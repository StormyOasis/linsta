import { Context } from "koa";

import {
  buildPostSortClause,
  config,
  isHashtag,
  logger,
  metrics,
  SearchService,
  type Post,
  withMetrics
} from "@linsta/shared";

import {
  addCommentCountsToPosts,
  addLikesToPosts,
  addPfpsToPosts,
  handleSuccess,
  handleValidationError
} from "../../utils";

type GetAllPostsBySearchRequest = {
    postId?: string;
    dateTime?: string;
    q: string;
};

type GetAllPostsBySearchResponse = {
    posts: Post[];
    dateTime: string;
    postId: string;
    done: boolean;
    q: string | null;
};

const buildPostSearchQuery = (term: string | null): Record<string, unknown> => {
    if (!term || term.length === 0) {
        return {
            query: { match_all: {} },
            sort: buildPostSortClause()
        };
    }

    if (isHashtag(term)) {
        return {
            query: {
                term: {
                    "hashtags.raw": term
                }
            },
            sort: buildPostSortClause()
        };
    }

    const nestedFields = [
        "user.userName",
        "global.captionText",
        "global.locationText",
        "media.altText"
    ];

    const shouldQueries = nestedFields.map((field) => ({
        nested: {
            path: field.split(".")[0],
            query: {
                match_phrase_prefix: {
                    [field]: { query: term }
                }
            }
        }
    }));

    return {
        query: {
            bool: { should: shouldQueries }
        },
        sort: buildPostSortClause()
    };
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "search.getpostsearch";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { postId, dateTime, q } = <GetAllPostsBySearchRequest>ctx.request.body;
 
    const term: string | null = q?.trim();
    const query = buildPostSearchQuery(term);

    try {
        const resultSize = config.es.defaultPaginationSize;
        const results = await SearchService.searchPostsWithPagination(query, dateTime, postId, resultSize);

        const response: GetAllPostsBySearchResponse = {
            posts: [],
            dateTime: "",
            postId: "",
            done: true,
            q: term
        };

        const hits = results?.hits?.hits || [];

        if (!hits?.length) {
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
        response.done = hits.length < resultSize;
        response.posts = Object.values(posts);

        return handleSuccess(ctx, response);
    } catch (err) {
        logger.error("Search error", err);
        metrics.increment(`${baseMetricsKey}.errorCount`);        
        return handleValidationError(ctx, "Error getting posts");
    }
};