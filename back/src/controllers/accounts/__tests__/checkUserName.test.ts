/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import { handlerActions as handler } from '../checkUserName';
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../utils/utils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

describe('checkUserName handler', () => {
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
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
    });

    it('returns validation error if username is missing', async () => {
        const event = { pathParameters: {} } as any;
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid username");
    });

    it('returns validation error if username is empty', async () => {
        const event = { pathParameters: { userName: '   ' } } as any;
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid username");
    });

    it('returns validation error if username format is invalid', async () => {
        const event = { pathParameters: { userName: 'bad*name' } } as any;
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid username format");
    });

    it('returns true if username is unique', async () => {
        const chain = makeGremlinChainMock({ value: null });
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(chain);

        const event = { pathParameters: { userName: 'uniqueuser' } } as any;
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(utils.handleSuccess).toHaveBeenCalledWith(true);
        expect(result.statusCode).toBe(200);
    });

    it('returns false if username is not unique', async () => {
        const chain = makeGremlinChainMock({ value: { id: 'existing' } });
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(chain);

        const event = { pathParameters: { userName: 'existinguser' } } as any;
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(utils.handleSuccess).toHaveBeenCalledWith(false);
        expect(result.statusCode).toBe(200);
    });

    it('returns error if DB throws', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));

        const event = { pathParameters: { userName: 'anyuser' } } as any;
        await handler("", event);

        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error checking username uniqueness", 500);
    });
});