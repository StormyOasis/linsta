import winston from "winston";
import config from 'config';

const { combine, timestamp, json } = winston.format;
let level: string | undefined = config.get("logging.logLevel");
if (level == null) {
    level = "info"
}

const logger = winston.createLogger({
    level: level,
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