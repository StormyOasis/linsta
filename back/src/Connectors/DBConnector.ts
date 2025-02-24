import gremlin from 'gremlin';
import config from 'config';
import logger from '../logger/logger';
import Metrics from '../metrics/Metrics';

export type DbResult = {
    affectedRows: number;
    data: unknown[];
    id: number;    
};

export class DBConnector {
    private static instance:DBConnector | null = null;

    private client: gremlin.driver.DriverRemoteConnection | null = null;
    private g: gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal> | null = null;

    private constructor() {
    }
    
    public static getInstance() : DBConnector {
        if(!DBConnector.instance) {
            DBConnector.instance = new DBConnector();
        }
      
        return DBConnector.instance;
    }

    public getConnection = () => {
        return this.client;
    }
    
    public getGraph = () => {
        return this.g;
    }       
    
    public connect = async () => {
        logger.info("Creating DB connection...");
        
        const host:string = config.get("database.host");
        const port:number = config.get("database.port");
        const user:string = config.get("database.user");
        const password:string = config.get("database.password");
        
        const url = `wss://${host}:${port}/gremlin`;

        const authenticator = new gremlin.driver.auth.PlainTextSaslAuthenticator(user, password);
        
        this.client = new gremlin.driver.DriverRemoteConnection(url, {
            authenticator,
            traversalsource: 'g',
            rejectUnauthorized: true,
            mimeType: 'application/vnd.gremlin-v2.0+json'
        });

        this.g = gremlin.process.AnonymousTraversalSource.traversal().withRemote(this.client);
        
        console.log(await this.g.V().hasLabel('person').values('name').toList());

        logger.info("Connection created");     
    }

    public query = async (query: string, params : any) => {
        const dbResult:DbResult = {
            affectedRows: 0,
            data: [],
            id: 0
        }
        return dbResult;        
    }

    public execute = async (query: string, params : string []) => {
        const dbResult:DbResult = {
            affectedRows: 0,
            data: [],
            id: 0
        }
        return dbResult;        
    }
}

export default DBConnector.getInstance();