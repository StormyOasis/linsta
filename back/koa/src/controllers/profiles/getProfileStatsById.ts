import { DBConnector, EDGE_USER_FOLLOWS, EDGE_USER_TO_POST, logger, metrics, withMetrics } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";

type GetProfileStatsByIdRequest = {
    userId: string;
};

type ProfileStats = {
    postCount: number;
    followerCount: number;
    followingCount: number;
};
export const handler = async (ctx: Context) => {
    const baseMetricsKey = "profiles.getprofilestatsbyid";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { userId } = <GetProfileStatsByIdRequest>ctx.request.body;

    if (!userId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        const stats: ProfileStats = {
            postCount: 0,
            followerCount: 0,
            followingCount: 0
        };

        const graph = await DBConnector.getGraph();

        // Get the number of posts by the user
        const postResult = await graph.V(userId)
            .outE(EDGE_USER_TO_POST)
            .count()
            .next();

        if(postResult == null || postResult.value === null) {
            return handleValidationError(ctx, "Error getting post count"); 
        }
                
        stats.postCount = postResult.value;

        // Get the number of users this profile is following
        const followingResult = await graph.V(userId)
            .outE(EDGE_USER_FOLLOWS)
            .count()
            .next();

        if(followingResult == null || followingResult.value === null) {
            return handleValidationError(ctx, "Error getting following count"); 
        }

        stats.followingCount = followingResult.value;

        // Get the number of users following this user
        const followerResult = await graph.V(userId)
            .inE(EDGE_USER_FOLLOWS)
            .count()
            .next();

        if(followerResult == null || followerResult.value === null) {
            return handleValidationError(ctx, "Error getting follower count"); 
        }    

        stats.followerCount = followerResult.value;

        return handleSuccess(ctx, stats);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting stats");
    }
};