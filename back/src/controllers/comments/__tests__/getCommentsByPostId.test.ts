/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import { handlerActions as handler } from '../getCommentsByPostId';
import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('jsonwebtoken');
jest.mock('../../../connectors/DBConnector');
jest.mock('../../../utils/utils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

describe('getCommentsByPostId handler', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        (Metrics.getInstance as jest.Mock).mockReturnValue({
            increment: jest.fn(),
            flush: jest.fn(),
            timing: jest.fn(),
            gauge: jest.fn(),
            histogram: jest.fn(),
        });
        (logger.error as jest.Mock).mockImplementation(() => { });
        (Metrics.getInstance().increment as jest.Mock).mockImplementation(() => { });
        (utils.handleValidationError as jest.Mock).mockImplementation((msg, code?) => ({ statusCode: code || 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.P as jest.Mock).mockReturnValue({ neq: jest.fn().mockReturnValue('neq') });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
    });

    it('returns validation error if postId is missing', async () => {
        const event = mockEvent({});
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params");
    });

    it('returns error if DB throws', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ postId: 'p1', requestorUserId: 'user123' });
        (utils.verifyJWT as jest.Mock).mockReturnValue({ id: 'user123' });
        await handler("", event);
        expect(logger.error).toHaveBeenCalledWith(expect.any(String));
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting comment");
    });

    it('returns comments if found', async () => {
        const gremlinResults = [
            new Map([
                ["comment", {
                    id: "c1",
                    properties: { dateTime: "2024-01-01T00:00:00Z", text: "hello" }
                }]
            ]),
            new Map([
                ["user", {
                    id: "u1",
                    properties: { userName: "alice", pfp: "pfp1" }
                }]
            ]),
            new Map([
                ["comment_to_user", { outV: { id: "c1" }, inV: { id: "u1" } }]
            ])
        ];
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(gremlinResults));

        // Mock likes for the comment
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock([]));
        // Simulate DB returns comments array
        (utils.verifyJWT as jest.Mock).mockReturnValue({ id: 'user123' });
        const event = mockEvent({ postId: 'p1', requestorUserId: 'user123' });
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(utils.handleSuccess).toHaveBeenCalled();
        expect(result.statusCode).toBe(200);
    });

    it('returns empty array if no comments found', async () => {
        const gremlinResults = [
            new Map([]),
            new Map([
                ["user", {
                    id: "u1",
                    properties: { userName: "alice", pfp: "pfp1" }
                }]
            ]),
            new Map([])
        ];
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(gremlinResults));
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock([]));

        const event = mockEvent({ postId: 'p1', requestorUserId: 'user123' });
        (utils.verifyJWT as jest.Mock).mockReturnValue({ id: 'user123' });
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(utils.handleSuccess).toHaveBeenCalledWith([]);
        expect(result.statusCode).toBe(200);
    });

    it('returns validation error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params");
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const event = mockEvent({ postId: 'p1', requestorUserId: 'user123' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
    });

    it('returns error if DB returns null', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(null));
        (utils.verifyJWT as jest.Mock).mockReturnValue({ id: 'user123' });
        const event = mockEvent({ postId: 'p1', requestorUserId: 'user123' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting comment");
    });

    it('returns error if user mapping is missing for a comment', async () => {
        const gremlinResults = [
            new Map([
                ["comment", {
                    id: "c1",
                    properties: { dateTime: "2024-01-01T00:00:00Z", text: "hello" }
                }]
            ])
            // No user or comment_to_user mapping
        ];
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(gremlinResults));
        (utils.verifyJWT as jest.Mock).mockReturnValue({ id: 'user123' });
        const event = mockEvent({ postId: 'p1', requestorUserId: 'user123' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid comment data");
    });

    it('returns comments with likes if found', async () => {
        const gremlinResults = [
            new Map([
                ["comment", {
                    id: "c1",
                    properties: { dateTime: "2024-01-01T00:00:00Z", text: "hello" }
                }]
            ]),
            new Map([
                ["user", {
                    id: "u1",
                    properties: { userName: "alice", pfp: "pfp1" }
                }]
            ]),
            new Map([
                ["comment_to_user", { outV: { id: "c1" }, inV: { id: "u1" } }]
            ])
        ];
        const likeUser = {
            id: "u2",
            properties: {
                userName: "bob",
                pfp: "pfp2",
                firstName: "Bob",
                lastName: "Smith",
                profileId: "profile2"
            }
        };
        const likeResults = [
            new Map([["user", likeUser]])
        ];
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(gremlinResults))
            .mockResolvedValueOnce(makeGremlinChainMock(likeResults));
        (utils.verifyJWT as jest.Mock).mockReturnValue({ id: 'user123' });
        const event = mockEvent({ postId: 'p1', requestorUserId: 'user123' });
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(utils.handleSuccess).toHaveBeenCalled();
        expect(result.statusCode).toBe(200);
    });
});