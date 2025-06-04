/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handler } from '../addPost';
import RedisConnector from '../../../connectors/RedisConnector';
import * as AWSConnector from '../../../connectors/AWSConnector';
import * as ESConnectorModule from '../../../connectors/ESConnector';
import * as textUtils from '../../../utils/textUtils';
import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';
import * as multipart from 'lambda-multipart-parser';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../connectors/RedisConnector');
jest.mock('../../../connectors/AWSConnector');
jest.mock('../../../connectors/ESConnector');
jest.mock('../../../utils/textUtils');
jest.mock('../../../utils/utils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');
jest.mock('lambda-multipart-parser');

const mockEvent = (body: any = {}) => ({
    ...body
}) as any;

const validUser = { userId: 'u1', userName: 'alice', pfp: 'pfp' };
const validGlobal = { captionText: 'hi', locationText: 'there', commentsDisabled: false, likesDisabled: false };
const validEntries = [{ id: 'e1', alt: 'alt', userId: 'u1' }];
const validFiles = [{ fieldname: 'e1', contentType: 'image/png', content: Buffer.from('abc') }];

const validParsed = {
    user: JSON.stringify(validUser),
    global: JSON.stringify(validGlobal),
    entries: JSON.stringify(validEntries),
    files: validFiles,
    requestorUserId: 'u1'
};

describe('addPost handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg, code?) => ({ statusCode: code || 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (utils.verifyJWT as jest.Mock).mockReturnValue(true);
        (textUtils.sanitize as jest.Mock).mockImplementation((x) => x);
        (multipart.parse as jest.Mock).mockResolvedValue(validParsed);
        (AWSConnector.uploadFile as jest.Mock).mockResolvedValue({ tag: '"etag"', url: 'https://s3/file.png' });
        (ESConnectorModule.buildDataSetForES as jest.Mock).mockImplementation((u, g, e) => ({ user: u, global: g, media: e }));
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            insert: jest.fn().mockResolvedValue({ result: 'created', _id: 'esid' }),
            update: jest.fn().mockResolvedValue({}),
        });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock({ value: { id: 'postid' } }));
        (DBConnector.beginTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.commitTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.rollbackTransaction as jest.Mock).mockResolvedValue(undefined);
        (RedisConnector.set as jest.Mock).mockResolvedValue(undefined);
    });

    it('returns error if multipart parsing fails', async () => {
        (multipart.parse as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith("Error parsing multipart data", expect.any(Error));
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid form data");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if required fields are missing', async () => {
        (multipart.parse as jest.Mock).mockResolvedValueOnce({});
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if entries field is missing', async () => {
        (multipart.parse as jest.Mock).mockResolvedValueOnce({
            ...validParsed,
            entries: undefined
        });
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if graphResult for post vertex is null', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error adding post");
        expect(result.statusCode).toBe(400);
    });    

    it('returns error if JSON fields are invalid', async () => {
        (multipart.parse as jest.Mock).mockResolvedValueOnce({
            ...validParsed,
            user: '{badjson'
        });
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid JSON in fields");
        expect(result.statusCode).toBe(400);
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns error if a file is missing for an entry', async () => {
        (multipart.parse as jest.Mock).mockResolvedValueOnce({
            ...validParsed,
            files: []
        });
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Missing file for entry e1");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if uploadFile throws', async () => {
        (AWSConnector.uploadFile as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error adding post");
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(result.statusCode).toBe(400);
    });

    it('returns error if ES insert fails', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValueOnce({
            insert: jest.fn().mockResolvedValue({ result: 'error' }),
        });
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error adding post");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if graph post vertex creation fails', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'postid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error creating profile links");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if graph edge creation fails', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'postid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error creating profile links");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if ES update fails', async () => {
        const updateMock = jest.fn().mockRejectedValue(new Error('fail'));
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            insert: jest.fn().mockResolvedValue({ result: 'created', _id: 'esid' }),
            update: updateMock
        });
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(updateMock).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error adding post");
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(result.statusCode).toBe(400);
    });

    it('returns error if Redis set fails', async () => {
        (RedisConnector.set as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error adding post");
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(result.statusCode).toBe(400);
    });

    it('returns success if post is added', async () => {
        const result = await handler(mockEvent(), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "OK", postId: "postid" });
        expect(result.statusCode).toBe(200);
    });
});