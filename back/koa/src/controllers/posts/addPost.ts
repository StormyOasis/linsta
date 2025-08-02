import { handleSuccess, handleValidationError } from '../../utils';
import {
    DBConnector,
    RedisConnector,
    EDGE_POST_TO_USER,
    EDGE_USER_TO_POST,
    getFileExtension,
    metrics,
    withMetrics,
    logger,
    sanitize,
    uploadFile,
    updatePostIdInES,
    IndexService,
    sendImageProcessingMessage,
    sendAutoCaptionProcessingMessage,
    getFileExtByMimeType,
} from '@linsta/shared';
import type { User, Global, Entry, Post } from '@linsta/shared';
import formidable from 'formidable';
import { Context } from 'koa';

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "posts.addpost";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const data = ctx.request.body;
    const files = ctx.request.files;

    if (!data || !files) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    let user: User, global: Global, entries: Entry[];
    try {
        user = JSON.parse(data.user);
        global = JSON.parse(data.global);
        entries = JSON.parse(data.entries);
    } catch (err) {
        return handleValidationError(ctx, "Invalid JSON in fields");
    }

    // Sanitize input
    user.userId = sanitize(user.userId);
    global.captionText = sanitize(global.captionText);
    global.locationText = sanitize(global.locationText);

    try {
        // Upload each file to S3
        await processFileUploads(user.userId, entries, files);

        // Add the data to ES
        const dataSet = IndexService.buildDataSetForES(user, global, entries);

        const indexResponse = await IndexService.insertPost(dataSet)
        if (!indexResponse || indexResponse.result !== 'created') {
            return handleValidationError(ctx, "Error adding post");
        }       

        // Add an associated vertex and edges to the graph for this post
        await DBConnector.beginTransaction();

        // Add a post vertex to the graph
        let graphResult = await (await DBConnector.getGraph(true))
            .addV("Post")
            .property("esId", indexResponse._id)
            .next();

        if (!graphResult || !graphResult.value) {
            return handleValidationError(ctx, "Error adding post");
        }

        const postId: string = graphResult.value.id;

        // Add the edges between the post and user vertices
        await DBConnector.createEdge(true, postId, user.userId, EDGE_POST_TO_USER, EDGE_USER_TO_POST);

        // Update the media entries with the postId for easier lookup. First update in ES
        await updatePostIdInES(indexResponse._id, postId);

        // Update the data set that is put into redis adding the postId
        (dataSet as Post).media = entries.map((entry: Entry) => {
            const newData = { ...entry };
            newData.postId = postId;
            return newData;
        });

        await DBConnector.commitTransaction();

        // Add the post data to redis
        await RedisConnector.set(indexResponse._id, JSON.stringify(dataSet));

        // We've finished all post stuff so it's now time to queue up an image processing and autocaption processing events
        entries.forEach(async (entry:Entry) => {
            const ext = getFileExtension(entry.url);
            const key = `${user.userId}/${entry.id}.${ext}`;
            await sendImageProcessingMessage(indexResponse._id, entry.id, key, (entry.mimeType || "").includes("video"), entry.altText);
            await sendAutoCaptionProcessingMessage(indexResponse._id, entry.id, key, (entry.mimeType || "").includes("video"), entry.url, entry.altText);
        });

        return handleSuccess(ctx, { status: "OK", postId });
    } catch (err) {
        await DBConnector.rollbackTransaction();
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);        
        return handleValidationError(ctx, "Error adding post");
    }
};

const processFileUploads = async (userId: string, entries: Entry[], files: formidable.Files): Promise<void> => {
    for (const entry of entries) {
        const file: formidable.File = (files[entry.id] as formidable.File);

        const result = await uploadFile(file, entry.id, userId, getFileExtByMimeType(file.mimetype));
        entry.entityTag = result.tag.replace('"', '').replace('"', '');
        entry.url = result.url;
        entry.mimeType = file.mimetype;
        entry.altText = sanitize(entry.altText);
        entry.userId = userId;        
    }
}