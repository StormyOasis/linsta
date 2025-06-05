import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, { EDGE_USER_FOLLOWS } from '../../connectors/DBConnector';
import { handleSuccess, handleValidationError } from '../../utils/utils';

type SingleFollowRequest = {
    userId: string;
    checkUserId: string;
};

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("profiles.getSingleFollowStatus");

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
        const results = await(await DBConnector.getGraph())
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
        logger.error((err as Error).message);
        return handleValidationError("Error getting followers");
    }
};