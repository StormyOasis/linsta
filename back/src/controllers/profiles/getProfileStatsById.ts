import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, { EDGE_USER_FOLLOWS, EDGE_USER_TO_POST } from '../../connectors/DBConnector';
import { handleSuccess, handleValidationError } from '../../utils/utils';

type GetProfileStatsByIdRequest = {
    userId: string;
};

type ProfileStats = {
    postCount: number;
    followerCount: number;
    followingCount: number;
};

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("profiles.getProfileStatsById");

    let data: GetProfileStatsByIdRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.userId) {
        return handleValidationError("Invalid params passed");
    }

    try {
        const stats: ProfileStats = {
            postCount: 0,
            followerCount: 0,
            followingCount: 0
        };

        // Get the number of posts by the user
        const postResult = await(await DBConnector.getGraph()).V(data.userId)
            .outE(EDGE_USER_TO_POST)
            .count()
            .next();

        if (!postResult || postResult.value == null) {
            return handleValidationError("Error getting post count");
        }
        stats.postCount = postResult.value;

        // Get the number of users this profile is following
        const followerResult = await(await DBConnector.getGraph()).V(data.userId)
            .outE(EDGE_USER_FOLLOWS)
            .count()
            .next();

        if (!followerResult || followerResult.value == null) {
            return handleValidationError("Error getting follower count");
        }
        stats.followingCount = followerResult.value;

        // Get the number of users following this user
        const followingResult = await(await DBConnector.getGraph()).V(data.userId)
            .inE(EDGE_USER_FOLLOWS)
            .count()
            .next();

        if (!followingResult || followingResult.value == null) {
            return handleValidationError("Error getting following count");
        }
        stats.followerCount = followingResult.value;

        return handleSuccess(stats);
    } catch (err) {
        logger.error((err as Error).message);
        return handleValidationError("Error getting stats");
    }
};