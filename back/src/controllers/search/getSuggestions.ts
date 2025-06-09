import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import { getESConnector } from '../../connectors/ESConnector';
import logger from '../../logger/logger';
import { handleSuccess, handleValidationError } from '../../utils/utils';

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "search.getsuggestions";
    return await withMetrics(baseMetricsKey, event.headers,async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
        const q = event.queryStringParameters?.q;
        const type = event.queryStringParameters?.type || "both";
        const resultSize = event.queryStringParameters?.resultSize;

        if (!q) {
            return handleValidationError("Missing required search params");
        }

        try {
            const result = await getESConnector().getAllSuggestions(q, type, resultSize);
            return handleSuccess(result);
        } catch (err) {
            Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
            logger.error("Suggest error", err);
            return handleValidationError("An error occurred while performing the search");
        }
};