/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import { handler } from '../changePassword';
import DBConnector from '../../../connectors/DBConnector';
import * as textUtils from '../../../utils/textUtils';
import * as utils from '../../../utils/utils';
import bcrypt from 'bcrypt';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';
import { APIGatewayProxyResult } from 'aws-lambda';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../utils/textUtils');
jest.mock('../../../utils/utils');
jest.mock('bcrypt');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

describe('changePassword handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg) => ({ statusCode: 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(true);

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
        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid parameters or missing token');
        expect(result.statusCode).toBe(400);
    });

    it('returns validation error if required fields are missing', async () => {
        const event = mockEvent({ password1: 'a', password2: 'a' });
        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid parameters or missing token');
    });

    it('returns validation error if passwords do not match', async () => {
        const event = mockEvent({ userName: 'user', oldPassword: 'old', password1: 'a', password2: 'b' });
        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Passwords don't match");
    });

    it('returns validation error if password format is invalid', async () => {
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(false);
        const event = mockEvent({ userName: 'user', oldPassword: 'old', password1: 'a', password2: 'a' });
        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid password format");
    });

    it('changes password with username and oldPassword (success)', async () => {
        // Mock DB returns user with password
        const userMap = new Map<string, any>([
            ['password', 'hashedOld'],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };
        const updateResult = { value: { id: 1 } };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult)) // get user
            .mockResolvedValueOnce(makeGremlinChainMock(updateResult)); // update password

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const event = mockEvent({
            userName: 'user',
            oldPassword: 'old',
            password1: 'newpass',
            password2: 'newpass'
        });

        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "OK" });
        expect(result.statusCode).toBe(200);
    });

    it('returns error if user not found', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));

        const event = mockEvent({
            userName: 'user',
            oldPassword: 'old',
            password1: 'newpass',
            password2: 'newpass'
        });

        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid username or password");
    });

    it('returns error if password does not match', async () => {
        const userMap = new Map<string, any>([
            ['password', 'hashedOld'],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult));

        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const event = mockEvent({
            userName: 'user',
            oldPassword: 'wrong',
            password1: 'newpass',
            password2: 'newpass'
        });

        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid username or password");
    });

    it('returns error if update password fails', async () => {
        const userMap = new Map<string, any>([
            ['password', 'hashedOld'],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const event = mockEvent({
            userName: 'user',
            oldPassword: 'old',
            password1: 'newpass',
            password2: 'newpass'
        });

        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid username or password");
    });

    it('changes password with token (success)', async () => {
        // Mock token lookup, password update, token delete
        const tokenResult = { value: { id: 1 } };
        const updateResult = { value: { id: 1 } };
        const dropResult = { value: { id: 1 } };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult)) // token lookup
            .mockResolvedValueOnce(makeGremlinChainMock(updateResult)) // update password
            .mockResolvedValueOnce(makeGremlinChainMock(dropResult)); // delete token

        const event = mockEvent({
            token: 'sometoken',
            password1: 'newpass',
            password2: 'newpass'
        });

        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "OK" });
        expect(result.statusCode).toBe(200);
    });

    it('returns error if token not found', async () => {
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));

        const event = mockEvent({
            token: 'badtoken',
            password1: 'newpass',
            password2: 'newpass'
        });

        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid token");
    });

    it('returns error if update password by token fails', async () => {
        const tokenResult = { value: { id: 1 } };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));

        const event = mockEvent({
            token: 'sometoken',
            password1: 'newpass',
            password2: 'newpass'
        });

        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error changing password");
    });

    it('returns error if token drop fails', async () => {
        const tokenResult = { value: { id: 1 } };
        const updateResult = { value: { id: 1 } };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult))
            .mockResolvedValueOnce(makeGremlinChainMock(updateResult))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));

        const event = mockEvent({
            token: 'sometoken',
            password1: 'newpass',
            password2: 'newpass'
        });

        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error changing password");
    });

    it('returns error if exception is thrown in token flow', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));

        const event = mockEvent({
            token: 'sometoken',
            password1: 'newpass',
            password2: 'newpass'
        });

        await handler(event, {} as any, undefined as any);
        expect(logger.error).toHaveBeenCalled();
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error with token");
    });
});