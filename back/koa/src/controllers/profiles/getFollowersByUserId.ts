import { Context } from "koa";

import {
    DBConnector,
    EDGE_USER_FOLLOWS,
    logger,
    metrics,
    type ProfileWithFollowStatus,
    withMetrics
} from "@linsta/shared";

import {
    handleSuccess,
    handleValidationError
} from "../../utils";

type GetFollowersByUserIdRequest = {
    userId: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "profiles.getfollowersbyuserid";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { userId } = ctx.request.body as GetFollowersByUserIdRequest;

    if (!userId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        const __ = DBConnector.__();
        const graph = await DBConnector.getGraph();

        // Find the follower profiles from the specified user id
        const followerVertices = await graph.V(userId)
            .inE(EDGE_USER_FOLLOWS)  // Get all incoming 'user_follows' edges pointing to User1
            .outV()  // Get the vertices (users) who follow User1
            .where(__.not(__.hasId(userId)))  // Exclude User1 from the results            
            .toList();

        if (!followerVertices?.length) {
            return handleSuccess(ctx, []);
        }

        const profileMap: Map<string, ProfileWithFollowStatus> = new Map<string, ProfileWithFollowStatus>();
        const followerIds: string[] = [];
        for (const vertex of followerVertices) {
            const vertexProperties = (vertex as any).properties;
            const vertexId = (vertex as any).id;

            const profile: ProfileWithFollowStatus = {
                profileId: DBConnector.getVertexPropertySafe(vertexProperties, 'profileId'),
                bio: DBConnector.getVertexPropertySafe(vertexProperties, 'bio'),
                pfp: DBConnector.getVertexPropertySafe(vertexProperties, 'pfp'),
                userId: vertexId,
                userName: DBConnector.getVertexPropertySafe(vertexProperties, 'userName'),
                firstName: DBConnector.getVertexPropertySafe(vertexProperties, 'firstName'),
                lastName: DBConnector.getVertexPropertySafe(vertexProperties, 'lastName'),
                gender: DBConnector.getVertexPropertySafe(vertexProperties, 'gender'),
                pronouns: DBConnector.getVertexPropertySafe(vertexProperties, 'pronouns'),
                link: DBConnector.getVertexPropertySafe(vertexProperties, 'link'),
                isFollowed: false
            };

            followerIds.push(vertexId);
            profileMap.set(vertexId, profile);
        }

        // Now check which of those users userId is following back (mutuals)
        const mutualVertices = await graph.V(userId)
            .out(EDGE_USER_FOLLOWS)
            .filter(__.id().is(DBConnector.P().within(followerIds)))
            .dedup()
            .toList();

        for (const vertex of mutualVertices) {
            const profile: ProfileWithFollowStatus | undefined = profileMap.get((vertex as any).id);

            if (profile) {
                profile.isFollowed = true;
                profileMap.set(profile.userId, profile);
            }
        }

        const returnData: ProfileWithFollowStatus[] = Array.from(profileMap.values());
        return handleSuccess(ctx, returnData);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting followers");
    }
};