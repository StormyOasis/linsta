import { Context } from "koa";

import {
    DBConnector,
    EDGE_USER_FOLLOWS,
    logger,
    metrics,
    type ProfileWithFollowStatus,
    type ProfileWithFollowStatusInt,
    withMetrics
} from "@linsta/shared";

import {
    handleSuccess,
    handleValidationError,
} from "../../utils";

type BulkGetProfilesRequest = {
    userId: string;
    userIds: string[];
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "profiles.bulkgetwithfollowing";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { userId, userIds } = <BulkGetProfilesRequest>ctx.request.body;

    if (!userIds || !userIds?.length) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        const graph = await DBConnector.getGraph();

        // Get profile data for the given userIds
        const profilesResult = await graph.V(userIds).project("User").toList();
        if (!profilesResult) {
            return handleValidationError(ctx, "Error getting profiles");
        }

        const profileMap: Map<string, ProfileWithFollowStatus> = new Map();
        for (const result of profilesResult) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map = result as Map<any, any>;
            if (!map.has("User")) {
                continue;
            }
            const vertex = map.get("User");
            const vertexProperties = vertex['properties'];
            const profile: ProfileWithFollowStatus = {
                profileId: DBConnector.getVertexPropertySafe(vertexProperties, 'profileId'),
                bio: DBConnector.getVertexPropertySafe(vertexProperties, 'bio'),
                pfp: DBConnector.getVertexPropertySafe(vertexProperties, 'pfp'),
                userId: vertex.id,
                userName: DBConnector.getVertexPropertySafe(vertexProperties, 'userName'),
                firstName: DBConnector.getVertexPropertySafe(vertexProperties, 'firstName'),
                lastName: DBConnector.getVertexPropertySafe(vertexProperties, 'lastName'),
                gender: DBConnector.getVertexPropertySafe(vertexProperties, 'gender'),
                pronouns: DBConnector.getVertexPropertySafe(vertexProperties, 'pronouns'),
                link: DBConnector.getVertexPropertySafe(vertexProperties, 'link'),
                isFollowed: false
            };
            profileMap.set(DBConnector.getVertexPropertySafe(vertexProperties, 'userName'), profile);
        }

        // Get followers for each userId
        const __ = DBConnector.__();
        const followersResult = await graph.V(userIds)
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
        if (followersResult) {
            for (const result of followersResult) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const map = result as Map<any, any>;
                for (const entry of map) {
                    const key = entry[0];
                    const followers: ProfileWithFollowStatus[] = [];
                    for (const user of entry[1]) {
                        const vertexProperties = user.properties;
                        const profile: ProfileWithFollowStatus = {
                            profileId: DBConnector.getVertexPropertySafe(vertexProperties, 'profileId'),
                            bio: DBConnector.getVertexPropertySafe(vertexProperties, 'bio'),
                            pfp: DBConnector.getVertexPropertySafe(vertexProperties, 'pfp'),
                            userId: user.id,
                            userName: DBConnector.getVertexPropertySafe(vertexProperties, 'userName'),
                            firstName: DBConnector.getVertexPropertySafe(vertexProperties, 'firstName'),
                            lastName: DBConnector.getVertexPropertySafe(vertexProperties, 'lastName'),
                            gender: DBConnector.getVertexPropertySafe(vertexProperties, 'gender'),
                            pronouns: DBConnector.getVertexPropertySafe(vertexProperties, 'pronouns'),
                            link: DBConnector.getVertexPropertySafe(vertexProperties, 'link'),
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
                    if (follower.userId === userId) {
                        value.isFollowed = true;
                        break;
                    }
                }
            }
            returnData[value.userId] = value;
        }

        return handleSuccess(ctx, returnData);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting profiles");
    }
};