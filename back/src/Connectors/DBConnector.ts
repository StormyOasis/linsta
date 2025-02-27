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

    private connection: gremlin.driver.DriverRemoteConnection | null = null;
    private g: gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal> | null = null;
    private tx: gremlin.process.Transaction<gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal>> | null = null;
    private transactionG:gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal> | null = null;

    private constructor() {
    }
    
    public static getInstance() : DBConnector {
        if(!DBConnector.instance) {
            DBConnector.instance = new DBConnector();
        }
      
        return DBConnector.instance;
    }

    public getConnection = () : gremlin.driver.DriverRemoteConnection | null => {
        return this.connection;
    }
    
    public getGraph = (isTransaction:boolean = false)
        :gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal> | null => {

        if(!isTransaction) {
            return this.g;
        }

        if(this.transactionG === null) {
            throw new Error("Not in transaction");
        }

        return this.transactionG;
    }  
    
    public connect = async () => {
        logger.info("Creating DB connection...");
        
        const host:string = config.get("database.host");
        const port:number = config.get("database.port");
        const user:string = config.get("database.user");
        const password:string = config.get("database.password");
        
        const url = `ws://${host}:${port}/gremlin`;

        const authenticator = new gremlin.driver.auth.PlainTextSaslAuthenticator(user, password);
        
        this.connection = new gremlin.driver.DriverRemoteConnection(url, {
          authenticator,
          traversalsource: 'g',
          rejectUnauthorized: true,
          mimeType: 'application/vnd.gremlin-v3.0+json'
        });

        this.g = gremlin.process.AnonymousTraversalSource.traversal().withRemote(this.connection);

        logger.info("Connection created");     
    }

    public T = () => {        
        return gremlin.process.t;
    }

    public P = () => {        
        return gremlin.process.P;
    }    

    public Merge = (): gremlin.process.Merge => {
        return gremlin.process.merge;
    }

    public __ = (): gremlin.process.Statics<gremlin.process.GraphTraversal> => {
        return gremlin.process.statics;
    }

    public beginTransaction = ():gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal> => {
        if(this.transactionG !== null) {
            throw new Error("Transaction already in progress");
        }

        if(this.g === null) {
            throw new Error("Invalid graph handle");
        }

        this.tx = this.g?.tx();    
        this.transactionG = this.tx?.begin();

        if(this.transactionG == null) {
            throw new Error("Error openining transaction");
        }

        return this.transactionG;
    }

    public commitTransaction = async () => {
        if(this.transactionG === null || this.tx === null) {
            throw new Error("No transaction in progress");
        }

        await this.tx.commit();
        this.transactionG = null;
        this.tx = null;        
    }

    public rollbackTransaction = async () => {
        if(this.transactionG === null  || this.tx === null) {
            // This is a noop
            return;
        }

        await this.tx.rollback();
        this.transactionG = null;
        this.tx = null;
    }
}

export default DBConnector.getInstance();