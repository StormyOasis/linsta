import { Context } from "koa";
import Metrics from "../metrics/Metrics";
import logger from "../logger/logger";
import ESConnector from '../Connectors/ESConnector';
import { User, Global, Entry, Post, PostWithCommentCount, Like } from "../utils/types";
import RedisConnector from "../Connectors/RedisConnector";
import { handleValidationError } from "../utils/utils";

export const getSearch = async (ctx: Context) => {
    Metrics.increment("search.getSearch");

    const { q, search_after } = ctx.query;

    //const cacheKey = `search:${q}:${search_after || 'first'}`;
    //const cached = await getFromCache(cacheKey);
    //if (cached) {
    //  ctx.body = cached;
    //  return;
    //}


/*
    index: 'main',
    size: 10,
    sort: ['global.dateTime:desc', '_id'],
    search_after: search_after ? [search_after] : undefined,
    query: {
      bool: {
        should: [
          // Your combined query: autocomplete + fuzzy + MLT 
        ],
        minimum_should_match: 1
      }
    }
*/    

/*

const result = await es.search({
  index: 'main',
  size: 10,
  sort: ['global.dateTime:desc', '_id'],
  search_after: search_after: search_after ? [search_after] : undefined,
  query: {
    bool: {
      should: [
        // 📌 Autocomplete (Edge N-Gram)
        {
          nested: {
            path: 'global',
            query: {
              match: {
                'global.captionText': {
                  query: q,
                  operator: 'and',
                  boost: 3 // Autocomplete is strong match
                }
              }
            }
          }
        },
        {
          nested: {
            path: 'media',
            query: {
              match: {
                'media.altText': {
                  query: q,
                  operator: 'and',
                  boost: 2
                }
              }
            }
          }
        },

        // ✏️ Fuzzy Matching
        {
          nested: {
            path: 'global',
            query: {
              match: {
                'global.captionText': {
                  query: q,
                  fuzziness: 'AUTO',
                  boost: 1.5
                }
              }
            }
          }
        },
        {
          nested: {
            path: 'media',
            query: {
              match: {
                'media.altText': {
                  query: q,
                  fuzziness: 'AUTO',
                  boost: 1
                }
              }
            }
          }
        },

        // 🔎 More Like This
        {
          nested: {
            path: 'global',
            query: {
              more_like_this: {
                fields: ['global.captionText'],
                like: q,
                min_term_freq: 1,
                max_query_terms: 12,
                boost: 1.2
              }
            }
          }
        },
        {
          nested: {
            path: 'media',
            query: {
              more_like_this: {
                fields: ['media.altText'],
                like: q,
                min_term_freq: 1,
                max_query_terms: 12,
                boost: 1
              }
            }
          }
        }
      ],
      minimum_should_match: 1
    }
  }
});
*/


/*
    const response = {
        results: result.hits.hits.map((hit) => hit._source),
        next: result.hits.hits.length
            ? result.hits.hits[result.hits.hits.length - 1].sort
            : null
    };

    //await setToCache(cacheKey, response);

    ctx.body = response;*/
    ctx.status = 200;
}