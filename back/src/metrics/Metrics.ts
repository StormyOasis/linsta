import StatsDClient, { ClientOptions } from "hot-shots";

export class Metrics extends StatsDClient {
    private static instance:Metrics | null = null;

    private constructor(args:ClientOptions) {
        super(args);
    }

    public static getInstance() : Metrics {
        if(!Metrics.instance) {
            Metrics.instance = new Metrics({
                host: "localhost",
                port: 8125,                
            });
        }
        return Metrics.instance;
    }    
}

export default Metrics.getInstance();