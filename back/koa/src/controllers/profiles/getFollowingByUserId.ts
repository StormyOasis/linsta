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

type GetFollowingByUserIdRequest = {
    userId: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "profiles.getfollowingbyid";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { userId } = <GetFollowingByUserIdRequest>ctx.request.body;

    if (!userId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        const __ = DBConnector.__();
        const results = await (await DBConnector.getGraph()).V(userId)
            .hasLabel('User')
            .group()
            .by("userName")
            .by(
                __.out(EDGE_USER_FOLLOWS)
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

        if (!results) {
            return handleSuccess(ctx, []);
        }

        const following: ProfileWithFollowStatus[] = [];
        for (const result of results) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map: Map<any, any> = (result as Map<any, any>);
            for (const entry of map) {
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
                        isFollowed: true
                    };

                    following.push(profile);
                }
            }
        }

        return handleSuccess(ctx, following);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting following users");
    }
};