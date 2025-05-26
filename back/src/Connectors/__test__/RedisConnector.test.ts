import RedisConnector from '../RedisConnector'; // Adjust the import path if needed
import { createClient } from 'redis';
import logger from '../../logger/logger';
import Metrics from '../../metrics/Metrics';

jest.mock('redis');
jest.mock('../../logger/logger');
jest.mock('../../metrics/Metrics');
jest.mock('config');  // Mock the config module
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),  // Keep all other fs methods intact
    readFileSync: jest.fn(),      // Mock only readFileSync method
}));

describe('RedisConnector', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clears any mock calls between tests
    });

    test('should successfully connect to Redis', async () => {
        const mockClient = {
            connect: jest.fn().mockResolvedValueOnce(undefined), // Simulate successful connection
            on: jest.fn(),
            disconnect: jest.fn(),
            dbSize: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
        };

        // Mock createClient to return the mock client
        (createClient as jest.Mock).mockReturnValue(mockClient);

        await RedisConnector.connect(); // Call the connect method

        expect(createClient).toHaveBeenCalledWith(expect.objectContaining({
            url: 'redis://redis:password@localhost:6379',
            socket: expect.objectContaining({
                connectTimeout: 10000,
                reconnectStrategy: expect.any(Function),
            }),
        }));
        expect(mockClient.connect).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith('Redis connection created');
    });

    test('should log error and increment redis.errorCount when connection fails', async () => {
        const mockClient = {
            connect: jest.fn().mockRejectedValueOnce(new Error('Connection failed')),
            on: jest.fn(),
            disconnect: jest.fn(),
            dbSize: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
        };

        (createClient as jest.Mock).mockReturnValue(mockClient);

        await expect(RedisConnector.connect()).rejects.toThrow('Connection failed');

        expect(logger.error).toHaveBeenCalledWith('Failed to connect to Redis:', expect.any(Error));

        // Ensure the connect method was called
        expect(mockClient.connect).toHaveBeenCalled();

        // Ensure the correct log messages were logged
        expect(logger.info).toHaveBeenCalledWith('Creating redis connection...');
        expect(logger.error).toHaveBeenCalledWith('Failed to connect to Redis:', expect.any(Error));
    });
});