/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import { handlerActions as handler } from '../forgotPassword';
import * as textUtils from '../../../utils/textUtils';
import * as utils from '../../../utils/utils';
import * as AWSConnector from '../../../connectors/AWSConnector';
import Metrics from '../../../metrics/Metrics';
import logger from '../../../logger/logger';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../utils/textUtils');
jest.mock('../../../utils/utils');
jest.mock('../../../connectors/AWSConnector');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

describe('forgotPassword handler', () => {
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
        (textUtils.obfuscateEmail as jest.Mock).mockImplementation((email) => `obf:${email}`);
        (textUtils.obfuscatePhone as jest.Mock).mockImplementation((phone) => `obf:${phone}`);
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.P as jest.Mock).mockReturnValue({ neq: jest.fn().mockReturnValue('neq') });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
        (DBConnector.T as jest.Mock).mockReturnValue({ id: 'id', label: 'label' });
    });

    it('returns validation error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("User info is missing or invalid");
        expect(result.statusCode).toBe(400);
    });

    it('returns validation error if user is missing', async () => {
        const event = mockEvent({});
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("User info is missing or invalid");
    });

    it('returns error if user not found', async () => {
        const chain = makeGremlinChainMock({ value: null });
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(chain);

        const event = mockEvent({ user: 'nouser' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith("No matching user found");
    });

    it('sends email if user has email', async () => {
        // Simulate user found with email
        const userMap = new Map<string, any>([
            ['email', 'user@example.com'],
            ['phone', ''],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };

        // Upsert token and add edges succeed
        const tokenResult = { value: { id: 1 } };
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult)) // user lookup
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult)) // upsert token
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult)); // add edges

        (AWSConnector.sendEmailByTemplate as jest.Mock).mockResolvedValue(true);

        const event = mockEvent({ user: 'user@example.com' });
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(AWSConnector.sendEmailByTemplate).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith(expect.objectContaining({
            status: "OK",
            title: "Email Sent"
        }));
        expect(result.statusCode).toBe(200);
    });

    it('sends SMS if user has phone but no email', async () => {
        const userMap = new Map<string, any>([
            ['email', ''],
            ['phone', '1234567890'],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };
        const tokenResult = { value: { id: 1 } };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult))
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult))
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult));

        (AWSConnector.sendSMS as jest.Mock).mockResolvedValue(true);

        const event = mockEvent({ user: '1234567890' });
        const result = await handler("", event) as APIGatewayProxyResult;

        expect(AWSConnector.sendSMS).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith(expect.objectContaining({
            status: "OK",
            title: "SMS Sent"
        }));
        expect(result.statusCode).toBe(200);
    });

    it('returns error if upsert token fails', async () => {
        const userMap = new Map<string, any>([
            ['email', 'user@example.com'],
            ['phone', ''],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));

        const event = mockEvent({ user: 'user@example.com' });
        await handler("", event);

        expect(utils.handleValidationError).toHaveBeenCalledWith("Failed to create or update token");
    });

    it('returns error if add edges fails', async () => {
        const userMap = new Map<string, any>([
            ['email', 'user@example.com'],
            ['phone', ''],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };
        const tokenResult = { value: { id: 1 } };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult))
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult))
            .mockResolvedValueOnce(makeGremlinChainMock({ value: null }));

        const event = mockEvent({ user: 'user@example.com' });
        await handler("", event);

        expect(utils.handleValidationError).toHaveBeenCalledWith("Failure creating token");
    });

    it('returns error if sendEmailByTemplate fails', async () => {
        const userMap = new Map<string, any>([
            ['email', 'user@example.com'],
            ['phone', ''],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };
        const tokenResult = { value: { id: 1 } };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult))
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult))
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult));

        (AWSConnector.sendEmailByTemplate as jest.Mock).mockResolvedValue(false);

        const event = mockEvent({ user: 'user@example.com' });
        await handler("", event);

        expect(utils.handleValidationError).toHaveBeenCalledWith("Failed to send message");
    });

    it('returns error if sendSMS fails', async () => {
        const userMap = new Map<string, any>([
            ['email', ''],
            ['phone', '1234567890'],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };
        const tokenResult = { value: { id: 1 } };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult))
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult))
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult));

        (AWSConnector.sendSMS as jest.Mock).mockResolvedValue(false);

        const event = mockEvent({ user: '1234567890' });
        await handler("", event);

        expect(utils.handleValidationError).toHaveBeenCalledWith("Failed to send message");
    });

    it('returns error if sendEmailByTemplate throws', async () => {
        const userMap = new Map<string, any>([
            ['email', 'user@example.com'],
            ['phone', ''],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };
        const tokenResult = { value: { id: 1 } };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult))
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult))
            .mockResolvedValueOnce(makeGremlinChainMock(tokenResult));

        (AWSConnector.sendEmailByTemplate as jest.Mock).mockRejectedValue(new Error('fail'));

        const event = mockEvent({ user: 'user@example.com' });
        await handler("", event);

        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Failed to send message");
    });

    it('returns error if sendForgotMessage throws', async () => {
        const userMap = new Map<string, any>([
            ['email', 'user@example.com'],
            ['phone', ''],
            ['userName', 'user'],
            ['id', 1]
        ]);
        const userResult = { value: userMap };

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(makeGremlinChainMock(userResult))
            .mockRejectedValueOnce(new Error('fail'));

        const event = mockEvent({ user: 'user@example.com' });
        await handler("", event);

        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error handling forgot message");
    });
});