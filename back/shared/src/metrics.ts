import StatsDClient, { ClientOptions } from 'hot-shots';
import config from './config';
import logger from './logger';
import RedisConnector from './connectors/RedisConnector';

export class Metrics extends StatsDClient {
    private static instance: Metrics | null = null;

    private constructor(options: ClientOptions) {
        super(options);
    }

    public static getInstance(): Metrics {
        if (!Metrics.instance) {
            Metrics.instance = new Metrics({
                host: config.metrics.statsd.host,
                port: Number(config.metrics.statsd.port),
                errorHandler: (err: any) => logger.error('StatsD error', err),
                isChild: false,
                protocol: "udp",
                telegraf: false,
            } as ClientOptions);
        }
        return Metrics.instance;
    }

    public mapEsStatus(status: string): number {
        switch (status) {
            case 'green': return 0;
            case 'yellow': return 1;
            case 'red': return 2;
            default: return -1;
        }
    }
}

export async function withMetrics<T>(key: string, ip: string, fn: () => Promise<T>): Promise<T> {
    logger.info(`Invoking ${key}`);
    const start = Date.now();

//    const minuteKey = new Date(start).toISOString().slice(0, 16); // we want to expire after once a minute
//    const redisKey = `ips:${minuteKey}`;

    // Add ip key and set expiration so Redis cleans up old keys automatically    
//    await RedisConnector.sAdd(redisKey, ip);
    //await RedisConnector.expire(redisKey, 3600); // 1 hour TTL

    Metrics.getInstance().increment(`${key}.invoked`);

    const result = await fn();

    Metrics.getInstance().timing(`${key}.execution_time_ms`, Date.now() - start);

    return result;
}

export default Metrics.getInstance();
