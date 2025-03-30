import { createClient, RedisClientOptions } from "redis";
import config from 'config';
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";
import { parseRedisInfo, RedisInfo } from "../utils/utils";

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
    private metricsInterval: NodeJS.Timeout;
    private metricsPrevCpuSample: number = 0;

    private constructor() {
        const timeout: number = config.get("redis.metricsIntervalMs") as number;

        this.metricsInterval = setInterval(async (connector: RedisConnector) => {
            if (connector === null || connector.getClient() === null) {
                return;
            }

            const keyCount: number = await connector.getKeyCount();
            Metrics.gauge("redis.keyCount", keyCount);

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
            this.client = await createClient({ ...options })
                .on('error', err => {
                    logger.error("Redis connection error", err);
                    Metrics.increment("redis.errorCount");
                    throw new Error(err);
                }).connect();
            logger.info("Redis connection created");
        } catch (err) {
            logger.error("Failed to connect to Redis:", err);
            throw err;
        }
    }

    public get = async (key: string): Promise<string | null> => {
        if (this.client == null) {
            Metrics.increment("redis.errorCount");
            logger.error("Redis connection not found");
            throw new Error("Redis connection not found");
        }
        try {
            return await this.client.get(key);
        } catch (err) {
            Metrics.increment("redis.errorCount");
            logger.error("Error getting key from Redis:", err);
            return null;
        }
    }

    public set = async (key: string, value: any, ttl: number | null = null): Promise<void> => {
        if (this.client == null) {
            Metrics.increment("redis.errorCount");
            logger.error("Redis connection not found");
            throw new Error("Redis connection not found");
        }

        // set TTL if given, otherwise default to value in config
        let options = {};
        if (ttl != null) {
            options = { EX: ttl };
        } else {
            options = { EX: config.get("redis.defaultTTL") }
        }

        try {
            await this.client.set(key, value, options);
        } catch (err) {
            // Note: It's ok if we fail to add to redis, so don't rethrow exception, just log it
            logger.warn("Error adding to redis");
            Metrics.increment("redis.errorCount");
        }
    }

    public close = async (): Promise<void> => {
        if (this.client != null) {
            await this.client.disconnect();
            this.client = null;
        }
        clearInterval(this.metricsInterval);
    }

    public getKeyCount = async (): Promise<number> => {
        if (this.client == null) {
            Metrics.increment("redis.errorCount");
            logger.error("Redis connection not found");
            throw new Error("Redis connection not found");
        }

        let result = 0;
        try {
            result = await this.client.dbSize();
        } catch (err) {
            Metrics.increment("redis.errorCount");
            logger.error("Error getting Redis key count:", err);
        }

        return result;
    }

    public getServerStatus = async (): Promise<RedisServerStats | null> => {
        if (this.client == null) {
            Metrics.increment("redis.errorCount");
            logger.error("Redis connection not found");
            throw new Error("Redis connection not found");
        }

        let result: RedisServerStats;
        try {
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
            Metrics.increment("redis.errorCount");
            logger.error("Error retrieving server stats from Redis:", err);
        }
        return null;
    }
}

export default RedisConnector.getInstance();