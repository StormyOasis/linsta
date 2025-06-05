/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeGremlinChainMock } = require('../../../connectors/DBConnector');
import DBConnector from '../../../connectors/DBConnector';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';

import { handler } from '../sendConfirmCode';
import * as textUtils from '../../../utils/textUtils';
import * as utils from '../../../utils/utils';
import * as AWSConnector from '../../../connectors/AWSConnector';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../connectors/DBConnector');
jest.mock('../../../utils/textUtils');
jest.mock('../../../utils/utils');
jest.mock('../../../connectors/AWSConnector');
jest.mock('../../../logger/logger');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');
jest.mock('moment', () => () => ({
    format: () => '2024-01-01 12:00:00.000'
}));
jest.mock('crypto', () => ({
    randomUUID: jest.fn(() => 'abcd-efgh-ijkl-mnop')
}));

const mockEvent = (qs: any) => ({
    queryStringParameters: qs
}) as any;

describe('sendConfirmCode handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg) => ({ statusCode: 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (DBConnector.__ as jest.Mock).mockReturnValue(makeGremlinChainMock());
        (DBConnector.P as jest.Mock).mockReturnValue({ neq: jest.fn().mockReturnValue('neq') });
        (DBConnector.getGraph as jest.Mock).mockResolvedValue(makeGremlinChainMock());
        (DBConnector.T as jest.Mock).mockReturnValue({ id: 'id', label: 'label' });
        (DBConnector.Merge as jest.Mock).mockReturnValue({ onCreate: 'onCreate', onMatch: 'onMatch' });
    });

    it('returns validation error if user is missing', async () => {
        const event = mockEvent({});
        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid confirmation input");
    });

    it('returns validation error if user is too short', async () => {
        const event = mockEvent({ user: 'ab' });
        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid confirmation input");
    });

    it('returns validation error if not email or phone', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(false);
        (textUtils.isPhone as jest.Mock).mockReturnValue(false);
        const event = mockEvent({ user: 'notanemail' });
        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Can't parse confirmation data");
    });

    it('returns error if DB upsert fails', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isPhone as jest.Mock).mockReturnValue(false);
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: null }));

        const event = mockEvent({ user: 'test@email.com' });
        await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith("Failed to generate confirmation code");
    });

    it('returns error if DB throws', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isPhone as jest.Mock).mockReturnValue(false);
        (DBConnector.getGraph as jest.Mock).mockRejectedValueOnce(new Error('fail'));

        const event = mockEvent({ user: 'test@email.com' });
        await handler(event, {} as any, undefined as any);
        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error processing confirmation data");
    });

    it('sends email if user is email', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isPhone as jest.Mock).mockReturnValue(false);
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 1 } }));

        (AWSConnector.sendEmailByTemplate as jest.Mock).mockResolvedValue(true);

        const event = mockEvent({ user: 'test@email.com' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;

        expect(AWSConnector.sendEmailByTemplate).toHaveBeenCalledWith(
            AWSConnector.SEND_CONFIRM_TEMPLATE,
            expect.objectContaining({
                destination: { ToAddresses: ['test@email.com'] },
                source: config.aws.ses.defaultReplyAddress,
                template: AWSConnector.SEND_CONFIRM_TEMPLATE,
                templateData: expect.objectContaining({
                    emailAddress: 'test@email.com',
                    code: 'abcd'
                })
            })
        );
        expect(utils.handleSuccess).toHaveBeenCalledWith("OK");
        expect(result.statusCode).toBe(200);
    });

    it('sends SMS if user is phone', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(false);
        (textUtils.isPhone as jest.Mock).mockReturnValue(true);
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 1 } }));

        (AWSConnector.sendSMS as jest.Mock).mockResolvedValue(true);

        const event = mockEvent({ user: '1234567890' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;

        expect(AWSConnector.sendSMS).toHaveBeenCalledWith('1234567890', 'abcd');
        expect(utils.handleSuccess).toHaveBeenCalledWith("OK");
        expect(result.statusCode).toBe(200);
    });

    it('returns error if sendEmailByTemplate fails', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(true);
        (textUtils.isPhone as jest.Mock).mockReturnValue(false);
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 1 } }));

        (AWSConnector.sendEmailByTemplate as jest.Mock).mockRejectedValue(new Error('fail'));

        const event = mockEvent({ user: 'test@email.com' });
        await handler(event, {} as any, undefined as any);

        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error Sending confirmation code");
    });

    it('returns error if sendSMS fails', async () => {
        (textUtils.isEmail as jest.Mock).mockReturnValue(false);
        (textUtils.isPhone as jest.Mock).mockReturnValue(true);
        (DBConnector.getGraph as jest.Mock).mockResolvedValueOnce(makeGremlinChainMock({ value: { id: 1 } }));

        (AWSConnector.sendSMS as jest.Mock).mockRejectedValue(new Error('fail'));

        const event = mockEvent({ user: '1234567890' });
        await handler(event, {} as any, undefined as any);

        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error Sending confirmation code");
    });
});