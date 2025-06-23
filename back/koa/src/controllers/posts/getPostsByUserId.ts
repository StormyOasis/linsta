import { buildPostSortClause, config, logger, metrics, SearchService, withMetrics, type Post } from "@linsta/shared";
import { Context } from "koa";
import { addCommentCountsToPosts, addLikesToPosts, addPfpsToPosts, handleSuccess, handleValidationError, verifyJWT } from "../../utils";


type GetPostsByUserIdRequest = {
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

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "posts.getbyuserid";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { dateTime, postId, userId } = <GetPostsByUserIdRequest>ctx.request.body;

    if (!userId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    if (!verifyJWT(ctx, () => { })) {
        // 403 - Forbidden
        return handleValidationError(ctx, "You do not have permission to access this data", 403);
    }

    try {
        // Return a paginated list of the user's posts
        const query: Record<string, unknown> = {
            query: {
                nested: {
                    path: "media",
                    query: {
                        match: {
                            "media.userId": userId
                        }
                    }
                }
            },
            sort: buildPostSortClause()
        };

        const results = await SearchService.searchPostsWithPagination(query, dateTime, postId);

        const response: GetPostsByUserIdResponse = {
            posts: [],
            dateTime: "",
            postId: "",
            done: true
        };

        const hits = results?.hits?.hits || [];

        if (hits.length === 0) {
            return handleSuccess(ctx, response);
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

        return handleSuccess(ctx, response);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting posts");
    }
};