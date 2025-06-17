import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, { EDGE_COMMENT_LIKED_BY_USER, EDGE_USER_LIKED_COMMENT } from '../../connectors/DBConnector';
import { handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { RequestWithRequestorId } from '../../utils/types';

interface LikeRequest extends RequestWithRequestorId {
    commentId: string;
    userId: string;
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "comments.togglelike";
    return await withMetrics(baseMetricsKey, event, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: LikeRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.commentId || !data.userId) {
        return handleValidationError("Invalid params passed");
    }

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }

    let isLiked = false;

    try {
        const __ = DBConnector.__();

        // Check if user currently likes this comment
        const isLikedResults = await (await DBConnector.getGraph()).V(data.commentId)
            .as("comment")
            .outE(EDGE_COMMENT_LIKED_BY_USER)
            .filter(__.inV().hasId(data.userId))
            .toList();

        if (!isLikedResults) {
            return handleValidationError("Error getting like status");
        }

        isLiked = isLikedResults.length > 0;

        // Update the graph adding or removing edges as necessary
        if (isLiked) {
            // drop the edges
            let results = await (await DBConnector.getGraph()).V(data.commentId)
                .as("comment")
                .outE(EDGE_COMMENT_LIKED_BY_USER)
                .filter(__.inV().hasId(data.userId))
                .drop()
                .toList();

            if (!results) {
                return handleValidationError("Error changing like status");
            }

            results = await (await DBConnector.getGraph()).V(data.userId)
                .as("user")
                .outE(EDGE_USER_LIKED_COMMENT)
                .filter(__.inV().hasId(data.commentId))
                .drop()
                .toList();

            if (!results) {
                return handleValidationError("Error changing like status");
            }
        } else {
            // add the edges
            const results = await (await DBConnector.getGraph()).V(data.commentId)
                .as("comment")
                .V(data.userId)
                .as("user")
                .addE(EDGE_COMMENT_LIKED_BY_USER)
                .from_("comment")
                .to("user")
                .addE(EDGE_USER_LIKED_COMMENT)
                .from_("user")
                .to("comment")
                .toList();

            if (!results) {
                return handleValidationError("Error changing like status");
            }
        }

        return handleSuccess({ liked: !isLiked });
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error changing like status");
    }
};