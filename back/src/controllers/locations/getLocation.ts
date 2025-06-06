import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import { getLocationData } from '../../connectors/AWSConnector';
import { handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { RequestWithRequestorId } from '../../utils/types';

interface LocationRequest extends RequestWithRequestorId {
    term: string;
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "location.get";
    return await withMetrics(baseMetricsKey, event.headers,async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    const query = event.queryStringParameters || {};

    const data: LocationRequest = {
        term: query.term || '',
        requestorUserId: query.requestorUserId || ''
    };

    if (!data.term || !data.requestorUserId) {
        return handleValidationError("Invalid params passed");
    }

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }

    try {
        const response = await getLocationData(data.term);
        return handleSuccess(response.Results);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        return handleValidationError("Error fetching location data", 500);

    }
};