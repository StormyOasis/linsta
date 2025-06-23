import { APIGatewayProxyEvent } from 'aws-lambda';
import * as multipart from 'lambda-multipart-parser';
import { getFileExtByMimeType, getIpFromEvent, updateProfileInRedis, verifyJWT } from '../../utils';
import {
  DBConnector,
  getProfile,
  handleSuccess,
  handleValidationError,
  IndexService,
  logger,
  metrics,
  removeFile,
  uploadFile,
  withMetrics,
} from '@linsta/shared';

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "profiles.putprofilepfp";
    const ip = getIpFromEvent(event);

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let parsed: multipart.MultipartRequest;
    try {
        parsed = await multipart.parse(event);

        if (!parsed.userId || !parsed.requestorUserId) {
            return handleValidationError("Missing required params");
        }

        // JWT Authorization: Only the owner can update
        const jwtPayload = verifyJWT(event, parsed.requestorUserId);
        if (!jwtPayload) {
            return handleValidationError("You do not have permission to access this data", 403);
        }

    } catch (err) {
        logger.error("Error parsing multipart data", err);
        return handleValidationError("Invalid form data");
    }

    const files = parsed.files;

    try {
        const profile = await getProfile(parsed.userId, null);
        if (!profile) {
            return handleValidationError("Invalid profile");
        }

        let url = "";
        // Upload the new file if we aren't clearing out the pfp property
        if (files && files.length > 0) {
            const file = files[0];
            const result = await uploadFile(
                file,
                `pfp-${crypto.randomUUID()}`,
                parsed.userId,
                getFileExtByMimeType(file.contentType)
            );
            url = result.url;
        } else {
            // Remove the existing pfp from S3
            if (profile.pfp && profile.pfp.length > 0) {
                await removeFile(profile.pfp);
            }
        }

        profile.pfp = url;

        // Now update the profile data in ES with the new pfp 
        const esResult = await IndexService.updateProfile(profile.profileId, undefined, {
            doc: {
                pfp: url,
            }
        });

        if (esResult.result != 'updated') {
            return handleValidationError("Error updating profile");
        }

        // Update the entry in the DB
        const dbResult = await (await DBConnector.getGraph()).V(parsed.userId).property("pfp", url).next();
        if (!dbResult?.value) {
            return handleValidationError("Error updating profile");
        }

        // Profile has just been updated, need to upsert into redis
        await updateProfileInRedis(profile, parsed.userId);

        return handleSuccess(url);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error updating profile");
    }
};