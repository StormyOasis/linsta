/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handler } from '../getPostProfileByUserName';
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

const validUserName = 'alice';
const validProfile = {
    profileId: 'profile123',
    userId: 'user123',
    userName: validUserName,
    bio: 'bio',
    pfp: 'pfp',
    firstName: 'Alice',
    lastName: 'Smith',
    gender: 'female',
    pronouns: 'she/her',
    link: 'link'
};

describe('getPostProfileByUserName handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg) => ({ statusCode: 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (utils.getProfile as jest.Mock).mockResolvedValue(validProfile);
    });

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userName is missing', async () => {
        const event = mockEvent({});
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if profile is null', async () => {
        (utils.getProfile as jest.Mock).mockResolvedValueOnce(null);
        const event = mockEvent({ userName: validUserName });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid profile");
        expect(result.statusCode).toBe(400);
    });

    it('returns profile if found', async () => {
        const event = mockEvent({ userName: validUserName });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.getProfile).toHaveBeenCalledWith(null, validUserName);
        expect(utils.handleSuccess).toHaveBeenCalledWith(validProfile);
        expect(result.statusCode).toBe(200);
    });

    it('returns error if getProfile throws', async () => {
        (utils.getProfile as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = mockEvent({ userName: validUserName });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid profile");
        expect(result.statusCode).toBe(400);
    });
});