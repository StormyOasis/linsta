import ESConnector from './ESConnector';
import { withRetries } from './RetryWrapper';
import config from '../../config';
import { json } from 'stream/consumers';

export class SearchService {
    static async searchPosts(body: object, size?: number) {
        return withRetries(() =>
            ESConnector.getClient().search({
                index: config.es.mainIndex,
                size: size ?? config.es.defaultResultSize,
                sort: [
                    {
                        "global.dateTime": {
                            order: "asc",
                            nested: { path: "global" },
                            mode: "min"
                        }
                    }
                ],
                body
            })
        );
    }

    static async searchPostsWithPagination(body: object, dateTime?: string, postId?: string, size?: number) {
        if (dateTime && postId) {
            (body as any).search_after = [dateTime, postId];
        }

        return withRetries(() =>
            ESConnector.getClient().search({
                index: config.es.mainIndex,
                size: size ?? config.es.defaultPaginationSize,
                body
            })
        );
    }

    static async searchProfiles(body: object, size?: number) {    
        return withRetries(() =>
            ESConnector.getClient().search({
                index: config.es.profileIndex,
                size: size ?? config.es.defaultResultSize,
                body                
            })
        );
    }

    static async countPosts(query: object) {
        return withRetries(() =>
            ESConnector.getClient().count({
                index: config.es.mainIndex,
                query
            })
        );
    }

    static async countProfiles(query: object) {
        return withRetries(() =>
            ESConnector.getClient().count({
                index: config.es.profileIndex,
                query
            })
        );
    }
}
