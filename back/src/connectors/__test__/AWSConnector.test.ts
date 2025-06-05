/* eslint-disable @typescript-eslint/no-explicit-any */
import { SESClient } from "@aws-sdk/client-ses";
import { SNSClient } from "@aws-sdk/client-sns";
import { LocationClient } from "@aws-sdk/client-location";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import * as awsFunctions from '../AWSConnector';

import logger from '../../logger/logger';

jest.mock('../../metrics/Metrics');
jest.mock('../../logger/logger');
jest.mock('../../config', () => ({
    aws: {
        region: 'us-west-2',
        s3: { userMediaBucket: 'linsta-public' },
        location: { apiKey: 'fake-key', index: 'test-index' },
        ses: {
            defaultReplyAddress: "no-reply@lboydstun.com",
            imageHostName: "https://linsta-public.s3.us-west-2.amazonaws.com"
        },        
    },
    logging: {
        logLevel: "debug"
    },    
}));

jest.mock('../../metrics/Metrics', () => {
    return {
        __esModule: true,
        default: {
            getInstance: jest.fn(() => ({
                increment: jest.fn(),
                flush: jest.fn(),
                timing: jest.fn(),
                gauge: jest.fn(),
                histogram: jest.fn(),
            })),
        },
        Metrics: {
            getInstance: jest.fn(() => ({
                increment: jest.fn(),
                flush: jest.fn(),
                timing: jest.fn(),
                gauge: jest.fn(),
                histogram: jest.fn(),
            })),
        }
    };
});

jest.mock('@aws/amazon-location-utilities-auth-helper', () => ({
    withAPIKey: jest.fn().mockResolvedValue({
        getLocationClientConfig: () => ({ region: 'us-west-2' })
    })
}));

jest.mock('@aws-sdk/client-ses');
jest.mock('@aws-sdk/client-sns');
jest.mock('@aws-sdk/client-location');
jest.mock('@aws-sdk/client-s3', () => {
    return {
        S3Client: jest.fn().mockImplementation(() => ({
            send: jest.fn(),
        })),
        PutObjectCommand: jest.fn(),
        DeleteObjectCommand: jest.fn(),
    };
});

const mockSendTemplatedEmailCommand = jest.fn();
const mockPublishCommand = jest.fn();
const mockSearchPlaceIndexForTextCommand = jest.fn();

beforeEach(() => {
    SESClient.prototype.send = mockSendTemplatedEmailCommand;
    SNSClient.prototype.send = mockPublishCommand;
    LocationClient.prototype.send = mockSearchPlaceIndexForTextCommand;
});

describe("sendEmailByTemplate", () => {
    it("should send email successfully", async () => {
        mockSendTemplatedEmailCommand.mockResolvedValueOnce({ MessageId: '123' });

        const params = {
            destination: { ToAddresses: ['test@example.com'] },
            source: 'sender@example.com',
            template: 'sendconfirmemail',
            templateData: { name: 'John Doe' }
        };

        await expect(awsFunctions.sendEmailByTemplate('sendconfirmemail', params)).resolves.toEqual({ MessageId: '123' });
    });

    it("should throw an error when SES fails", async () => {
        mockSendTemplatedEmailCommand.mockRejectedValueOnce(new Error('SES failed'));

        const params = {
            destination: { ToAddresses: ['test@example.com'] },
            source: 'sender@example.com',
            template: 'sendconfirmemail',
            templateData: { name: 'John Doe' }
        };

        await expect(awsFunctions.sendEmailByTemplate('sendconfirmemail', params)).rejects.toThrow('Failed to send email via SES.');
    });
});

describe("sendSMS", () => {
    it("should send SMS successfully", async () => {
        mockPublishCommand.mockResolvedValueOnce({ MessageId: '123' });

        const phoneNumber = '1234567890';
        const message = 'Test SMS message';

        await expect(awsFunctions.sendSMS(phoneNumber, message)).resolves.toBe(true);
    });

    it("should fail to send SMS", async () => {
        mockPublishCommand.mockRejectedValueOnce(new Error('SNS failed'));

        const phoneNumber = '1234567890';
        const message = 'Test SMS message';

        await expect(awsFunctions.sendSMS(phoneNumber, message)).resolves.toBe(false);
    });
});

