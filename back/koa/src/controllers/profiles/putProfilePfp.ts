import { Context } from 'koa';
import formidable from 'formidable';
import { handleSuccess, handleValidationError, isUserAuthorized, } from '../../utils';
import {
  DBConnector,
  getProfile,
  IndexService,
  logger,
  metrics,
  removeFile,
  uploadFile,
  withMetrics,
  getFileExtByMimeType, 
  updateProfileInRedis
} from '@linsta/shared';

type PutPPfpByIdRequest = {
    userId: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "profiles.putprofilepfp";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const data = <PutPPfpByIdRequest>ctx.request.body;
    const files:formidable.Files = ctx.request.files as formidable.Files;

    if (data.userId == null) {
        return handleValidationError(ctx, "Invalid params passed");   
    }  

    try {
        const profile = await getProfile(data.userId, null);
        if (!profile) {
            return handleValidationError(ctx, "Invalid profile");
        }

        let url = "";
        // Upload the new file if we aren't clearing out the pfp property
        if(files != null && files.fileData != null) {
            const file:formidable.File = (files.fileData as formidable.File);            
            const result = await uploadFile(file, `pfp-${crypto.randomUUID()}`, data.userId, getFileExtByMimeType(file.mimetype));
            url = result.url;
        } else {
            // Remove the existing pfp from S3
            if(profile.pfp != null && profile.pfp.length > 0) {
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
            return handleValidationError(ctx, "Error updating profile");
        }

        // Update the entry in the DB
        const dbResult = await (await DBConnector.getGraph()).V(data.userId).property("pfp", url).next();
        if(dbResult == null || dbResult.value == null) {
            return handleValidationError(ctx, "Error updating profile");
        }

        // Profile has just been updated, need to upsert into redis
        await updateProfileInRedis(profile, data.userId);

        return handleSuccess(ctx, url);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error updating profile");
    }
};