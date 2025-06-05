/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handler } from '../getSingleFollowStatus';
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
const validCheckUserId = 'user456';

describe('getSingleFollowStatus handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg) => ({ statusCode: 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
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
        const event = mockEvent({ checkUserId: validCheckUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if checkUserId is missing', async () => {
        const event = mockEvent({ userId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if results.value is null', async () => {
        const chain = makeGremlinChainMock({ value: null });
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(chain);
        chain.V = jest.fn().mockReturnThis();
        chain.outE = jest.fn().mockReturnThis();
        chain.inV = jest.fn().mockReturnThis();
        chain.hasId = jest.fn().mockReturnThis();
        chain.count = jest.fn().mockReturnThis();
        chain.next = jest.fn().mockResolvedValue({ value: null });

        const event = mockEvent({ userId: validUserId, checkUserId: validCheckUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting follow status");
        expect(result.statusCode).toBe(400);
    });

    it('returns true if user follows checkUserId', async () => {
        const chain = makeGremlinChainMock({ value: 1 });
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(chain);
        chain.V = jest.fn().mockReturnThis();
        chain.outE = jest.fn().mockReturnThis();
        chain.inV = jest.fn().mockReturnThis();
        chain.hasId = jest.fn().mockReturnThis();
        chain.count = jest.fn().mockReturnThis();
        chain.next = jest.fn().mockResolvedValue({ value: 1 });

        const event = mockEvent({ userId: validUserId, checkUserId: validCheckUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalledWith(true);
        expect(result.statusCode).toBe(200);
    });

    it('returns false if user does not follow checkUserId', async () => {
        const chain = makeGremlinChainMock({ value: 0 });
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(chain);
        chain.V = jest.fn().mockReturnThis();
        chain.outE = jest.fn().mockReturnThis();
        chain.inV = jest.fn().mockReturnThis();
        chain.hasId = jest.fn().mockReturnThis();
        chain.count = jest.fn().mockReturnThis();
        chain.next = jest.fn().mockResolvedValue({ value: 0 });

        const event = mockEvent({ userId: validUserId, checkUserId: validCheckUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalledWith(false);
        expect(result.statusCode).toBe(200);
    });

    it('returns error if an exception is thrown', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ userId: validUserId, checkUserId: validCheckUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting followers");
        expect(result.statusCode).toBe(400);
    });
});