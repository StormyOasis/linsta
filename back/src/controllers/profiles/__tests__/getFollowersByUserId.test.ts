/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handlerActions as handler } from '../getFollowersByUserId';

import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../utils/utils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

const validUserId = 'user123';
const validRequestorUserId = 'user456';

const validData = {
    userId: validUserId,
    requestorUserId: validRequestorUserId
};

const validVertex = {
    id: 'user789',
    properties: {
        profileId: 'profile789',
        bio: 'bio',
        pfp: 'pfp',
        userName: 'alice',
        firstName: 'Alice',
        lastName: 'Smith',
        gender: 'female',
        pronouns: 'she/her',
        link: 'link'
    }
};

describe('getFollowersByUserId handler', () => {
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
        (utils.getVertexPropertySafe as jest.Mock).mockImplementation((props, key) => props[key]);
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.P as jest.Mock).mockReturnValue({ within: jest.fn().mockReturnValue('within') });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
    });

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userId is missing', async () => {
        const event = mockEvent({ requestorUserId: validRequestorUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if requestorUserId is missing', async () => {
        const event = mockEvent({ userId: validUserId });
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

    it('returns empty array if no followers found', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(null));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalledWith([]);
        expect(result.statusCode).toBe(200);
    });

    it('returns followers with isFollowed set correctly', async () => {
        // First call returns followers, second call returns mutuals
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([validVertex]))
            .mockResolvedValueOnce(makeGremlinChainMock([{ id: validVertex.id }]));

        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(utils.handleSuccess).toHaveBeenCalled();
        expect(result.statusCode).toBe(200);

        const callArg = (utils.handleSuccess as jest.Mock).mock.calls[0][0];
        expect(Array.isArray(callArg)).toBe(true);
        expect(callArg[0].userId).toBe(validVertex.id);
        expect(callArg[0].isFollowed).toBe(true);
    });

    it('returns followers with isFollowed false if not mutual', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([validVertex]))
            .mockResolvedValueOnce(makeGremlinChainMock([]));

        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;

        const callArg = (utils.handleSuccess as jest.Mock).mock.calls[0][0];
        expect(callArg[0].isFollowed).toBe(false);
        expect(result.statusCode).toBe(200);
    });

    it('returns error if an exception is thrown', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting followers");
        expect(result.statusCode).toBe(400);
    });
});