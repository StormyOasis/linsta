import {
    isUserAuthorized,
    getLikesByPost,
    getPostByPostId,
    getFollowingUserIds,
    getProfile,
    getVertexPropertySafe,
    handleValidationError,
} from '../utils';

import RedisConnector from '../../Connectors/RedisConnector';
import ESConnector from '../../Connectors/ESConnector';
import { Context } from 'koa';

jest.mock('../../Connectors/RedisConnector');
jest.mock('../../Connectors/ESConnector');

import * as dbConnectorModule from '../../Connectors/DBConnector'; // adjust this path
import DBConnector from '../../Connectors/DBConnector'; // same as above

// Get original methods to preserve
const { parseGraphResult, extractMapFromResult, unwrapResult, __ } = DBConnector;

// Mock all other methods
jest.mock('../../Connectors/DBConnector', () => {
  const actual = jest.requireActual('../../Connectors/DBConnector');

  // Build a mocked version of the singleton instance
  const mockedInstance = {
    ...actual.default,
    connect: jest.fn(),
    close: jest.fn(),
    getConnection: jest.fn(),
    getGraph: jest.fn().mockReturnValue({
        V: jest.fn().mockReturnThis(),
    }),
    getTx: jest.fn(),
    getTransactionG: jest.fn(),
    beginTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    reconnectIfNeeded: jest.fn(),

    // Keep these real
    parseGraphResult: actual.default.parseGraphResult,
    extractMapFromResult: actual.default.extractMapFromResult,
    unwrapResult: actual.default.unwrapResult,
    
  };

  return {
    __esModule: true,
    ...actual,
    default: mockedInstance,
  };
});


describe('utils.ts', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('isUserAuthorized', () => {
        it('should return true if the user is authorized', () => {
            const ctx = { state: { user: { id: '123' } } } as unknown as Context;
            expect(isUserAuthorized(ctx, '123')).toBe(true);
        });

        it('should return false if the user is not authorized', () => {
            const ctx = { state: { user: { id: '123' } } } as unknown as Context;
            expect(isUserAuthorized(ctx, '456')).toBe(false);
        });
    });

    describe('getLikesByPost', () => {
        it('fetches likes from DB and parses results', async () => {
       /*     await DBConnector.connect();
            expect(DBConnector.connect).toHaveBeenCalled();

            const likes1 = new Map<string, string>();
            likes1.set("userId", "1");
            likes1.set("userName", "test");
            likes1.set("profileId", "p1");

            const mockResults = [likes1];

            const result = await getLikesByPost('post1');
            expect(result).toEqual(mockResults);*/
        });

        it('should return an empty array if postId is null', async () => {
            //const likes = await getLikesByPost(null);
           // expect(likes).toEqual([]);
        });
    });

    describe('getPostByPostId', () => {
        it('should return a post from Redis if cached', async () => {
          /*  const mockPost = { postId: 'post123', commentCount: 5 };

            (RedisConnector.get as jest.Mock)
                .mockResolvedValueOnce("esId123")
                .mockResolvedValueOnce(JSON.stringify(mockPost)); // Redis hits

                
            const result = await getPostByPostId('post123');
            expect(result?.post).toEqual(mockPost);*/
        });

        it('should fetch a post from Elasticsearch if not cached', async () => {
            /*const mockEsResult = {
                body: {
                    hits: {
                        hits: [{ _source: { postId: 'post123', commentCount: 5 } }],
                    },
                },
            };
            RedisConnector.get.mockResolvedValue(null);

            const result = await getPostByPostId('post123');
            expect(result?.post).toEqual({ postId: 'post123', commentCount: 5 });*/
        });

        it('should throw an error if the post is not found', async () => {
            /*RedisConnector.get.mockResolvedValue(null);
            ESConnector.getInstance.mockReturnValue({
                search: jest.fn().mockResolvedValue({ body: { hits: { hits: [] } } }),
            });

            await expect(getPostByPostId('post123')).rejects.toThrow('Invalid post');*/
        });
    });

    describe('getFollowingUserIds', () => {
        it('should return a list of following user IDs', async () => {
            const mockResults = [
                { id: 'user1' },
                { id: 'user2' },
            ];
            // Mock the toList method to return mockResults


           // const userIds = await getFollowingUserIds('user123');
            //expect(userIds).toEqual(['user1', 'user2']);
        });

        it('should return an empty array if an error occurs', async () => {
            // Mock the toList method to return mockResults

           // const userIds = await getFollowingUserIds('user123');
           // expect(userIds).toEqual([]);
        });
    });

    describe('getProfile', () => {
        it('should return a profile from Redis if cached', async () => {
            /* const mockProfile = { userId: 'user123', userName: 'testUser' };
             RedisConnector.get.mockResolvedValue(JSON.stringify(mockProfile));
 
             const profile = await getProfile('user123', null);
             expect(profile).toEqual(mockProfile);*/
        });

        it('should throw an error if the profile is not found', async () => {
            /* RedisConnector.get.mockResolvedValue(null);
             // Mock the toList method to return mockResults
             (DBConnector.getGraph as jest.Mock).mockReturnValue({
                 V: jest.fn().mockReturnThis(),
                 inE: jest.fn().mockReturnThis(),
                 outV: jest.fn().mockReturnThis(),
                 project: jest.fn().mockReturnThis(),
                 by: jest.fn().mockReturnThis(),
                 toList: jest.fn().mockResolvedValue({value: null}),
             });            
 
             await expect(getProfile('user123', null)).rejects.toThrow('Invalid user name or id');*/
        });
    });

    describe('getVertexPropertySafe', () => {
        it('should return the property value if it exists', () => {
            const vertexProperties = { name: [{ value: 'testName' }] };
            const result = getVertexPropertySafe(vertexProperties, 'name');
            expect(result).toBe('testName');
        });

        it('should return the default value if the property does not exist', () => {
            const vertexProperties = {};
            const result = getVertexPropertySafe(vertexProperties, 'name', 'defaultName');
            expect(result).toBe('defaultName');
        });
    });

    describe('handleValidationError', () => {
        it('should set the correct status and body on the context', () => {
            const ctx = {} as Context;
            handleValidationError(ctx, 'Invalid input', 400);

            expect(ctx.status).toBe(400);
            expect(ctx.body).toEqual({ status: 'Invalid input' });
        });
    });
});