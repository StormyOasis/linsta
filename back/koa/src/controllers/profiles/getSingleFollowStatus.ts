import { DBConnector, EDGE_USER_FOLLOWS, logger, metrics, withMetrics } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";

type SingleFollowRequest = {
    userId: string;
    checkUserId: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "profiles.getsinglefollowstatus";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { userId, checkUserId } = <SingleFollowRequest>ctx.request.body;

    if (!userId || !checkUserId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        // Check if userId follows checkUserId
        const results = await (await DBConnector.getGraph())
            .V(userId)
            .outE(EDGE_USER_FOLLOWS)
            .inV()
            .hasId(checkUserId)
            .count()
            .next();

        if(results == null || results.value === null) {
            return handleValidationError(ctx, "Error getting follow status"); 
        }

        return handleSuccess(ctx, results.value === 1);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting followers");
    }
};