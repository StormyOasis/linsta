/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import { handlerActions as handler } from '../loginUser';
import * as utils from '../../../utils/utils';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../utils/utils');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

describe('loginUser handler', () => {
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
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.P as jest.Mock).mockReturnValue({ neq: jest.fn().mockReturnValue('neq') });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
        (DBConnector.T as jest.Mock).mockReturnValue({ id: 'id' });
    });

    it('returns validation error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid input");
        expect(result.statusCode).toBe(400);
    });

    it('returns validation error if username or password is missing', async () => {
        const event = mockEvent({ userName: '', password: '' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid username or password");
    });

    it('returns error if user not found', async () => {
        const chain = makeGremlinChainMock({ value: null });
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(chain);

        const event = mockEvent({ userName: 'nouser', password: 'pass' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid username or password");
    });

    it('returns error if password does not match', async () => {
        // Simulate user found
        const userMap = new Map<string, any>([
            ['password', 'hashedpass'],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(userResult));
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const event = mockEvent({ userName: 'user', password: 'wrongpass' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid username or password");
    });

    it('returns error if DB throws', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));

        const event = mockEvent({ userName: 'user', password: 'pass' });
        await handler("", event);
        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error logging in", 500);
    });

    it('returns success and token if login is correct', async () => {
        // Simulate user found
        const userMap = new Map<string, any>([
            ['password', 'hashedpass'],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock(userResult));
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

        const event = mockEvent({ userName: 'user', password: 'pass' });
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(jwt.sign).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ token: 'jwt-token', userName: 'user', id: 1 });
        expect(result.statusCode).toBe(200);
    });
});