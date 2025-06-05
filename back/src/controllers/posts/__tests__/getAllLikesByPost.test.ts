/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import { handlerActions as handler } from '../getAllLikesByPost';
import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../utils/utils');
jest.mock('../../../config');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');

describe('getAllLikesByPost handler', () => {
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
        (utils.handleValidationError as jest.Mock).mockImplementation((msg) => ({ statusCode: 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
    });

    it('returns error if postId is missing', async () => {
        const event = { queryStringParameters: {} } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting all likes");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if postId is empty', async () => {
        const event = { queryStringParameters: { postId: '   ' } } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting all likes");
        expect(result.statusCode).toBe(400);
    });

    it('returns likes if found', async () => {
        const likes = [{ userId: 'u1' }, { userId: 'u2' }];
        (utils.getLikesByPost as jest.Mock).mockResolvedValueOnce(likes);
        const event = { queryStringParameters: { postId: 'abc123' } } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.getLikesByPost).toHaveBeenCalledWith('abc123');
        expect(utils.handleSuccess).toHaveBeenCalledWith(likes);
        expect(result.statusCode).toBe(200);
    });

    it('returns error if getLikesByPost throws', async () => {
        (utils.getLikesByPost as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = { queryStringParameters: { postId: 'abc123' } } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting all likes");
        expect(result.statusCode).toBe(400);
    });
});