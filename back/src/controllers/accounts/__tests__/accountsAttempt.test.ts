/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import { handlerActions as handler } from '../accountsAttempt';
import DBConnector from '../../../connectors/DBConnector';
import * as ESConnectorModule from '../../../connectors/ESConnector';
import * as textUtils from '../../../utils/textUtils';
import * as utils from '../../../utils/utils';
import bcrypt from 'bcrypt';
import moment from 'moment';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';
import { APIGatewayProxyResult } from 'aws-lambda';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../connectors/ESConnector');
jest.mock('../../../utils/textUtils');
jest.mock('../../../utils/utils');
jest.mock('bcrypt');
jest.mock('moment');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

describe('accountsAttempt handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.getInstance as jest.Mock).mockReturnValue({
            increment: jest.fn(),
            flush: jest.fn(),
            timing: jest.fn(),
            gauge: jest.fn(),
            histogram: jest.fn(),
        });
        (utils.handleValidationError as jest.Mock).mockImplementation((msg) => ({ statusCode: 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
        (moment as unknown as jest.Mock).mockImplementation(() => ({
            format: () => '2024-01-01 00:00:00.000',
            hour: () => 1,
            minute: () => 2,
            second: () => 3,
            millisecond: () => 4,
        }));
        (textUtils.isEmail as jest.Mock).mockReturnValue(false);
        (textUtils.isPhone as jest.Mock).mockReturnValue(false);
        (textUtils.stripNonNumericCharacters as jest.Mock).mockImplementation((x) => x);
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(true);

        // Chainable Gremlin/DBConnector mocks
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.P as jest.Mock).mockReturnValue({ neq: jest.fn().mockReturnValue('neq') });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
        (DBConnector.beginTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.rollbackTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.commitTransaction as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.resetAllMocks();
        (Metrics.getInstance as jest.Mock).mockReturnValue({
            increment: jest.fn(),
            flush: jest.fn(),
            timing: jest.fn(),
            gauge: jest.fn(),
            histogram: jest.fn(),
        });
    });

    it('returns validation error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid input');
        expect(result.statusCode).toBe(400);
    });

    it('returns validation error if required fields are missing', async () => {
        const event = mockEvent({ emailOrPhone: '', fullName: '', userName: '', password: '' });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid input');
    });

    it('returns validation error if not email or phone', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(false);
        (textUtils.isPhone as jest.Mock).mockReturnValue(false);
        const event = mockEvent({
            dryRun: true,
            emailOrPhone: 'notanemail',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'password'
        });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid email or phone');
    });

    it('returns validation error if full name is empty', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        const event = mockEvent({
            dryRun: true,
            emailOrPhone: 'test@email.com',
            fullName: '   ',
            userName: 'testuser',
            password: 'password'
        });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid full name');
    });

    it('returns validation error if confirmCode is invalid', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        const event = mockEvent({
            dryRun: false,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'password',
            confirmCode: '123', // invalid length
            day: 1, month: 1, year: 2000
        });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid confirmation code');
    });

    it('returns validation error if password is invalid', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(false);
        const event = mockEvent({
            dryRun: true,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'bad'
        });
        await handler("", event);
        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid password');
    });

    it('returns OK for dryRun if user is unique and insert succeeds', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isPhone as jest.Mock).mockReturnValue(false);
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(true);

        // Unique check returns { value: null }, user insert returns { value: { id: 'newuser' } }
        const uniqueChain = makeGremlinChainMock({ value: null });
        const insertChain = makeGremlinChainMock({ value: { id: 'newuser' } });
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(uniqueChain)
            .mockResolvedValueOnce(insertChain);

        const event = mockEvent({
            dryRun: true,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'dryrun',
            password: 'password'
        });

        await handler("", event);

        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "OK" });
    });

    it('returns error if user is not unique', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(true);

        const uniqueChain = makeGremlinChainMock({ value: { id: 'existing' } });
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(uniqueChain);

        const event = mockEvent({
            dryRun: true,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'password'
        });

        await handler("", event);

        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith('Error creating user');
    });

    it('returns error if user insert fails', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(true);

        const uniqueChain = makeGremlinChainMock({ value: null });
        const insertChain = makeGremlinChainMock({ value: null });
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(uniqueChain)
            .mockResolvedValueOnce(insertChain);

        const event = mockEvent({
            dryRun: true,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'password'
        });

        await handler("", event);

        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith('Error creating user');
    });

    it('returns validation error if confirmCode check fails', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);

        // Confirm code check returns { value: null }
        const confirmChain = makeGremlinChainMock({ value: null });
        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(confirmChain);

        const event = mockEvent({
            dryRun: false,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'password',
            confirmCode: '12345678',
            day: 1, month: 1, year: 2000
        });

        await handler("", event);

        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid confirmation code');
    });

    it('returns error if DB throws during confirmCode check', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);

        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));

        const event = mockEvent({
            dryRun: false,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'password',
            confirmCode: '12345678',
            day: 1, month: 1, year: 2000
        });

        await handler("", event);

        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith('Error checking confirmation code');
    });

    // Add tests for the non-dryRun (actual create)
    it('returns error if ES insertProfile fails', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(true);

        // Confirm code check returns { value: { id: 'code' } }
        const confirmChain = makeGremlinChainMock({ value: { id: 'code' } });
        // Unique check returns { value: null }, user insert returns { value: { id: 'newuser' } }
        const uniqueChain = makeGremlinChainMock({ value: null });
        const insertChain = makeGremlinChainMock({ value: { id: 'newuser' } });
        const dropChain = makeGremlinChainMock({ value: null });

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(confirmChain) // confirm code check
            .mockResolvedValueOnce(uniqueChain)  // unique check
            .mockResolvedValueOnce(insertChain)  // user insert
            .mockResolvedValueOnce(dropChain);   // confirm code delete

        // ES insertProfile fails
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            insertProfile: jest.fn().mockResolvedValue(undefined)
        });

        const event = mockEvent({
            dryRun: false,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'password',
            confirmCode: '12345678',
            day: 1, month: 1, year: 2000
        });

        await handler("", event);

        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith('Error creating user');
    });

    it('returns error if updating profileId fails', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(true);

        const confirmChain = makeGremlinChainMock({ value: { id: 'code' } });
        const uniqueChain = makeGremlinChainMock({ value: null });
        const insertChain = makeGremlinChainMock({ value: { id: 'newuser' } });
        const dropChain = makeGremlinChainMock({ value: null });
        const updateProfileChain = makeGremlinChainMock(null); // profile update fails

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(confirmChain)
            .mockResolvedValueOnce(uniqueChain)
            .mockResolvedValueOnce(insertChain)
            .mockResolvedValueOnce(dropChain)
            .mockResolvedValueOnce(updateProfileChain);

        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            insertProfile: jest.fn().mockResolvedValue({ _id: 'profileid' })
        });

        const event = mockEvent({
            dryRun: false,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'password',
            confirmCode: '12345678',
            day: 1, month: 1, year: 2000
        });

        await handler("", event);

        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith('Error creating user');
    });

    it('returns error if commit transaction fails', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(true);

        const confirmChain = makeGremlinChainMock({ value: { id: 'code' } });
        const uniqueChain = makeGremlinChainMock({ value: null });
        const insertChain = makeGremlinChainMock({ value: { id: 'newuser' } });
        const dropChain = makeGremlinChainMock({ value: null });
        const updateProfileChain = makeGremlinChainMock({ value: { id: 'newuser' } });

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(confirmChain)
            .mockResolvedValueOnce(uniqueChain)
            .mockResolvedValueOnce(insertChain)
            .mockResolvedValueOnce(dropChain)
            .mockResolvedValueOnce(updateProfileChain);

        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            insertProfile: jest.fn().mockResolvedValue({ _id: 'profileid' })
        });

        (DBConnector.commitTransaction as jest.Mock).mockRejectedValueOnce(new Error('fail'));

        const event = mockEvent({
            dryRun: false,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'password',
            confirmCode: '12345678',
            day: 1, month: 1, year: 2000
        });

        await handler("", event);

        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith('Error creating user');
    });

    it('returns OK if everything succeeds', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isValidPassword as jest.Mock).mockReturnValue(true);

        const confirmChain = makeGremlinChainMock({ value: { id: 'code' } });
        const uniqueChain = makeGremlinChainMock({ value: null });
        const insertChain = makeGremlinChainMock({ value: { id: 'newuser' } });
        const dropChain = makeGremlinChainMock({ value: null });
        const updateProfileChain = makeGremlinChainMock({ value: { id: 'newuser' } });

        (DBConnector.getGraph as jest.Mock)
            .mockResolvedValueOnce(confirmChain)
            .mockResolvedValueOnce(uniqueChain)
            .mockResolvedValueOnce(insertChain)
            .mockResolvedValueOnce(dropChain)
            .mockResolvedValueOnce(updateProfileChain);

        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            insertProfile: jest.fn().mockResolvedValue({ _id: 'profileid' })
        });

        (DBConnector.commitTransaction as jest.Mock).mockResolvedValue(undefined);

        const event = mockEvent({
            dryRun: false,
            emailOrPhone: 'test@email.com',
            fullName: 'Test User',
            userName: 'testuser',
            password: 'password',
            confirmCode: '12345678',
            day: 1, month: 1, year: 2000
        });

        await handler("", event);

        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "OK" });
    });    
});