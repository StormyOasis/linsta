import { Destination, SendTemplatedEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { LocationClient, SearchPlaceIndexForTextCommand } from "@aws-sdk/client-location";
import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import config from '../config';
import logger from "../logger";
import Metrics from "../metrics";
import { Entry } from "../types";
import formidable from 'formidable';
import { Readable } from "stream";
import { readFileSync } from "fs";

export const SEND_CONFIRM_TEMPLATE = `sendconfirmemail`;
export const FORGOT_PASSWORD_TEMPLATE = `forgotpasswordemail`;

export type SESTemplate = {
    destination: Destination;
    source: string;
    template: string;
    templateData: object;
}

export type ImageProcessingMessage = {
    type: "image_processing";
    version: "v1";
    data: {
        postEsId: string;
        entryId: string;
        key: string;
        compress: boolean;
        isVideo: boolean;
        currentAltText: string|null;
    };
};

export type AutoCaptionProcessingMessage = {
    type: "autoCaption_processing";
    version: "v1";
    data: {
        currentAltText: string|null;
        postId: string;
        entryId: string;
        key: string;
        isVideo: boolean;
        url: string;
    };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAWSClient = <T extends { new(...args: any[]): any }>(ClientConstructor: T, clientConfig: object): InstanceType<T> => {
    const REGION: string = config.aws.region;
    return new ClientConstructor({ region: REGION, ...clientConfig });
};

export const sendEmailByTemplate = async (templateName: string, params: SESTemplate) => {
    try {
        logger.info(`Creating SES client with region: ${config.aws.region}`);
        const command = new SendTemplatedEmailCommand({
            Destination: params.destination,
            Source: params.source,
            Template: templateName,
            TemplateData: JSON.stringify(params.templateData)
        });
        const sesClient = getAWSClient(SESClient, {});
        return await sesClient.send(command);
    } catch (error) {
        logger.error("Failure sending email", error);
        Metrics.increment("aws.sesfailurecount");
        throw new Error("Failed to send email via SES.");
    }
}

export const sendSMS = async (phoneNumber: string, message: string): Promise<boolean> => {
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
    } catch (err) {
        logger.error("Error fetching location data", err);
        throw new Error("Failed to fetch location data");
    }
}

export const uploadFile = async (
    file: formidable.File,
    entryId: string,
    userId: string,
    fileExt?: string
): Promise<{ tag: string, url: string }> => {
    try {
        if (!file) {
            throw new Error("Invalid file");
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

export const removeFile = async (fileName: string): Promise<void> => {
    if (!fileName || fileName.length === 0) {
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

export const getFileFromS3 = async (key: string): Promise<Buffer> => {
    const bucket = config.aws.s3.userMediaBucket;
    const s3Client = getAWSClient(S3Client, {});

    const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    }));

    const stream = response.Body as Readable;

    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
};

export const uploadProcessedImage = async (key: string, buffer: Buffer)
    : Promise<{ url: string; key: string }> => {

    const bucket = config.aws.s3.userMediaBucket;
    const s3Client = getAWSClient(S3Client, {});

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: 'image/webp',
        })
    );

    return {
        key,
        url: `https://${bucket}.s3.${config.aws.region}.amazonaws.com/${key}`,
    };
};

export const sendImageProcessingMessage = async (postEsId: string, entryId: string, key: string, isVideo: boolean, currentAltText: string|null) => {
    const message:ImageProcessingMessage = {
        type: "image_processing",
        version: "v1",
        data: {
            postEsId,
            entryId,
            key,
            isVideo,
            compress: true,
            currentAltText
        },
    };

    const sqsClient = getAWSClient(SQSClient, {});
    await sqsClient.send(new SendMessageCommand({
        QueueUrl: config.aws.sqs.imageQueueUrl,
        MessageBody: JSON.stringify(message),
    }));
};

export const sendAutoCaptionProcessingMessage = async (postId: string, entryId: string, key: string, isVideo: boolean, currentAltText: string|null) => {
    const message:AutoCaptionProcessingMessage = {
        type: "autoCaption_processing",
        version: "v1",
        data: {
            postId,
            entryId,
            key,
            currentAltText,
            isVideo
        },
    };

    const sqsClient = getAWSClient(SQSClient, {});
    await sqsClient.send(new SendMessageCommand({
        QueueUrl: config.aws.sqs.autoCaptionQueueUrl,
        MessageBody: JSON.stringify(message),
    }));
};