import StatsDClient, { ClientOptions } from "hot-shots";
import config from '../config';

export class Metrics extends StatsDClient {
    private static instance:Metrics | null = null;

    private constructor(args:ClientOptions) {
        super(args);
    }

    public static getInstance() : Metrics {
        if(!Metrics.instance) {
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