/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import { handlerActions as handler } from '../addComment';
import * as utils from '../../../utils/utils';
import * as textUtils from '../../../utils/textUtils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../utils/utils');
jest.mock('../../../utils/textUtils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

describe('addComment handler', () => {
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
        (utils.getPostByPostId as jest.Mock).mockResolvedValue({ post: { global: { commentsDisabled: false } } });
        (textUtils.sanitize as jest.Mock).mockImplementation((x) => x);
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.P as jest.Mock).mockReturnValue({ neq: jest.fn().mockReturnValue('neq') });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
        (DBConnector.beginTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.rollbackTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.commitTransaction as jest.Mock).mockResolvedValue(undefined);
    });

    it('returns validation error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns validation error if required fields are missing', async () => {
        const event = mockEvent({ text: '', postId: '', userId: '' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const event = mockEvent({ text: 'hi', postId: '1', userId: '2', requestorUserId: '3' });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns error if post not found', async () => {
        (utils.getPostByPostId as jest.Mock).mockResolvedValueOnce(null);
        const event = mockEvent({ text: 'hi', postId: '1', userId: '2', requestorUserId: '2' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting post");
    });

    it('returns success if comments are disabled', async () => {
        (utils.getPostByPostId as jest.Mock).mockResolvedValueOnce({ post: { global: { commentsDisabled: true } } });
        const event = mockEvent({ text: 'hi', postId: '1', userId: '2', requestorUserId: '2' });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "Comments disabled for this post" });
        expect(result.statusCode).toBe(200);
    });

    it('returns error if comment vertex creation fails', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: null }));
        const event = mockEvent({ text: 'hi', postId: '1', userId: '2', requestorUserId: '2' });
        await handler("", event);
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error adding comment");
    });

    it('returns error if user-comment edge creation fails', async () => {
        // First vertex creation succeeds
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));
        const event = mockEvent({ text: 'hi', postId: '1', userId: '2', requestorUserId: '2' });
        await handler("", event);
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error adding comment");
    });

    it('returns error if comment-post edge creation fails', async () => {
        // First two succeed, third fails
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));
        const event = mockEvent({ text: 'hi', postId: '1', userId: '2', requestorUserId: '2' });
        await handler("", event);
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error adding comment");
    });

    it('returns error if parent comment edge creation fails', async () => {
        // All previous succeed, parent fails
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));
        const event = mockEvent({ text: 'hi', postId: '1', userId: '2', parentCommentId: 'parent', requestorUserId: '2' });
        await handler("", event);
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error adding comment");
    });

    it('returns success if comment is added without parent', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }));
        const event = mockEvent({ text: 'hi', postId: '1', userId: '2', requestorUserId: '2' });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ id: 'cid' });
        expect(result.statusCode).toBe(200);
    });

    it('returns success if comment is added with parent', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'cid' } }));
        const event = mockEvent({ text: 'hi', postId: '1', userId: '2', parentCommentId: 'parent', requestorUserId: '2' });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ id: 'cid' });
        expect(result.statusCode).toBe(200);
    });

    it('returns error and rolls back on exception', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ text: 'hi', postId: '1', userId: '2', requestorUserId: '2' });
        await handler("", event);
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error adding comment");
    });
});