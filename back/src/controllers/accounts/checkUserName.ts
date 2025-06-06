import { APIGatewayProxyEvent } from 'aws-lambda';
import DBConnector from '../../connectors/DBConnector';
import { handleSuccess, handleValidationError } from '../../utils/utils';
import logger from '../../logger/logger';
import Metrics, { withMetrics } from '../../metrics/Metrics';

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "accounts.checkunique";
    return await withMetrics(baseMetricsKey, event.headers,async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    // Get userName from path parameters
    const userName = event.pathParameters?.userName;

    if (!userName || userName.trim().length === 0) {
        return handleValidationError("Invalid username");
    }

    // Sanitize input 
    const regex = /^[A-Za-z0-9]+$/;
    if (!regex.test(userName)) {
        return handleValidationError("Invalid username format");
    }

    try {
        const uniquePropertyMatcher = await (await DBConnector.getGraph()).V()
            .hasLabel("User")
            .has("userName", userName)
            .valueMap(true)
            .next();

        const isUnique = uniquePropertyMatcher?.value === null;

        return handleSuccess(isUnique);

    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error checking username uniqueness", 500);
    }
}