import { APIGatewayProxyEvent } from 'aws-lambda';
import { LambdaMultipartFile, uploadFile } from '../../connectors/AWSConnector';
import { buildDataSetForES, getESConnector } from '../../connectors/ESConnector';
import DBConnector, { EDGE_POST_TO_USER, EDGE_USER_TO_POST } from '../../connectors/DBConnector';
import RedisConnector from '../../connectors/RedisConnector';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import { getFileExtByMimeType, sanitize } from '../../utils/textUtils';
import { handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import * as multipart from 'lambda-multipart-parser';
import { User, Global, Entry, Post } from '../../utils/types';

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "posts.addpost";
    return await withMetrics(baseMetricsKey, async () => await handlerActions(baseMetricsKey, event))
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
        for (const entry of entries) {
            const file: LambdaMultipartFile | undefined = files.find((f) => f.fieldname === entry.id);
            if (!file) {
                return handleValidationError(`Missing file for entry ${entry.id}`);
            }

            const result = await uploadFile(
                file,
                entry.id,
                user.userId,
                getFileExtByMimeType(file.contentType)
            );
            entry.entityTag = result.tag.replace(/"/g, '');
            entry.url = result.url;
            entry.mimeType = file.contentType;
            entry.alt = sanitize(entry.alt);
            entry.userId = user.userId;
        }

        // Add the data to ES
        const dataSet = buildDataSetForES(user, global, entries);

        const esResult = await getESConnector().insert(dataSet);
        if (!esResult || esResult.result !== 'created') {
            return handleValidationError("Error adding post");
        }

        // Add an associated vertex and edges to the graph for this post
        await DBConnector.beginTransaction();

        // Add a post vertex to the graph
        let graphResult = await (await DBConnector.getGraph(true))
            .addV("Post")
            .property("esId", esResult._id)
            .next();

        if (!graphResult || !graphResult.value) {
            return handleValidationError("Error adding post");
        }

        const postId: string = graphResult.value.id;

        // Add the edges between the post and user vertices
        graphResult = await (await DBConnector.getGraph(true)).V(postId)
            .as('post')
            .V(user.userId)
            .as('user')
            .addE(EDGE_POST_TO_USER)
            .from_("post")
            .to("user")
            .addE(EDGE_USER_TO_POST)
            .from_("user")
            .to("post")
            .next();

        if (!graphResult || !graphResult.value) {
            return handleValidationError("Error creating profile links");
        }

        // Update the media entries with the postId for easier lookup. First update in ES
        await getESConnector().update(esResult._id, {
            source: `for (int i = 0; i < ctx._source.media.size(); i++) {
                ctx._source.media[i].postId = params.postId;
            }`,
            params: { postId: `${postId}` },
            lang: "painless"
        });

        // Update the data set that is put into redis adding the postId
        (dataSet as Post).media = entries.map((entry: Entry) => {
            const newData = { ...entry };
            newData.postId = postId;
            return newData;
        });

        await DBConnector.commitTransaction();

        // Add the post data to redis
        await RedisConnector.set(esResult._id, JSON.stringify(dataSet));

        return handleSuccess({ status: "OK", postId });
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        await DBConnector.rollbackTransaction();
        logger.error((err as Error).message);
        return handleValidationError("Error adding post");
    }
};