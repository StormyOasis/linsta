import config from 'config';
import dotenv from 'dotenv';

interface AWSConfig {
    region: string;
    ses: {
        defaultReplyAddress: string;
        imageHostName: string;
    };
    location: {
        apiKey: string;
        index: string;
    };
    s3: {
        userMediaBucket: string;
    };
}

interface RedisConfig {
    host: string;
    port: string | number;
    userName: string;
    password: string;
    connectTimeout: number;
    maxRetries: number;
    defaultTTL: number;
    metricsIntervalMs: number;
}

interface ESConfig {
    node: string;
    apiKey: string;
    mainIndex: string;
    profileIndex: string;
    defaultResultSize: number;
    defaultPaginationSize: number;
    defaultSuggestionResultSize: number;
    backoffFactor: number;
    maxTimeout: number;
    minTimeout: number;
    maxRetries: number;
}

interface DBConfig {
    hostType: string;
    backoffFactor: number;
    maxTimeout: number;
    minTimeout: number;
    maxRetries: number;
    host: string;
    port: string | number;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;
}

interface AuthConfig {
    jwt: {
        secret: string;
        expiration: string;
    }
}

interface AppConfig {
    frontHost: string;
    port: number | string;
    host: string;

    logging: {
        logLevel: string;
    };

    metrics: {
        statsd: {
            host: string;
            port: string|number;
        }            
    };    
    
    auth: AuthConfig;
    database: DBConfig;
    es: ESConfig;
    redis: RedisConfig;
    aws: AWSConfig;
}

