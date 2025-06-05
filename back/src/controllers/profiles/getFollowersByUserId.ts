import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, { EDGE_USER_FOLLOWS } from '../../connectors/DBConnector';
import { getVertexPropertySafe, handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { ProfileWithFollowStatus } from '../../utils/types';

type GetFollowersByUserIdRequest = {
    userId: string;
    requestorUserId: string;
};

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "profiles.getfollowersbyid";
    return await withMetrics(baseMetricsKey, async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: GetFollowersByUserIdRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.userId || !data.requestorUserId) {
        return handleValidationError("Invalid params passed");
    }

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }

    try {
        // Find the follower profiles from the specified user id
        const __ = DBConnector.__();
        let results = await (await DBConnector.getGraph()).V(data.userId)
            .inE(EDGE_USER_FOLLOWS)  // Get all incoming 'user_follows' edges pointing to User1
            .outV()  // Get the vertices (users) who follow User1
            .where(__.not(__.hasId(data.userId)))  // Exclude User1 from the results            
            .toList();

        if (!results) {
            return handleSuccess([]);
        }

        const profileMap: Map<string, ProfileWithFollowStatus> = new Map<string, ProfileWithFollowStatus>();
        const followerIds: string[] = [];
        for (const result of results) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const vertex: any = result;
            const vertexProperties = vertex.properties;

            const profile: ProfileWithFollowStatus = {
                profileId: getVertexPropertySafe(vertexProperties, 'profileId'),
                bio: getVertexPropertySafe(vertexProperties, 'bio'),
                pfp: getVertexPropertySafe(vertexProperties, 'pfp'),
                userId: vertex.id,
                userName: getVertexPropertySafe(vertexProperties, 'userName'),
                firstName: getVertexPropertySafe(vertexProperties, 'firstName'),
                lastName: getVertexPropertySafe(vertexProperties, 'lastName'),
                gender: getVertexPropertySafe(vertexProperties, 'gender'),
                pronouns: getVertexPropertySafe(vertexProperties, 'pronouns'),
                link: getVertexPropertySafe(vertexProperties, 'link'),
                isFollowed: false
            };

            followerIds.push(vertex.id);
            profileMap.set(vertex.id, profile);
        }

        // Now check which of those users userId is following back (mutuals)
        results = await (await DBConnector.getGraph()).V(data.userId)
            .out(EDGE_USER_FOLLOWS)
            .filter(__.id().is(DBConnector.P().within(followerIds)))
            .dedup()
            .toList();

        if (results) {
            for (const result of results) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const vertex: any = result;
                const profile: ProfileWithFollowStatus | undefined = profileMap.get(vertex.id);

                if (profile) {
                    profile.isFollowed = true;
                    profileMap.set(profile.userId, profile);
                }
            }
        }

        const returnData: ProfileWithFollowStatus[] = Array.from(profileMap.values());
        return handleSuccess(returnData);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error getting followers");
    }
};