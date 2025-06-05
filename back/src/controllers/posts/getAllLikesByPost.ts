import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import { getLikesByPost, handleSuccess, handleValidationError } from '../../utils/utils';

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "posts.getalllikesbyid";
    return await withMetrics(baseMetricsKey, async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    const postId = event.queryStringParameters?.postId?.trim();

    if (!postId || postId.length === 0) {
        return handleValidationError("Error getting all likes");
    }

    try {
        const likes = await getLikesByPost(postId);
        return handleSuccess(likes);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error getting all likes");
    }
};