const appConfig: AppConfig = {
    frontHost: config.get<string>('frontHost'),
    port: config.get<number>('port'),
    host: config.get<string>('host'),
    database: {
        hostType: config.get<string>('database.hostType'),
        host: config.get<string>('database.host'),
        user: config.get<string>('database.user'),
        port: config.get<number>('database.port'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        connectionLimit: config.get<number>('database.connectionLimit'),
        backoffFactor: config.get<number>('database.backoffFactor'),
        maxTimeout: config.get<number>('database.maxTimeout'),
        minTimeout: config.get<number>('database.minTimeout'),
        maxRetries: config.get<number>('database.maxRetries')
    },    
    logging: {
        logLevel: config.get<string>('logging.logLevel')
    },
    metrics: {
        statsd: {
            host: config.get<string>('metrics.statsd.host'),
            port: config.get<number>('metrics.statsd.port')
        }
    },
    auth: {
        jwt: {
            secret: config.get<string>('auth.jwt.secret'),
            expiration: config.get<string>('auth.jwt.expiration')
        }
    },
    es: {
        node: config.get<string>('es.node'),
        apiKey: config.get<string>('es.apiKey'),
        mainIndex: config.get<string>('es.mainIndex'),
        profileIndex: config.get<string>('es.profileIndex'),
        defaultResultSize: config.get<number>('es.defaultResultSize'),
        defaultPaginationSize: config.get<number>('es.defaultPaginationSize'),
        defaultSuggestionResultSize: config.get<number>('es.defaultSuggestionResultSize'),
        backoffFactor: config.get<number>('es.backoffFactor'),
        maxTimeout: config.get<number>('es.maxTimeout'),
        minTimeout: config.get<number>('es.minTimeout'),
        maxRetries: config.get<number>('es.maxRetries')
    },
    redis: {
        host: config.get<string>('redis.host'),
        userName: config.get<string>('redis.userName'),
        port: config.get<number>('redis.port'),
        password: config.get<string>('redis.password'),
        connectTimeout: config.get<number>('redis.connectTimeout'),
        maxRetries: config.get<number>('redis.maxRetries'),
        defaultTTL: config.get<number>('redis.defaultTTL'),
        metricsIntervalMs: config.get<number>('redis.metricsIntervalMs')
    },
    aws: {
        region: config.get<string>('aws.region'),
        ses: {
            defaultReplyAddress: config.get<string>('aws.ses.defaultReplyAddress'),
            imageHostName: config.get<string>('aws.ses.imageHostName')
        },
        location: {
            apiKey: config.get<string>('aws.location.apiKey'),
            index: config.get<string>('aws.location.index')
        },
        s3: {
            userMediaBucket: config.get<string>('aws.s3.userMediaBucket')
        }
    }
};

// Load .env only in production
if (process.env.NODE_ENV === 'production') {
    dotenv.config();
  
    appConfig.port = process.env.PORT ?? appConfig.port;
    appConfig.frontHost = process.env.FRONT_HOST ?? appConfig.frontHost;
    appConfig.host = process.env.HOST ?? appConfig.host;
  
    appConfig.database.hostType = process.env.DB_HOST_TYPE ?? appConfig.database.hostType;
    appConfig.database.host = process.env.DB_HOST ?? appConfig.database.host;
    appConfig.database.port = process.env.DB_PORT ?? appConfig.database.port;
    appConfig.database.user = process.env.DB_USER ?? appConfig.database.user;
    appConfig.database.password = process.env.DB_PASSWORD ?? appConfig.database.password;
    appConfig.database.database = process.env.DB_NAME ?? appConfig.database.database;
    appConfig.database.connectionLimit = Number(process.env.DB_CONN_LIMIT ?? appConfig.database.connectionLimit);
    appConfig.database.backoffFactor = Number(process.env.DB_BACKOFF_FACTOR ?? appConfig.database.backoffFactor);
    appConfig.database.maxRetries = Number(process.env.DB_MAX_RETRIES ?? appConfig.database.maxRetries);
    appConfig.database.minTimeout = Number(process.env.DB_MIN_TIMEOUT ?? appConfig.database.minTimeout);
    appConfig.database.maxTimeout = Number(process.env.DB_MAX_TIMEOUT ?? appConfig.database.maxTimeout);
  
    appConfig.logging.logLevel = process.env.LOG_LEVEL ?? appConfig.logging.logLevel;
  
    appConfig.metrics.statsd.host = process.env.STATSD_HOST ?? appConfig.metrics.statsd.host;
    appConfig.metrics.statsd.port = process.env.STATSD_PORT ?? appConfig.metrics.statsd.port;
  
    appConfig.auth.jwt.secret = process.env.JWT_SECRET ?? appConfig.auth.jwt.secret;
    appConfig.auth.jwt.expiration = process.env.JWT_EXPIRATION ?? appConfig.auth.jwt.expiration;
  
    appConfig.es.node = process.env.ES_NODE ?? appConfig.es.node;
    appConfig.es.apiKey = process.env.ES_API_KEY ?? appConfig.es.apiKey;
    appConfig.es.mainIndex = process.env.ES_MAIN_INDEX ?? appConfig.es.mainIndex;
    appConfig.es.profileIndex = process.env.ES_PROFILE_INDEX ?? appConfig.es.profileIndex;
    appConfig.es.defaultResultSize = Number(process.env.ES_DEFAULT_RESULT_SIZE ?? appConfig.es.defaultResultSize);
    appConfig.es.defaultPaginationSize = Number(process.env.ES_DEFAULT_PAGINATION_SIZE ?? appConfig.es.defaultPaginationSize);
    appConfig.es.defaultSuggestionResultSize = Number(process.env.ES_DEFAULT_SUGGESTION_RESULT_SIZE ?? appConfig.es.defaultSuggestionResultSize);
    appConfig.es.backoffFactor = Number(process.env.ES_BACKOFF_FACTOR ?? appConfig.es.backoffFactor);
    appConfig.es.maxRetries = Number(process.env.ES_MAX_RETRIES ?? appConfig.es.maxRetries);
    appConfig.es.minTimeout = Number(process.env.ES_MIN_TIMEOUT ?? appConfig.es.minTimeout);
    appConfig.es.maxTimeout = Number(process.env.ES_MAX_TIMEOUT ?? appConfig.es.maxTimeout);

    appConfig.redis.host = process.env.REDIS_HOST ?? appConfig.redis.host;
    appConfig.redis.port = process.env.REDIS_PORT ?? appConfig.redis.port;
    appConfig.redis.userName = process.env.REDIS_USERNAME ?? appConfig.redis.userName;
    appConfig.redis.password = process.env.REDIS_PASSWORD ?? appConfig.redis.password;
    appConfig.redis.connectTimeout = Number(process.env.REDIS_CONNECT_TIMEOUT ?? appConfig.redis.connectTimeout);
    appConfig.redis.maxRetries = Number(process.env.REDIS_MAX_RETRIES ?? appConfig.redis.maxRetries);
    appConfig.redis.defaultTTL = Number(process.env.REDIS_DEFAULT_TTL ?? appConfig.redis.defaultTTL);
    appConfig.redis.metricsIntervalMs = Number(process.env.REDIS_METRICS_INTERVAL_MS ?? appConfig.redis.metricsIntervalMs);
  
    appConfig.aws.region = process.env.AWS_REGION ?? appConfig.aws.region;
    appConfig.aws.ses.defaultReplyAddress = process.env.AWS_SES_REPLY_ADDRESS ?? appConfig.aws.ses.defaultReplyAddress;
    appConfig.aws.ses.imageHostName = process.env.AWS_SES_IMAGE_HOST ?? appConfig.aws.ses.imageHostName;
    appConfig.aws.location.apiKey = process.env.AWS_LOC_API_KEY ?? appConfig.aws.location.apiKey;
    appConfig.aws.location.index = process.env.AWS_LOC_INDEX ?? appConfig.aws.location.index;
    appConfig.aws.s3.userMediaBucket = process.env.AWS_S3_MEDIA_BUCKET ?? appConfig.aws.s3.userMediaBucket;
}

export default appConfig;