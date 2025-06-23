import { APIGatewayProxyEvent } from 'aws-lambda';

import {
    withMetrics,
    logger,
    handleSuccess,
    handleValidationError,
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
import { getIpFromEvent, verifyJWT } from '../../utils';

interface AddCommentRequest extends RequestWithRequestorId {
    text: string;
    postId: string;
    userName: string;
    userId: string;
    parentCommentId: string | null;
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "comments.addcomment";
    const ip = getIpFromEvent(event);
    
    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: AddCommentRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.text || !data.postId || !data.userId) {
        return handleValidationError("Invalid params passed");
    }

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }

    try {
        // First grab the post data from redis / DB so we can check the comments disabled flag
        const postById = await getPostByPostId(false, data.postId);
        if (postById === null) {
            return handleValidationError("Error getting post");
        }

        const post = postById.post;

        // Make sure that commenting is enabled for this post
        if (post.global.commentsDisabled) {
            return handleSuccess({ status: "Comments disabled for this post" });
        }
        
        await DBConnector.beginTransaction();

        // Add the comment data to the db only (Comments won't be searchable)
        const commentResult = await (await DBConnector.getGraph(true))
            .addV("Comment")
            .property("dateTime", new Date())
            .property("text", sanitize(data.text))
            .next();

        if (!commentResult?.value) {
            await DBConnector.rollbackTransaction();
            return handleValidationError("Error adding comment");
        }

        const commentId = commentResult.value.id;

        await Promise.all([
            DBConnector.createEdge(true, data.userId, commentId, EDGE_USER_TO_COMMENT, EDGE_COMMENT_TO_USER),
            DBConnector.createEdge(true, data.postId, commentId, EDGE_POST_TO_COMMENT, EDGE_COMMENT_TO_POST),
            data.parentCommentId ? 
                DBConnector.createEdge(true, data.parentCommentId, commentId, EDGE_PARENT_TO_CHILD_COMMENT, EDGE_CHILD_TO_PARENT_COMMENT) 
                : Promise.resolve()
        ]);

        await DBConnector.commitTransaction();

        return handleSuccess({ id: commentId });
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);        
        logger.error("Error adding comment", err);
        await DBConnector.rollbackTransaction();
        return handleValidationError("Error adding comment");
    }
};