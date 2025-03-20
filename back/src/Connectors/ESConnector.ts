import {Client} from '@elastic/elasticsearch';
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";
import config from 'config';
import { Entry, User, Global, Post } from '../utils/types';
import fs from 'fs';

const client = new Client({
    node: config.get("es.node"),
    auth: {
        apiKey: config.get("es.apiKey")
    },
    tls: {
        ca: fs.readFileSync( "/usr/share/es/certs/ca.crt" ),
    }
});

export const search = async (query: object, resultSize: number|null) => {
    const size: number = resultSize ? resultSize : config.get("es.defaultResultSize");

    const result = await client.search({
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

export const searchWithPagination = async (query: object, resultSize?: number|null) => {
    const size: number = resultSize ? resultSize : config.get("es.defaultMediaPaginationSize");

    const result = await client.search({
        index: config.get("es.mainIndex"),
        body: query,
        size,
    }, { meta: true});

    return result;
}

export const count = async (query: object) => {
    const result = await client.count({
        index: config.get("es.mainIndex"),
        query,
    }, { meta: true});

    return result;
}

export const searchProfile = async (query: object, resultSize: number|null) => {
    const size: number = resultSize ? resultSize : config.get("es.defaultResultSize");

    const result = await client.search({
        index: config.get("es.profileIndex"),
        query,
        size,
    }, { meta: true});

    return result;
}

export const countProfile = async (query: object) => {
    const result = await client.count({
        index: config.get("es.profileIndex"),
        query,
    }, { meta: true});

    return result;
}

export const insert = async (dataSet: object) => {
    const result = await client.index({
        index: config.get("es.mainIndex"),
        document: dataSet
    });

    return result;
}

export const insertProfile = async (dataSet: object) => {
    const result = await client.index({
        index: config.get("es.profileIndex"),
        document: dataSet
    });

    return result;
}

export const update = async (id: string, script?: object, body?: object) => {
    const result = await client.update({
        index: config.get("es.mainIndex"),
        id,
        script,
        body
    });
    return result;
}

export const updateProfile = async (id: string, script?: object, body?: object) => {
    const result = await client.update({
        index: config.get("es.profileIndex"),
        id,
        script,
        body
    });
    return result;
}

export const buildDataSetForES = (user:User, global:Global, entries:Entry[]):object => {
    const dataSet = {
        post: {
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
                locationText: global.locationText          
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
        }
    };

    return dataSet;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildSearchResultSet = (hits: any[]):Post[] => {    
    const results:Post[] = hits.map((entry):Post => {
        const source = entry._source.post;
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