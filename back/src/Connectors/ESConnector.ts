import {Client} from '@elastic/elasticsearch';
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";
import config from 'config';
import { Entry, User, Global } from '../controllers/postsController';
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

export const search = async () => {
    const result = await client.search({
        index: config.get("es.index"),
        query: {
            match_all: {}
        }
    }, { meta: true});

    return result;
}

export const insert = async (dataSet: object) => {
    const result = await client.index({
        index: config.get("es.index"),
        document: dataSet
    });

    return result;
}

export const buildDataSetForES = (user:User, global:Global, entries:Entry[]):object => {
    const dataSet = {
        user: {
            userId: user.id,
            userName: user.name
        },
        global: {
            dateTime: new Date(),
            captionText: global.text,
            commentsDisabled: global.commentsDisabled,
            likesDisabled: global.likesDisabled,
            locationText: global.locationText,
        },
        media: entries.map((entry) => {return {
            altText: entry.alt,
            entityTag: entry.entityTag,
            id: entry.id,
            mimeType: entry.mimeType,
            path: entry.url
        }})
    };

    return dataSet;
}