import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

interface AIConfig {
    openApiKey: string;    
    autoCaptionUrl: string;
}

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
    sqs: {
        imageQueue: string;
        imageQueueUrl: string;
        autoCaptionQueue: string;
        autoCaptionQueueUrl: string;        
    },
    cloudfront: {
        url: string;
    }
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
    metricsIntervalMs: number;
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
            port: string | number;
        }
    };

    auth: AuthConfig;
    database: DBConfig;
    es: ESConfig;
    redis: RedisConfig;
    aws: AWSConfig;
    ai: AIConfig;
}

const appConfig: AppConfig = {
    frontHost: '',
    port: '',
    host: '',
    logging: {
        logLevel: ''
    },
    metrics: {
        statsd: {
            host: '',
            port: ''
        }
    },
    auth: {
        jwt: {
            secret: '',
            expiration: ''
        }
    },
    database: {
        hostType: '',
        backoffFactor: 0,
        maxTimeout: 0,
        minTimeout: 0,
        maxRetries: 0,
        host: '',
        port: '',
        user: '',
        password: '',
        database: '',
        connectionLimit: 0
    },
    es: {
        node: '',
        apiKey: '',
        mainIndex: '',
        profileIndex: '',
        defaultResultSize: 0,
        defaultPaginationSize: 0,
        defaultSuggestionResultSize: 0,
        backoffFactor: 0,
        maxTimeout: 0,
        minTimeout: 0,
        maxRetries: 0,
        metricsIntervalMs: 1000
    },
    redis: {
        host: '',
        port: '',
        userName: '',
        password: '',
        connectTimeout: 0,
        maxRetries: 0,
        defaultTTL: 0,
        metricsIntervalMs: 1000
    },
    aws: {
        region: '',
        ses: {
            defaultReplyAddress: '',
            imageHostName: ''
        },
        location: {
            apiKey: '',
            index: ''
        },
        s3: {
            userMediaBucket: ''
        },
        sqs: {
            imageQueue: '',
            imageQueueUrl: '',
            autoCaptionQueue: '',
            autoCaptionQueueUrl: ''
        },
        cloudfront: {
            url: ''
        }
    },
    ai: {
        openApiKey: '',
        autoCaptionUrl: 'https://api.openai.com/v1/chat/completions'
    }    
};




function loadEnv(): void {
    const envPath = path.resolve(process.cwd(), '../.env');
    const envPathSameDir = path.resolve(process.cwd(), './.env');

    if (existsSync(envPath)) {
        dotenv.config({ path: envPath });
    } else if(existsSync(envPathSameDir)) {
        dotenv.config({ path: envPathSameDir });
    } else {
        console.warn(`.env file not found at ${envPath} or ${envPathSameDir}`);
    }
}

loadEnv();

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
appConfig.es.metricsIntervalMs = Number(process.env.ES_METRICS_INTERVAL_MS ?? appConfig.es.metricsIntervalMs);

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
appConfig.aws.cloudfront.url = process.env.AWS_CLOUDFRONT_URL ?? appConfig.aws.cloudfront.url;
appConfig.aws.sqs.imageQueue = process.env.AWS_SQS_IMAGE_QUEUE ?? appConfig.aws.sqs.imageQueue;
appConfig.aws.sqs.imageQueueUrl = process.env.AWS_SQS_IMAGE_QUEUE_URL ?? appConfig.aws.sqs.imageQueueUrl;
appConfig.aws.sqs.autoCaptionQueue = process.env.AWS_SQS_AUTO_CAPTION_QUEUE ?? appConfig.aws.sqs.autoCaptionQueue;
appConfig.aws.sqs.autoCaptionQueueUrl = process.env.AWS_SQS_AUTO_CAPTION_QUEUE_URL ?? appConfig.aws.sqs.autoCaptionQueueUrl;

appConfig.ai.openApiKey = process.env.OPENAI_API_KEY ?? appConfig.ai.openApiKey;
appConfig.ai.autoCaptionUrl = process.env.OPENAI_AUTO_CAPTION_URL ?? appConfig.ai.autoCaptionUrl;

"https://api.openai.com/v1/chat/completions"     

export default appConfig;