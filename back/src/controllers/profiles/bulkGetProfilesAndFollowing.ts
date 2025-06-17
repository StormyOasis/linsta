import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, { EDGE_USER_FOLLOWS } from '../../connectors/DBConnector';
import { getVertexPropertySafe, handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { ProfileWithFollowStatus, ProfileWithFollowStatusInt, RequestWithRequestorId } from '../../utils/types';

interface BulkGetProfilesRequest extends RequestWithRequestorId {
    userId: string;
    userIds: string[];
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "profiles.bulkgetwithfollowing";
    return await withMetrics(baseMetricsKey, event, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: BulkGetProfilesRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.userId || !data.userIds || data.userIds.length === 0) {
        return handleValidationError("Invalid params passed");
    }

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }

    try {
        // Get profile data for the given userIds
        const results = await (await DBConnector.getGraph()).V(data.userIds).project("User").toList();
        if (!results) {
            return handleValidationError("Error getting profiles");
        }

        const profileMap: Map<string, ProfileWithFollowStatus> = new Map();
        for (const result of results) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map = result as Map<any, any>;
            if (map.has("User")) {
                const vertex = map.get("User");
                const vertexProperties = vertex['properties'];
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
                profileMap.set(getVertexPropertySafe(vertexProperties, 'userName'), profile);
            }
        }

        // Get followers for each userId
        const __ = DBConnector.__();
        const results2 = await (await DBConnector.getGraph()).V(data.userIds)
            .hasLabel('User')
            .group()
            .by("userName")
            .by(
                __.in_(EDGE_USER_FOLLOWS)
                    .project('followers')
                    .by()
                    .by(
                        __.unfold()
                            .hasLabel('User')
                            .values("userName")
                            .fold()
                    )
                    .unfold()
                    .select(DBConnector.Column().values)
                    .fold()
            )
            .toList();

        const followerMap: Map<string, ProfileWithFollowStatus[]> = new Map();
        if (results2) {
            for (const result of results2) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const map = result as Map<any, any>;
                for (const entry of map) {
                    const key = entry[0];
                    const followers: ProfileWithFollowStatus[] = [];
                    for (const user of entry[1]) {
                        const vertexProperties = user.properties;
                        const profile: ProfileWithFollowStatus = {
                            profileId: getVertexPropertySafe(vertexProperties, 'profileId'),
                            bio: getVertexPropertySafe(vertexProperties, 'bio'),
                            pfp: getVertexPropertySafe(vertexProperties, 'pfp'),
                            userId: user.id,
                            userName: getVertexPropertySafe(vertexProperties, 'userName'),
                            firstName: getVertexPropertySafe(vertexProperties, 'firstName'),
                            lastName: getVertexPropertySafe(vertexProperties, 'lastName'),
                            gender: getVertexPropertySafe(vertexProperties, 'gender'),
                            pronouns: getVertexPropertySafe(vertexProperties, 'pronouns'),
                            link: getVertexPropertySafe(vertexProperties, 'link'),
                            isFollowed: false
                        };
                        followers.push(profile);
                    }
                    followerMap.set(key, followers);
                }
            }
        }

        // Attach followers and isFollowed status
        const returnData: ProfileWithFollowStatusInt = {};
        for (const [key, value] of profileMap) {
            value.followers = followerMap.get(key);
            if (value.followers) {
                for (const follower of value.followers) {
                    if (follower.userId === data.userId) {
                        value.isFollowed = true;
                        break;
                    }
                }
            }
            returnData[value.userId] = value;
        }

        return handleSuccess(returnData);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error getting profiles");
    }
};