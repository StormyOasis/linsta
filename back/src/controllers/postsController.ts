import { Context } from "koa";
import Metrics from "../metrics/Metrics";
import { getFileExtByMimeType, sanitize } from "../utils/utils";
import formidable from 'formidable';
import { uploadFile } from "../Connectors/AWSConnector";
import logger from "../logger/logger";
import { buildDataSetForES, insert, search } from '../Connectors/ESConnector';

export type User = {
    id: number;
    name: string;
};

export type Global = {
    text: string;
    commentsDisabled: boolean;
    likesDisabled: boolean;
    locationText: string;
};

export type Entry = {
    id: string;
    alt: string;
    entityTag: string;
    url: string;
    mimeType: string|null;
}

export const addPost = async (ctx: Context) => {
    Metrics.increment("posts.addPost");

    const data = ctx.request.body;
    const files = ctx.request.files;

    if (!data || !files) {
        ctx.status = 400;
        return;
    }

    const user:User = JSON.parse(data.user);
    const global:Global = JSON.parse(data.global);
    const entries:Entry[] = JSON.parse(data.entries);

    // strip out any potentially problematic html tags
    global.text = sanitize(global.text);
    global.locationText = sanitize(global.locationText);

    try {
        // Upload each file to s3
        for(const entry of entries) {
            const file:formidable.File = (files[entry.id] as formidable.File);            

            const result = await uploadFile(file, entry.id, user.id, getFileExtByMimeType(file.mimetype));
            entry.entityTag = result.tag.replace('"', '').replace('"', '');
            entry.url = result.url;
            entry.mimeType = file.mimetype;
            entry.alt = sanitize(entry.alt);
        }

        // Now add the data to ES
        const dataSet = buildDataSetForES(user, global, entries);

        const result = await insert(dataSet);

        if(result.result !== 'created') {
            throw new Error("Error adding post");
        }

    } catch(err) {
        logger.error(err);
        ctx.status = 400;
        return;
    }

    //ctx.body = 
    ctx.status = 200;
}

export const searchPosts = async () => {
    const results = await search();

    console.log(results);
}