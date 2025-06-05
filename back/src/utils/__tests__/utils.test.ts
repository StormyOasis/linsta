/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    getLikesByPost,
    getPostByPostId,
    getFollowingUserIds,
    getProfile,
    getVertexPropertySafe,
    handleValidationError,
    mapToObjectDeep,
    verifyJWT,
    updateProfileInRedis,
    getPfpByUserId,
    addPfpsToPosts,
    addCommentCountsToPosts,
    addLikesToPosts,
    handleSuccess,
    buildPostSortClause,
} from '../utils';

import RedisConnector from '../../connectors/RedisConnector';
import DBConnector from '../../connectors/DBConnector';
import * as ESConnectorModule from '../../connectors/ESConnector';

import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');
jest.mock('../../logger/logger');
jest.mock('../../config', () => ({
    logging: {
        logLevel: "debug"
    },
    auth: {
        jwt: {
            secret: "sfD*okj2398!ru9aWad^IOEa",
            expiration: "128d"
        }
    },
}));

jest.mock('../../connectors/RedisConnector');
jest.mock('../../connectors/ESConnector', () => {
    // Import here to avoid circular dependency at module load time
    const { buildSearchResultSet } = jest.requireActual('../../connectors/ESConnector');
    return {
        getESConnector: jest.fn(() => ({
            search: jest.fn().mockResolvedValue({ body: { hits: { hits: [{ _source: { foo: 'bar' } }] } } }),
            searchProfile: jest.fn().mockResolvedValue({ hits: { hits: [{ _source: { firstName: 'Test', lastName: 'User' } }] } }),
        })),
        buildSearchResultSet: jest.fn(buildSearchResultSet),
    };
});
jest.mock('../../connectors/DBConnector', () => {
    const actual = jest.requireActual('../../connectors/DBConnector');

    return {
        ...actual,
        __esModule: true,
        default: {
            ...actual.default,
            getGraph: jest.fn(),
            __: jest.fn(),
            P: jest.fn(),
            parseGraphResult: jest.fn(),
            extractMapFromResult: jest.fn(),
            unwrapResult: jest.fn(),
        }
    };
});


function makeGremlinChainMock(resolvedValue: any = []) {
    const chain: any = {};
    [
        'V', 'inE', 'outV', 'project', 'by', 'count', 'fold', 'filter', 'is', 'out', 'next', 'has',
        'id', 'outE'
    ].forEach(fn => {
        chain[fn] = jest.fn().mockReturnThis();
    });
    chain.toList = jest.fn().mockResolvedValue(resolvedValue);
    return chain;
}

