/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import { handler } from '../toggleFollowing';
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

describe('toggleFollowing handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg, code?) => ({ statusCode: code || 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (utils.verifyJWT as jest.Mock).mockReturnValue(true);
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.P as jest.Mock).mockReturnValue({ neq: jest.fn().mockReturnValue('neq') });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
        (DBConnector.beginTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.rollbackTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.commitTransaction as jest.Mock).mockResolvedValue(undefined);
    });

    it('returns validation error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid input");
        expect(result.statusCode).toBe(400);
    });

    it('returns validation error if required fields are missing', async () => {
        const event = mockEvent({ userId: '', followId: '', follow: undefined });
        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Missing or invalid parameters");
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const event = mockEvent({ userId: '1', followId: '2', follow: true, requestorUserId: '3' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('follows a user successfully', async () => {
        // Simulate DB returns a result for follow
        const followResult = { value: { id: 1 } };
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(followResult));

        const event = mockEvent({ userId: '1', followId: '2', follow: true, requestorUserId: '1' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;

        expect(DBConnector.beginTransaction).toHaveBeenCalled();
        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "OK" });
        expect(result.statusCode).toBe(200);
    });

    it('returns error if follow DB returns null', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: null }));

        const event = mockEvent({ userId: '1', followId: '2', follow: true, requestorUserId: '1' });
        await handler(event, {} as any, undefined as any);

        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error following user");
    });

    it('unfollows a user successfully', async () => {
        // For unfollow, just ensure no error and commit is called
        const event = mockEvent({ userId: '1', followId: '2', follow: false, requestorUserId: '1' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;

        expect(DBConnector.beginTransaction).toHaveBeenCalled();
        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "OK" });
        expect(result.statusCode).toBe(200);
    });

    it('returns error and rolls back on DB error', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));

        const event = mockEvent({ userId: '1', followId: '2', follow: true, requestorUserId: '1' });
        await handler(event, {} as any, undefined as any);

        expect(logger.error).toHaveBeenCalled();
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error changing following status");
    });
});