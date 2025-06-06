import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import { getProfile, handleSuccess, handleValidationError } from '../../utils/utils';
import logger from '../../logger/logger';
import { Profile } from '../../utils/types';

type GetProfileByUserIdRequest = {
    userId: string;
};

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "profiles.getprofilebyid";
    return await withMetrics(baseMetricsKey, event.headers,async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: GetProfileByUserIdRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.userId) {
        return handleValidationError("Invalid params passed");
    }

    try {
        const profile: Profile | null = await getProfile(data.userId, null);
        if (profile === null) {
            return handleValidationError("Invalid profile");
        }

        return handleSuccess(profile);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Invalid profile");
    }
};