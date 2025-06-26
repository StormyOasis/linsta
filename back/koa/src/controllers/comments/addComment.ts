import {
    withMetrics,
    logger,
    sanitize,
    metrics,
    DBConnector,
    getPostByPostId,
    EDGE_CHILD_TO_PARENT_COMMENT,
    EDGE_COMMENT_TO_POST,
    EDGE_COMMENT_TO_USER,
    EDGE_PARENT_TO_CHILD_COMMENT,
    EDGE_POST_TO_COMMENT,
    EDGE_USER_TO_COMMENT
} from '@linsta/shared';

import type { RequestWithRequestorId } from '@linsta/shared';
import { handleSuccess, handleValidationError } from "../../utils";
import { Context } from 'koa';

interface AddCommentRequest extends RequestWithRequestorId {
    text: string;
    postId: string;
    userName: string;
    userId: string;
    parentCommentId: string | null;
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "comments.addcomment";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { postId, text, userName, userId, parentCommentId } = <AddCommentRequest>ctx.request?.body;

    if (!text || !postId || !userId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        // First grab the post data from redis / DB so we can check the comments disabled flag
        const postById = await getPostByPostId(false, postId);
        if (postById === null) {
            return handleValidationError(ctx, "Error getting post");
        }

        const post = postById.post;

        // Make sure that commenting is enabled for this post
        if (post.global.commentsDisabled) {
            return handleSuccess(ctx, { status: "Comments disabled for this post" });
        }
        
        await DBConnector.beginTransaction();

        // Add the comment data to the db only (Comments won't be searchable)
        const commentResult = await (await DBConnector.getGraph(true))
            .addV("Comment")
            .property("dateTime", new Date())
            .property("text", sanitize(text))
            .next();

        if (!commentResult?.value) {
            await DBConnector.rollbackTransaction();
            return handleValidationError(ctx, "Error adding comment");
        }

        const commentId = commentResult.value.id;

        await Promise.all([
            DBConnector.createEdge(true, userId, commentId, EDGE_USER_TO_COMMENT, EDGE_COMMENT_TO_USER),
            DBConnector.createEdge(true, postId, commentId, EDGE_POST_TO_COMMENT, EDGE_COMMENT_TO_POST),
            parentCommentId ? 
                DBConnector.createEdge(true, parentCommentId, commentId, EDGE_PARENT_TO_CHILD_COMMENT, EDGE_CHILD_TO_PARENT_COMMENT) 
                : Promise.resolve()
        ]);

        await DBConnector.commitTransaction();

        return handleSuccess(ctx, { id: commentId });
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);        
        logger.error("Error adding comment", err);
        await DBConnector.rollbackTransaction();
        return handleValidationError(ctx, "Error adding comment");
    }
};