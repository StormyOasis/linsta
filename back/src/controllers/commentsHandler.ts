import { Context } from "koa";
import Metrics from "../metrics/Metrics";
import { getPostById, sanitize } from "../utils/utils";
import logger from "../logger/logger";
import { insertComment } from "../Connectors/ESConnector";

type AddCommentRequest = {
    text: string;
    postId: string;
    userName: string;
    userId: string;
    parentCommentId: string|null;
};

export const addComment = async (ctx: Context) => {
    Metrics.increment("comments.addComment");

    const data = <AddCommentRequest>ctx.request.body;

    if (data.text == null || data.postId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    try {
        // First grab the post data from redis / ES so we can check the comments disabled flag
        const post = await getPostById(data.postId);
        if(post === null) {
            throw new Error("Error getting post");
        }

        // Make sure that commenting is enabled for this post
        if(post.global.commentsDisabled) {
            ctx.status = 400;
            ctx.body = { status: "Comments disabled for this post" };    
            return;
        }

        const commentData = {
            dateTime: new Date(),
            text: sanitize(data.text),
            user: {
                userName: data.userName,
                userId: data.userId
            },
            parent: {
                postId: data.postId,
                commentId: data.parentCommentId
            },
            likes: {}
        };

        const result = await insertComment(commentData);
        if(result.result !== 'created') {
            throw new Error("Error adding comment");
        }        

        ctx.status = 200;
    } catch(err) {
        logger.error(err);
        ctx.status = 400;
        ctx.body = { status: err };
        return;        
    }
}