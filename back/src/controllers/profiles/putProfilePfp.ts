import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import { getProfile, handleSuccess, handleValidationError, updateProfileInRedis, verifyJWT } from '../../utils/utils';
import logger from '../../logger/logger';
import { getESConnector } from '../../connectors/ESConnector';
import DBConnector from '../../connectors/DBConnector';
import { removeFile, uploadFile } from '../../connectors/AWSConnector';
import { getFileExtByMimeType } from '../../utils/textUtils';
import * as multipart from 'lambda-multipart-parser';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("profiles.putProfilePfp");    

    let parsed;
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

        if (profile === null) {
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
        await getESConnector().updateProfile(profile.profileId, undefined, {
            doc: {
                pfp: url,
            }
        });

        // Update the entry in the DB
        const result = await(await DBConnector.getGraph()).V(parsed.userId).property("pfp", url).next();
        if (!result || !result.value) {
            return handleValidationError("Error updating profile");
        }

        // Profile has just been updated, need to upsert into redis
        await updateProfileInRedis(profile, parsed.userId);

        return handleSuccess({ url });
    } catch (err) {
        logger.error((err as Error).message);
        return handleValidationError("Error updating profile");
    }
};