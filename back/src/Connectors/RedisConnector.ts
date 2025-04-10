import { createClient, RedisClientOptions } from "redis";
import config from 'config';
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";

export interface RedisInfo {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export const parseRedisInfo = (infoString: string): RedisInfo => {
    const info: RedisInfo = {};

    const lines = infoString.split('\r\n');
    for (let i = 0; i < lines.length; ++i) {
        const parts = lines[i].split(':');
        if (parts[1]) {
            info[parts[0]] = parts[1];
        }
    }
    return info;
};

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
    private metricsInterval: NodeJS.Timeout | null;
    private metricsPrevCpuSample: number = 0;
    private metricsErrorCount: number = 0

    private constructor() {
        const timeout: number = config.get("redis.metricsIntervalMs") as number;

        this.metricsInterval = setInterval(async (connector: RedisConnector) => {
            if (connector === null) {
                return;
            }

            try {
                const keyCount: number|null = await connector.getKeyCount();
                if(keyCount == null) {
                    throw new Error("Could not get key count");
                }
                Metrics.gauge("redis.keyCount", keyCount || 0);

                const serverInfo: (RedisServerStats | null) = await connector.getServerStatus();
                if (serverInfo) {
                    const cpuAsPercantage = (serverInfo.used_cpu_user - this.metricsPrevCpuSample) / (timeout / 1000);
                    this.metricsPrevCpuSample = serverInfo.used_cpu_user;

                    Metrics.gauge("redis.connectedClients", serverInfo.connected_clients);
                    Metrics.gauge("redis.qps", serverInfo.instantaneous_ops_per_sec);
                    Metrics.gauge("redis.usedMemory", serverInfo.used_memory);
                    Metrics.gauge("redis.usedMemoryPeak", serverInfo.used_memory_peak);
                    Metrics.gauge("redis.memFragmentationRatio", serverInfo.mem_fragmentation_ratio);
                    Metrics.gauge("redis.cpuUsage", cpuAsPercantage);
                } else {
                    throw new Error("Error getting server stats");
                }
            } catch (err) {
                logger.error("Failed getting redis metrics: ", err);
                Metrics.gauge("redis.errorCount", this.metricsErrorCount++);

                await this.connect();                
            }
        }, timeout, this);
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

        const redisUserName = config.get("redis.userName");
        const redisPassword = config.get("redis.password");
        const redisHost = config.get("redis.host");
        const redisPort = config.get("redis.port");
        const maxRetries = config.get("redis.maxRetries") as number;
        const connectTimeout = config.get("redis.connectTimeout") as number;

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
            if(this.client != null) {
                await this.client.disconnect();
                this.client = null;
            }
            this.client = createClient({ ...options });
            
            this.client.on("error", (err) => {
                logger.error("Redis connection error:", err);
                Metrics.gauge("redis.errorCount", this.metricsErrorCount++);
            });

            this.client.on("connect", () => {
                logger.info("Redis connection created");
                this.metricsErrorCount = 0;
                Metrics.gauge("redis.errorCount", this.metricsErrorCount);
            }); 
            
            this.client = await this.client.connect();
        } catch (err) {
            logger.error("Failed to connect to Redis:", err);
            Metrics.gauge("redis.errorCount", this.metricsErrorCount++);
        }
    }

    public get = async (key: string): Promise<string | null> => {
        try {
            if (this.client == null) {
                throw new Error("Redis connection not found");
            }            
            return await this.client.get(key);
        } catch (err) {
            Metrics.gauge("redis.errorCount", this.metricsErrorCount++);
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
            options = { EX: config.get("redis.defaultTTL") }
        }

        try {
            if (this.client == null) {
                throw new Error("Redis connection not found");
            }            
            await this.client.set(key, value, options);
        } catch (err) {
            // Note: It's ok if we fail to add to redis, so don't rethrow exception, just log it
            logger.warn("Error adding to redis");
            Metrics.gauge("redis.errorCount", this.metricsErrorCount++);
        }
    }

    public close = async (): Promise<void> => {
        if(this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }        
        if (this.client != null) {
            await this.client.disconnect();
            this.client = null;
        }
        this.metricsInterval = null;
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
            if (this.client == null) {
                throw new Error("Redis connection not found");
            }
            result = await this.client.dbSize();
            return result;
        } catch (err) {
            Metrics.gauge("redis.errorCount", this.metricsErrorCount++);
            logger.error("Error getting Redis key count:", err);
        }

        return null;
    }

    public getServerStatus = async (): Promise<RedisServerStats | null> => {
        let result: RedisServerStats;
        try {
            if (this.client == null) {
                throw new Error("Redis connection not found");
            }            
            const statsString = await this.client.info();
            const stats: RedisInfo = parseRedisInfo(statsString);

            result = {
                instantaneous_ops_per_sec: parseInt(stats['instantaneous_ops_per_sec']),
                connected_clients: parseInt(stats['connected_clients']),
                used_memory: stats['used_memory'] / 1024,
                used_memory_peak: stats['used_memory_peak'] / 1024,
                mem_fragmentation_ratio: parseFloat(stats['mem_fragmentation_ratio']),
                used_cpu_user: parseFloat(stats['used_cpu_user'])
            };

            return result;

        } catch (err) {
            Metrics.gauge("redis.errorCount", this.metricsErrorCount++);
            logger.error("Error retrieving server stats from Redis:", err);
        }
        return null;
    }
}

export default RedisConnector.getInstance();