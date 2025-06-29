import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';

import logger from "../../logger";
import config from '../../config';
import metrics from '../../metrics';
import { Post } from '../../types';
import { IndexService } from './IndexService';
import { ClusterHealthResponse, IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';

export default class ESConnector {
    private static client: Client|null = null;
    private static metricsInterval: NodeJS.Timeout;

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

            // Metrics
            const timeout: number = config.es.metricsIntervalMs as number;

            this.metricsInterval = setInterval(async (connector: ESConnector) => {
                if (connector === null || ESConnector.client === null) {
                    return;
                }

                try {
                    const health: ClusterHealthResponse | undefined = await ESConnector.client?.cluster.health();
                    const stats: IndicesStatsResponse | undefined = await ESConnector.client?.indices.stats();
                    if (health && stats) {
                        metrics.gauge('es.cluster_status', metrics.mapEsStatus(health.status));
                        metrics.gauge('es.number_of_nodes', health.number_of_nodes);
                        metrics.gauge('es.active_primary_shards', health.active_primary_shards);
                        metrics.gauge('es.active_shards', health.active_shards);
                        metrics.gauge('es.task_max_waiting_in_queue_millis', health.task_max_waiting_in_queue_millis);
                        metrics.gauge('es.number_of_pending_tasks', health.number_of_pending_tasks);
                        metrics.gauge('es.total_docs_count', stats._all.total?.docs?.count || -1);
                        metrics.gauge('es.unassigned_shards', health?.unassigned_shards || 0);
                    }
                } catch (err) {
                    logger.error("Error getting ES Metrics", err);
                    metrics.gauge('es.cluster_status', metrics.mapEsStatus("red"));
                    metrics.gauge('es.number_of_nodes', 0);
                }

            }, timeout, this);            
        }
        return this.client;
    }

    public static close = async () => {
        clearInterval(ESConnector.metricsInterval);
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