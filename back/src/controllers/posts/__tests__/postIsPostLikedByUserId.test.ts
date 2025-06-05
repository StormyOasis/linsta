/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EDGE_USER_LIKED_POST } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import { handlerActions as handler } from '../postIsPostLikedByUserId';

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

describe('postIsPostLikedByUserId handler', () => {
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

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if postId is missing', async () => {
        const event = mockEvent({ userId: validUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userId is missing', async () => {
        const event = mockEvent({ postId: validPostId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns liked: true if user likes the post', async () => {
        const hasNextMock = jest.fn().mockResolvedValue(true);
        const chain = {
            V: jest.fn().mockReturnThis(),
            out: jest.fn().mockReturnThis(),
            hasId: jest.fn().mockReturnThis(),
            hasNext: hasNextMock
        };
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(chain);
        const event = mockEvent({ postId: validPostId, userId: validUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(DBConnector.getGraph).toHaveBeenCalled();
        expect(chain.V).toHaveBeenCalledWith(validUserId);
        expect(chain.out).toHaveBeenCalledWith(EDGE_USER_LIKED_POST);
        expect(chain.hasId).toHaveBeenCalledWith(validPostId);
        expect(hasNextMock).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ liked: true });
        expect(result.statusCode).toBe(200);
    });

    it('returns liked: false if user does not like the post', async () => {
        const hasNextMock = jest.fn().mockResolvedValue(false);
        const chain = {
            V: jest.fn().mockReturnThis(),
            out: jest.fn().mockReturnThis(),
            hasId: jest.fn().mockReturnThis(),
            hasNext: hasNextMock
        };
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(chain);
        const event = mockEvent({ postId: validPostId, userId: validUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalledWith({ liked: false });
        expect(result.statusCode).toBe(200);
    });

    it('returns error if DBConnector throws', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ postId: validPostId, userId: validUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting like state");
        expect(result.statusCode).toBe(400);
    });
});