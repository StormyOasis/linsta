import { DBConnector, EDGE_COMMENT_LIKED_BY_USER, EDGE_USER_LIKED_COMMENT, logger, metrics, withMetrics, type RequestWithRequestorId } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError, verifyJWT } from "../../utils";


interface LikeRequest extends RequestWithRequestorId {
    commentId: string;
    userId: string;
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "comments.togglelike";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { commentId, userId } = <LikeRequest>ctx.request?.body;

    if (!commentId || !userId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    if (!verifyJWT(ctx, () => {})) {
        // 403 - Forbidden
        return handleValidationError(ctx, "You do not have permission to access this data", 403);
    }

    try {
        const __ = DBConnector.__();
        await DBConnector.beginTransaction();
        const graph = await DBConnector.getGraph(true);

        // Check if user currently likes this comment
        const isLikedResults = await graph.V(commentId)
            .as("comment")
            .outE(EDGE_COMMENT_LIKED_BY_USER)
            .filter(__.inV().hasId(userId))
            .toList();

        if (!isLikedResults) {
            await DBConnector.rollbackTransaction();
            return handleValidationError(ctx, "Error getting like status");
        }

        const alreadyLiked = (isLikedResults?.length ?? 0) > 0;

        // Update the graph adding or removing edges as necessary
        if (alreadyLiked) {
            // drop the edges
            let results = await graph.V(commentId)
                .as("comment")
                .outE(EDGE_COMMENT_LIKED_BY_USER)
                .filter(__.inV().hasId(userId))
                .drop()
                .toList();

            if (!results || results.length === 0) {
                await DBConnector.rollbackTransaction();
                return handleValidationError(ctx, "Error changing like status");
            }

            results = await graph.V(userId)
                .as("user")
                .outE(EDGE_USER_LIKED_COMMENT)
                .filter(__.inV().hasId(commentId))
                .drop()
                .toList();

            if (!results || results.length === 0) {
                await DBConnector.rollbackTransaction();
                return handleValidationError(ctx, "Error changing like status");
            }
        } else {
            // add the edges
            const results = await graph.V(commentId)
                .as("comment")
                .V(userId)
                .as("user")
                .addE(EDGE_COMMENT_LIKED_BY_USER)
                .from_("comment")
                .to("user")
                .addE(EDGE_USER_LIKED_COMMENT)
                .from_("user")
                .to("comment")
                .toList();

            if (!results || results.length === 0) {
                await DBConnector.rollbackTransaction();
                return handleValidationError(ctx, "Error changing like status");
            }
        }

        await DBConnector.commitTransaction();
        return handleSuccess(ctx, { liked: !alreadyLiked });
    } catch (err) {
        await DBConnector.rollbackTransaction();
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error changing like status");
    }
};