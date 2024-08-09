import {createClient,  RedisClientOptions } from "redis";
import config from 'config';
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";

// Minor annoyance. see: https://github.com/redis/node-redis/issues/1673
export type RedisClientType = ReturnType<typeof createClient>;

export default class Redis {
    private client:RedisClientType|null = null;

    public createClient = async () => {
        const redisUserName = config.get("redis.userName");
        const redisPassword = config.get("redis.password");
        const redisHost = config.get("redis.host");
        const redisPort = config.get("redis.port");

        const options: RedisClientOptions = {
            url: `redis://${redisUserName}:${redisPassword}@${redisHost}:${redisPort}`
        }

        this.client = await createClient({...options}) 
            .on('error', err => {
                logger.error("Redis connection error", err);
                Metrics.increment("redis.errorcount");
                throw new Error(err);
        }).connect();
    }

    public get = async (key:string):Promise<string | null> => {
        if(this.client == null) {
            Metrics.increment("redis.errorcount");
            logger.error("Redis connection not found");
            throw new Error("Redis connection not found");
        }
        const value = await this.client.get(key);
        return value;
    }

    public set = async (key:string, value: string, ttl:number|null = null) => {
        if(this.client == null) {
            Metrics.increment("redis.errorcount");
            logger.error("Redis connection not found");
            throw new Error("Redis connection not found");
        }

        // set TTL if given
        let options = {};
        if(ttl != null) {
            options = {EX: ttl};
        }

        await this.client.set(key, value, options);      
    }

    public close = () => {
        if(this.client != null) {
            this.client.disconnect();
            this.client = null;
        }
    }
}