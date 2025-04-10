import {Client} from '@elastic/elasticsearch';
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";
import config from 'config';
import { Entry, User, Global, Post } from '../utils/types';
import fs from 'fs';
import { ClusterHealthResponse, IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';

export default class ESConnector {
    private static instance: ESConnector | null = null;

    private client:Client | null = null; 

    private metricsInterval: NodeJS.Timeout | null;


    private constructor() {    
        this.client = new Client({
            node: config.get("es.node"),
            auth: {
                apiKey: config.get("es.apiKey")
            },
            tls: {
                ca: fs.readFileSync( "/usr/share/es/certs/ca.crt" ),
            }
        });
        
        const timeout: number = config.get("es.metricsIntervalMs") as number;

        this.metricsInterval = setInterval(async (connector: ESConnector) => {
            if (connector === null || connector.getClient() === null) {
                return;
            }

            const health:ClusterHealthResponse|undefined = await connector.client?.cluster.health();
            const stats:IndicesStatsResponse|undefined = await connector.client?.indices.stats();
            if(health && stats) {
                Metrics.gauge('es.cluster_status', Metrics.mapEsStatus(health.status));                                
                Metrics.gauge('es.number_of_nodes', health.number_of_nodes);
                Metrics.gauge('es.active_primary_shards', health.active_primary_shards);
                Metrics.gauge('es.active_shards', health.active_shards);            
                Metrics.gauge('es.task_max_waiting_in_queue_millis', health.task_max_waiting_in_queue_millis);           
                Metrics.gauge('es.number_of_pending_tasks', health.number_of_pending_tasks);
                Metrics.gauge('es.total_docs_count', stats._all.total?.docs?.count || -1);    
                Metrics.gauge('es.unassigned_shards', health?.unassigned_shards || 0);                         
            }

        }, timeout, this);            
    }

    public static getInstance(): ESConnector {
        if (!ESConnector.instance) {            
            ESConnector.instance = new ESConnector();
        }

        return ESConnector.instance;
    }

    public getClient = ():(Client | null) => {
        return this.client;
    }    

    public search = async (query: object, resultSize: number|null) => {
        const size: number = resultSize ? resultSize : config.get("es.defaultResultSize");        
        
        const result = await this.client?.search({
            index: config.get("es.mainIndex"),
            query,
            size,
            sort: [
                {
                  "post.global.dateTime": {
                    "nested" : {
                      "path": "post.global"
                    }
                  }
                }
              ]
        }, { meta: true});

        return result;
    }
    
    public searchWithPagination = async (query: object, resultSize?: number|null) => {
        const size: number = resultSize ? resultSize : config.get("es.defaultMediaPaginationSize");
    
        const result = await this.client?.search({
            index: config.get("es.mainIndex"),
            body: query,
            size,
        }, { meta: true});
    
        return result;
    }
    
    public count = async (query: object) => {
        const result = await this.client?.count({
            index: config.get("es.mainIndex"),
            query,
        }, { meta: true});
    
        return result;
    }
    
    public searchProfile = async (query: object, resultSize: number|null) => {
        const size: number = resultSize ? resultSize : config.get("es.defaultResultSize");
    
        const result = await this.client?.search({
            index: config.get("es.profileIndex"),
            query,
            size,
        }, { meta: true});
    
        return result;
    }
    
    public countProfile = async (query: object) => {
        const result = await this.client?.count({
            index: config.get("es.profileIndex"),
            query,
        }, { meta: true});
    
        return result;
    }
    
    public insert = async (dataSet: object) => {
        const result = await this.client?.index({
            index: config.get("es.mainIndex"),
            document: dataSet
        });
    
        return result;
    }
    
    public insertProfile = async (dataSet: object) => {
        const result = await this.client?.index({
            index: config.get("es.profileIndex"),
            document: dataSet
        });
    
        return result;
    }
    
    public update = async (id: string, script?: object, body?: object) => {
        const result = await this.client?.update({
            index: config.get("es.mainIndex"),
            id,
            script,
            body
        });
        return result;
    }
    
    public updateProfile = async (id: string, script?: object, body?: object) => {
        const result = await this.client?.update({
            index: config.get("es.profileIndex"),
            id,
            script,
            body
        });
        return result;
    }
    
    public close = async () => {                
        this.metricsInterval && clearInterval(this.metricsInterval);
        await this.client?.close();
        ESConnector.instance = null;
        this.client = null;
    }
}

export const buildDataSetForES = (user:User, global:Global, entries:Entry[]):object => {
    const dataSet = {
        user: {
            userId: user.userId,
            userName: user.userName,
            pfp: user.pfp
        },
        global: {
            dateTime: new Date(),
            captionText: global.captionText,
            commentsDisabled: global.commentsDisabled,
            likesDisabled: global.likesDisabled,
            locationText: global.locationText,
            likes: global.likes || []                          
        },
        media: entries.map((entry) => {return {
            altText: entry.alt,
            entityTag: entry.entityTag,
            id: entry.id,
            mimeType: entry.mimeType,
            path: entry.url,
            postId: entry.postId,
            userId: entry.userId
        }})
    };

    return dataSet;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildSearchResultSet = (hits: any[]):Post[] => {    
    const results:Post[] = hits.map((entry):Post => {
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
                likes: []
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            media: source.media.map((media:any) => {
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