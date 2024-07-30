//TODO: Client side metrics

export class Metrics {
    private static instance:Metrics | null = null;
    private metrics:any = null;

    private constructor(args: any) {

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

    public increment(key: string) {        
        if(this.metrics == null) {
            throw new Error("Metrics failure");
        }
        this.metrics.increment(key);
    }
}

export default Metrics.getInstance();