/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handlerActions as handler } from '../getFollowingByUserId';
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

const validData = {
    userId: validUserId
};

const validVertex = {
    id: 'user456',
    properties: {
        profileId: 'profile456',
        bio: 'bio',
        pfp: 'pfp',
        userName: 'bob',
        firstName: 'Bob',
        lastName: 'Jones',
        gender: 'male',
        pronouns: 'he/him',
        link: 'link'
    }
};

describe('getFollowingByUserId handler', () => {
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
        (utils.getVertexPropertySafe as jest.Mock).mockImplementation((props, key) => props[key]);
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
        (DBConnector.Column as jest.Mock).mockReturnValue(makeGremlinChainMock());
    });

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userId is missing', async () => {
        const event = mockEvent({});
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns empty array if no following found', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(null));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalledWith([]);
        expect(result.statusCode).toBe(200);
    });

    it('returns following users with isFollowed true', async () => {
        // Simulate Gremlin result structure
        const map = new Map([["bob", [validVertex]]]);
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock([map]));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(utils.handleSuccess).toHaveBeenCalled();
        expect(result.statusCode).toBe(200);

        const callArg = (utils.handleSuccess as jest.Mock).mock.calls[0][0];
        expect(Array.isArray(callArg)).toBe(true);
        expect(callArg[0].userId).toBe(validVertex.id);
        expect(callArg[0].isFollowed).toBe(true);
    });

    it('returns error if an exception is thrown', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting following users");
        expect(result.statusCode).toBe(400);
    });
});