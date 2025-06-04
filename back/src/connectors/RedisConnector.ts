import { createClient, RedisClientOptions } from "redis";
import config from '../config';
import logger from "../logger/logger";

export const parseRedisInfo = (info: string): Record<string, string> => {
    const result: Record<string, string> = {};
    info.split('\r\n').forEach(line => {
        if (!line || !line.includes(':')) return;
        const [key, ...rest] = line.split(':');
        if (!key) return; // skip empty keys
        result[key] = rest.join(':');
    });
    return result;
}

// Minor annoyance. see: https://github.com/redis/node-redis/issues/1673
export type RedisClientType = ReturnType<typeof createClient>;

type RedisServerStats = {
    instantaneous_ops_per_sec: number;
    connected_clients: number;
    used_memory: number;
    used_memory_peak: number;
    mem_fragmentation_ratio: number;
    used_cpu_user: number;
};

export class RedisConnector {
    private static instance: RedisConnector | null = null;
    private client: RedisClientType | null = null;

    private constructor() {
    }

    public static getInstance(): RedisConnector {
        if (!RedisConnector.instance) {
            RedisConnector.instance = new RedisConnector();
        }

        return RedisConnector.instance;
    }

    public getClient = (): (RedisClientType | null) => {
        return this.client;
    }

    public connect = async (): Promise<void> => {
        logger.info("Creating redis connection...");

        const redisUserName = config.redis.userName;
        const redisPassword = config.redis.password;
        const redisHost = config.redis.host;
        const redisPort = config.redis.port;
        const maxRetries = config.redis.maxRetries as number;
        const connectTimeout = config.redis.connectTimeout as number;

        const options: RedisClientOptions = {
            url: `redis://${redisUserName}:${redisPassword}@${redisHost}:${redisPort}`,
            socket: {
                connectTimeout,
                reconnectStrategy: (retries) => {
                    if (retries > maxRetries) {
                        logger.error("Too many reconnect attempts. Redis connection terminated");
                        return new Error("Too many redis reconnect attempts");
                    } else {
                        return retries * 500;
                    }
                }
            }
        }

        try {
            if (this.client != null) {
                await this.client.disconnect();
                this.client = null;
            }

            this.client = createClient({ ...options });
            
            this.client.on("error", (err) => {
                logger.error("Redis connection error:", err);
            });

            this.client.on("connect", () => {
                logger.info("Redis connection created");
            }); 
            
            await this.client.connect();
        } catch (err) {
            logger.error("Failed to connect to Redis:", err);
        }
    }

    private async ensureConnected() {
        if (!this.client) {
            await this.connect();
        }
    }    

    public get = async (key: string): Promise<string | null> => {
        try {
            await this.ensureConnected();
            if (this.client == null) {
                throw new Error("Redis connection not found");
            }            
            return await this.client.get(key);
        } catch (err) {
            logger.error("Error getting key from Redis:", err);
            return null;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public set = async (key: string, value: any, ttl: number | null = null): Promise<void> => {
        // set TTL if given, otherwise default to value in config
        let options = {};
        if (ttl != null) {
            options = { EX: ttl };
        } else {
            options = { EX: config.redis.defaultTTL }
        }

        try {
            await this.ensureConnected();
            if (this.client == null) {
                throw new Error("Redis connection not found");
            }           
            await this.client.set(key, value, options);
        } catch (err) {
            // Note: It's ok if we fail to add to redis, so don't rethrow exception, just log it
            logger.warn("Error adding to redis");
        }
    }

    public del = async (key: string): Promise<void> => {
        try {
            await this.ensureConnected();
            if (this.client == null) {
                throw new Error("Redis connection not found");
            }           
            
            await this.client.del(key);

        } catch (err) {
            logger.error("Error deleting key from Redis:", err);
        }
    }    

    public close = async (): Promise<void> => {        
        if (this.client != null) {
            await this.client.disconnect();
            this.client = null;
        }
    }

    public static resetInstance(): void {
        if (RedisConnector.instance) {
          RedisConnector.instance.close();
          RedisConnector.instance = null;
        }
    }    

    public getKeyCount = async (): Promise<number|null> => {
        let result = 0;
        try {
            await this.ensureConnected();
            if (this.client == null) {
                throw new Error("Redis connection not found");
            } 
            result = await this.client.dbSize();
            return result;
        } catch (err) {
            logger.error("Error getting Redis key count:", err);
        }

        return null;
    }

    public getServerStatus = async (): Promise<RedisServerStats | null> => {
        let result: RedisServerStats;
        try {
            await this.ensureConnected();
            if (this.client == null) {
                throw new Error("Redis connection not found");
            }         
            const statsString = await this.client.info();
            const stats: Record<string, string> = parseRedisInfo(statsString);

            const convertToNumber = (value: string|null):number => {
                if(!value) {
                    return 0;
                }
                const num = Number(value);
                if(isNaN(num)) {
                    return 0;
                }
                return num;
            }

            result = {
                instantaneous_ops_per_sec: convertToNumber(stats['instantaneous_ops_per_sec']),
                connected_clients: convertToNumber(stats['connected_clients']),
                used_memory: convertToNumber(stats['used_memory']) / 1024,
                used_memory_peak: convertToNumber(stats['used_memory_peak']) / 1024,
                mem_fragmentation_ratio: convertToNumber(stats['mem_fragmentation_ratio']),
                used_cpu_user: convertToNumber(stats['used_cpu_user'])
            };

            return result;

        } catch (err) {
            logger.error("Error retrieving server stats from Redis:", err);
        }
        return null;
    }
}

export default RedisConnector.getInstance();