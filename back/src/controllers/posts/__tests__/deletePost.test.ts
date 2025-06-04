/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handler } from '../deletePost';
import RedisConnector from '../../../connectors/RedisConnector';
import * as ESConnectorModule from '../../../connectors/ESConnector';
import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../connectors/RedisConnector');
jest.mock('../../../connectors/AWSConnector');
jest.mock('../../../connectors/ESConnector');
jest.mock('../../../utils/utils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

const validPostId = 'post123';
const validEsId = 'esid123';
const validUserId = 'user123';


describe('deletePost handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg, code?) => ({ statusCode: code || 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (utils.verifyJWT as jest.Mock).mockReturnValue(true);
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
        (DBConnector.beginTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.rollbackTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.commitTransaction as jest.Mock).mockResolvedValue(undefined);        
        (DBConnector.unwrapResult as jest.Mock).mockImplementation((x) => x);
        (DBConnector.parseGraphResult as jest.Mock).mockImplementation((x) => x);
        (RedisConnector.del as jest.Mock).mockResolvedValue(undefined);
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            delete: jest.fn().mockResolvedValue({ result: 'deleted' })
        });
    });

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if postId is missing', async () => {
        const event = mockEvent({});
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const result = await handler(mockEvent({ postId: validPostId, requestorUserId: validUserId }), {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns error if no results from graph', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock([]));
        const event = mockEvent({ postId: validPostId, requestorUserId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error deleting post");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if esId or userId is missing', async () => {
        (DBConnector.parseGraphResult as jest.Mock).mockReturnValueOnce({ post: {}, user: undefined });
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock([{}]));
        const event = mockEvent({ postId: validPostId, requestorUserId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error deleting post");
        expect(result.statusCode).toBe(400);
    });

    it('returns 403 if verifyJWT fails for owner', async () => {
        (DBConnector.parseGraphResult as jest.Mock).mockReturnValueOnce({ post: { esId: validEsId }, user: validUserId });
        (utils.verifyJWT as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock([{}]));
        const event = mockEvent({ postId: validPostId, requestorUserId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns error if no vertexIdsToDelete found', async () => {
        (DBConnector.parseGraphResult as jest.Mock).mockReturnValueOnce({ post: { esId: validEsId }, user: validUserId });
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([{}])) // for results
            .mockResolvedValueOnce(makeGremlinChainMock([])); // for vertexIdsToDelete
        const event = mockEvent({ postId: validPostId, requestorUserId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.warn).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error deleting post");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if ES delete fails', async () => {
        (DBConnector.parseGraphResult as jest.Mock).mockReturnValueOnce({ post: { esId: validEsId }, user: validUserId });
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([{}])) // for results
            .mockResolvedValueOnce(makeGremlinChainMock([validPostId])); // for vertexIdsToDelete
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValueOnce({
            delete: jest.fn().mockResolvedValue({ result: 'error' })
        });
        const event = mockEvent({ postId: validPostId, requestorUserId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error deleting post");
        expect(result.statusCode).toBe(400);
    });

    it('returns success if post is deleted', async () => {
        (DBConnector.parseGraphResult as jest.Mock).mockReturnValueOnce({ post: { esId: validEsId }, user: validUserId });
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([{}])) // for results
            .mockResolvedValueOnce(makeGremlinChainMock([validPostId])); // for vertexIdsToDelete
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValueOnce({
            delete: jest.fn().mockResolvedValue({ result: 'deleted' })
        });
        const event = mockEvent({ postId: validPostId, requestorUserId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(RedisConnector.del).toHaveBeenCalledWith(validEsId);
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "OK" });
        expect(result.statusCode).toBe(200);
    });

    it('returns error and rolls back on exception', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ postId: validPostId, requestorUserId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalled();
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error deleting post");
        expect(result.statusCode).toBe(400);
    });
});