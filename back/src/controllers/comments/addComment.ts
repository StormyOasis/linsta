import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import logger from '../../logger/logger';
import { getPostByPostId, handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import DBConnector, {
    EDGE_CHILD_TO_PARENT_COMMENT, EDGE_COMMENT_TO_POST, EDGE_COMMENT_TO_USER,
    EDGE_PARENT_TO_CHILD_COMMENT, EDGE_POST_TO_COMMENT, EDGE_USER_TO_COMMENT
} from '../../connectors/DBConnector';
import { sanitize } from '../../utils/textUtils';
import { RequestWithRequestorId } from '../../utils/types';

interface AddCommentRequest extends RequestWithRequestorId {
    text: string;
    postId: string;
    userName: string;
    userId: string;
    parentCommentId: string | null;
}

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("comments.addComment");

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
        const postById = await getPostByPostId(data.postId);
        if (postById === null) {
            return handleValidationError("Error getting post");
        }

        const post = postById.post;

        // Make sure that commenting is enabled for this post
        if (post.global.commentsDisabled) {
            return handleSuccess({ status: "Comments disabled for this post" });
        }

        // Add the comment data to the db only (Comments won't be searchable)
        await DBConnector.beginTransaction();

        let result = await(await DBConnector.getGraph(true))
            .addV("Comment")
            .property("dateTime", new Date())
            .property("text", sanitize(data.text))
            .next();

        if (!result?.value) {
            await DBConnector.rollbackTransaction();
            return handleValidationError("Error adding comment");
        }

        const commentId = result.value.id;

        // Edges between User and comment
        result = await(await DBConnector.getGraph(true)).V(commentId)
            .as("comment")
            .V(data.userId)
            .as("user")
            .addE(EDGE_COMMENT_TO_USER)
            .from_("comment")
            .to("user")
            .addE(EDGE_USER_TO_COMMENT)
            .from_("user")
            .to("comment")
            .next();

        if (!result?.value) {
            await DBConnector.rollbackTransaction();
            return handleValidationError("Error adding comment");
        }

        // Edges between comment and post
        result = await(await DBConnector.getGraph(true)).V(commentId)
            .as("comment")
            .V(data.postId)
            .as("post")
            .addE(EDGE_COMMENT_TO_POST)
            .from_("comment")
            .to("post")
            .addE(EDGE_POST_TO_COMMENT)
            .from_("post")
            .to("comment")
            .next();

        if (!result?.value) {
            await DBConnector.rollbackTransaction();
            return handleValidationError("Error adding comment");
        }

        // Edges between comment and another parent comment (if applicable)
        const parentCommentId: string = `${data.parentCommentId || ""}`;
        if (parentCommentId.length > 0) {
            result = await(await DBConnector.getGraph(true)).V(commentId)
                .as("comment")
                .V(parentCommentId)
                .as("parent")
                .addE(EDGE_CHILD_TO_PARENT_COMMENT)
                .from_("comment")
                .to("parent")
                .addE(EDGE_PARENT_TO_CHILD_COMMENT)
                .from_("parent")
                .to("comment")
                .next();

            if (!result?.value) {
                await DBConnector.rollbackTransaction();
                return handleValidationError("Error adding comment");
            }
        }

        await DBConnector.commitTransaction();

        return handleSuccess({ id: commentId });
    } catch (err) {
        await DBConnector.rollbackTransaction();
        logger.error("Error adding comment", err);
        return handleValidationError("Error adding comment");
    }
};