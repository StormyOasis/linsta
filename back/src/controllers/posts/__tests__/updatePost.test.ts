/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handlerActions as handler } from '../updatePost';
import RedisConnector from '../../../connectors/RedisConnector';
import * as ESConnectorModule from '../../../connectors/ESConnector';
import * as utils from '../../../utils/utils';
import * as textUtils from '../../../utils/textUtils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../connectors/RedisConnector');
jest.mock('../../../connectors/ESConnector');
jest.mock('../../../utils/utils');
jest.mock('../../../utils/textUtils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

const validPostId = 'post123';
const validRequestorUserId = 'user123';
const validEsId = 'esid123';
const validUserId = 'user123';

const validData = {
    postId: validPostId,
    requestorUserId: validRequestorUserId,
    fields: {
        commentsDisabled: true,
        likesDisabled: false,
        locationText: 'loc',
        captionText: 'caption',
        altText: ['alt1', 'alt2']
    }
};

describe('updatePost handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.getInstance as jest.Mock).mockReturnValue({
            increment: jest.fn(),
            flush: jest.fn(),
            timing: jest.fn(),
            gauge: jest.fn(),
            histogram: jest.fn(),
        });
        (Metrics.getInstance().increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg, code?) => ({ statusCode: code || 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (utils.verifyJWT as jest.Mock).mockReturnValue(true);
        (textUtils.sanitizeInput as jest.Mock).mockImplementation((x) => x);
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.T as jest.Mock).mockReturnValue({ id: 'id' });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock([
            {
                post: { id: validPostId, esId: validEsId },
                user: validUserId
            }
        ]));
        (DBConnector.unwrapResult as jest.Mock).mockImplementation((x) => x);
        (DBConnector.parseGraphResult as jest.Mock).mockImplementation((x) => x);
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            update: jest.fn().mockResolvedValue({
                result: 'updated',
                _id: validEsId,
                get: { _source: { postId: validPostId, updated: true } }
            })
        });
        (RedisConnector.set as jest.Mock).mockResolvedValue(undefined);
    });

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if postId is missing', async () => {
        const event = mockEvent({ requestorUserId: validRequestorUserId, fields: validData.fields });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if fields is missing', async () => {
        const event = mockEvent({ postId: validPostId, requestorUserId: validRequestorUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns error if no results from graph', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock([]));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error updating post");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if esId or userId is missing', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock([
            { post: {}, user: undefined }
        ]));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error updating post");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if ES update fails', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValueOnce({
            update: jest.fn().mockResolvedValue({ result: 'error' })
        });
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error updating post");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if ES update returns no post', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValueOnce({
            update: jest.fn().mockResolvedValue({
                result: 'updated',
                _id: validEsId,
                get: { _source: null }
            })
        });
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error updating post");
        expect(result.statusCode).toBe(400);
    });

    it('returns success if post is updated', async () => {
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(RedisConnector.set).toHaveBeenCalledWith(validEsId, JSON.stringify({ postId: validPostId, updated: true }));
        expect(utils.handleSuccess).toHaveBeenCalledWith({ postId: validPostId, updated: true });
        expect(result.statusCode).toBe(200);
    });

    it('returns error if an exception is thrown', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error updating posts");
        expect(result.statusCode).toBe(400);
    });
});