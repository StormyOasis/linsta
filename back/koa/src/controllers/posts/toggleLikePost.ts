import { Context } from "koa";

import {
    DBConnector,
    EDGE_POST_LIKED_BY_USER,
    EDGE_USER_LIKED_POST,
    logger,
    metrics,
    withMetrics
} from "@linsta/shared";

import {
    handleSuccess,
    handleValidationError
} from "../../utils";

type LikeRequest = {
    postId: string;
    userId: string;
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "posts.togglelike";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { postId, userId } = <LikeRequest>ctx.request.body;

    if (!postId || !userId) {
        return handleValidationError(ctx, "Missing postId or userId");
    }

    let isLiked: boolean | undefined = false;

    try {
        const __ = DBConnector.__();

        await DBConnector.beginTransaction();
        const graph = await DBConnector.getGraph(true);

        // Check the graph to see if the user likes the post
        isLiked = await graph.V(userId)
            .out(EDGE_USER_LIKED_POST)
            .hasId(postId)
            .hasNext();

        if (isLiked) {
            // User currently likes this post, so unlike (remove edges)
            await Promise.all([
                graph.V(postId)
                    .outE(EDGE_POST_LIKED_BY_USER)
                    .filter(__.inV().hasId(userId))
                    .drop()
                    .iterate(),
                graph.V(userId)
                    .outE(EDGE_USER_LIKED_POST)
                    .filter(__.inV().hasId(postId))
                    .drop()
                    .iterate()
            ]);
        } else {
            // Like the post by adding the edges
            const result = await graph.V(postId)
                .as("post")
                .V(userId)
                .as("user")
                .addE(EDGE_POST_LIKED_BY_USER)
                .from_("post")
                .to("user")
                .addE(EDGE_USER_LIKED_POST)
                .from_("user")
                .to("post")
                .next();

            if (!result?.value) {
                await DBConnector.rollbackTransaction();
                return handleValidationError(ctx, "Error toggling like state");
            }
        }

        await DBConnector.commitTransaction();

        return handleSuccess(ctx, { liked: !isLiked });
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error("Failed to toggle like", { userId, postId, err });
        await DBConnector.rollbackTransaction();
        return handleValidationError(ctx, "Error toggling like state");
    }
};