import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import { addCommentCountsToPosts, addLikesToPosts, addPfpsToPosts, buildPostSortClause, handleSuccess, handleValidationError } from '../../utils/utils';
import { getESConnector } from '../../connectors/ESConnector';
import { PostWithCommentCount } from '../../utils/types';
import logger from '../../logger/logger';
import { isHashtag } from '../../utils/textUtils';
import config from '../../config';

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

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("search.getPostSearch");

    let data: GetAllPostsBySearchRequest;
    try {
        data = JSON.parse(event.body || '{}');
        
    } catch {
        return handleValidationError("Missing required search params");
    }

    if (!data.postId) {
        return handleValidationError("Missing required search params");
    }

    const term: string | null = data.q?.trim();
    const query = buildPostSearchQuery(term);

    try {
        const resultSize = config.es.defaultPaginationSize;
        const results = await getESConnector().searchWithPagination(query, data.dateTime, data.postId, resultSize);

        const response: GetAllPostsBySearchResponse = {
            posts: [],
            dateTime: "",
            postId: "",
            done: true,
            q: term
        };

        const hits = results?.hits?.hits || [];

        if (hits.length === 0) {
            return handleSuccess(response);
        }

        const posts: Record<string, PostWithCommentCount> = {};
        const postIds: string[] = [];

        for (const hit of hits) {
            const entry = hit._source as PostWithCommentCount;
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

        return handleSuccess(response);
    } catch (err) {
        logger.error("Search error", err);
        return handleValidationError("Error getting posts");
    }
};