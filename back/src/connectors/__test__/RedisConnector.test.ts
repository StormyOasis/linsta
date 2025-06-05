/* eslint-disable @typescript-eslint/no-explicit-any */
import RedisConnector from '../RedisConnector'; // Adjust the import path if needed
import { createClient } from 'redis';
import logger from '../../logger/logger';

jest.mock('redis');
jest.mock('../../logger/logger');
jest.mock('../../metrics/Metrics');
jest.mock('../../config', () => ({
    redis: {
        host: "localhost",
        userName: "redis",
        password: "password",
        port: 6379,
        connectTimeout: 10000,
        maxRetries: 20,
        defaultTTL: 300000
    },
    logging: {
        logLevel: "debug"
    },
}));

const mockRedisClient = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    dbSize: jest.fn(),
    info: jest.fn(),
    on: jest.fn(),
};

(createClient as jest.Mock).mockReturnValue(mockRedisClient);

describe('RedisConnector', () => {
    afterEach(() => {
        jest.clearAllMocks();
        // Reset singleton for isolation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (RedisConnector as any).client = null;
    });

    it('getClient returns the current client', async () => {
        await RedisConnector.connect();
        expect(RedisConnector.getClient()).toBe(mockRedisClient);
    });

    it('getInstance always returns the same instance', () => {
        const instance1 = (RedisConnector.constructor as any).getInstance();
        const instance2 = (RedisConnector.constructor as any).getInstance();
        expect(instance1).toBe(instance2);
    });    

    it('connects to Redis and sets up event listeners', async () => {
        await RedisConnector.connect();
        expect(createClient).toHaveBeenCalled();
        expect(mockRedisClient.connect).toHaveBeenCalled();
        expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
        expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('calls get on the redis client', async () => {
        mockRedisClient.get.mockResolvedValue('value');
        await RedisConnector.connect();
        const value = await RedisConnector.get('key');
        expect(mockRedisClient.get).toHaveBeenCalledWith('key');
        expect(value).toBe('value');
    });

    it('returns null if redis client returns null for get', async () => {
        mockRedisClient.get.mockResolvedValue(null);
        await RedisConnector.connect();
        const value = await RedisConnector.get('missing');
        expect(value).toBeNull();
    });    

    it('returns null and logs error if get fails', async () => {
        mockRedisClient.get.mockRejectedValue(new Error('fail'));
        await RedisConnector.connect();
        const value = await RedisConnector.get('key');
        expect(value).toBeNull();
        expect(logger.error).toHaveBeenCalled();
    });

    it('calls set on the redis client with default TTL', async () => {
        mockRedisClient.set.mockResolvedValue(undefined);
        await RedisConnector.connect();
        await RedisConnector.set('key', 'val');
        expect(mockRedisClient.set).toHaveBeenCalledWith('key', 'val', { EX: 300000 });
    });

    it('calls set on the redis client with custom TTL', async () => {
        mockRedisClient.set.mockResolvedValue(undefined);
        await RedisConnector.connect();
        await RedisConnector.set('key', 'val', 123);
        expect(mockRedisClient.set).toHaveBeenCalledWith('key', 'val', { EX: 123 });
    });

    it('getServerStatus returns 0 fields if info string is empty', async () => {
        mockRedisClient.info.mockResolvedValue('');
        await RedisConnector.connect();
        const stats = await RedisConnector.getServerStatus();
        expect(stats).toEqual({
            instantaneous_ops_per_sec: 0,
            connected_clients: 0,
            used_memory: 0,
            used_memory_peak: 0,
            mem_fragmentation_ratio: 0,
            used_cpu_user: 0
        });
    });    

    it('returns 0 if dbSize returns 0', async () => {
        mockRedisClient.dbSize.mockResolvedValue(0);
        await RedisConnector.connect();
        const count = await RedisConnector.getKeyCount();
        expect(count).toBe(0);
    });

    it('calls del on the redis client', async () => {
        mockRedisClient.del.mockResolvedValue(undefined);
        await RedisConnector.connect();
        await RedisConnector.del('key');
        expect(mockRedisClient.del).toHaveBeenCalledWith('key');
    });

    it('calls disconnect on close', async () => {
        await RedisConnector.connect();
        await RedisConnector.close();
        expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('reconnects after close', async () => {
        await RedisConnector.connect();
        await RedisConnector.close();
        expect(mockRedisClient.disconnect).toHaveBeenCalled();
        await RedisConnector.connect();
        expect(createClient).toHaveBeenCalledTimes(2);
    });    

    it('close does nothing if client is already null', async () => {
        (RedisConnector as any).client = null;
        await expect(RedisConnector.close()).resolves.toBeUndefined();
    });    

    it('returns key count from dbSize', async () => {
        mockRedisClient.dbSize.mockResolvedValue(42);
        await RedisConnector.connect();
        const count = await RedisConnector.getKeyCount();
        expect(count).toBe(42);
    });

    it('returns null and logs error if dbSize fails', async () => {
        mockRedisClient.dbSize.mockRejectedValue(new Error('fail'));
        await RedisConnector.connect();
        const count = await RedisConnector.getKeyCount();
        expect(count).toBeNull();
        expect(logger.error).toHaveBeenCalled();
    });
    it('calls del on the redis client with non-existent key', async () => {
        mockRedisClient.del.mockResolvedValue(undefined);
        await RedisConnector.connect();
        await expect(RedisConnector.del('nonexistent')).resolves.toBeUndefined();
        expect(mockRedisClient.del).toHaveBeenCalledWith('nonexistent');
    });

    it('calls set on the redis client with falsy value', async () => {
        mockRedisClient.set.mockResolvedValue(undefined);
        await RedisConnector.connect();
        await RedisConnector.set('key', '');
        expect(mockRedisClient.set).toHaveBeenCalledWith('key', '', { EX: 300000 });
        await RedisConnector.set('key', 0);
        expect(mockRedisClient.set).toHaveBeenCalledWith('key', 0, { EX: 300000 });
    });    

    it('returns server stats from info', async () => {
        const infoString = [
            'instantaneous_ops_per_sec:10',
            'connected_clients:5',
            'used_memory:2048',
            'used_memory_peak:4096',
            'mem_fragmentation_ratio:1.5',
            'used_cpu_user:0.5',
            ''
        ].join('\r\n');
        mockRedisClient.info.mockResolvedValue(infoString);
        await RedisConnector.connect();
        const stats = await RedisConnector.getServerStatus();
        expect(stats).toEqual({
            instantaneous_ops_per_sec: 10,
            connected_clients: 5,
            used_memory: 2,
            used_memory_peak: 4,
            mem_fragmentation_ratio: 1.5,
            used_cpu_user: 0.5
        });
    });

    it('getServerStatus handles missing or non-numeric fields', async () => {
        const infoString = [
            'instantaneous_ops_per_sec:abc', // not a number
            'connected_clients:',            // missing value
            'used_memory:',                  // missing value
            'used_memory_peak:4096',
            'mem_fragmentation_ratio:foo',   // not a number
            'used_cpu_user:0.5',
            ''
        ].join('\r\n');
        mockRedisClient.info.mockResolvedValue(infoString);
        await RedisConnector.connect();
        const stats = await RedisConnector.getServerStatus();
        expect(stats).toEqual({
            instantaneous_ops_per_sec: 0,
            connected_clients: 0,
            used_memory: 0,
            used_memory_peak: 4,
            mem_fragmentation_ratio: 0,
            used_cpu_user: 0.5
        });
    });    

    it('returns null and logs error if info fails', async () => {
        mockRedisClient.info.mockRejectedValue(new Error('fail'));
        await RedisConnector.connect();
        const stats = await RedisConnector.getServerStatus();
        expect(stats).toBeNull();
        expect(logger.error).toHaveBeenCalled();
    });

    it('does not reconnect if already connected', async () => {
        await RedisConnector.connect();
        // Set client to a non-null value to simulate already connected
        (RedisConnector as any).client = mockRedisClient;
        await RedisConnector.connect();
        // Should call disconnect on the existing client before reconnecting
        expect(mockRedisClient.disconnect).toHaveBeenCalled();
        expect(createClient).toHaveBeenCalledTimes(2);
    });

    it('logs error if connect throws', async () => {
        (createClient as jest.Mock).mockImplementationOnce(() => {
            throw new Error('fail');
        });
        await RedisConnector.connect();
        expect(logger.error).toHaveBeenCalledWith("Failed to connect to Redis:", expect.any(Error));
    });

    it('warns if set fails', async () => {
        mockRedisClient.set.mockRejectedValueOnce(new Error('fail'));
        const warnSpy = jest.spyOn(logger, 'warn');
        await RedisConnector.connect();
        await RedisConnector.set('key', 'val');
        expect(warnSpy).toHaveBeenCalledWith("Error adding to redis");
        warnSpy.mockRestore();
    });

    it('logs error if del fails', async () => {
        mockRedisClient.del.mockRejectedValueOnce(new Error('fail'));
        await RedisConnector.connect();
        await RedisConnector.del('key');
        expect(logger.error).toHaveBeenCalledWith("Error deleting key from Redis:", expect.any(Error));
    });

    it('logs error if ensureConnected fails in get', async () => {
        // Simulate ensureConnected throwing
        (RedisConnector as any).client = null;
        const connectSpy = jest.spyOn(RedisConnector, 'connect').mockRejectedValueOnce(new Error('fail'));
        const value = await RedisConnector.get('key');
        expect(value).toBeNull();
        expect(logger.error).toHaveBeenCalled();
        connectSpy.mockRestore();
    });

    it('logs error if ensureConnected fails in set', async () => {
        (RedisConnector as any).client = null;
        const connectSpy = jest.spyOn(RedisConnector, 'connect').mockRejectedValueOnce(new Error('fail'));
        const warnSpy = jest.spyOn(logger, 'warn');
        await RedisConnector.set('key', 'val');
        expect(warnSpy).toHaveBeenCalledWith("Error adding to redis");
        connectSpy.mockRestore();
        warnSpy.mockRestore();
    });

    it('logs error if ensureConnected fails in del', async () => {
        (RedisConnector as any).client = null;
        const connectSpy = jest.spyOn(RedisConnector, 'connect').mockRejectedValueOnce(new Error('fail'));
        await RedisConnector.del('key');
        expect(logger.error).toHaveBeenCalled();
        connectSpy.mockRestore();
    });

    it('logs error if ensureConnected fails in getKeyCount', async () => {
        (RedisConnector as any).client = null;
        const connectSpy = jest.spyOn(RedisConnector, 'connect').mockRejectedValueOnce(new Error('fail'));
        const count = await RedisConnector.getKeyCount();
        expect(count).toBeNull();
        expect(logger.error).toHaveBeenCalled();
        connectSpy.mockRestore();
    });

    it('logs error if ensureConnected fails in getServerStatus', async () => {
        (RedisConnector as any).client = null;
        const connectSpy = jest.spyOn(RedisConnector, 'connect').mockRejectedValueOnce(new Error('fail'));
        const stats = await RedisConnector.getServerStatus();
        expect(stats).toBeNull();
        expect(logger.error).toHaveBeenCalled();
        connectSpy.mockRestore();
    });

    it('resetInstance closes and nulls the singleton', async () => {
        await RedisConnector.connect();
        const closeSpy = jest.spyOn(RedisConnector, 'close');
        // Call static resetInstance
        (RedisConnector.constructor as any).resetInstance.call(RedisConnector.constructor);
        expect(closeSpy).toHaveBeenCalled();
        expect((RedisConnector as any).instance).toBeUndefined();
        closeSpy.mockRestore();
    });

    it('parseRedisInfo parses info string correctly', () => {
        const { parseRedisInfo } = jest.requireActual('../RedisConnector');
        const infoString = 'foo:1\r\nbar:2\r\nbaz:3\r\n';
        const result = parseRedisInfo(infoString);
        expect(result).toEqual({ foo: '1', bar: '2', baz: '3' });
    });

    it('parseRedisInfo ignores empty and malformed lines', () => {
        const { parseRedisInfo } = jest.requireActual('../RedisConnector');
        const infoString = 'foo:1\r\nbadline\r\n:missingkey\r\n\r\nbar:2\r\n';
        const result = parseRedisInfo(infoString);
        expect(result).toEqual({ foo: '1', bar: '2' });
    });    

    it('resetInstance does nothing if instance is already null', () => {
        (RedisConnector as any).instance = null;
        expect(() => (RedisConnector.constructor as any).resetInstance.call(RedisConnector.constructor)).not.toThrow();
    });    

    it('logs error if disconnect throws during connect', async () => {
        await RedisConnector.connect();
        mockRedisClient.disconnect.mockRejectedValueOnce(new Error('disconnect fail'));
        await RedisConnector.connect();
        expect(logger.error).toHaveBeenCalledWith("Failed to connect to Redis:", expect.any(Error));
    });    

    it('logs error if redis client emits error event', async () => {
        await RedisConnector.connect();
        const errorHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'error')[1];
        errorHandler(new Error('event error'));
        expect(logger.error).toHaveBeenCalledWith("Redis connection error:", expect.any(Error));
    });
    
    it('logs info if redis client emits connect event', async () => {
        await RedisConnector.connect();
        const connectHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'connect')[1];
        connectHandler();
        expect(logger.info).toHaveBeenCalledWith("Redis connection created");
    });
    
    it('reconnectStrategy logs error and returns Error after max retries', async () => {
        await RedisConnector.connect(); // <-- Ensure createClient is called
        const options = (createClient as jest.Mock).mock.calls[0][0];
        const reconnectStrategy = options.socket.reconnectStrategy;
        const result = reconnectStrategy(21); // maxRetries is 20 in config mock
        expect(result).toBeInstanceOf(Error);
        expect(logger.error).toHaveBeenCalledWith("Too many reconnect attempts. Redis connection terminated");
    });   

    it('calls set on the redis client with TTL 0', async () => {
        mockRedisClient.set.mockResolvedValue(undefined);
        await RedisConnector.connect();
        await RedisConnector.set('key', 'val', 0);
        expect(mockRedisClient.set).toHaveBeenCalledWith('key', 'val', { EX: 0 });
    });    

    it('parseRedisInfo handles lines with multiple colons', () => {
        const { parseRedisInfo } = jest.requireActual('../RedisConnector');
        const infoString = 'foo:1:2\r\nbar:3\r\n';
        const result = parseRedisInfo(infoString);
        expect(result).toEqual({ foo: '1:2', bar: '3' });
    });
    
    it('returns null if client is null after ensureConnected in get', async () => {
        (RedisConnector as any).client = null;
        const connectSpy = jest.spyOn(RedisConnector, 'connect').mockResolvedValue(undefined);
        const value = await RedisConnector.get('key');
        expect(value).toBeNull();
        connectSpy.mockRestore();
    });    
});