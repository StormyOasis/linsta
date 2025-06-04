import appConfig from '../config';

jest.mock('config', () => ({
    get: jest.fn((key: string) => {
        // Return the key as the value for easy testing
        return key;
    }),
}));

describe('appConfig', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env = {};
    });

    it('loads default config values from config package', () => {
        const config = require('../config').default;
        expect(config.frontHost).toBe('frontHost');
        expect(config.port).toBe('port');
        expect(config.host).toBe('host');
        expect(config.database.host).toBe('database.host');
        expect(config.redis.host).toBe('redis.host');
        expect(config.aws.region).toBe('aws.region');
        expect(config.es.node).toBe('es.node');
        expect(config.auth.jwt.secret).toBe('auth.jwt.secret');
    });

    it('overrides config with environment variables in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.PORT = '1234';
        process.env.FRONT_HOST = 'envFront';
        process.env.HOST = 'envHost';
        process.env.DB_HOST = 'envDbHost';
        process.env.DB_PORT = '9999';
        process.env.DB_USER = 'envDbUser';
        process.env.DB_PASSWORD = 'envDbPassword';
        process.env.DB_NAME = 'envDbName';
        process.env.DB_CONN_LIMIT = '42';
        process.env.DB_BACKOFF_FACTOR = '2';
        process.env.DB_MAX_RETRIES = '5';
        process.env.DB_MIN_TIMEOUT = '100';
        process.env.DB_MAX_TIMEOUT = '200';
        process.env.LOG_LEVEL = 'warn';
        process.env.STATSD_HOST = 'envStatsdHost';
        process.env.STATSD_PORT = '8126';
        process.env.JWT_SECRET = 'envJwtSecret';
        process.env.JWT_EXPIRATION = '2d';
        process.env.ES_NODE = 'envEsNode';
        process.env.ES_API_KEY = 'envEsApiKey';
        process.env.ES_MAIN_INDEX = 'envEsMainIndex';
        process.env.ES_PROFILE_INDEX = 'envEsProfileIndex';
        process.env.ES_DEFAULT_RESULT_SIZE = '11';
        process.env.ES_DEFAULT_PAGINATION_SIZE = '22';
        process.env.ES_DEFAULT_SUGGESTION_RESULT_SIZE = '33';
        process.env.ES_BACKOFF_FACTOR = '3';
        process.env.ES_MAX_RETRIES = '7';
        process.env.ES_MIN_TIMEOUT = '111';
        process.env.ES_MAX_TIMEOUT = '222';
        process.env.REDIS_HOST = 'envRedisHost';
        process.env.REDIS_PORT = '6380';
        process.env.REDIS_USERNAME = 'envRedisUser';
        process.env.REDIS_PASSWORD = 'envRedisPass';
        process.env.REDIS_CONNECT_TIMEOUT = '15000';
        process.env.REDIS_MAX_RETRIES = '8';
        process.env.REDIS_DEFAULT_TTL = '600000';
        process.env.REDIS_METRICS_INTERVAL_MS = '10000';
        process.env.AWS_REGION = 'envAwsRegion';
        process.env.AWS_SES_REPLY_ADDRESS = 'envSesReply';
        process.env.AWS_SES_IMAGE_HOST = 'envSesImageHost';
        process.env.AWS_LOC_API_KEY = 'envLocApiKey';
        process.env.AWS_LOC_INDEX = 'envLocIndex';
        process.env.AWS_S3_MEDIA_BUCKET = 'envS3Bucket';

        // Re-require config to reload with env vars
        jest.resetModules();
        const config = require('../config').default;

        expect(config.port).toBe('1234');
        expect(config.frontHost).toBe('envFront');
        expect(config.host).toBe('envHost');
        expect(config.database.host).toBe('envDbHost');
        expect(config.database.port).toBe('9999');
        expect(config.database.user).toBe('envDbUser');
        expect(config.database.password).toBe('envDbPassword');
        expect(config.database.database).toBe('envDbName');
        expect(config.database.connectionLimit).toBe(42);
        expect(config.database.backoffFactor).toBe(2);
        expect(config.database.maxRetries).toBe(5);
        expect(config.database.minTimeout).toBe(100);
        expect(config.database.maxTimeout).toBe(200);
        expect(config.logging.logLevel).toBe('warn');
        expect(config.metrics.statsd.host).toBe('envStatsdHost');
        expect(config.metrics.statsd.port).toBe('8126');
        expect(config.auth.jwt.secret).toBe('envJwtSecret');
        expect(config.auth.jwt.expiration).toBe('2d');
        expect(config.es.node).toBe('envEsNode');
        expect(config.es.apiKey).toBe('envEsApiKey');
        expect(config.es.mainIndex).toBe('envEsMainIndex');
        expect(config.es.profileIndex).toBe('envEsProfileIndex');
        expect(config.es.defaultResultSize).toBe(11);
        expect(config.es.defaultPaginationSize).toBe(22);
        expect(config.es.defaultSuggestionResultSize).toBe(33);
        expect(config.es.backoffFactor).toBe(3);
        expect(config.es.maxRetries).toBe(7);
        expect(config.es.minTimeout).toBe(111);
        expect(config.es.maxTimeout).toBe(222);
        expect(config.redis.host).toBe('envRedisHost');
        expect(config.redis.port).toBe('6380');
        expect(config.redis.userName).toBe('envRedisUser');
        expect(config.redis.password).toBe('envRedisPass');
        expect(config.redis.connectTimeout).toBe(15000);
        expect(config.redis.maxRetries).toBe(8);
        expect(config.redis.defaultTTL).toBe(600000);
        expect(config.redis.metricsIntervalMs).toBe(10000);
        expect(config.aws.region).toBe('envAwsRegion');
        expect(config.aws.ses.defaultReplyAddress).toBe('envSesReply');
        expect(config.aws.ses.imageHostName).toBe('envSesImageHost');
        expect(config.aws.location.apiKey).toBe('envLocApiKey');
        expect(config.aws.location.index).toBe('envLocIndex');
        expect(config.aws.s3.userMediaBucket).toBe('envS3Bucket');
    });
});