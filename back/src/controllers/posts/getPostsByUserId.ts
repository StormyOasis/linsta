import { APIGatewayProxyEvent } from 'aws-lambda';
import config from '../../config';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import { getESConnector } from '../../connectors/ESConnector';
import { addCommentCountsToPosts, addLikesToPosts, addPfpsToPosts, buildPostSortClause, handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { Post, RequestWithRequestorId } from '../../utils/types';

interface GetPostsByUserIdRequest extends RequestWithRequestorId {
    userId: string;
    dateTime?: string;
    postId?: string;
}

type GetPostsByUserIdResponse = {
    posts: Post[];
    dateTime: string;
    postId: string;
    done: boolean;
};

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "posts.getbyuserid";
    return await withMetrics(baseMetricsKey, async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
        let data: GetPostsByUserIdRequest;
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
            // Return a paginated list of the user's posts
            const query: Record<string, unknown> = {
                query: {
                    nested: {
                        path: "media",
                        query: {
                            match: {
                                "media.userId": data.userId
                            }
                        }
                    }
                },
                sort: buildPostSortClause()
            };

            const results = await getESConnector().searchWithPagination(query, data.dateTime, data.postId);

            const response: GetPostsByUserIdResponse = {
                posts: [],
                dateTime: "",
                postId: "",
                done: true
            };

            const hits = results?.hits?.hits || [];

            if (hits.length === 0) {
                return {
                    statusCode: 200,
                    body: JSON.stringify(response),
                };
            }

            const posts: Record<string, Post> = {};
            const postIds: string[] = [];

            for (const hit of hits) {
                const entry = hit._source as Post;
                const postId = entry.media[0].postId;
                posts[postId] = { ...entry, postId };
                postIds.push(postId);
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
            response.done = hits.length < (config.es.defaultPaginationSize as number);
            response.posts = Object.values(posts);

            return handleSuccess(response);
        } catch (err) {
            Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
            logger.error((err as Error).message);
            return handleValidationError("Error getting posts");
        }
};