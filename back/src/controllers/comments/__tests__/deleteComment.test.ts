/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import { handlerActions as handler } from '../deleteComment';
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

describe('deleteComment handler', () => {
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
        (DBConnector.P as jest.Mock).mockReturnValue({ neq: jest.fn().mockReturnValue('neq') });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
        (DBConnector.beginTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.rollbackTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.commitTransaction as jest.Mock).mockResolvedValue(undefined);
    });

    it('returns validation error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params");
        expect(result.statusCode).toBe(400);
    });

    it('returns validation error if commentId is missing', async () => {
        const event = mockEvent({});
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params");
    });

    it('returns error if comment user not found', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: null }));
        const event = mockEvent({ commentId: 'c1' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error deleting comment(s)");
    });

    it('returns 403 if verifyJWT fails', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'u1' } }));
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const event = mockEvent({ commentId: 'c1' });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns error if recursive delete fails', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'u1' } })) // commentUserResult
            .mockResolvedValueOnce(makeGremlinChainMock(null)); // results
        const event = mockEvent({ commentId: 'c1' });
        await handler("", event);
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error deleting comment(s)");
    });

    it('returns success if comment is deleted', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 'u1' } })) // commentUserResult
            .mockResolvedValueOnce(makeGremlinChainMock([{}])); // results
        const event = mockEvent({ commentId: 'c1' });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "OK" });
        expect(result.statusCode).toBe(200);
    });

    it('returns error and rolls back on exception', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ commentId: 'c1' });
        await handler("", event);
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error deleting comment(s)");
    });
});