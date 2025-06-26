import { Context } from "koa";

import {
  config,
  logger,
  metrics,
  type Post,
  withMetrics,
  SearchService,
  buildPostSortClause
} from "@linsta/shared";

import {
  handleSuccess,
  handleValidationError,
  addLikesToPosts,
  addPfpsToPosts,
  addCommentCountsToPosts,
  getFollowingUserIds
} from "../../utils";

type GetAllPostsByFollowingRequest = {
    dateTime?: string;
    postId?: string;
    userId: string;
}

type GetAllPostsByFollowingResponse = {
    posts: Post[];
    dateTime: string;
    postId: string;
    done: boolean;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "posts.getallbyfollowing";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const {dateTime, postId, userId} = <GetAllPostsByFollowingRequest>ctx.request.body;

    if (!userId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        const response: GetAllPostsByFollowingResponse = {
            posts: [],
            dateTime: "",
            postId: "",
            done: true
        };

        const followingIds: string[] = await getFollowingUserIds(userId);
        if (followingIds.length === 0) {
            return handleSuccess(ctx, response);
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

        const resultSize: number = config.es.defaultPaginationSize || 10;
        const results = await SearchService.searchPostsWithPagination(query, dateTime, postId, resultSize);

        const hits = results?.hits?.hits || [];
        if (hits.length === 0) {
            return handleSuccess(ctx, response);
        }

        const posts: Record<string, Post> = {};
        const postIds: string[] = [];

        for (const hit of hits) {
            const entry = hit._source as Post;
            if (entry.media?.length > 0) {
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

        return handleSuccess(ctx, response);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting posts");
    }
};