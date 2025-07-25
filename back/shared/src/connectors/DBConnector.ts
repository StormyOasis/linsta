import gremlin from 'gremlin';
import config from '../config';
import logger from '../logger';
import pRetry from 'p-retry';
import { mapToObjectDeep } from '../utils';

export const EDGE_POST_TO_USER: string = "post_to_user";
export const EDGE_USER_TO_POST: string = "user_to_post";
export const EDGE_USER_FOLLOWS: string = "user_follows";
export const EDGE_USER_LIKED_POST: string = "user_liked_post";
export const EDGE_POST_LIKED_BY_USER: string = "post_liked_by_user";
export const EDGE_USER_LIKED_COMMENT: string = "user_liked_comment";
export const EDGE_COMMENT_LIKED_BY_USER: string = "comment_liked_by_user";
export const EDGE_POST_TO_COMMENT: string = "post_to_comment";
export const EDGE_COMMENT_TO_POST: string = "comment_to_post";
export const EDGE_PARENT_TO_CHILD_COMMENT: string = "parent_to_child_comment";
export const EDGE_CHILD_TO_PARENT_COMMENT: string = "child_to_parent_comment";
export const EDGE_COMMENT_TO_USER: string = "comment_to_user";
export const EDGE_USER_TO_COMMENT: string = "user_to_comment";
export const EDGE_USER_TO_TOKEN: string = "user_to_token";
export const EDGE_TOKEN_TO_USER: string = "token_to_user";

type TraverserWrapper = {
    object?: unknown;
    value?: unknown;
} & Record<string, unknown>;

export class DBConnector {
    private static instance: DBConnector | null = null;

    private connection: gremlin.driver.DriverRemoteConnection | null = null;
    private g: gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal> | null = null;
    private tx: gremlin.process.Transaction<gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal>> | null = null;
    private transactionG: gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal> | null = null;

    private constructor() {
    }

    public static getInstance(): DBConnector {
        if (!DBConnector.instance) {
            DBConnector.instance = new DBConnector();
        }

        return DBConnector.instance;
    }

    public getConnection = (): gremlin.driver.DriverRemoteConnection | null => {
        return this.connection;
    }

    public getTx = (): gremlin.process.Transaction<gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal>> | null => {
        return this.tx;
    }

    public getTransactionG = (): gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal> | null => {
        return this.transactionG;
    }

    public getGraph = async (isTransaction: boolean = false)
        : Promise<gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal>> => {

        await this.reconnectIfNeeded();

        if (!this.g) {
            throw new Error("Invalid connection");
        }

        if (!isTransaction) {
            return this.g;
        }

        if (this.transactionG === null) {
            throw new Error("Not in transaction");
        }

        return this.transactionG;
    }

    public connect = async (): Promise<void> => {
        await pRetry(async () => {
            logger.info(`Creating ${config.database.hostType} DB connection...`);

            const isNeptune: boolean = config.database.hostType === "neptune";

            const host: string = config.database.host;
            const port: number = config.database.port as number;

            const url = `ws://${host}:${port}/gremlin`;

            const options = {
                traversalsource: 'g',
                mimeType: 'application/vnd.gremlin-v3.0+json',
            };

            /*if(!isNeptune) {
                const user: string = config.database.user;
                const password: string = config.database.password;
                const authenticator = new gremlin.driver.auth.PlainTextSaslAuthenticator(user, password);
                options = {
                    authenticator,
                    traversalsource: 'g',
                    rejectUnauthorized: true,
                    mimeType: 'application/vnd.gremlin-v3.0+json'
                };
            }*/

            this.connection = new gremlin.driver.DriverRemoteConnection(url, options);

            // Try opening a test traversal to ensure connection works
            this.g = gremlin.process.AnonymousTraversalSource.traversal().withRemote(this.connection);
            await this.g.V().limit(1).toList(); // simple query to verify            

            logger.info("Connection created");
        }, {
            retries: config.database.maxRetries,                  // number of retry attempts
            minTimeout: config.database.minTimeout,              // initial wait time (ms)
            maxTimeout: config.database.maxTimeout,             // max wait time (ms)
            factor: config.database.backoffFactor,             // exponential backoff factor
            onFailedAttempt: error => {
                logger.warn(`Gremlin connection attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`, error);
            }
        });
    }

