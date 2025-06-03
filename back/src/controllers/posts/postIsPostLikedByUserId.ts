import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, { EDGE_USER_LIKED_POST } from '../../connectors/DBConnector';
import { handleSuccess, handleValidationError } from '../../utils/utils';

type LikeRequest = {
    postId: string;
    userId: string;
};

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("posts.isPostLiked");

    let data: LikeRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.postId || !data.userId) {
        return handleValidationError("Invalid params passed");
    }

    try {
        // Check the graph to see if the user likes the post
        const isLiked = await(await DBConnector.getGraph()).V(data.userId)
            .out(EDGE_USER_LIKED_POST)
            .hasId(data.postId)
            .hasNext();

        return handleSuccess({ liked: isLiked });
    } catch (err) {
        logger.error((err as Error).message);
        return handleValidationError("Error getting like state");
    }
};