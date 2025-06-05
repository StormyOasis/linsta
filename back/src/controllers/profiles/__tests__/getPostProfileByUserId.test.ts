/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handlerActions as handler } from '../getPostProfileByUserId';
import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../utils/utils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

const validUserId = 'user123';
const validProfile = {
    profileId: 'profile123',
    userId: validUserId,
    userName: 'alice',
    bio: 'bio',
    pfp: 'pfp',
    firstName: 'Alice',
    lastName: 'Smith',
    gender: 'female',
    pronouns: 'she/her',
    link: 'link'
};

describe('getPostProfileByUserId handler', () => {
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
        (utils.getProfile as jest.Mock).mockResolvedValue(validProfile);
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

    it('returns error if profile is null', async () => {
        (utils.getProfile as jest.Mock).mockResolvedValueOnce(null);
        const event = mockEvent({ userId: validUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid profile");
        expect(result.statusCode).toBe(400);
    });

    it('returns profile if found', async () => {
        const event = mockEvent({ userId: validUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(utils.getProfile).toHaveBeenCalledWith(validUserId, null);
        expect(utils.handleSuccess).toHaveBeenCalledWith(validProfile);
        expect(result.statusCode).toBe(200);
    });

    it('returns error if getProfile throws', async () => {
        (utils.getProfile as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ userId: validUserId });
        const result = await handler("", event) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid profile");
        expect(result.statusCode).toBe(400);
    });
});