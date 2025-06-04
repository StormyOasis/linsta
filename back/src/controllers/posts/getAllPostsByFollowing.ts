import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import config from '../../config';
import Metrics from '../../metrics/Metrics';
import logger from '../../logger/logger';
import { getESConnector } from '../../connectors/ESConnector';
import { addCommentCountsToPosts, addLikesToPosts, addPfpsToPosts, buildPostSortClause, getFollowingUserIds, handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { PostWithCommentCount, RequestWithRequestorId } from '../../utils/types';

interface GetAllPostsByFollowingRequest extends RequestWithRequestorId {
    dateTime?: string;
    postId?: string;
    userId: string;
}

type GetAllPostsByFollowingResponse = {
    posts: PostWithCommentCount[];
    dateTime: string;
    postId: string;
    done: boolean;
};

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("posts.getAllPostsByFollowing");

    let data: GetAllPostsByFollowingRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.userId) {
        return handleValidationError("Invalid params passed");
    }

    if (!verifyJWT(event, data.requestorUserId)) {
        // 403 - Forbidden
        return handleValidationError("You do not have permission to access this data", 403);
    }    

    try {
        const response: GetAllPostsByFollowingResponse = {
            posts: [],
            dateTime: "",
            postId: "",
            done: true
        };

        const followingIds: string[] = await getFollowingUserIds(data.userId);
        if (followingIds.length === 0) {
            return handleSuccess(response);
        }

        const query: Record<string, unknown> = {
            query: {
                nested: {
                  path: "user",
                  query: {
                    terms: {
                      "user.userId": followingIds
                    }
                  }
                }
            },
            sort: buildPostSortClause()
        };

        const resultSize: number = config.es.defaultPaginationSize;
        const results = await getESConnector().searchWithPagination(query, data.dateTime, data.postId, resultSize);

        const hits = results?.hits?.hits || [];
        if (hits.length === 0) {
            return handleSuccess(response);
        }

        const posts: Record<string, PostWithCommentCount> = {};
        const postIds: string[] = [];

        for (const hit of hits) {
            const entry = hit._source as PostWithCommentCount;
            if(entry.media?.length > 0) {
                const postId = entry.media[0].postId;
                posts[postId] = { ...entry, postId };
                postIds.push(postId);
            }
        }

        await Promise.all([
            addPfpsToPosts(posts),
            addCommentCountsToPosts(posts, postIds),
            addLikesToPosts(posts, postIds)
        ]);

        // Get the pagination data
        const sort = hits[hits.length - 1].sort || [];

        response.dateTime = sort[0];
        response.postId = sort[1];
        response.done = hits.length < resultSize;
        response.posts = Object.values(posts);

        return handleSuccess(response);
    } catch (err) {
        logger.error((err as Error).message);
        return handleValidationError("Error getting posts");
    }
};