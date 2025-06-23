import { Context } from "koa";
import { handleSuccess, handleValidationError, verifyJWT } from "../../utils";
import { 
    DBConnector, 
    EDGE_CHILD_TO_PARENT_COMMENT, 
    EDGE_COMMENT_LIKED_BY_USER, 
    EDGE_COMMENT_TO_USER, 
    EDGE_POST_TO_COMMENT, 
    logger, 
    metrics, 
    withMetrics 
} from "@linsta/shared";
import type {Like, RequestWithRequestorId, Comment, User} from "@linsta/shared";


interface GetCommentsByPostIdRequest extends RequestWithRequestorId {
    postId: string;
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "comments.getcomments";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { postId } = <GetCommentsByPostIdRequest>ctx.request?.body;

    if (!postId) {
        return handleValidationError(ctx, "Invalid params");
    }

    if (!verifyJWT(ctx, () => { })) {
        // 403 - Forbidden
        return handleValidationError(ctx, "You do not have permission to access this data", 403);
    }

    try {
        const __ = DBConnector.__();
        const graph = await DBConnector.getGraph();

        // Find all the comment related data
        const results = await graph.V(postId)
            .out(EDGE_POST_TO_COMMENT)
            .as("comment")
            .union(
                __.local(
                    __.union(
                        __.identity().project("comment").by(),
                        __.out(EDGE_COMMENT_TO_USER).project("user").by()
                    )
                ),
                __.outE(EDGE_COMMENT_TO_USER).project(EDGE_COMMENT_TO_USER).by(),
                __.outE(EDGE_CHILD_TO_PARENT_COMMENT).project(EDGE_CHILD_TO_PARENT_COMMENT).by()
            )
            .dedup()
            .toList();

        if (results == null) {
            return handleValidationError(ctx, "Error finding comments");
        } else if(results?.length === 0) {
            return handleSuccess(ctx, []);
        }

        const commentMap: Map<string, Comment> = new Map<string, Comment>();
        const userMap: Map<string, User> = new Map<string, User>();
        const userFromCommentMap: Map<string, string> = new Map<string, string>();
        const childToParentMap: Map<string, string> = new Map<string, string>();

        // Store the results of the query so we can build out the comments list
        for (const result of results) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map: Map<any, any> = (result as Map<any, any>);

            if (map.has("comment")) {
                const vertex = map.get("comment");
                const vertexProperties = vertex['properties'];
                const newComment: Comment = {
                    commentId: vertex['id'],
                    dateTime: DBConnector.getVertexPropertySafe(vertexProperties, 'dateTime'),
                    text: DBConnector.getVertexPropertySafe(vertexProperties, 'text'),
                    user: {
                        userName: "",
                        userId: "",
                        pfp: ""
                    },
                    postId: postId,
                    parentCommentId: null,
                    likes: []
                };
                commentMap.set(newComment.commentId, newComment);
            } else if (map.has("user")) {
                const vertex = map.get("user");
                const vertexProperties = vertex['properties'];
                const newUser: User = {
                    userName: DBConnector.getVertexPropertySafe(vertexProperties, 'userName'),
                    userId: vertex['id'],
                    pfp: DBConnector.getVertexPropertySafe(vertexProperties, 'pfp')
                };
                userMap.set(newUser.userId, newUser);
            } else if (map.has(EDGE_COMMENT_TO_USER)) {
                const edge = map.get(EDGE_COMMENT_TO_USER);
                userFromCommentMap.set(edge.outV.id, edge.inV.id);
            } else if (map.has(EDGE_CHILD_TO_PARENT_COMMENT)) {
                const edge = map.get(EDGE_CHILD_TO_PARENT_COMMENT);
                childToParentMap.set(edge.outV.id, edge.inV.id);
            }
        }

        // Merge the 4 maps into one comment list object
        const comments: Comment[] = [];
        for (const [commentId, tmpComment] of commentMap.entries()) {
            // Get the user data for the comment
            const userId = userFromCommentMap.get(commentId);
            if (!userId) {
                return handleValidationError(ctx, "Invalid comment data");
            }
            const user: User = userMap.get(userId) as User;

            // Get the parent mapping for the comment
            const parentId: string | null | undefined = childToParentMap.get(commentId) || null;

            const newComment: Comment = {
                commentId,
                dateTime: tmpComment.dateTime,
                text: tmpComment.text,
                user: {
                    userName: user.userName,
                    userId: user.userId,
                    pfp: user.pfp
                },
                postId: postId,
                parentCommentId: parentId,
                likes: await (async (): Promise<Like[]> => {
                    // Get the likes for this comment from the db
                    const results = await graph.V(commentId)
                        .out(EDGE_COMMENT_LIKED_BY_USER)
                        .project("user")
                        .by()
                        .toList();

                    if (!results) {
                        return [];
                    }

                    const likes: Like[] = [];
                    for (const result of results) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const map: Map<any, any> = (result as Map<any, any>);
                        const vertex = map.get("user");
                        const vertexProperties = vertex['properties'];

                        const like: Like = {
                            userId: vertex.id,
                            userName: DBConnector.getVertexPropertySafe(vertexProperties, 'userName'),
                            pfp: DBConnector.getVertexPropertySafe(vertexProperties, 'pfp'),
                            firstName: DBConnector.getVertexPropertySafe(vertexProperties, 'firstName'),
                            lastName: DBConnector.getVertexPropertySafe(vertexProperties, 'lastName'),
                            profileId: DBConnector.getVertexPropertySafe(vertexProperties, 'profileId'),
                        };

                        likes.push(like);
                    }
                    return likes;
                })()
            };

            comments.push(newComment);
        }

        return handleSuccess(ctx, comments);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting comment");
    }
};