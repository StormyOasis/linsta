import { StatsD, Tags } from 'hot-shots';
import config from '../config';
import logger from '../logger/logger';
import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders } from "aws-lambda";
import RedisConnector from "../connectors/RedisConnector";

export class Metrics {
    private static instance: Metrics | null = null;
    private client:StatsD | null = null;

    private constructor() {
        this.client = new StatsD({
            host: config.metrics.statsd.host,
            port: Number(config.metrics.statsd.port),
            errorHandler: (err) => logger.error('StatsD error', err),
            isChild: false,
            protocol: "udp",
            telegraf: false,            
        });        
    }

    public static getInstance(): Metrics {
        if (!Metrics.instance) {
            Metrics.instance = new Metrics();
        }
        return Metrics.instance;
    }

    public flush(): void {
        if (this.client) {
            try {
                this.client.close();                
            } finally {
                this.client = null;
                Metrics.instance = null;
            }
        }
    }

    public increment(stat: string, value = 1) {
        if (this.client && this.client.socket)
            this.client.increment(stat, value);
    }

    public timing(stat: string, time: number) {
        if (this.client && this.client.socket)
            this.client.timing(stat, time);
    }

    public gauge(stat: string, value: number, sampleRate?:number, tags?:Tags) {
        if (this.client && this.client.socket)
            this.client.gauge(stat, value, sampleRate, tags);
    }

    public histogram(stat: string, value: number) {
        if (this.client && this.client.socket)
            this.client.histogram(stat, value);
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

export async function withMetrics<T>(key: string, event: APIGatewayProxyEvent, fn: () => Promise<T>): Promise<T> {
    logger.info(`Invoking ${key}`);
    const start = Date.now();

    // Extract IP from http headers
    let ip = event.requestContext.identity.sourceIp;
    if(!ip) {
        ip = !ip && event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';  
    }
  
    const metrics: Metrics = Metrics.getInstance();    
    try {
        const minuteKey = new Date(start).toISOString().slice(0, 16); // we want to expire after once a minute
        const redisKey = `ips:${minuteKey}`;

        // Add ip key and set expiration so Redis cleans up old keys automatically    
        await RedisConnector.sAdd(redisKey, ip);
        await RedisConnector.expire(redisKey, 3600); // 1 hour TTL

        metrics.increment(`${key}.invoked`);

        const result = await fn();

        metrics.timing(`${key}.execution_time_ms`, Date.now() - start);

        return result;
    } finally {
        metrics.flush();
    }
}

export default Metrics;
