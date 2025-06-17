import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, { EDGE_USER_FOLLOWS } from '../../connectors/DBConnector';
import { handleSuccess, handleValidationError } from '../../utils/utils';

type SingleFollowRequest = {
    userId: string;
    checkUserId: string;
};

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "profiles.getsinglefollowstatus";
    return await withMetrics(baseMetricsKey, event, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: SingleFollowRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.userId || !data.checkUserId) {
        return handleValidationError("Invalid params passed");
    }

    try {
        // Check if userId follows checkUserId
        const results = await (await DBConnector.getGraph())
            .V(data.userId)
            .outE(EDGE_USER_FOLLOWS)
            .inV()
            .hasId(data.checkUserId)
            .count()
            .next();

        if (!results || results.value === null) {
            return handleValidationError("Error getting follow status");
        }

        return handleSuccess(results.value === 1);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error getting followers");
    }
};