import StatsDClient, { ClientOptions } from "hot-shots";
import config from '../config';
import logger from '../logger/logger';

export class Metrics extends StatsDClient {
    private static instance:Metrics | null = null;

    private constructor(args:ClientOptions) {
        super(args);
    }

    public static getInstance() : Metrics {
        if(!Metrics.instance) {
            console.log(`metrics://${config.metrics.statsd.host}:${ config.metrics.statsd.port}`);
            logger.info(`redis://${config.metrics.statsd.host}:${ config.metrics.statsd.port}`);
            
            Metrics.instance = new Metrics({
                host: config.metrics.statsd.host,
                port: config.metrics.statsd.port
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

export default Metrics.getInstance();