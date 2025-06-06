import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import { getPostByPostId, handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { RequestWithRequestorId } from '../../utils/types';

interface GetPostByIdRequest extends RequestWithRequestorId {
    postId: string;
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "posts.getpostbyid";
    return await withMetrics(baseMetricsKey, event.headers,async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: GetPostByIdRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Error getting post");
    }

    const postId = data.postId;

    if (!postId) {
        return handleValidationError("Error getting post");
    }

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }

    try {
        const post = await getPostByPostId(postId);
        return handleSuccess(post);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error getting post");
    }
};