import { Destination, SendTemplatedEmailCommand } from "@aws-sdk/client-ses";
import { SESClient } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { LocationClient, SearchPlaceIndexForTextCommand } from "@aws-sdk/client-location";
import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import formidable from 'formidable';
import config from 'config';
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";
import { readFileSync } from "fs";

export const SEND_CONFIRM_TEMPLATE = `sendconfirmemail`;
export const FORGOT_PASSWORD_TEMPLATE = `forgotpasswordemail`;

export type SESTemplate = {
    destination: Destination;
    source: string;
    template: string;
    templateData: object;
}

export const sendEmailByTemplate = async (templateName: string, params: SESTemplate) => {
    const command = new SendTemplatedEmailCommand({
        Destination: params.destination,
        Source: params.source,
        Template: templateName,
        TemplateData: JSON.stringify(params.templateData)
    });

    try {
        const REGION: string = config.get("aws.region");
        const sesClient = new SESClient({ region: REGION });

        return await sesClient.send(command);
    } catch (error) {
        logger.error("Failure sending email", error);
        Metrics.increment("aws.sesfailurecount");
        return {};
    }
}

export const sendSMS = async (phoneNumber: string, message: string) => {
    try {
        const REGION: string = config.get("aws.region");
        const snsClient = new SNSClient({ region: REGION });

        const response = await snsClient.send(
            new PublishCommand({
                Message: message,
                PhoneNumber: phoneNumber,
            }),
        );

        console.log(response);

        return true;
    } catch (error) {
        logger.error("Failure sending sms", error);
        Metrics.increment("aws.smsfailurecount");

        return false;
    }
}

export const getLocationData = async (term: string) => {
    const authHelper = await withAPIKey(config.get("aws.location.apiKey"));

    const client = new LocationClient({
        region: config.get("aws.region"),
        ...authHelper.getLocationClientConfig()
    });

    const input = {
        IndexName: `${config.get("aws.location.index")}`,
        Text: term
    }

    const command = new SearchPlaceIndexForTextCommand(input);
    const response = await client.send(command);

    return response;
}

export const uploadFile = async (file: formidable.File, entryId: string, userId: string, fileExt?: string)
    :Promise<{ tag: string, url: string }> => {

    try {
        if (file === null) {
            throw new Error("Invalid filename");
        }

        const REGION: string = config.get("aws.region");
        const s3Client = new S3Client({ region: REGION });
        const key = `${userId}/${entryId}${fileExt}`;
        const bucket = config.get("aws.s3.userMediaBucket") as string;

        const result = await s3Client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: readFileSync(file.filepath)
        }));

        return {
            tag: (result.ETag as string),
            url: `https://${bucket}.s3.${REGION}.amazonaws.com/${key}`
        };

    } catch (err) {
        logger.error("Error uploading to s3", err);
        throw err;
    }
}