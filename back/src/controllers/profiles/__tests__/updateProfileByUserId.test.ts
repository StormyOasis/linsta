/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handlerActions as handler } from '../updateProfileByUserId';
import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';
import * as ESConnectorModule from '../../../connectors/ESConnector';
import * as textUtils from '../../../utils/textUtils';

jest.mock('../../../config');
jest.mock('../../../utils/utils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../connectors/ESConnector');
jest.mock('../../../connectors/DBConnector');
jest.mock('../../../utils/textUtils');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

const validUserId = 'user123';
const validProfileId = 'profile123';

const validData = {
    userId: validUserId,
    bio: 'bio',
    pfp: 'pfp',
    gender: 'female',
    pronouns: 'she/her',
    firstName: 'Alice',
    lastName: 'Smith',
    link: 'link'
};

const validProfile = {
    profileId: validProfileId,
    userId: validUserId,
    bio: 'bio',
    pfp: 'pfp',
    gender: 'female',
    pronouns: 'she/her',
    firstName: 'Alice',
    lastName: 'Smith',
    link: 'link'
};

describe('updateProfileByUserId handler', () => {
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
        (utils.getProfile as jest.Mock).mockResolvedValue({ ...validProfile });
        (utils.updateProfileInRedis as jest.Mock).mockResolvedValue(undefined);
        (textUtils.sanitizeInput as jest.Mock).mockImplementation((x) => x);
        (textUtils.extractFromMultipleTexts as jest.Mock).mockReturnValue({ hashtags: ['#tag'], mentions: ['@mention'] });
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            updateProfile: jest.fn().mockResolvedValue({ result: 'updated' })
        });
        (DBConnector.beginTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.rollbackTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.commitTransaction as jest.Mock).mockResolvedValue(undefined);
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock({
            value: { id: validUserId }
        }));
    });

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userId is missing', async () => {
        const event = mockEvent({});
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValueOnce(false);
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns error if profile is null', async () => {
        (utils.getProfile as jest.Mock).mockResolvedValueOnce(null);
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid profile for user id");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if DB update returns null', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: null }));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error updating profile");
        expect(result.statusCode).toBe(400);
    });

    it('returns success if profile is updated', async () => {
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(ESConnectorModule.getESConnector().updateProfile).toHaveBeenCalledWith(
            validProfileId,
            undefined,
            expect.objectContaining({
                doc: expect.objectContaining({
                    bio: validData.bio,
                    hashtags: ['#tag'],
                    mentions: ['@mention']
                })
            })
        );
        expect(DBConnector.beginTransaction).toHaveBeenCalled();
        expect(DBConnector.commitTransaction).toHaveBeenCalled();
        expect(utils.updateProfileInRedis).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ status: "OK" });
        expect(result.statusCode).toBe(200);
    });

    it('rolls back and returns error if an exception is thrown', async () => {
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent(validData);
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(DBConnector.rollbackTransaction).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error updating profile");
        expect(result.statusCode).toBe(400);
    });
});