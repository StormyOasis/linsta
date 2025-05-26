import { Destination, SendTemplatedEmailCommand } from "@aws-sdk/client-ses";
import { SESClient } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { LocationClient, SearchPlaceIndexForTextCommand } from "@aws-sdk/client-location";
import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import formidable from 'formidable';
import config from '../config';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAWSClient = <T extends { new (...args: any[]): any }>(ClientConstructor: T, clientConfig: object): InstanceType<T> => {
    const REGION: string = config.aws.region;
    return new ClientConstructor({ region: REGION, ...clientConfig });
};

export const sendEmailByTemplate = async (templateName: string, params: SESTemplate) => {
    const command = new SendTemplatedEmailCommand({
        Destination: params.destination,
        Source: params.source,
        Template: templateName,
        TemplateData: JSON.stringify(params.templateData)
    });

    try {
        const sesClient = getAWSClient(SESClient, {});

        return await sesClient.send(command);
    } catch (error) {
        logger.error("Failure sending email", error);
        Metrics.increment("aws.sesfailurecount");
        throw new Error("Failed to send email via SES.");
    }
}

export const sendSMS = async (phoneNumber: string, message: string):Promise<boolean> => {
    try {
        const snsClient = getAWSClient(SNSClient, {});

        await snsClient.send(
            new PublishCommand({
                Message: message,
                PhoneNumber: phoneNumber,
            }),
        );

        return true;
    } catch (error) {
        logger.error("Failure sending sms", error);
        Metrics.increment("aws.smsfailurecount");

        return false;
    }
}

export const getLocationData = async (term: string) => {
    try {
        const authHelper = await withAPIKey(config.aws.location.apiKey);
        const client = getAWSClient(LocationClient, authHelper.getLocationClientConfig());
        const input = {
            IndexName: `${config.aws.location.index}`,
            Text: term
        }

        const command = new SearchPlaceIndexForTextCommand(input);
        const response = await client.send(command);

        return response;
    } catch(err) {
        logger.error("Error fetching location data", err);
        throw new Error("Failed to fetch location data");        
    }
}

export const uploadFile = async (file: formidable.File, entryId: string, userId: string, fileExt?: string)
    :Promise<{ tag: string, url: string }> => {

    try {
        if (file === null) {
            throw new Error("Invalid filename");
        }

        const s3Client = getAWSClient(S3Client, {});
        const key = `${userId}/${entryId}${fileExt}`;
        const bucket = config.aws.s3.userMediaBucket as string;

        const result = await s3Client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: readFileSync(file.filepath)
        }));

        return {
            tag: (result.ETag as string),
            url: `https://${bucket}.s3.${config.aws.region}.amazonaws.com/${key}`
        };

    } catch (err) {
        logger.error("Error uploading to s3", err);
        throw new Error("File upload failed.");
    }
}

export const removeFile = async (fileName: string):Promise<void> => {
    if(fileName == null || fileName.length === 0) {
        return;
    }

    try {
        const s3FileName = new URL(fileName).pathname.substring(1);
        const s3Client = getAWSClient(S3Client, {});
        const bucket = config.aws.s3.userMediaBucket as string;

        await s3Client.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: s3FileName
        }));
    } catch (error) {
        logger.error("Error removing file from S3", error);
        throw new Error("Failed to remove file.");
    }
}