    public close = async (): Promise<void> => {
        if (this.connection?.isOpen) {
            await this.connection?.close();
            this.connection = null;
        }
        this.transactionG = null;
        this.g = null;
        this.tx = null;
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

    public beginTransaction = async (): Promise<gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal>> => {
        await this.reconnectIfNeeded();

        if (this.transactionG !== null) {
            throw new Error("Transaction already in progress");
        }

        if (this.g === null) {
            throw new Error("Invalid graph handle");
        }

        this.tx = this.g?.tx();
        this.transactionG = this.tx?.begin();

        if (this.transactionG == null) {
            throw new Error("Error opening transaction");
        }

        return this.transactionG;
    }

    public commitTransaction = async (): Promise<void> => {
        if (this.transactionG === null || this.tx === null) {
            throw new Error("No transaction in progress");
        }

        await this.tx.commit();
        this.transactionG = null;
        this.tx = null;
    }

    public rollbackTransaction = async (): Promise<void> => {
        if (this.transactionG === null || this.tx === null) {
            // This is a noop
            return;
        }

        await this.tx.rollback();
        this.transactionG = null;
        this.tx = null;
    }

    public reconnectIfNeeded = async (): Promise<void> => {
        if (!this.connection?.isOpen) {
            logger.info("Reconnecting to DB");
            await this.connect();
        }
    }

    public parseGraphResult = <T extends Record<string, unknown>>(
        input: Map<string, unknown> | Record<string, unknown>, fields: (keyof T)[]): T => {

        const result = {} as T;

        for (const field of fields) {
            const key = field as string;
            const value = input instanceof Map
                ? input.get(key)
                : (input as Record<string, unknown>)[key];

            result[field] = mapToObjectDeep(value) as T[typeof field];
        }

        return result;
    }

    public extractMapFromResult = (result: unknown): Map<string, unknown> => {
        if (result instanceof Map) {
            return result;
        }

        // Gremlin driver may wrap in `object` or `value` fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const maybeMap = (result as any)?.object ?? (result as any)?.value ?? result;

        if (maybeMap instanceof Map) {
            return maybeMap;
        }

        throw new Error("Unexpected result format: not a Map");
    }

    public unwrapResult = (result: unknown): Map<string, unknown> | Record<string, unknown> => {
        if (result instanceof Map) {
            return result;
        }

        if (typeof result === "object" && result !== null) {
            const wrapper = result as TraverserWrapper;
            if (wrapper.object instanceof Map) {
                return wrapper.object;
            }

            if (wrapper.value instanceof Map) {
                return wrapper.value;
            }

            // Amazon Neptune often returns a plain object directly
            return wrapper;
        }

        throw new Error("Unexpected result format");
    }

    public getVertexPropertySafe = (vertexProperties: Record<string, Array<{ value: string }>> | undefined,
        propertyName: string, defaultValue: string = ""): string => {
        return vertexProperties?.[propertyName]?.[0]?.value ?? defaultValue;
    };

    public createEdge = async (isTransaction: boolean, fromId: string, toId: string, forwardLabel: string, backwardLabel: string)
        : Promise<void> => {

        const result = await (await this.getGraph(isTransaction))
            .V(fromId).as("from")
            .V(toId).as("to")
            .addE(forwardLabel).from_("from").to("to")
            .addE(backwardLabel).from_("to").to("from")
            .next();

        if (!result?.value) {
            throw new Error(`Failed to create edges between ${fromId} and ${toId}`);
        }
    }

    public getCommentCount = async (isTransaction: boolean, postId: string): Promise<number> => {        
        const results = await (await this.getGraph(isTransaction))
            .V(postId)
            .project("commentCount")
            .by(this.__().outE(EDGE_POST_TO_COMMENT).count())
            .toList();

        if (!results?.length) {
            return 0;
        }

        const vertex = this.unwrapResult(results[0]);
        const parsed = this.parseGraphResult<{ commentCount: number }>(vertex, ["commentCount"]);
        return parsed.commentCount || 0;
    }    
}

export default DBConnector.getInstance();