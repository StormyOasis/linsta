/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handler } from '../getProfileStatsById';
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

describe('getProfileStatsById handler', () => {
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
        const event = mockEvent({});
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if post count is missing', async () => {
        const chain = makeGremlinChainMock({ value: null });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(chain);
        chain.V = jest.fn().mockReturnThis();
        chain.outE = jest.fn().mockReturnThis();
        chain.count = jest.fn().mockReturnThis();
        chain.next = jest.fn().mockResolvedValue({ value: null });

        const event = mockEvent({ userId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting post count");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if following count is missing', async () => {
        // post count ok, following count missing
        const chain = makeGremlinChainMock({ value: 5 });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(chain);
        chain.V = jest.fn().mockReturnThis();
        chain.outE = jest.fn().mockReturnThis();
        chain.count = jest.fn().mockReturnThis();
        chain.next = jest.fn()
            .mockResolvedValueOnce({ value: 5 })   // post count
            .mockResolvedValueOnce({ value: null }); // following count

        const event = mockEvent({ userId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting follower count");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if follower count is missing', async () => {
        // post count ok, following count ok, follower count missing
        const chain = makeGremlinChainMock({ value: 5 });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(chain);
        chain.V = jest.fn().mockReturnThis();
        chain.outE = jest.fn().mockReturnThis();
        chain.inE = jest.fn().mockReturnThis();
        chain.count = jest.fn().mockReturnThis();
        chain.next = jest.fn()
            .mockResolvedValueOnce({ value: 5 })   // post count
            .mockResolvedValueOnce({ value: 3 })   // following count
            .mockResolvedValueOnce({ value: null }); // follower count

        const event = mockEvent({ userId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting following count");
        expect(result.statusCode).toBe(400);
    });

    it('returns stats if all counts are present', async () => {
        const chain = makeGremlinChainMock({ value: 5 });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(chain);
        chain.V = jest.fn().mockReturnThis();
        chain.outE = jest.fn().mockReturnThis();
        chain.inE = jest.fn().mockReturnThis();
        chain.count = jest.fn().mockReturnThis();
        chain.next = jest.fn()
            .mockResolvedValueOnce({ value: 10 })   // post count
            .mockResolvedValueOnce({ value: 3 })    // following count
            .mockResolvedValueOnce({ value: 7 });   // follower count

        const event = mockEvent({ userId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalledWith({
            postCount: 10,
            followerCount: 7,
            followingCount: 3
        });
        expect(result.statusCode).toBe(200);
    });

    it('returns error if an exception is thrown', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ userId: validUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting stats");
        expect(result.statusCode).toBe(400);
    });
});