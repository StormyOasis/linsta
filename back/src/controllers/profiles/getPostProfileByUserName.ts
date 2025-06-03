import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import { getProfile, handleSuccess, handleValidationError } from '../../utils/utils';
import logger from '../../logger/logger';
import { ProfileWithFollowStatus } from '../../utils/types';

type GetProfileByUserNameRequest = {
    userName: string;
};

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("profiles.getPostProfileByUserName");

    let data: GetProfileByUserNameRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.userName) {
        return handleValidationError("Invalid params passed");
    }

    try {
        const profile: ProfileWithFollowStatus | null = await getProfile(null, data.userName);
        if (profile === null) {
            return handleValidationError("Invalid profile");
        }

        return handleSuccess(profile);
    } catch (err) {
        logger.error((err as Error).message);
        return handleValidationError("Invalid profile");
    }
};