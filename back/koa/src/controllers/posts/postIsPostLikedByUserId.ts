import { DBConnector, EDGE_USER_LIKED_POST, logger, metrics, withMetrics } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";

type LikeRequest = {
    postId: string;
    userId: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "posts.islikedbyuserid";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { postId, userId } = <LikeRequest>ctx.request.body;

    if (!postId || !userId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        // Check the graph to see if the user likes the post
        const isLiked = await (await DBConnector.getGraph()).V(userId)
            .out(EDGE_USER_LIKED_POST)
            .hasId(postId)
            .hasNext();

        return handleSuccess(ctx, { liked: isLiked });
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting like state");
    }
};