describe('utils.ts', () => {
    beforeEach(() => {
        const chainable = makeGremlinChainMock([]);
        (DBConnector.__ as jest.Mock).mockReturnValue(chainable);
        (DBConnector.P as jest.Mock).mockReturnValue({ gt: jest.fn() });
        (DBConnector.getGraph as jest.Mock).mockReturnValue(chainable);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('verifyJWT', () => {
        it('returns null if event or userId is missing', () => {
            expect(verifyJWT(null as any, 'id')).toBeNull();
            expect(verifyJWT({ headers: {} } as any, null as any)).toBeNull();
        });

        it('returns null if JWT payload is object but id is missing', () => {
            (jwt.verify as jest.Mock).mockReturnValue({});
            expect(verifyJWT({ headers: { Authorization: 'Bearer token' } } as any, 'id')).toBeNull();
        });
        it('returns null if JWT payload is falsy', () => {
            (jwt.verify as jest.Mock).mockReturnValue(null);
            expect(verifyJWT({ headers: { Authorization: 'Bearer token' } } as any, 'id')).toBeNull();
        });

        it('returns null if no Authorization header', () => {
            expect(verifyJWT({ headers: {} } as any, 'id')).toBeNull();
        });

        it('returns null if JWT is invalid', () => {
            (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('bad'); });
            expect(verifyJWT({ headers: { Authorization: 'Bearer badtoken' } } as any, 'id')).toBeNull();
        });

        it('returns null if JWT id does not match', () => {
            (jwt.verify as jest.Mock).mockReturnValue({ id: 'other' });
            expect(verifyJWT({ headers: { Authorization: 'Bearer token' } } as any, 'id')).toBeNull();
        });

        it('returns payload if valid', () => {
            (jwt.verify as jest.Mock).mockReturnValue({ id: 'id' });
            expect(verifyJWT({ headers: { Authorization: 'Bearer token' } } as any, 'id')).toEqual({ id: 'id' });
        });
    });

    describe('updateProfileInRedis', () => {
        it('sets profile in Redis under both id and name keys', async () => {
            const profile = { userName: 'bob' } as any;
            await updateProfileInRedis(profile, '123');
            expect(RedisConnector.set).toHaveBeenCalledWith('profile:id:123', JSON.stringify(profile));
            expect(RedisConnector.set).toHaveBeenCalledWith('profile:name:bob', JSON.stringify(profile));
        });

        it('calls RedisConnector.set with both keys', async () => {
            const profile = { userName: 'bob' } as any;
            await updateProfileInRedis(profile, '123');
            expect(RedisConnector.set).toHaveBeenCalledTimes(2);
        });
        it('throws if RedisConnector.set fails', async () => {
            (RedisConnector.set as jest.Mock).mockRejectedValueOnce(new Error('fail'));
            await expect(updateProfileInRedis({ userName: 'bob' } as any, '123')).rejects.toThrow('fail');
        });
    });

    describe('getPfpByUserId', () => {
        it('returns pfp from Redis if cached', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(JSON.stringify({ pfp: 'pic.png' }));
            const result = await getPfpByUserId('u1');
            expect(result).toBe('pic.png');
        });

        it('returns pfp from DB if not cached', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(null);
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                next: jest.fn().mockResolvedValue({ value: { properties: { pfp: [{ value: 'pic2.png' }] } } }),
            });
            const result = await getPfpByUserId('u2');
            expect(result).toBe('pic2.png');
        });

        it('returns empty string if no pfp found', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(null);
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                next: jest.fn().mockResolvedValue({ value: { properties: {} } }),
            });
            const result = await getPfpByUserId('u3');
            expect(result).toBe('');
        });
    });

    describe('addPfpsToPosts', () => {
        it('adds pfps to all posts', async () => {
            const posts = {
                a: { user: { userId: 'u1' } },
                b: { user: { userId: 'u2' } },
            } as any;
            (RedisConnector.get as jest.Mock).mockResolvedValue(JSON.stringify({ pfp: 'pic.png' }));
            await addPfpsToPosts(posts);
            expect(posts.a.user.pfp).toBe('pic.png');
            expect(posts.b.user.pfp).toBe('pic.png');
        });

        it('handles empty posts object', async () => {
            await expect(addPfpsToPosts({})).resolves.toBeUndefined();
        });
    });

    describe('addCommentCountsToPosts', () => {
        it('adds comment counts to posts', async () => {
            const posts = { p1: { global: { commentCount: 0 } }, p2: { global: { commentCount: 0 } } } as any;
            (DBConnector.__ as jest.Mock).mockReturnValue({
                id: jest.fn().mockReturnThis(),
                outE: jest.fn().mockReturnThis(),
                count: jest.fn().mockReturnThis(),
            });
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([
                    { postId: 'p1', commentCount: 2 },
                    { postId: 'p2', commentCount: 3 },
                ]),
            });
            (DBConnector.unwrapResult as jest.Mock).mockImplementation(x => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation(x => x);
            await addCommentCountsToPosts(posts, ['p1', 'p2']);
            expect(posts.p1.global.commentCount).toBe(2);
            expect(posts.p2.global.commentCount).toBe(3);
        });

        it('handles no comment results', async () => {
            const posts = { p1: {}, p2: {} } as any;
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([]),
            });
            await addCommentCountsToPosts(posts, ['p1', 'p2']);
            expect(posts.p1.commentCount).toBeUndefined();
            expect(posts.p2.commentCount).toBeUndefined();
        });

        it('does not set commentCount if postId not in posts', async () => {
            const posts = { p1: {} } as any;
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([{ postId: 'not_in_posts', commentCount: 5 }]),
            });
            (DBConnector.unwrapResult as jest.Mock).mockImplementation(x => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation(x => x);
            await addCommentCountsToPosts(posts, ['not_in_posts']);
            expect(posts.p1.commentCount).toBeUndefined();
        });
    });

    describe('addLikesToPosts', () => {
        it('handles no like results', async () => {
            const posts = { p1: { global: { likes: [] } } } as any;
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                filter: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([]),
            });
            await addLikesToPosts(posts, ['p1']);
            expect(posts.p1.global.likes).toEqual([]);
        });

        it('adds likes to posts', async () => {
            const posts = { p1: { global: { likes: [] } } } as any;
            (DBConnector.__ as jest.Mock).mockReturnValue({
                id: jest.fn().mockReturnThis(),
                inE: jest.fn().mockReturnThis(),
                outV: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                fold: jest.fn().mockReturnThis(),
                filter: jest.fn().mockReturnThis(),
                count: jest.fn().mockReturnThis(),
                is: jest.fn().mockReturnThis(),
            });
            (DBConnector.P as jest.Mock).mockReturnValue({ gt: jest.fn() });
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                filter: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([
                    {
                        postId: 'p1',
                        users: [
                            { userName: 'alice', userId: '1', profileId: 'p1', firstName: 'A', lastName: 'L', pfp: 'pic.png' }
                        ]
                    }
                ]),
            });
            (DBConnector.unwrapResult as jest.Mock).mockImplementation(x => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation(x => x);
            await addLikesToPosts(posts, ['p1']);
            expect(posts.p1.global.likes[0]).toEqual({
                userName: 'alice',
                userId: '1',
                profileId: 'p1',
                firstName: 'A',
                lastName: 'L',
                pfp: 'pic.png'
            });
        });

        it('skips posts not in posts object', async () => {
            const posts = { p1: { global: { likes: [] } } } as any;
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                filter: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([{ postId: 'not_in_posts', users: [] }]),
            });
            (DBConnector.unwrapResult as jest.Mock).mockImplementation(x => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation(x => x);
            await addLikesToPosts(posts, ['not_in_posts']);
            expect(posts.p1.global.likes).toEqual([]);
        });
        it('handles users as undefined', async () => {
            const posts = { p1: { global: { likes: [] } } } as any;
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                filter: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([{ postId: 'p1' }]),
            });
            (DBConnector.unwrapResult as jest.Mock).mockImplementation(x => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation(x => x);
            await addLikesToPosts(posts, ['p1']);
            expect(posts.p1.global.likes).toEqual([]);
        });
    });

    describe('handleSuccess', () => {
        it('returns correct success object', () => {
            const result = handleSuccess({ foo: 'bar' });
            expect(result).toEqual({
                statusCode: 200,
                body: JSON.stringify({ foo: 'bar' }),
            });
        });
    });

    describe('buildPostSortClause', () => {
        it('returns the correct sort clause', () => {
            const sort = buildPostSortClause();
            expect(Array.isArray(sort)).toBe(true);
            expect(sort[0]['global.dateTime']).toBeDefined();
            expect(sort[1]['media.postId']).toBeDefined();
        });
    });

    describe('getLikesByPost', () => {
        it('returns empty array if postId is null', async () => {
            const likes = await getLikesByPost(null);
            expect(likes).toEqual([]);
        });

        it('returns empty array if postId is empty string', async () => {
            const likes = await getLikesByPost('');
            expect(likes).toEqual([]);
        });

        it('throws an error if DB returns null', async () => {
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                inE: jest.fn().mockReturnThis(),
                outV: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue(null),
            });
            await expect(getLikesByPost('post1')).rejects.toThrow('Error getting post likes');
        });

        it('fetches likes from DB and parses results', async () => {
            const likes1 = new Map<string, string>();
            likes1.set("userId", "1");
            likes1.set("userName", "test");
            likes1.set("profileId", "p1");
            const mockResults = [likes1];

            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                inE: jest.fn().mockReturnThis(),
                outV: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue(mockResults),
            });

            (DBConnector.unwrapResult as jest.Mock).mockImplementation((x) => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation((data) => Object.fromEntries(data));

            const result = await getLikesByPost('post1');
            expect(result).toEqual([{ userId: "1", userName: "test", profileId: "p1" }]);
        });

        it('handles parseGraphResult returning undefined', async () => {
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                inE: jest.fn().mockReturnThis(),
                outV: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([{}]),
            });
            (DBConnector.unwrapResult as jest.Mock).mockImplementation(x => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation(() => undefined);
            const result = await getLikesByPost('post1');
            expect(result).toEqual([undefined]);
        });
    });

    describe('getPostByPostId', () => {
        it('returns null if postId is empty', async () => {
            const result = await getPostByPostId('');
            expect(result).toBeNull();
        });

        it('throws an error if esId lookup fails', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(null);
            (DBConnector.getGraph as jest.Mock).mockReturnValueOnce({
                V: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([]),
            });
            await expect(getPostByPostId('post123')).rejects.toThrow('Error getting post');
        });

        it('sets post.commentCount if commentResults exist', async () => {
            const mockPost = { postId: 'post123', global: { likes: [] }, user: { userId: 'u1', pfp: '' } };
            (RedisConnector.get as jest.Mock)
                .mockResolvedValueOnce("esId123")
                .mockResolvedValueOnce(JSON.stringify(mockPost));
            (DBConnector.getGraph as jest.Mock)
                .mockReturnValueOnce(makeGremlinChainMock([{ commentCount: 7 }]))
                .mockReturnValueOnce(makeGremlinChainMock([]))
                .mockReturnValueOnce(makeGremlinChainMock([{ esId: "esId123" }]));
            (DBConnector.unwrapResult as jest.Mock).mockImplementation((x) => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation((data) => data);
            const result = await getPostByPostId('post123');
            expect(result?.post.global.commentCount).toBe(7);
        });

        it('throws an error if esId is invalid', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(null);
            (DBConnector.getGraph as jest.Mock).mockReturnValueOnce({
                V: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([{ esId: '' }]),
            });
            (DBConnector.unwrapResult as jest.Mock).mockImplementation((x) => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation((data) => data);
            await expect(getPostByPostId('post123')).rejects.toThrow('Invalid post id');
        });

        it('throws an error if ES returns no hits', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce('esId123');
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(null);
            const searchMock = jest.fn().mockResolvedValue({ body: { hits: { hits: [] } } });
            (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({ search: searchMock });
            await expect(getPostByPostId('post123')).rejects.toThrow('Invalid post');
        });

        it('throws an error if post is not found after ES', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce('esId123');
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(null);
            const searchMock = jest.fn().mockResolvedValue({ body: { hits: { hits: [{ _source: {} }] } } });
            (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({ search: searchMock });
            // Simulate buildSearchResultSet returning empty array
            jest.spyOn(ESConnectorModule, 'buildSearchResultSet').mockReturnValue([]);
            await expect(getPostByPostId('post123')).rejects.toThrow('Post not found');
        });

        it('returns a post from Redis if cached', async () => {
            const mockPost = { postId: 'post123', global: { likes: [], commentCount: 5 }, user: { userId: 'u1', pfp: '' } };
            (RedisConnector.get as jest.Mock)
                .mockResolvedValueOnce("esId123")
                .mockResolvedValueOnce(JSON.stringify(mockPost));

            // Mock getGraph to return the correct chain for each call
            (DBConnector.getGraph as jest.Mock)
                .mockReturnValueOnce(makeGremlinChainMock([{ commentCount: 5 }]))   // for comment count                                              
                .mockReturnValueOnce(makeGremlinChainMock([]))                          // for likes                
                .mockReturnValueOnce(makeGremlinChainMock([{ esId: "esId123" }]));     // for esId lookup  

            (DBConnector.unwrapResult as jest.Mock).mockImplementation((x) => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation((data) => data);

            const result = await getPostByPostId('post123');
            expect(result?.post).toEqual(mockPost);
        });

        it('throws an error if the post is not found', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValue(null);
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                by: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([]),
            });
            await expect(getPostByPostId('post123')).rejects.toThrow('Error getting post');
        });

        it('handles missing user property gracefully', async () => {
            const mockPost = { postId: 'post123', commentCount: 5, global: { likes: [] } };
            (RedisConnector.get as jest.Mock)
                .mockResolvedValueOnce("esId123")
                .mockResolvedValueOnce(JSON.stringify(mockPost));
            (DBConnector.getGraph as jest.Mock)
                .mockReturnValueOnce(makeGremlinChainMock([{ commentCount: 5 }]))
                .mockReturnValueOnce(makeGremlinChainMock([]))
                .mockReturnValueOnce(makeGremlinChainMock([{ esId: "esId123" }]));
            (DBConnector.unwrapResult as jest.Mock).mockImplementation((x) => x);
            (DBConnector.parseGraphResult as jest.Mock).mockImplementation((data) => data);
            await expect(getPostByPostId('post123')).rejects.toThrow();
        });
    });

    describe('getFollowingUserIds', () => {
        it('returns a list of following user IDs', async () => {
            const mockResults = [
                { id: 'user1' },
                { id: 'user2' },
            ];
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                out: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue(mockResults),
            });
            (DBConnector.unwrapResult as jest.Mock).mockImplementation((x) => x);

            const userIds = await getFollowingUserIds('user123');
            expect(userIds).toEqual(['user1', 'user2']);
        });

        it('returns an empty array if an error occurs', async () => {
            (DBConnector.getGraph as jest.Mock).mockImplementation(() => { throw new Error('fail'); });
            const userIds = await getFollowingUserIds('user123');
            expect(userIds).toEqual([]);
        });

        it('returns [] if vertex format is unexpected', async () => {
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                out: jest.fn().mockReturnThis(),
                toList: jest.fn().mockResolvedValue([123]), // not Map or object
            });
            (DBConnector.unwrapResult as jest.Mock).mockImplementation(x => x);
            const userIds = await getFollowingUserIds('user123');
            expect(userIds).toEqual([]);
        });
    });

    describe('getProfile', () => {
        it('returns a profile from Redis if cached', async () => {
            const mockProfile = { userId: 'user123', userName: 'testUser' };
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockProfile));
            const profile = await getProfile('user123', null);
            expect(profile).toEqual(mockProfile);
        });

        it('returns null if no userId and no userName', async () => {
            const profile = await getProfile(null, null);
            expect(profile).toBeNull();
        });

        it('returns null and logs error if DB throws', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(null);
            (DBConnector.getGraph as jest.Mock).mockImplementation(() => { throw new Error('fail'); });
            const profile = await getProfile('user123', null);
            expect(profile).toBeNull();
        });

        it('returns null and logs error if ES returns no hits', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(null);
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                next: jest.fn().mockResolvedValue({ value: { id: 'user123', properties: { profileId: [{ value: 'pid' }] } } }),
            });
            (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
                searchProfile: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
            });
            const profile = await getProfile('user123', null);
            expect(profile).toBeNull();
        });

        it('returns null if profileId is missing in vertexProperties', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(null);
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                next: jest.fn().mockResolvedValue({ value: { id: 'user123', properties: {} } }),
            });
            const profile = await getProfile('user123', null);
            expect(profile).toBeNull();
        });

        it('returns null if ES throws', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValueOnce(null);
            (DBConnector.getGraph as jest.Mock).mockReturnValue({
                V: jest.fn().mockReturnThis(),
                next: jest.fn().mockResolvedValue({ value: { id: 'user123', properties: { profileId: [{ value: 'pid' }] } } }),
            });
            (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
                searchProfile: jest.fn().mockImplementation(() => { throw new Error('fail'); }),
            });
            const profile = await getProfile('user123', null);
            expect(profile).toBeNull();
        });
    });

    describe('getVertexPropertySafe', () => {
        it('returns the property value if it exists', () => {
            const vertexProperties = { name: [{ value: 'testName' }] };
            const result = getVertexPropertySafe(vertexProperties, 'name');
            expect(result).toBe('testName');
        });

        it('returns the default value if the property does not exist', () => {
            const vertexProperties = {};
            const result = getVertexPropertySafe(vertexProperties, 'name', 'defaultName');
            expect(result).toBe('defaultName');
        });
        it('returns default value if property is undefined', () => {
            expect(getVertexPropertySafe(undefined, 'foo', 'bar')).toBe('bar');
        });
    });

    describe('handleValidationError', () => {
        it('returns correct error object', () => {
            const result = handleValidationError('Invalid input', 400);
            expect(result).toEqual({
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid input' }),
            });
        });
        it('returns default status code if not provided', () => {
            const result = handleValidationError('Oops');
            expect(result.statusCode).toBe(400);
        });
    });

    describe('mapToObjectDeep', () => {
        it('converts Map to object recursively', () => {
            const map = new Map([['a', new Map([['b', 1]])]]);
            expect(mapToObjectDeep(map)).toEqual({ a: { b: 1 } });
        });
        it('converts array of Maps', () => {
            const arr = [new Map([['x', 2]])];
            expect(mapToObjectDeep(arr)).toEqual([{ x: 2 }]);
        });
        it('returns primitives as is', () => {
            expect(mapToObjectDeep(5)).toBe(5);
            expect(mapToObjectDeep('foo')).toBe('foo');
        });
        it('handles nested objects', () => {
            const input = { foo: new Map([['bar', 42]]) };
            expect(mapToObjectDeep(input)).toEqual({ foo: { bar: 42 } });
        });
    });
});