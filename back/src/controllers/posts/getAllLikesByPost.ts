import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import logger from '../../logger/logger';
import { getLikesByPost, handleSuccess, handleValidationError } from '../../utils/utils';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("posts.getAllLikesByPost");

    const postId = event.queryStringParameters?.postId?.trim();

    if (!postId || postId.length === 0) {
        return handleValidationError("Error getting all likes");
    }

    try {
        const likes = await getLikesByPost(postId);
        return handleSuccess(likes);
    } catch (err) {
        logger.error((err as Error).message);
        return handleValidationError("Error getting all likes");
    }
};