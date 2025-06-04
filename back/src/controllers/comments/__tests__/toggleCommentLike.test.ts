/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import { handler } from '../toggleCommentLike';
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

describe('toggleCommentLike handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg, code?) => ({ statusCode: code || 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (utils.verifyJWT as jest.Mock).mockReturnValue(true);
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
    });

    it('returns validation error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns validation error if required fields are missing', async () => {
        const event = mockEvent({ commentId: '', userId: '' });
        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const event = mockEvent({ commentId: 'c1', userId: 'u1', requestorUserId: 'bad' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns error if isLikedResults is null', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(null));
        const event = mockEvent({ commentId: 'c1', userId: 'u1', requestorUserId: 'u1' });
        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting like status");
    });

    it('unlikes a comment if already liked', async () => {
        // Simulate isLikedResults returns non-empty array
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([{}])) // isLikedResults
            .mockResolvedValueOnce(makeGremlinChainMock([{}])) // drop comment->user
            .mockResolvedValueOnce(makeGremlinChainMock([{}])); // drop user->comment

        const event = mockEvent({ commentId: 'c1', userId: 'u1', requestorUserId: 'u1' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;

        expect(utils.handleSuccess).toHaveBeenCalledWith({ liked: false });
        expect(result.statusCode).toBe(200);
    });

    it('returns error if drop comment->user fails', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([{}])) // isLikedResults
            .mockResolvedValueOnce(makeGremlinChainMock(null)); // drop comment->user

        const event = mockEvent({ commentId: 'c1', userId: 'u1', requestorUserId: 'u1' });
        await handler(event, {} as any, undefined as any);

        expect(utils.handleValidationError).toHaveBeenCalledWith("Error changing like status");
    });

    it('returns error if drop user->comment fails', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([{}])) // isLikedResults
            .mockResolvedValueOnce(makeGremlinChainMock([{}])) // drop comment->user
            .mockResolvedValueOnce(makeGremlinChainMock(null)); // drop user->comment

        const event = mockEvent({ commentId: 'c1', userId: 'u1', requestorUserId: 'u1' });
        await handler(event, {} as any, undefined as any);

        expect(utils.handleValidationError).toHaveBeenCalledWith("Error changing like status");
    });

    it('likes a comment if not already liked', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([])) // isLikedResults
            .mockResolvedValueOnce(makeGremlinChainMock([{}])); // add edges

        const event = mockEvent({ commentId: 'c1', userId: 'u1', requestorUserId: 'u1' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;

        expect(utils.handleSuccess).toHaveBeenCalledWith({ liked: true });
        expect(result.statusCode).toBe(200);
    });

    it('returns error if add edges fails', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock([])) // isLikedResults
            .mockResolvedValueOnce(makeGremlinChainMock(null)); // add edges

        const event = mockEvent({ commentId: 'c1', userId: 'u1', requestorUserId: 'u1' });
        await handler(event, {} as any, undefined as any);

        expect(utils.handleValidationError).toHaveBeenCalledWith("Error changing like status");
    });

    it('returns error and logs if exception is thrown', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ commentId: 'c1', userId: 'u1', requestorUserId: 'u1' });
        await handler(event, {} as any, undefined as any);
        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error changing like status");
    });
});