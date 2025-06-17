import { APIGatewayProxyEvent } from 'aws-lambda';
import DBConnector, { EDGE_USER_FOLLOWS } from '../../connectors/DBConnector';
import { handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import logger from '../../logger/logger';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import { RequestWithRequestorId } from '../../utils/types';

interface FollowingType extends RequestWithRequestorId {
    userId: string;
    followId: string;
    follow: boolean;
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "accounts.togglefollowing";
    return await withMetrics(baseMetricsKey, event, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {

    let data: FollowingType;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid input");
    }

    if (!data.userId || !data.followId || typeof data.follow !== 'boolean') {
        return handleValidationError("Missing or invalid parameters");
    }

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }

    try {
        await DBConnector.beginTransaction();

        if (data.follow) {
            // Adding a new follower
            const result = await (await DBConnector.getGraph(true)).V(data.userId)
                .as("user_id")
                .V(data.followId)
                .as("follow_id")
                .addE(EDGE_USER_FOLLOWS)
                .from_('user_id')
                .to('follow_id')
                .next();

            if (!result || !result.value) {
                await DBConnector.rollbackTransaction();
                return handleValidationError("Error following user");
            }
        } else {
            // Unfollow the given follower
            await (await DBConnector.getGraph(true)).V(data.userId)
                .outE(EDGE_USER_FOLLOWS)
                .where(DBConnector.__().inV().hasId(data.followId))
                .drop()
                .next();
        }

        await DBConnector.commitTransaction();
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        await DBConnector.rollbackTransaction();
        return handleValidationError("Error changing following status");
    }

    return handleSuccess({ status: "OK" });
};