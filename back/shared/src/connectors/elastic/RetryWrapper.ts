import pRetry, { FailedAttemptError } from 'p-retry';
import logger from "../../logger";
import config from "../../config";
import metrics from '../../metrics';

type AsyncFunction<T> = () => Promise<T>;

export const withRetries = async <T>(fn: AsyncFunction<T>): Promise<T> => {
    return await pRetry(fn, {
        retries: config.database.maxRetries,                  // number of retry attempts
        minTimeout: config.database.minTimeout,              // initial wait time (ms)
        maxTimeout: config.database.maxTimeout,             // max wait time (ms)
        factor: config.database.backoffFactor,             // exponential backoff factor
        onFailedAttempt: (error: FailedAttemptError) => {
            metrics.increment("db.connectionFailure");
            logger.warn(
                `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Error:`, error);            
        }
    }) as Promise<T>;
}