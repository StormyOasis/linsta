/* eslint-disable @typescript-eslint/no-explicit-any */
import { handler } from '../getLocation';
import * as AWSConnector from '../../../connectors/AWSConnector';
import * as utils from '../../../utils/utils';
import Metrics from '../../../metrics/Metrics';

jest.mock('../../../connectors/AWSConnector');
jest.mock('../../../utils/utils');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../config');

describe('getLocation handler', () => {
    const mockEvent = (term = 'test', requestorUserId = 'user1') => ({
        queryStringParameters: { term, requestorUserId }
    }) as any;

    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
    });

    it('returns validation error if term is missing', async () => {
        (utils.handleValidationError as jest.Mock).mockReturnValue('validation error');
        const event = mockEvent('', 'user1');
        const result = await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid params passed');
        expect(result).toBe('validation error');
    });

    it('returns validation error if requestorUserId is missing', async () => {
        (utils.handleValidationError as jest.Mock).mockReturnValue('validation error');
        const event = mockEvent('test', '');
        const result = await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith('Invalid params passed');
        expect(result).toBe('validation error');
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        (utils.handleValidationError as jest.Mock).mockReturnValue('forbidden');
        const event = mockEvent('test', 'user1');
        const result = await handler(event, {} as any, undefined as any);
        expect(utils.verifyJWT).toHaveBeenCalledWith(event, 'user1');
        expect(utils.handleValidationError).toHaveBeenCalledWith('You do not have permission to access this data', 403);
        expect(result).toBe('forbidden');
    });

    it('returns success if location data is fetched', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(true);
        (AWSConnector.getLocationData as jest.Mock).mockResolvedValue({ Results: ['loc1', 'loc2'] });
        (utils.handleSuccess as jest.Mock).mockReturnValue('success');
        const event = mockEvent('test', 'user1');
        const result = await handler(event, {} as any, undefined as any);
        expect(AWSConnector.getLocationData).toHaveBeenCalledWith('test');
        expect(utils.handleSuccess).toHaveBeenCalledWith(['loc1', 'loc2']);
        expect(result).toBe('success');
    });

    it('returns error if getLocationData throws', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(true);
        (AWSConnector.getLocationData as jest.Mock).mockRejectedValue(new Error('fail'));
        (utils.handleValidationError as jest.Mock).mockReturnValue('error');
        const event = mockEvent('test', 'user1');
        const result = await handler(event, {} as any, undefined as any);
        expect(utils.handleValidationError).toHaveBeenCalledWith('Error fetching location data', 500);
        expect(result).toBe('error');
    });

    it('increments the correct metric', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        (utils.handleValidationError as jest.Mock).mockReturnValue('forbidden');
        const event = mockEvent('test', 'user1');
        await handler(event, {} as any, undefined as any);
        expect(Metrics.increment).toHaveBeenCalledWith('locations.getData');
    });
});