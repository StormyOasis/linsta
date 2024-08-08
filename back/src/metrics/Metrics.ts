import StatsDClient, { ClientOptions } from "hot-shots";
import config from 'config';


export class Metrics extends StatsDClient {
    private static instance:Metrics | null = null;

    private constructor(args:ClientOptions) {
        super(args);
    }

    public static getInstance() : Metrics {
        if(!Metrics.instance) {
            Metrics.instance = new Metrics({
                host: config.get("metrics.statsd.host"),
                port: config.get("metrics.statsd.port")
            });
        }
        return Metrics.instance;
    }    
}

export default Metrics.getInstance();