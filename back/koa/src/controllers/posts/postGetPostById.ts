import { getPostByPostId, logger, metrics, withMetrics } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";

type GetPostByIdRequest = {
    postId: string;
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "posts.getpostbyid";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { postId } = <GetPostByIdRequest>ctx.request.body;

    if (!postId) {
        return handleValidationError(ctx, "Error getting post");
    }

    try {
        const post = await getPostByPostId(false, postId);
        return handleSuccess(ctx, post);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting post");
    }
};