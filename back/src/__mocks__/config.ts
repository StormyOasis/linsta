export default {
    database: {
        host: 'localhost',
        port: 8182,
        user: 'user',
        password: 'pass',
        maxRetries: 1,
        minTimeout: 1,
        maxTimeout: 1,
        backoffFactor: 1,
    },
    metrics: { statsd: { host: "localhost", port: 8125 } },
    logging: { logLevel: "debug" },
    auth: { jwt: { secret: "sfD*okj2398!ru9aWad^IOEa", expiration: "128d" } },
    es: {
        node: 'http://localhost:9200',
        apiKey: 'test-key',
        mainIndex: 'main',
        profileIndex: 'profile',
        defaultResultSize: 10000,
        defaultPaginationSize: 10,
        defaultSuggestionResultSize: 5,
    },
    aws: {
        region: 'us-west-2',
        s3: { userMediaBucket: 'linsta-public' },
        location: { apiKey: 'fake-key', index: 'test-index' },
        ses: {
            defaultReplyAddress: "no-reply@lboydstun.com",
            imageHostName: "https://linsta-public.s3.us-west-2.amazonaws.com"
        },        
    },    
};