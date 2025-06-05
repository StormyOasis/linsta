/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handler } from '../bulkGetProfilesAndFollowing';
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
const validRequestorUserId = 'user123';
const validUserIds = ['user123', 'user456'];

const validProfileVertex = {
    id: 'user123',
    properties: {
        profileId: 'profile123',
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

const validProfileMap = new Map([["User", validProfileVertex]]);

const validFollowerVertex = {
    id: 'user456',
    properties: {
        profileId: 'profile456',
        bio: 'bio2',
        pfp: 'pfp2',
        userName: 'bob',
        firstName: 'Bob',
        lastName: 'Jones',
        gender: 'male',
        pronouns: 'he/him',
        link: 'link2'
    }
};

const validFollowerMap = new Map([["alice", [validFollowerVertex]]]);

describe('bulkGetProfilesAndFollowing handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg, code?) => ({ statusCode: code || 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (utils.verifyJWT as jest.Mock).mockReturnValue(true);
        (utils.getVertexPropertySafe as jest.Mock).mockImplementation((props, key) => props[key]);
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
    });

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userId is missing', async () => {
        const event = mockEvent({ userIds: validUserIds, requestorUserId: validRequestorUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userIds is missing', async () => {
        const event = mockEvent({ userId: validUserId, requestorUserId: validRequestorUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userIds is empty', async () => {
        const event = mockEvent({ userId: validUserId, userIds: [], requestorUserId: validRequestorUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const event = mockEvent({ userId: validUserId, userIds: validUserIds, requestorUserId: validRequestorUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns error if profile results are missing', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(null));
        const event = mockEvent({ userId: validUserId, userIds: validUserIds, requestorUserId: validRequestorUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting profiles");
        expect(result.statusCode).toBe(400);
    });

    it('returns profiles with followers and isFollowed', async () => {
        // Mock profile results
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([validProfileMap]))
            .mockResolvedValueOnce(makeGremlinChainMock([validFollowerMap]));

        const event = mockEvent({ userId: validUserId, userIds: validUserIds, requestorUserId: validRequestorUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;

        expect(utils.handleSuccess).toHaveBeenCalled();
        expect(result.statusCode).toBe(200);

        // Check that isFollowed is set correctly
        const callArg = (utils.handleSuccess as jest.Mock).mock.calls[0][0];
        expect(callArg[validProfileVertex.id].isFollowed).toBe(false); // user123 is not in followers
        expect(callArg[validProfileVertex.id].followers).toBeDefined();
    });

    it('sets isFollowed true if user is in followers', async () => {
        // Follower's userId matches data.userId
        const followerWithSameId = { ...validFollowerVertex, id: validUserId, properties: validFollowerVertex.properties };
        const followerMapWithSelf = new Map([["alice", [followerWithSameId]]]);

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([validProfileMap]))
            .mockResolvedValueOnce(makeGremlinChainMock([followerMapWithSelf]));

        const event = mockEvent({ userId: validUserId, userIds: validUserIds, requestorUserId: validRequestorUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;

        const callArg = (utils.handleSuccess as jest.Mock).mock.calls[0][0];
        expect(callArg[validProfileVertex.id].isFollowed).toBe(true);
        expect(result.statusCode).toBe(200);
    });

    it('returns error if an exception is thrown', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ userId: validUserId, userIds: validUserIds, requestorUserId: validRequestorUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting profiles");
        expect(result.statusCode).toBe(400);
    });
});