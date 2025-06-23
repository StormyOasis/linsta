import { APIGatewayProxyEvent } from 'aws-lambda';
import * as multipart from 'lambda-multipart-parser';
import { getIpFromEvent, getFileExtByMimeType, verifyJWT } from '../../utils';
import {
    DBConnector,
    RedisConnector,
    EDGE_POST_TO_USER,
    EDGE_USER_TO_POST,
    handleSuccess,
    handleValidationError,
    metrics,
    withMetrics,
    logger,
    sanitize,
    uploadFile,
    updatePostIdInES,
    IndexService
} from '@linsta/shared';
import type { LambdaMultipartFile, User, Global, Entry, Post } from '@linsta/shared';

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "posts.addpost";
    const ip = getIpFromEvent(event);

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let parsed;
    try {
        parsed = await multipart.parse(event);
    } catch (err) {
        logger.error("Error parsing multipart data", err);
        return handleValidationError("Invalid form data");
    }

    const data: multipart.MultipartRequest = parsed;
    const files: multipart.MultipartFile[] = parsed.files;

    if (!data || !files || !data.user || !data.global || !data.entries) {
        return handleValidationError("Invalid params passed");
    }

    let user: User, global: Global, entries: Entry[];
    try {
        user = JSON.parse(data.user);
        global = JSON.parse(data.global);
        entries = JSON.parse(data.entries);
    } catch (err) {
        return handleValidationError("Invalid JSON in fields");
    }

    // Sanitize input
    user.userId = sanitize(user.userId);
    global.captionText = sanitize(global.captionText);
    global.locationText = sanitize(global.locationText);

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }

    try {
        // Upload each file to S3
        await processFileUploads(user.userId, entries, files);

        // Add the data to ES
        const dataSet = IndexService.buildDataSetForES(user, global, entries);

        const indexResponse = await IndexService.insertPost(dataSet)
        if (!indexResponse || indexResponse.result !== 'created') {
            return handleValidationError("Error adding post");
        }

        // Add an associated vertex and edges to the graph for this post
        await DBConnector.beginTransaction();

        // Add a post vertex to the graph
        let graphResult = await (await DBConnector.getGraph(true))
            .addV("Post")
            .property("esId", indexResponse._id)
            .next();

        if (!graphResult || !graphResult.value) {
            return handleValidationError("Error adding post");
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

        return handleSuccess({ status: "OK", postId });
    } catch (err) {
        await DBConnector.rollbackTransaction();
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);        
        return handleValidationError("Error adding post");
    }
};

const processFileUploads = async (userId: string, entries: Entry[], files: LambdaMultipartFile[]): Promise<void> => {
    for (const entry of entries) {
        const file = files.find(f => f.fieldname === entry.id);
        if (!file) {
            throw new Error(`Missing file for entry ${entry.id}`);
        }

        const { tag, url } = await uploadFile(
            file,
            entry.id,
            userId,
            getFileExtByMimeType(file.contentType)
        );

        entry.entityTag = tag.replace(/"/g, '');
        entry.url = url;
        entry.mimeType = file.contentType;
        entry.alt = sanitize(entry.alt);
        entry.userId = userId;
    }
}