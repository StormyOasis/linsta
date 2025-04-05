// __mocks__/redis.ts
import { RedisClientType } from 'redis';

// Mocking createClient to return a mock Redis client
export const createClient = jest.fn(() => {
  // Create a mock client with the necessary methods mocked as Jest mock functions
  const mockClient = {
    connect: jest.fn().mockResolvedValue(undefined), // Simulate successful connection
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    dbSize: jest.fn(),
    info: jest.fn(),
    on: jest.fn(),
    // Mock additional methods if needed
  };

  return mockClient; // Ensure the return type is RedisClientType<any>
});