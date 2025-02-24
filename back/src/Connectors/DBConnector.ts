import mysql, {Pool} from 'mysql2';
import { PoolConnection, Pool as PromisePool, QueryResult, ResultSetHeader } from 'mysql2/promise';
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

    private dbConnectionPool: Pool | null = null;
    private dbPromisePool: PromisePool | null = null;

    private constructor() {
    }

    public connect = () => {
        logger.info("Creating DB connection pool...");
        
        const host:string = config.get("database.host");
        const user:string = config.get("database.user");
        const password:string = config.get("database.password");
        const db:string = config.get("database.database");
        const connectionLimit:number = config.get("database.connectionLimit");

        this.dbConnectionPool = mysql.createPool({
            host: host,
            user: user,
            password: password,
            database: db,
            waitForConnections: true,
            connectionLimit: connectionLimit,
            maxIdle: 10,
            idleTimeout: 60000,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
        });

        this.dbPromisePool = this.dbConnectionPool.promise();
        
        logger.info("Connection Pool created");     
    }

    public static getInstance() : DBConnector {
        if(!DBConnector.instance) {
            DBConnector.instance = new DBConnector();
        }
      
        return DBConnector.instance;
    }

    public query = async (query: string, params : any) => {
        logger.debug(`Query: ${query} Params: ${params}`);
        try {
            if(!this.dbPromisePool) {
                throw new Error("Invalid connection");
            }

            const [rows] = await this.dbPromisePool.query(query, params);
            return this.parseResult(rows);

        } catch(err) {
            Metrics.increment("db.error.counts");
            logger.error(`Error querying db: ${err}`);
            throw err;            
        }
    }

    public execute = async (query: string, params : string []) => {
        logger.debug(`Execute: ${query} Params: ${params}`);
        try {
            if(!this.dbPromisePool) {
                throw new Error("Invalid connection");
            }            
           
            const [rows] = await this.dbPromisePool.execute(query, params);
            return this.parseResult(rows);

        } catch(err) {
            Metrics.increment("db.error.counts");
            logger.error(`Error executing against db: ${err}`);
            throw err;
        }
    }

    public getConnection = async() => {
        return await this.dbPromisePool?.getConnection();
    }

    public releaseConnection = (connection: PoolConnection) => {
        this.dbPromisePool?.releaseConnection(connection);
    }

    private parseResult = (result: QueryResult|ResultSetHeader) :DbResult => {        
        if(result == null) {
            throw new Error("Invalid result");
        }

        const dbResult:DbResult = {
            affectedRows: 0,
            data: [],
            id: 0
        }

        if((result as []).length == undefined) {
            // A non select statement(ie. INSERT, ROLLBACK, etc)
            dbResult.data = [];
            dbResult.id = (result as ResultSetHeader).insertId;
            dbResult.affectedRows = (result as ResultSetHeader).affectedRows;
        }
        else if((result as []).length != 0) {
            // standard SELECT
            dbResult.data = (result as []);
        }
        
        return dbResult;
    }
}

export default DBConnector.getInstance();