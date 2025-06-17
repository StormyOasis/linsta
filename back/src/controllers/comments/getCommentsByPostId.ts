import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, {
    EDGE_CHILD_TO_PARENT_COMMENT, EDGE_COMMENT_LIKED_BY_USER,
    EDGE_COMMENT_TO_USER,
    EDGE_POST_TO_COMMENT
} from '../../connectors/DBConnector';
import { getVertexPropertySafe, handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { Comment, Like, RequestWithRequestorId, User } from '../../utils/types';

interface GetCommentsByPostIdRequest extends RequestWithRequestorId {
    postId: string;
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "comments.getcomment";
    return await withMetrics(baseMetricsKey, event, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: GetCommentsByPostIdRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params");
    }

    if (!data.postId) {
        return handleValidationError("Invalid params");
    }

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }

    try {
        const __ = DBConnector.__();

        const results = await (await DBConnector.getGraph()).V(data.postId)
            .as("post")
            .out(EDGE_POST_TO_COMMENT)
            .as("comment")
            .union(
                __.local(
                    __.union(
                        __.local(__.union(__.identity().project("comment").by(), __.out(EDGE_COMMENT_TO_USER).project("user").by())),
                        __.outE(EDGE_COMMENT_TO_USER).project(EDGE_COMMENT_TO_USER).by())),
                __.outE(EDGE_CHILD_TO_PARENT_COMMENT)
                    .project(EDGE_CHILD_TO_PARENT_COMMENT).by())
            .dedup()
            .toList();

        if (!results) {
            return handleValidationError("Error getting comment");
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
                    dateTime: getVertexPropertySafe(vertexProperties, 'dateTime'),
                    text: getVertexPropertySafe(vertexProperties, 'text'),
                    user: {
                        userName: "",
                        userId: "",
                        pfp: ""
                    },
                    postId: data.postId,
                    parentCommentId: null,
                    likes: []
                };
                commentMap.set(newComment.commentId, newComment);
            } else if (map.has("user")) {
                const vertex = map.get("user");
                const vertexProperties = vertex['properties'];
                const newUser: User = {
                    userName: getVertexPropertySafe(vertexProperties, 'userName'),
                    userId: vertex['id'],
                    pfp: getVertexPropertySafe(vertexProperties, 'pfp')
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
            if (userId == null) {
                return handleValidationError("Invalid comment data");
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
                postId: data.postId,
                parentCommentId: parentId,
                likes: await (async (): Promise<Like[]> => {
                    // Get the likes for this comment from the db
                    const results = await (await DBConnector.getGraph()).V(commentId)
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
                            userName: getVertexPropertySafe(vertexProperties, 'userName'),
                            pfp: getVertexPropertySafe(vertexProperties, 'pfp'),
                            firstName: getVertexPropertySafe(vertexProperties, 'firstName'),
                            lastName: getVertexPropertySafe(vertexProperties, 'lastName'),
                            profileId: getVertexPropertySafe(vertexProperties, 'profileId'),
                        };

                        likes.push(like);
                    }
                    return likes;
                })()
            };

            comments.push(newComment);
        }

        return handleSuccess(comments);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error getting comment");
    }
};