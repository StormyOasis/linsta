import { APIGatewayProxyEvent } from 'aws-lambda';
import { getIpFromEvent, verifyJWT } from '../../utils';
import {
    DBConnector,
    RedisConnector,
    EDGE_POST_TO_USER,
    EDGE_POST_TO_COMMENT,
    EDGE_COMMENT_TO_POST,
    handleSuccess,
    handleValidationError,
    withMetrics,
    metrics,
    logger,
    IndexService
} from '@linsta/shared';
import type { RequestWithRequestorId } from '@linsta/shared';

interface DeletePostRequest extends RequestWithRequestorId {
    postId: string;
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "posts.deletepost";
    const ip = getIpFromEvent(event);

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: DeletePostRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.postId) {
        return handleValidationError("Invalid params passed");
    }

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }

    try {
        const __ = DBConnector.__();

        // Step 1: Get the esId and userId of the post
        const results = await (await DBConnector.getGraph())
            .V(data.postId)
            .as("post")
            .out(EDGE_POST_TO_USER)
            .as("user")
            .select("post", "user")
            .by(
                __.project("id", "esId")
                    .by(DBConnector.T().id)
                    .by("esId")
            )
            .by(DBConnector.T().id)
            .toList();

        if (!results?.length) {
            return handleValidationError("Error deleting post");
        }

        let esId: string | null = null;
        let userId: string | null = null;
        for (const entry of results) {
            const vertex = DBConnector.unwrapResult(entry);
            const parsed = DBConnector.parseGraphResult<{ post: { id: string, esId: string }, user: string }>(vertex, ["post", "user"]);
            esId = parsed.post?.esId;
            userId = parsed.user;
        }

        if (!esId || !userId) {
            return handleValidationError("Error deleting post");
        }

        // JWT Authorization: Only the owner can delete
        const jwtPayload = verifyJWT(event, userId);
        if (!jwtPayload) {
            return handleValidationError("You do not have permission to access this data", 403);
        }

        // Step 2: Get all vertex IDs to delete (post + comments)
        const vertexIdsToDelete = await (await DBConnector.getGraph())
            .V(data.postId)
            .union(
                __.identity(),
                __.both(EDGE_POST_TO_COMMENT, EDGE_COMMENT_TO_POST)
            )
            .dedup()
            .id()
            .toList();

        if (vertexIdsToDelete.length === 0) {
            logger.warn(`No vertices found to delete for post: ${data.postId}`);
            return handleValidationError("Error deleting post");
        }

        // Start transaction
        await DBConnector.beginTransaction();

        // Step 3: Drop all edges connected to those vertices
        await (await DBConnector.getGraph(true))
            .V(...vertexIdsToDelete)
            .bothE()
            .drop()
            .iterate();

        // Step 4: Drop the vertices themselves
        await (await DBConnector.getGraph(true))
            .V(...vertexIdsToDelete)
            .drop()
            .iterate();

        // Remove the post from ES
        const deleteResponse = await IndexService.deletePost(esId as string);
        if (!deleteResponse || (deleteResponse.result !== 'deleted' && deleteResponse.result !== 'not_found')) {
            await DBConnector.rollbackTransaction();
            return handleValidationError("Error deleting post");
        }

        await DBConnector.commitTransaction();

        // Step 5: Remove post from Redis
        await RedisConnector.del(esId as string);

        return handleSuccess({ status: "OK" });
    } catch (err) {
        await DBConnector.rollbackTransaction();
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error deleting post");
    }
};