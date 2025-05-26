import { SESClient, SendTemplatedEmailCommand } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { LocationClient, SearchPlaceIndexForTextCommand } from "@aws-sdk/client-location";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import * as awsFunctions from '../AWSConnector';
import formidable from 'formidable';
import path from "path";

import * as fs from 'fs';
import { readFileSync } from "fs";

import logger from '../../logger/logger';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),  // Keep all other fs methods intact
    readFileSync: jest.fn(),      // Mock only readFileSync method
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
jest.mock('../../logger/logger');
jest.mock('../../metrics/Metrics');

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
    it("should return location data successfully", async () => {
        mockSearchPlaceIndexForTextCommand.mockResolvedValueOnce({ Results: [{ Place: 'Test Place' }] });

        const term = 'Test';
        await expect(awsFunctions.getLocationData(term)).resolves.toEqual({ Results: [{ Place: 'Test Place' }] });
    });

    it("should throw error when location data fetch fails", async () => {
        mockSearchPlaceIndexForTextCommand.mockRejectedValueOnce(new Error('Location service failed'));

        const term = 'Test';
        await expect(awsFunctions.getLocationData(term)).rejects.toThrow('Failed to fetch location data');
    });
});

describe("uploadFile", () => {
    let mockSend: jest.Mock;
    let mockPutObjectCommand: jest.Mock;

    beforeEach(() => {
        // Mock the send method of S3Client
        mockSend = jest.fn();
        (S3Client as jest.Mock).mockImplementation(() => {
            return { send: mockSend }; // Return mock send method
        });

        // Mock PutObjectCommand's constructor and behavior
        mockPutObjectCommand = PutObjectCommand as unknown as jest.Mock;
        mockPutObjectCommand.mockImplementation((params) => {
            // Store parameters passed to PutObjectCommand for later verification
            return {
                send: mockSend,
                params, // Store params passed to the constructor
            };
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should upload file successfully", async () => {
        const mockFile = {
            filepath: path.resolve(__dirname, 'test-file.txt'),
            originalFilename: 'test-file.txt'
        } as unknown as formidable.File;

        const mockResult = { ETag: '"mock-etag"' };
        mockSend.mockResolvedValueOnce(mockResult);

        // Mock the S3Client and make sure the send method resolves
        S3Client.prototype.send = mockSend;

        (readFileSync as jest.Mock).mockReturnValue(Buffer.from('test content'));

        const result = await awsFunctions.uploadFile(mockFile, "123456", "testuser", ".txt");
        expect(result.tag).toBe('"mock-etag"');
        expect(result.url).toBe(`https://linsta-public.s3.us-west-2.amazonaws.com/testuser/123456.txt`);

        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith(
            expect.objectContaining({
                params: {
                    Bucket: "linsta-public",
                    Key: "testuser/123456.txt",
                    Body: expect.any(Buffer),
                }
            })
        );
        expect(mockPutObjectCommand).toHaveBeenCalledWith({
            Bucket: 'linsta-public',
            Key: 'testuser/123456.txt',
            Body: expect.any(Buffer), // Ensuring Body is a Buffer
        });
    });

    it("should throw error when upload fails", async () => {
        const mockFile = {
            filepath: path.resolve(__dirname, 'test-file.txt'),
            originalFilename: 'test-file.txt'
        } as unknown as formidable.File;

        mockSend.mockRejectedValueOnce(new Error('S3 upload failed'));
        S3Client.prototype.send = mockSend;

        await expect(awsFunctions.uploadFile(mockFile, "123456", "testuser", ".txt")).rejects.toThrow('File upload failed.');
        expect(logger.error).toHaveBeenCalledWith('Error uploading to s3', expect.any(Error));
    });
});

describe("removeFile", () => {
    let mockSend: jest.Mock;
    let mockDeleteObjectCommand: jest.Mock;

    beforeEach(() => {
        // Mock the send method of S3Client
        mockSend = jest.fn();
        (S3Client as jest.Mock).mockImplementation(() => {
            return { send: mockSend }; // Return mock send method
        });

        // Mock DeleteObjectCommand's constructor and behavior
        mockDeleteObjectCommand = DeleteObjectCommand as unknown as jest.Mock;
        mockDeleteObjectCommand.mockImplementation((params) => {
            // Return an object with the mocked send function, simulating the behavior of DeleteObjectCommand
            return {
                send: mockSend,
                params, // Store the parameters for later verification
            };
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });    

    it("should remove file successfully", async () => {
        const mockResult = { $metadata: { httpStatusCode: 204 } };
        mockSend.mockResolvedValueOnce(mockResult);
        S3Client.prototype.send = mockSend;

        await expect(awsFunctions.removeFile("https://linsta-public.s3.us-west-2.amazonaws.com/testuser/123456.txt")).resolves.not.toThrow();

        // Ensure the AWS SDK's send method was called with the correct parameters
        expect(mockSend).toHaveBeenCalledWith(
            expect.objectContaining({
                params:{ 
                    Bucket: 'linsta-public',
                    Key: 'testuser/123456.txt',
                }
            })
        );

        // Verify that DeleteObjectCommand constructor was called with the correct parameters
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
        S3Client.prototype.send = mockSend;

        const fileName = 'https://bucket-name.s3.region.amazonaws.com/user123/entry123.jpg';
        await expect(awsFunctions.removeFile(fileName)).rejects.toThrow('Failed to remove file.');
    });
});
