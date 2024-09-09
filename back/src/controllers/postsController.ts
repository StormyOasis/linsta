import { Context } from "koa";
import Metrics from "../metrics/Metrics";
import { getFileExtByMimeType, sanitize } from "../utils/utils";
import formidable from 'formidable';
import { uploadFile } from "../Connectors/AWSConnector";
import logger from "../logger/logger";

export const addPost = async (ctx: Context) => {
    Metrics.increment("posts.addPost");

    const data = ctx.request.body;
    const files = ctx.request.files;

    if (!data || !files) {
        ctx.status = 400;
        return;
    }

    const user = JSON.parse(data.user);
    const global = JSON.parse(data.global);
    const entries = JSON.parse(data.entries);

    // strip out any potentially problematic html tags
    global.text = sanitize(global.text);

    try {
        // Upload each file to s3
        for(const entry of entries) {
            const file:formidable.File = (files[entry.id] as formidable.File);
            entry.newFileName = file.newFilename;
            
            const entityTag = await uploadFile(file, entry.id, user.id, getFileExtByMimeType(file.mimetype));
            entry.entityTag = entityTag;
        }

        // Now add the data to ES

    } catch(err) {
        logger.error(err);
        ctx.status = 400;
        return;
    }

    //ctx.body = 
    ctx.status = 200;
}