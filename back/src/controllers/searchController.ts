import { Context } from "koa";
import config from 'config';
import Metrics from "../metrics/Metrics";
import { addCommentCountsToPosts, addLikesToPosts, addPfpsToPosts, buildPostSortClause, handleValidationError } from "../utils/utils";
import ESConnector from "../Connectors/ESConnector";
import { PostWithCommentCount } from "../utils/types";
import logger from "../logger/logger";
import { isHashtag } from "../utils/textUtils";

type GetAllPostsBySearchRequest = {
    postId?: string;
    dateTime?: string;
    q: string;
};

type GetAllPostsBySearchResponse = {
    posts: PostWithCommentCount[];
    dateTime: string;
    postId: string;
    done: boolean;
    q: string;
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

export const getPostSearch = async (ctx: Context) => {
    Metrics.increment("search.getPostSearch");

    const data = ctx.request.body as GetAllPostsBySearchRequest;

    try {
        if (data.postId?.trim() === "") {
            return handleValidationError(ctx, "Missing required search params");
        }

        const term: string | null = data.q?.trim();
        const query = buildPostSearchQuery(term);

        const resultSize = config.get<number>("es.defaultPaginationSize");
        const results = await ESConnector.getInstance().searchWithPagination(query, data.dateTime, data.postId, resultSize);

        const response: GetAllPostsBySearchResponse = {
            posts: [],
            dateTime: "",
            postId: "",
            done: true,
            q: term
        }

        const hits = results?.body?.hits?.hits || [];

        if (hits.length === 0) {
            ctx.status = 200;
            ctx.body = response;
            return;
        }

        const posts: Record<string, PostWithCommentCount> = {};
        const postIds: string[] = [];

        for (const hit of hits) {
            const entry = hit._source as PostWithCommentCount;
            const postId = entry.media[0].postId;
            posts[postId] = {...entry, postId};

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
        response.done = hits.length < resultSize; // End of pagination?
        // Add the posts to the response
        response.posts = Object.values(posts);

        ctx.status = 200;
        ctx.body = response;

    } catch (err) {
        logger.error("Search error", err);
        return handleValidationError(ctx, "Error getting posts");
    }
}

export const getSuggestions = async (ctx: Context) => {
    Metrics.increment("search.getSuggestions");

    const q = ctx.query.q?.toString();

    if (!q) {
        return handleValidationError(ctx, "Missing required search params");
    }

    try {
        const result = await ESConnector.getInstance().getAllSuggestions(q);
        ctx.body = result;
        ctx.status = 200;
    } catch (err) {
        logger.error("Suggest error", err);
        ctx.status = 500;
        ctx.body = { error: 'An error occurred while performing the search.' };
    }
}