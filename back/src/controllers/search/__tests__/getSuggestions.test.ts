/* eslint-disable @typescript-eslint/no-explicit-any */
import { handler } from '../getSuggestions';
import * as ESConnectorModule from '../../../connectors/ESConnector';
import * as utils from '../../../utils/utils';
import Metrics from '../../../metrics/Metrics';
import logger from '../../../logger/logger';
import { APIGatewayProxyResult } from 'aws-lambda';

jest.mock('../../../connectors/ESConnector');
jest.mock('../../../utils/utils');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../logger/logger');
jest.mock('../../../config');

const mockEvent = (q?: string) => ({
    queryStringParameters: q !== undefined ? { q } : undefined
}) as any;

describe('getSuggestions handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleSuccess as jest.Mock).mockImplementation((x) => ({
            statusCode: 200,
            body: JSON.stringify(x),
        }));
        (utils.handleValidationError as jest.Mock).mockImplementation((x) => ({
            statusCode: 400,
            body: JSON.stringify(x),
        }));
        (logger.error as jest.Mock).mockImplementation(() => {});
    });

    it('returns validation error if q is missing', async () => {
        const event = mockEvent(undefined);
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith('Missing required search params');
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toBe('Missing required search params');
    });

    it('returns success if suggestions are fetched', async () => {
        const mockSuggestions = { postSuggestions: ['foo'], profileSuggestions: ['bar'], uniqueProfiles: [] };
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            getAllSuggestions: jest.fn().mockResolvedValue(mockSuggestions)
        });
        const event = mockEvent('test');
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(ESConnectorModule.getESConnector).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith(mockSuggestions);
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(mockSuggestions);
    });

    it('returns error if getAllSuggestions throws', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            getAllSuggestions: jest.fn().mockRejectedValue(new Error('fail'))
        });
        const event = mockEvent('test');
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('Suggest error', expect.any(Error));
        expect(utils.handleValidationError).toHaveBeenCalledWith('An error occurred while performing the search');
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toBe('An error occurred while performing the search');
    });

    it('increments the correct metric', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            getAllSuggestions: jest.fn().mockResolvedValue({ postSuggestions: [], profileSuggestions: [], uniqueProfiles: [] })
        });
        const event = mockEvent('test');
        await handler(event, {} as any, undefined as any);
        expect(Metrics.increment).toHaveBeenCalledWith('search.getSuggestions');
    });
});