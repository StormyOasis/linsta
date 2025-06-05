/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handlerActions as handler } from '../postGetPostById';
import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../config');
jest.mock('../../../utils/utils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

const validPostId = 'post123';
const validRequestorUserId = 'user123';

describe('postGetPostById handler', () => {
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
        (utils.getPostByPostId as jest.Mock).mockResolvedValue({ postId: validPostId });
    });

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting post");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if postId is missing', async () => {
        const event = mockEvent({ requestorUserId: validRequestorUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting post");
        expect(result.statusCode).toBe(400);
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const event = mockEvent({ postId: validPostId, requestorUserId: validRequestorUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns post if found', async () => {
        const event = mockEvent({ postId: validPostId, requestorUserId: validRequestorUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.getPostByPostId).toHaveBeenCalledWith(validPostId);
        expect(utils.handleSuccess).toHaveBeenCalledWith({ postId: validPostId });
        expect(result.statusCode).toBe(200);
    });

    it('returns error if getPostByPostId throws', async () => {
        (utils.getPostByPostId as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ postId: validPostId, requestorUserId: validRequestorUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting post");
        expect(result.statusCode).toBe(400);
    });
});