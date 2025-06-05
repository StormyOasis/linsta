import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import { getESConnector } from '../../connectors/ESConnector';
import logger from '../../logger/logger';
import { handleSuccess, handleValidationError } from '../../utils/utils';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("search.getSuggestions");

    const q = event.queryStringParameters?.q;

    if (!q) {
        return handleValidationError("Missing required search params");
    }

    try {
        const result = await getESConnector().getAllSuggestions(q);
        return handleSuccess(result);
    } catch (err) {
        logger.error("Suggest error", err);
        return handleValidationError("An error occurred while performing the search");
    }
};