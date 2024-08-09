import { SendTemplatedEmailCommand } from "@aws-sdk/client-ses";
import { SESClient } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import config from 'config';
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";
export const SEND_CONFIRM_TEMPLATE = `sendconfirmemail`;
export const FORGOT_PASSWORD_TEMPLATE = `forgotpasswordemail`;
export const sendEmailByTemplate = async (templateName, params) => {
    const command = new SendTemplatedEmailCommand({
        Destination: params.destination,
        Source: params.source,
        Template: templateName,
        TemplateData: JSON.stringify(params.templateData)
    });
    try {
        const REGION = config.get("aws.region");
        const sesClient = new SESClient({ region: REGION });
        return await sesClient.send(command);
    }
    catch (error) {
        logger.error("Failure sending email", error);
        Metrics.increment("aws.sesfailurecount");
        return {};
    }
};
export const sendSMS = async (phoneNumber, message) => {
    try {
        const REGION = config.get("aws.region");
        const snsClient = new SNSClient({ region: REGION });
        const response = await snsClient.send(new PublishCommand({
            Message: message,
            PhoneNumber: phoneNumber,
        }));
        console.log(response);
        return true;
    }
    catch (error) {
        logger.error("Failure sending sms", error);
        Metrics.increment("aws.smsfailurecount");
        return false;
    }
};
