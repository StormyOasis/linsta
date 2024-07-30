import winston from "winston";
import config from 'config';

const { combine, timestamp, json } = winston.format;

const logger = winston.createLogger({
    level: config.get("logging.logLevel"),
    format: combine(timestamp(), json()),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: 'logs/combined.log',
        }),
        new winston.transports.File({
            filename: 'logs/app-error.log',
            level: 'error',
        })]
});

export default logger;