import { Context } from "koa";
import config from 'config';
import Metrics from "../metrics/Metrics";
import { getPfpByUserId, handleValidationError, isHashtag } from "../utils/utils";
import ESConnector from "../Connectors/ESConnector";
import { Like, PostWithCommentCount } from "../utils/types";
import logger from "../logger/logger";
import DBConnector, { EDGE_POST_TO_COMMENT, EDGE_USER_LIKED_POST } from "../Connectors/DBConnector";

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

const buildPostSortClause = () => [
    {
        "global.dateTime": {
            order: "asc",
            nested: { path: "global" },
            mode: "min"
        }
    },
    {
        "media.postId": {
            order: "asc",
            nested: { path: "media" },
            mode: "min"
        }
    }
];

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

        // Data needed for pagination in ES
        if (data.dateTime != null && data.postId != null) {
            query.search_after = [data.dateTime, data.postId];
        }

        const resultSize = config.get<number>("es.defaultPaginationSize");
        const results = await ESConnector.getInstance().searchWithPagination(query, resultSize);

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const entry = hit._source as any;
            const postId = entry.media[0].postId;
            posts[postId] = entry;
            posts[postId].postId = postId;
            posts[postId].user.pfp = await getPfpByUserId(posts[postId].user.userId);

            postIds.push(postId);
        }

        // Get the pagination data
        const sort = hits[hits.length - 1].sort || [];

        response.dateTime = sort[0];
        response.postId = sort[1];
        response.done = hits.length < resultSize; // End of pagination

        // Now update the posts' return values by adding all the likes and just the comment counts

        // Get the per post comment counts first
        const __ = DBConnector.__();
        const commentResults = await DBConnector.getGraph().V(postIds)
            .project("postId", "commentCount")
            .by(__.id())
            .by(__.outE(EDGE_POST_TO_COMMENT).count())
            .toList();

        for (const result of commentResults) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const postMap: Map<string, any> = result as Map<string, any>;
            const commentCount = postMap.get?.("commentCount");
            const postId = postMap.get?.("postId");
            posts[postId].commentCount = commentCount;
        }

        // Get all posts' likes
        const likeResults = await DBConnector.getGraph().V(postIds)
            .filter(__.inE(EDGE_USER_LIKED_POST).count().is(DBConnector.P().gt(0)))
            .project("postId", "users")
            .by(__.id())
            .by(__.inE(EDGE_USER_LIKED_POST)
                .outV()
                .project('profileId', 'userName', 'pfp', 'firstName', 'lastName', 'id')
                .by("profileId")
                .by("userName")
                .by("pfp")
                .by("firstName")
                .by("lastName")
                .by(__.id())
                .fold()
            ).toList();

        for (const result of likeResults) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const postMap: Map<string, any> = result as Map<string, any>;
            const postId = postMap.get("postId");
            const users = postMap.get("users");

            // Make sure that the postId found in DB matches one
            // from the above ES query. They could be out of sync due to pagination
            if (posts[postId] == null) {
                continue;
            }

            const post: PostWithCommentCount = (posts[postId] as PostWithCommentCount);
            post.global.likes = post.global.likes || [];

            for (const user of users) {
                const newLike: Like = {
                    userName: user.get("userName"),
                    userId: user.get("id"),
                    profileId: user.get("profileId"),
                    firstName: user.get("firstName"),
                    lastName: user.get("lastName"),
                    pfp: user.get("pfp")
                };
                post.global.likes.push(newLike);
            }
        }

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