import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, { EDGE_POST_LIKED_BY_USER, EDGE_USER_LIKED_POST } from '../../connectors/DBConnector';
import { handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { RequestWithRequestorId } from '../../utils/types';

interface LikeRequest extends RequestWithRequestorId {
    postId: string;
    userId: string;
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "posts.togglelike";
    return await withMetrics(baseMetricsKey, event, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
        let data: LikeRequest;
        try {
            data = JSON.parse(event.body || '{}');
        } catch {
            return handleValidationError("Missing postId or userId");
        }

        const { postId, userId, requestorUserId } = data;

        if (!postId || !userId) {
            return handleValidationError("Missing postId or userId");
        }

        if (!verifyJWT(event, requestorUserId)) {
            // 403 - Forbidden
            return handleValidationError("You do not have permission to access this data", 403);
        }

        let isLiked: boolean | undefined = false;

        try {
            const __ = DBConnector.__();

            await DBConnector.beginTransaction();

            // Check the graph to see if the user likes the post
            isLiked = await (await DBConnector.getGraph(true)).V(userId)
                .out(EDGE_USER_LIKED_POST)
                .hasId(postId)
                .hasNext();

            if (isLiked) {
                // User currently likes this post, so unlike (remove edges)
                await Promise.all([
                    (await DBConnector.getGraph(true)).V(postId)
                        .outE(EDGE_POST_LIKED_BY_USER)
                        .filter(__.inV().hasId(userId))
                        .drop()
                        .iterate(),
                    (await DBConnector.getGraph(true)).V(userId)
                        .outE(EDGE_USER_LIKED_POST)
                        .filter(__.inV().hasId(postId))
                        .drop()
                        .iterate()
                ]);
            } else {
                // Like the post by adding the edges
                const result = await (await DBConnector.getGraph(true)).V(postId)
                    .as("post")
                    .V(userId)
                    .as("user")
                    .addE(EDGE_POST_LIKED_BY_USER)
                    .from_("post")
                    .to("user")
                    .addE(EDGE_USER_LIKED_POST)
                    .from_("user")
                    .to("post")
                    .next();

                if (!result?.value) {
                    await DBConnector.rollbackTransaction();
                    return handleValidationError("Error toggling like state");
                }
            }

            await DBConnector.commitTransaction();

            return handleSuccess({ liked: !isLiked });
        } catch (err) {
            Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
            logger.error("Failed to toggle like", { userId, postId, err });
            await DBConnector.rollbackTransaction();
            return handleValidationError("Error toggling like state");
        }
};