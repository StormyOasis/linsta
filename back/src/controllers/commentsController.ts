import { Context } from "koa";
import Metrics from "../metrics/Metrics";
import { getPostById, sanitize } from "../utils/utils";
import { Comment, Like } from "../utils/types";
import logger from "../logger/logger";
import { insertComment, searchComment, update, updateComment } from "../Connectors/ESConnector";

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

        // Prepare to send new comment data to ES
        const commentData = {
            comment: {
                dateTime: new Date(),
                text: sanitize(data.text),
                postId: data.postId,
                parentCommentId: data.parentCommentId,
                user: {
                    userName: data.userName,
                    userId: data.userId
                },
                children: [],
                likes: []
            }
        };

        // Add comment to ES
        const result = await insertComment(commentData);
        if(result.result !== 'created') {
            throw new Error("Error adding comment");
        }

        // Update the comment count field in the post in ES
        await update(data.postId, {
            source: "ctx._source.post.global.commentCount++",
            lang: "painless"
        });    
        
        // Update the child comment list in the parent comment in ES (if comment is a child)
        if(data.parentCommentId != null) {
            await updateComment(data.parentCommentId, {
                source: "ctx._source.comment.children.add(params)",
                lang: "painless",
                params: {"childCommentId": result._id}
            });
        }

        ctx.status = 200;
        ctx.body = {id: result._id};
    } catch(err) {
        logger.error(err);
        ctx.status = 400;
        return;        
    }
}

type GetCommentsByPostIdRequest = {
    postId: string;
};

export const getCommentsByPostId = async (ctx: Context) => {
    Metrics.increment("comments.getCommentsByPostId");

    const data = <GetCommentsByPostIdRequest>ctx.request.body;

    if (data.postId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any = await searchComment({
            bool: {
                must: [{
                    nested: {
                        path: "comment",
                        query: {
                            bool: {
                                must: [
                                    { match: { "comment.postId": data.postId } }
                                ]
                            }
                        }
                    }
                }]
            }
        }, null);

        const comments:Comment[] = results.body.hits.hits.map((entry: any):Comment => {
            const comment: Comment = {
                commentId: entry._id,
                dateTime: entry._source.comment.dateTime,
                text: entry._source.comment.text,
                postId: entry._source.comment.postId,
                parentCommentId: entry._source.comment.parentCommentId,
                user: {
                    userName: entry._source.comment.user.userName,
                    userId: entry._source.comment.user.userId
                },
                children: entry._source.comment.children.map((comment: any) => {
                    return comment.childCommentId;
                }),
                likes: entry._source.comment.likes.map((like: any):Like => { 
                    return  {userName: like.userName, userId: like.userId};
                })
            };            
            return comment;
        });

        ctx.body = comments;
        ctx.status = 200;
    } catch(err) {
        logger.error(err);
        ctx.status = 400;
        return;        
    }
}

type LikeRequest = {
    commentId: string;
    userName: string;
    userId: number;
}

export const toggleCommentLike = async (ctx: Context) => {
    Metrics.increment("comments.toggleCommentLike");

    const data = <LikeRequest>ctx.request.body;

    if (data.commentId == null || data.userName == null || data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    let isLiked:boolean = false;

    try {
        // Check if user currently likes this comment
        const results = await searchComment(
            {
                bool: {
                    must: [
                        {
                            match: { _id: data.commentId }
                        },
                        {
                            nested: {
                                path: "comment.likes",
                                query: {
                                    bool: {
                                        must: [
                                            { match: { "comment.likes.userName": data.userName } }
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            }, 1);   

        isLiked = (results.body.hits.hits.length === 1);

        // Toggle the like in ES
        await updateComment(data.commentId, {
            source: "if(ctx._source.comment.likes.contains(params.newLikes)) {ctx._source.comment.likes.remove(ctx._source.comment.likes.indexOf(params.newLikes));} else {ctx._source.comment.likes.add(params.newLikes)}",
            lang: "painless",
            params: {
                newLikes: {userName: data.userName, userId: data.userId}
            }
        });

        ctx.body = {liked: !isLiked};
        ctx.status = 200;
    } catch(err) {        
        ctx.status = 400;
        return;
    }    
}