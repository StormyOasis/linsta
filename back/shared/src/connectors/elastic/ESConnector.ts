import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';

import logger from "../../logger";
import config from '../../config';
import { Post } from '../../types';
import { IndexService } from './IndexService';

export default class ESConnector {
    private static client: Client|null = null;

    private constructor() {
    }

    public static getClient = (): Client => {
        logger.info(path.resolve(__dirname, '../../../certs/ca.crt'));
        if(!this.client) {
            logger.info("Connecting to ElasticSearch...");
            this.client = new Client({
                node: config.es.node,
                auth: {                
                    apiKey: config.es.apiKey                
                },
                tls: {
                    rejectUnauthorized: false,
                    ca: fs.readFileSync(path.resolve(__dirname, '../../../certs/ca.crt')),
                }
            });
            logger.info("Built ElasticSearch client");
        }
        return this.client;
    }

    public static close = async () => {
        await this.client?.close();
        this.client = null;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildSearchResultSet = (hits: any[]): Post[] => {
    const results: Post[] = hits.map((entry): Post => {
        const source = entry._source;
        return {
            postId: "",
            user: {
                userId: source.user.userId,
                userName: source.user.userName,
                pfp: ""
            },
            global: {
                id: entry._id,
                dateTime: source.global.dateTime,
                captionText: source.global.captionText,
                commentsDisabled: source.global.commentsDisabled,
                likesDisabled: source.global.likesDisabled,
                locationText: source.global.locationText,
                commentCount: 0,
                likes: [],
                collaborators: source.global.collaborators || []
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            media: source.media.map((media: any) => {
                return {
                    altText: media.altText,
                    id: media.id,
                    mimeType: media.mimeType,
                    path: media.path,
                    postId: media.postId,
                    userId: media.userId
                }
            })
        }
    });

    return results;
}

export const buildPostSortClause = () => [
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

export const updatePostIdInES = async (esId: string, postId: string): Promise<void> => {
    const script = {
        params: { postId },
        lang: "painless",
        source: 
        `
            for (int i = 0; i < ctx._source.media.size(); i++) {
                ctx._source.media[i].postId = params.postId;
            }
        `
    };

    await ESConnector.getClient().update({
        index: config.es.mainIndex,
        id: esId,
        script,
        _source: false
    });
}