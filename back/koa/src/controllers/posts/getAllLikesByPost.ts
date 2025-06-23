import { getLikesByPost, logger, metrics, withMetrics } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";

type GetAllLikesByPostRequest = {
    postId: string
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "posts.getalllikesbyid";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const req = <GetAllLikesByPostRequest>ctx.request.query;
    const postId = req.postId;

    if (!postId || postId.trim().length === 0) {
        return handleValidationError(ctx, "Invalid post id");
    }

    try {
        const likes = await getLikesByPost(false, postId);
        return handleSuccess(ctx, likes);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting all likes");
    }
};