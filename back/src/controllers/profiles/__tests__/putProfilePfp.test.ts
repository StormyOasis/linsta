/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import { handler } from '../putProfilePfp';
import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';
import * as ESConnectorModule from '../../../connectors/ESConnector';
import * as AWSConnector from '../../../connectors/AWSConnector';
import * as textUtils from '../../../utils/textUtils';
import * as multipart from 'lambda-multipart-parser';

jest.mock('../../../config');
jest.mock('../../../utils/utils');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../connectors/ESConnector');
jest.mock('../../../connectors/DBConnector');
jest.mock('../../../connectors/AWSConnector');
jest.mock('../../../utils/textUtils');
jest.mock('lambda-multipart-parser');

const validUserId = 'user123';
const validRequestorUserId = 'user123';
const validProfileId = 'profile123';
const validPfpUrl = 'https://bucket/pfp.png';

const validProfile = {
    profileId: validProfileId,
    userId: validUserId,
    pfp: '',
    userName: 'alice',
    bio: 'bio',
    firstName: 'Alice',
    lastName: 'Smith',
    gender: 'female',
    pronouns: 'she/her',
    link: 'link'
};

describe('putProfilePfp handler', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg, code?) => ({ statusCode: code || 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (utils.verifyJWT as jest.Mock).mockReturnValue(true);
        (utils.getProfile as jest.Mock).mockResolvedValue({ ...validProfile });
        (utils.updateProfileInRedis as jest.Mock).mockResolvedValue(undefined);
        (multipart.parse as jest.Mock).mockResolvedValue({
            userId: validUserId,
            requestorUserId: validRequestorUserId,
            files: [{ contentType: 'image/png', buffer: Buffer.from('img') }]
        });
        (AWSConnector.uploadFile as jest.Mock).mockResolvedValue({ url: validPfpUrl });
        (AWSConnector.removeFile as jest.Mock).mockResolvedValue(undefined);
        (textUtils.getFileExtByMimeType as jest.Mock).mockReturnValue('.png');
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            updateProfile: jest.fn().mockResolvedValue({ result: 'updated' })
        });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock({
            value: { id: validUserId }
        }));
    });

    it('returns error if multipart parse fails', async () => {
        (multipart.parse as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = {} as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith("Error parsing multipart data", expect.any(Error));
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid form data");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userId or requestorUserId missing', async () => {
        (multipart.parse as jest.Mock).mockResolvedValueOnce({ userId: '', requestorUserId: '', files: [] });
        const event = {} as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Missing required params");
        expect(result.statusCode).toBe(400);
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValueOnce(false);
        const event = {} as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns error if profile is null', async () => {
        (utils.getProfile as jest.Mock).mockResolvedValueOnce(null);
        const event = {} as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid profile");
        expect(result.statusCode).toBe(400);
    });

    it('uploads file and updates profile if file is present', async () => {
        const event = {} as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(AWSConnector.uploadFile).toHaveBeenCalled();
        expect(ESConnectorModule.getESConnector().updateProfile).toHaveBeenCalledWith(
            validProfileId,
            undefined,
            { doc: { pfp: validPfpUrl } }
        );
        expect(DBConnector.getGraph).toHaveBeenCalled();
        expect(utils.updateProfileInRedis).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith({ url: validPfpUrl });
        expect(result.statusCode).toBe(200);
    });

    it('removes file if no new file is uploaded and profile.pfp exists', async () => {
        (multipart.parse as jest.Mock).mockResolvedValueOnce({
            userId: validUserId,
            requestorUserId: validRequestorUserId,
            files: []
        });
        (utils.getProfile as jest.Mock).mockResolvedValueOnce({ ...validProfile, pfp: 'oldurl' });
        const event = {} as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(AWSConnector.removeFile).toHaveBeenCalledWith('oldurl');
        expect(ESConnectorModule.getESConnector().updateProfile).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalled();
        expect(result.statusCode).toBe(200);
    });

    it('returns error if ES updateProfile fails', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValueOnce({
            updateProfile: jest.fn().mockResolvedValue({ result: 'error' })
        });
        const event = {} as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error updating profile");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if DB update fails', async () => {
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: null }));
        const event = {} as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error updating profile");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if an exception is thrown', async () => {
        (utils.getProfile as jest.Mock).mockRejectedValueOnce(new Error('fail'));
        const event = {} as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('fail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error updating profile");
        expect(result.statusCode).toBe(400);
    });
});