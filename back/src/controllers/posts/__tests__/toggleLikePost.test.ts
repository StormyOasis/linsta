/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EDGE_POST_LIKED_BY_USER, EDGE_USER_LIKED_POST, makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handlerActions as handler } from '../toggleLikePost';
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

const validPostId = 'post123';
const validUserId = 'user123';
const validRequestorUserId = 'user123';

const validData = {
    postId: validPostId,
    userId: validUserId,
    requestorUserId: validRequestorUserId
};

describe('toggleLikePost handler', () => {
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
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.beginTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.rollbackTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.commitTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
    });

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Missing postId or userId");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if postId is missing', async () => {
        const event = mockEvent({ userId: validUserId, requestorUserId: validRequestorUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Missing postId or userId");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userId is missing', async () => {
        const event = mockEvent({ postId: validPostId, requestorUserId: validRequestorUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Missing postId or userId");
        expect(result.statusCode).toBe(400);
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('unlikes the post if already liked', async () => {
        // Mock isLiked = true
        const hasNextMock = jest.fn().mockResolvedValue(true);
        const chain = makeGremlinChainMock();
        chain.V = jest.fn().mockReturnThis();
        chain.out = jest.fn().mockReturnThis();
        chain.hasId = jest.fn().mockReturnThis();
        chain.hasNext = hasNextMock;
        chain.outE = jest.fn().mockReturnThis();
        chain.filter = jest.fn().mockReturnThis();
        chain.inV = jest.fn().mockReturnThis();
        chain.drop = jest.fn().mockReturnThis();
        chain.iterate = jest.fn().mockResolvedValue(undefined);

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(chain) // for isLiked
            .mockResolvedValue(chain);    // for unlike edges

        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(DBConnector.beginTransaction).toHaveBeenCalled();
        expect(chain.V).toHaveBeenCalledWith(validUserId);
        expect(chain.out).toHaveBeenCalledWith(EDGE_USER_LIKED_POST);
        expect(chain.hasId).toHaveBeenCalledWith(validPostId);
        expect(chain.hasNext).toHaveBeenCalled();
        expect(chain.outE).toHaveBeenCalledWith(EDGE_POST_LIKED_BY_USER);
        expect(chain.filter).toHaveBeenCalled();
        expect(chain.drop).toHaveBeenCalled();
        expect(chain.iterate).toHaveBeenCalled();
        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ liked: false });
        expect(result.statusCode).toBe(200);
    });

    it('likes the post if not already liked', async () => {
        // Mock isLiked = false
        const hasNextMock = jest.fn().mockResolvedValue(false);
        const chain = makeGremlinChainMock({ value: { id: 'likeEdge' } });
        chain.V = jest.fn().mockReturnThis();
        chain.out = jest.fn().mockReturnThis();
        chain.hasId = jest.fn().mockReturnThis();
        chain.hasNext = hasNextMock;
        chain.as = jest.fn().mockReturnThis();
        chain.addE = jest.fn().mockReturnThis();
        chain.from_ = jest.fn().mockReturnThis();
        chain.to = jest.fn().mockReturnThis();
        chain.next = jest.fn().mockResolvedValue({ value: { id: 'likeEdge' } });

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(chain) // for isLiked
            .mockResolvedValue(chain);    // for like edges

        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(DBConnector.beginTransaction).toHaveBeenCalled();
        expect(chain.V).toHaveBeenCalledWith(validUserId);
        expect(chain.out).toHaveBeenCalledWith(EDGE_USER_LIKED_POST);
        expect(chain.hasId).toHaveBeenCalledWith(validPostId);
        expect(chain.hasNext).toHaveBeenCalled();
        expect(chain.addE).toHaveBeenCalledWith(EDGE_POST_LIKED_BY_USER);
        expect(chain.from_).toHaveBeenCalledWith("post");
        expect(chain.to).toHaveBeenCalledWith("user");
        expect(chain.addE).toHaveBeenCalledWith(EDGE_USER_LIKED_POST);
        expect(chain.from_).toHaveBeenCalledWith("user");
        expect(chain.to).toHaveBeenCalledWith("post");
        expect(chain.next).toHaveBeenCalled();
        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ liked: true });
        expect(result.statusCode).toBe(200);
    });

    it('rolls back and returns error if like edge creation fails', async () => {
        // Mock isLiked = false, but next() returns { value: null }
        const hasNextMock = jest.fn().mockResolvedValue(false);
        const chain = makeGremlinChainMock({ value: null });
        chain.V = jest.fn().mockReturnThis();
        chain.out = jest.fn().mockReturnThis();
        chain.hasId = jest.fn().mockReturnThis();
        chain.hasNext = hasNextMock;
        chain.as = jest.fn().mockReturnThis();
        chain.addE = jest.fn().mockReturnThis();
        chain.from_ = jest.fn().mockReturnThis();
        chain.to = jest.fn().mockReturnThis();
        chain.next = jest.fn().mockResolvedValue({ value: null });

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(chain) // for isLiked
            .mockResolvedValue(chain);    // for like edges

        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error toggling like state");
        expect(result.statusCode).toBe(400);
    });

    it('rolls back and returns error if an exception is thrown', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(logger.error).toHaveBeenCalledWith("Failed to toggle like", { userId: validUserId, postId: validPostId, err: expect.any(Error) });
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error toggling like state");
        expect(result.statusCode).toBe(400);
    });
});