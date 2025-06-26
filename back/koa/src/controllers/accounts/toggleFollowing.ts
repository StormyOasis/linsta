import { DBConnector, EDGE_USER_FOLLOWS, logger, metrics, RequestWithRequestorId, withMetrics } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";

interface FollowingType extends RequestWithRequestorId {
    userId: string;
    followId: string;
    follow: boolean;
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "accounts.togglefollowing";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const {userId, followId, follow, requestorUserId} = <FollowingType>ctx.request?.body;

    if (!userId || !followId || typeof follow !== 'boolean') {
        return handleValidationError(ctx, "Missing or invalid parameters");
    }

    try {        
        await DBConnector.beginTransaction();
        const graph = await DBConnector.getGraph(true);

        if (follow) {
            // Adding a new follower
            const result = await graph.V(userId)
                .as("user_id")
                .V(followId)
                .as("follow_id")
                .addE(EDGE_USER_FOLLOWS)
                .from_('user_id')
                .to('follow_id')
                .next();

            if (!result?.value) {
                await DBConnector.rollbackTransaction();
                return handleValidationError(ctx, "Error following user");
            }
        } else {
            // Unfollow the given follower
            await graph.V(userId)
                .outE(EDGE_USER_FOLLOWS)
                .where(DBConnector.__().inV().hasId(followId))
                .drop()
                .next();
        }

        await DBConnector.commitTransaction();
        return handleSuccess(ctx, { status: "OK" });
        
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        await DBConnector.rollbackTransaction();
        return handleValidationError(ctx, "Error changing following status");
    }
};