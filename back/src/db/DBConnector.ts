import mysql, {Pool} from 'mysql2';
import { PoolConnection, Pool as PromisePool } from 'mysql2/promise';
import config from 'config';
import Logger from '../logger/logger';
import Metrics from '../metrics/Metrics';

export class DBConnector {
    private static instance:DBConnector | null = null;

    private dbConnectionPool: Pool | null = null;
    private dbPromisePool: PromisePool | null = null;

    private constructor() {
    }

    public connect = () => {
        Logger.info("Creating DB connection pool...");
        
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
        
        Logger.info("Connection Pool created");     
    }

    public static getInstance() : DBConnector {
        if(!DBConnector.instance) {
            DBConnector.instance = new DBConnector();
        }
      
        return DBConnector.instance;
    }

    public query = async (query: string, params : string []) => {
        Logger.debug(`Query: ${query} Params: ${params}`);
        try {
            if(!this.dbPromisePool) {
                throw new Error("Invalid connection");
            }

            const [rows, fields] = await this.dbPromisePool.query(query, params);

            return [rows, fields];
        } catch(err) {
            Metrics.increment("db.error.counts");
            Logger.error(`Error querying db: ${err}`);
        }
    }

    public execute = async (query: string, params : string []) => {
        Logger.debug(`Execute: ${query} Params: ${params}`);
        try {
            if(!this.dbPromisePool) {
                throw new Error("Invalid connection");
            }            
            return await this.dbPromisePool.execute(query, params);
        } catch(err) {
            Metrics.increment("db.error.counts");
            Logger.error(`Error executing against db: ${err}`);
        }
    }

    public getConnection = async() => {
        return await this.dbPromisePool?.getConnection();
    }

    public releaseConnection = (connection: PoolConnection) => {
        this.dbPromisePool?.releaseConnection(connection);
    }
}

export default DBConnector.getInstance();