describe("getLocationData", () => {
    it("should throw error if withAPIKey fails", async () => {
        const originalWithAPIKey = require('@aws/amazon-location-utilities-auth-helper').withAPIKey;
        require('@aws/amazon-location-utilities-auth-helper').withAPIKey = jest.fn().mockRejectedValueOnce(new Error('API Key error'));
        await expect(awsFunctions.getLocationData('test')).rejects.toThrow('Failed to fetch location data');
        require('@aws/amazon-location-utilities-auth-helper').withAPIKey = originalWithAPIKey;
    });
});

describe("uploadFile", () => {
    let mockSend: jest.Mock;
    let mockPutObjectCommand: jest.Mock;

    beforeEach(() => {
        mockSend = jest.fn();
        (S3Client as jest.Mock).mockImplementation(() => ({ send: mockSend }));
        mockPutObjectCommand = PutObjectCommand as unknown as jest.Mock;
        mockPutObjectCommand.mockImplementation((params) => ({ params }));     
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should upload file successfully", async () => {
        const mockFile = {
            content: Buffer.from('test content'),
            contentType: 'text/plain',
            filename: 'test-file.txt',
            encoding: 'utf-8',
            fieldname: 'file'
        };
        const mockResult = { ETag: '"mock-etag"' };
        mockSend.mockResolvedValueOnce(mockResult);

        const result = await awsFunctions.uploadFile(mockFile, "123456", "testuser", ".txt");
        expect(result.tag).toBe('"mock-etag"');
        expect(result.url).toBe(`https://linsta-public.s3.us-west-2.amazonaws.com/testuser/123456.txt`);
        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockPutObjectCommand).toHaveBeenCalledWith({
            Bucket: 'linsta-public',
            Key: 'testuser/123456.txt',
            Body: expect.any(Buffer),
            ContentType: 'text/plain'
        });
    });

    it("should throw error when upload fails", async () => {
        const mockFile = {
            content: Buffer.from('test content'),
            contentType: 'text/plain',
            filename: 'test-file.txt',
            encoding: 'utf-8',
            fieldname: 'file'
        };
        mockSend.mockRejectedValueOnce(new Error('S3 upload failed'));
        await expect(awsFunctions.uploadFile(mockFile, "123456", "testuser", ".txt")).rejects.toThrow('File upload failed.');
        expect(logger.error).toHaveBeenCalledWith('Error uploading to s3', expect.any(Error));
    });

    it("should throw error if file is invalid", async () => {
        await expect(awsFunctions.uploadFile(undefined as any, "123", "user", ".txt")).rejects.toThrow("File upload failed.");
        await expect(awsFunctions.uploadFile({} as any, "123", "user", ".txt")).rejects.toThrow("File upload failed.");
    });
});

describe("removeFile", () => {
    let mockSend: jest.Mock;
    let mockDeleteObjectCommand: jest.Mock;

    beforeEach(() => {
        mockSend = jest.fn();
        (S3Client as jest.Mock).mockImplementation(() => ({ send: mockSend }));
        mockDeleteObjectCommand = DeleteObjectCommand as unknown as jest.Mock;
        mockDeleteObjectCommand.mockImplementation((params) => ({ params }));   
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should remove file successfully", async () => {
        mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 204 } });
        await expect(awsFunctions.removeFile("https://linsta-public.s3.us-west-2.amazonaws.com/testuser/123456.txt")).resolves.not.toThrow();
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            params: { Bucket: 'linsta-public', Key: 'testuser/123456.txt' }
        }));
        expect(mockDeleteObjectCommand).toHaveBeenCalledWith({
            Bucket: 'linsta-public',
            Key: 'testuser/123456.txt',
        });
    });

    it("should handle empty file name gracefully", async () => {
        await expect(awsFunctions.removeFile('')).resolves.toBeUndefined();
    });

    it("should throw error when file removal fails", async () => {
        mockSend.mockRejectedValueOnce(new Error('Failed to remove file from S3'));
        const fileName = 'https://bucket-name.s3.region.amazonaws.com/user123/entry123.jpg';
        await expect(awsFunctions.removeFile(fileName)).rejects.toThrow('Failed to remove file.');
        expect(logger.error).toHaveBeenCalledWith('Error removing file from S3', expect.any(Error));
    });
});

