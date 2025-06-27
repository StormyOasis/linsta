// Text utilities
export { 
    sanitize, 
    sanitizeInput, 
    extractFromMultipleTexts, 
    isValidPassword, 
    isEmail, 
    isPhone, 
    stripNonNumericCharacters,
    obfuscateEmail,
    obfuscatePhone,
    convertSingleToDoubleQuotes,
    extractHashtags,
    extractHashtagsAndMentions,
    extractTextSuggestionsFlat,
    isHashtag,
    isMention
} from './textUtils';

// Logger & Config
export { default as logger } from './logger';
export { default as config } from './config';

// Metrics
export { default as metrics } from './metrics';
export { withMetrics } from './metrics';

// Core utilities
export {
    handleSuccess,
    handleValidationError,
    mapToObjectDeep,
    getProfile,
    getPostByPostId,
    getEsIdFromGraph,
    getLikesByPost,
    getPfpByUserId,
    getPostFromCacheOrES,
    updateEntryUrl,
    getFileExtension,
    getFileExtByMimeType, 
    updateProfileInRedis
} from './utils';

// AWS Connector
export {
    removeFile,
    uploadFile,
    FORGOT_PASSWORD_TEMPLATE,
    SEND_CONFIRM_TEMPLATE,
    getLocationData,
    sendEmailByTemplate,
    sendSMS,
    sendImageProcessingMessage,
    uploadProcessedImage, 
    getFileFromS3,
    ImageProcessingMessage
} from './connectors/AWSConnector';

// DB Connector
export {
    default as DBConnector,
    EDGE_CHILD_TO_PARENT_COMMENT,
    EDGE_COMMENT_TO_POST,
    EDGE_COMMENT_TO_USER,
    EDGE_PARENT_TO_CHILD_COMMENT,
    EDGE_POST_TO_COMMENT,
    EDGE_USER_TO_COMMENT,
    EDGE_POST_TO_USER,
    EDGE_USER_TO_POST,
    EDGE_TOKEN_TO_USER,
    EDGE_USER_TO_TOKEN,
    EDGE_USER_FOLLOWS,
    EDGE_COMMENT_LIKED_BY_USER,
    EDGE_POST_LIKED_BY_USER,
    EDGE_USER_LIKED_COMMENT,
    EDGE_USER_LIKED_POST
} from './connectors/DBConnector';

// Redis Connector
export { default as RedisConnector } from './connectors/RedisConnector';

// Elasticsearch Connectors
export {
    default as ESConnector,
    updatePostIdInES,
    buildPostSortClause,
    buildSearchResultSet,    
} from './connectors/elastic/ESConnector';

export { SuggestService } from './connectors/elastic/SuggestService';
export { SearchService } from './connectors/elastic/SearchService';
export { IndexService } from './connectors/elastic/IndexService';

// Types
export * from './types';