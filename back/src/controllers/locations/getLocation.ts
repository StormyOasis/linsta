import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import { getLocationData } from '../../connectors/AWSConnector';
import { handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { RequestWithRequestorId } from '../../utils/types';

interface LocationRequest extends RequestWithRequestorId {
    term: string;
}

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("locations.getData");

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
        return handleValidationError("Error fetching location data", 500);
        
    }
};