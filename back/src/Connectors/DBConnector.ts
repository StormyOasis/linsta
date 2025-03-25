import gremlin from 'gremlin';
import config from 'config';
import logger from '../logger/logger';
import Metrics from '../metrics/Metrics';

export const EDGE_POST_TO_USER:string = "post_to_user";
export const EDGE_USER_TO_POST:string = "user_to_post";
export const EDGE_USER_FOLLOWS:string = "user_follows";
export const EDGE_USER_LIKED_POST:string = "user_liked_post";
export const EDGE_POST_LIKED_BY_USER:string = "post_liked_by_user";
export const EDGE_USER_LIKED_COMMENT:string = "user_liked_comment";
export const EDGE_COMMENT_LIKED_BY_USER:string = "comment_liked_by_user";
export const EDGE_POST_TO_COMMENT:string = "post_to_comment";
export const EDGE_COMMENT_TO_POST:string = "comment_to_post";
export const EDGE_PARENT_TO_CHILD_COMMENT:string = "parent_to_child_comment";
export const EDGE_CHILD_TO_PARENT_COMMENT:string = "child_to_parent_comment";    
export const EDGE_COMMENT_TO_USER:string = "comment_to_user";    
export const EDGE_USER_TO_COMMENT:string = "user_to_comment";    

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
    
    public getGraph = async (isTransaction:boolean = false)
        :Promise<gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal>> => {

        await this.reconnectIfNeeded();

        if(!this.g) {
            throw new Error("Invalid connection");
        }

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

    public close = async () => {
        if(this.connection?.isOpen) {
            await this.connection?.close();
            this.connection = null;
        }
    }

    public T = () => {        
        return gremlin.process.t;
    }

    public P = () => {        
        return gremlin.process.P;
    }   
    
    public Column = () => {        
        return gremlin.process.column;
    }    

    public Merge = (): gremlin.process.Merge => {
        return gremlin.process.merge;
    }

    public __ = (): gremlin.process.Statics<gremlin.process.GraphTraversal> => {
        return gremlin.process.statics;
    }

    public beginTransaction = async ():Promise<gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal>> => {
        await this.reconnectIfNeeded();

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

    public reconnectIfNeeded = async () => {        
        if(!this.connection?.isOpen) {            
            logger.info("Reconnecting to DB");
            await this.connect();
        }
    }
}

export default DBConnector.getInstance();