import { Client } from '@elastic/elasticsearch';
import { buildDataSetForES, buildSearchResultSet, getESConnector, resetESConnector } from '../ESConnector';
import config from '../../config';
import fs from 'fs';
import RedisConnector from '../RedisConnector';

jest.mock('../RedisConnector', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        set: jest.fn(),
    }
}));

jest.mock('@elastic/elasticsearch');
jest.mock('fs');
jest.mock('../../logger/logger');
jest.mock('../../metrics/Metrics');
jest.mock('../../config', () => ({
    es: {
        node: 'http://localhost:9200',
        apiKey: 'test-key',
        mainIndex: 'main',
        profileIndex: 'profile',
        defaultResultSize: 10000,
        defaultPaginationSize: 10,
        defaultSuggestionResultSize: 5,
    },
    database: {
        maxRetries: 3,
        minTimeout: 100,
        maxTimeout: 1000,
        backoffFactor: 2,
    },
    logging: {
        logLevel: "debug"
    }
}));

const mockClient = {
    search: jest.fn(),
    index: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    close: jest.fn(),
};

(Client as unknown as jest.Mock).mockImplementation(() => mockClient);
(fs.readFileSync as jest.Mock).mockReturnValue('fake-ca');

describe('ESConnector', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await resetESConnector();
    });

    it('should return the same singleton instance', () => {
        const instance1 = getESConnector();
        const instance2 = getESConnector();
        expect(instance1).toBe(instance2);
    });

    it('should initialize the ES client with config', () => {
        getESConnector();
        expect(Client).toHaveBeenCalledWith({
            node: config.es.node,
            auth: { apiKey: config.es.apiKey },
            tls: { ca: 'fake-ca' },
        });
    });

    it('should perform a search with default size', async () => {
        mockClient.search.mockResolvedValue({ hits: { hits: [] } });
        const connector = getESConnector();
        const result = await connector.search({ match_all: {} }, null);
        expect(mockClient.search).toHaveBeenCalled();
        expect(result).toEqual({ hits: { hits: [] } });
    });

    it('should perform a search with custom size', async () => {
        mockClient.search.mockResolvedValue({ hits: { hits: [] } });
        const connector = getESConnector();
        await connector.search({ match: { foo: 'bar' } }, 5);
        expect(mockClient.search).toHaveBeenCalledWith(
            expect.objectContaining({ size: 5 }),
            expect.anything()
        );
    });

    it('should insert a document', async () => {
        mockClient.index.mockResolvedValue({ result: 'created' });
        const connector = getESConnector();
        const data = { foo: 'bar' };
        const result = await connector.insert(data);
        expect(mockClient.index).toHaveBeenCalledWith({
            index: config.es.mainIndex,
            document: data,
        });
        expect(result).toEqual({ result: 'created' });
    });

    it('should update a document', async () => {
        mockClient.update.mockResolvedValue({ result: 'updated' });
        const connector = getESConnector();
        const result = await connector.update('id1', { script: {} }, true, { foo: 'bar' });
        expect(mockClient.update).toHaveBeenCalledWith({
            index: config.es.mainIndex,
            id: 'id1',
            script: { script: {} },
            body: { foo: 'bar' },
            _source: true,
        });
        expect(result).toEqual({ result: 'updated' });
    });

    it('should delete a document', async () => {
        mockClient.delete.mockResolvedValue({ result: 'deleted' });
        const connector = getESConnector();
        const result = await connector.delete('id1');
        expect(mockClient.delete).toHaveBeenCalledWith({
            index: config.es.mainIndex,
            id: 'id1',
        });
        expect(result).toEqual({ result: 'deleted' });
    });

    it('should count documents', async () => {
        mockClient.count.mockResolvedValue({ count: 42 });
        const connector = getESConnector();
        const result = await connector.count({ match_all: {} });
        expect(mockClient.count).toHaveBeenCalled();
        expect(result).toEqual({ count: 42 });
    });

    it('should close the client', async () => {
        const connector = getESConnector();
        await connector.close();
        expect(mockClient.close).toHaveBeenCalled();
    });

    it('should build a dataset for ES', () => {
        const user = { userId: '1', userName: 'test', pfp: 'pfp' };
        const global = { collaborators: {}, captionText: 'caption', commentCount: 0, commentsDisabled: false, likesDisabled: false, locationText: 'loc', id: '', dateTime: '', likes: [] };
        const entries = [{ alt: 'alt', entityTag: 'tag', id: '1', mimeType: 'image/jpeg', url: 'url', postId: 'p1', userId: '1' }];
        const result = buildDataSetForES(user, global, entries);
        expect(result).toHaveProperty('user');
        expect(result).toHaveProperty('global');
        expect(result).toHaveProperty('media');
    });

    it('should build search result set', () => {
        const hits = [{
            _id: '1',
            _source: {
                user: { userId: '1', userName: 'test', pfp: '' },
                global: { dateTime: new Date(), captionText: 'caption', commentsDisabled: false, likesDisabled: false, locationText: 'loc' },
                media: [{ altText: 'alt', id: '1', mimeType: 'image/jpeg', path: 'url', postId: 'p1', userId: '1' }]
            }
        }];
        const result = buildSearchResultSet(hits);
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('postId');
        expect(result[0].user).toHaveProperty('userId');
        expect(result[0].global).toHaveProperty('dateTime');
        expect(result[0].media.length).toBe(1);
    });

    describe('ESConnector additional methods', () => {
        let connector: ReturnType<typeof getESConnector>;
        const mockProfileHit = {
            _id: 'profile1',
            _source: {
                userName: 'alice',
                bio: 'bio',
                pfp: 'pfp',
                firstName: 'Alice',
                lastName: 'Smith',
                gender: 'f',
                pronouns: 'she/her',
                link: 'link'
            }
        };

        beforeEach(() => {
            connector = getESConnector();
            jest.clearAllMocks();
        });

        afterEach(async () => {
            await resetESConnector();
        });

        it('should build hashtag query', () => {
            const query = connector.buildHashtagQuery('foo');
            expect(query.query.term['hashtags.raw']).toBe('foo');
        });

        it('should build search query for posts and profiles', () => {
            const postQuery = connector.buildSearchQuery(true, false, 'foo');
            expect(postQuery.index).toBeDefined();
            expect(postQuery.query.bool.should.length).toBeGreaterThan(0);

            const profileQuery = connector.buildSearchQuery(false, false, 'foo');
            expect(profileQuery.index).toBeDefined();
            expect(profileQuery.query.bool.should.length).toBeGreaterThan(0);
        });

        it('should build suggest query for hashtag and non-hashtag', () => {
            const hashtag = connector.buildSuggestQuery('#foo', 5, true);
            expect(hashtag.mainSuggestBody.suggest.hashtags).toBeDefined();

            const nonHashtag = connector.buildSuggestQuery('foo', 5, false);
            expect(nonHashtag.mainSuggestBody.suggest.userName).toBeDefined();
        });

        it('should build profile search query', () => {
            const query = connector.buildProfileSearchQuery(['alice', 'bob'], false, 5);
            expect(query.size).toBe(5);
            expect(query.query.bool.should.length).toBe(2);
        });

        it('should getAllSuggestions from cache', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValue(JSON.stringify({
                postSuggestions: ['foo'],
                profileSuggestions: ['bar'],
                uniqueProfiles: [{ userName: 'alice' }]
            }));
            const result = await connector.getAllSuggestions('foo');
            expect(result.postSuggestions).toContain('foo');
            expect(RedisConnector.get).toHaveBeenCalled();
        });

        it('should getAllSuggestions from ES and cache result', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValue(null);
            (RedisConnector.set as jest.Mock).mockResolvedValue(undefined);

            // Mock ES suggest responses
            (connector['client'].search as jest.Mock)
                .mockResolvedValueOnce({ suggest: { userName: [{ options: [{ text: 'alice' }] }] } }) // mainSuggest
                .mockResolvedValueOnce({ suggest: { userName: [{ options: [{ text: 'alice' }] }] } }) // profileSuggest
                .mockResolvedValueOnce({ hits: { hits: [mockProfileHit] } }); // profileQuery

            const result = await connector.getAllSuggestions('alice');
            expect(result.profileSuggestions).toContain('alice');
            expect(result.uniqueProfiles[0].userName).toBe('alice');
            expect(RedisConnector.set).toHaveBeenCalled();
        });

        it('should handle error in Redis set gracefully in getAllSuggestions', async () => {
            (RedisConnector.get as jest.Mock).mockResolvedValue(null);
            (RedisConnector.set as jest.Mock).mockRejectedValue(new Error('fail'));

            (connector['client'].search as jest.Mock)
                .mockResolvedValueOnce({ suggest: { userName: [{ options: [{ text: 'alice' }] }] } })
                .mockResolvedValueOnce({ suggest: { userName: [{ options: [{ text: 'alice' }] }] } })
                .mockResolvedValueOnce({ hits: { hits: [mockProfileHit] } });

            const result = await connector.getAllSuggestions('alice');
            expect(result.profileSuggestions).toContain('alice');
        });

        it('should return empty suggestions for blank input', async () => {
            const result = await connector.getAllSuggestions('   ');
            expect(result.postSuggestions).toEqual([]);
            expect(result.profileSuggestions).toEqual([]);
            expect(result.uniqueProfiles).toEqual([]);
        });

        it('should search with pagination', async () => {
            (connector['client'].search as jest.Mock).mockResolvedValue({ hits: { hits: [] } });
            const query = { match_all: {} };
            const result = await connector.searchWithPagination(query, '2024-01-01', 'id1', 5);
            expect(connector['client'].search).toHaveBeenCalled();
            expect(result.hits.hits).toEqual([]);
        });

        it('should searchProfile', async () => {
            (connector['client'].search as jest.Mock).mockResolvedValue({ hits: { hits: [] } });
            const result = await connector.searchProfile({ match_all: {} }, 5);
            expect(connector['client'].search).toHaveBeenCalled();
            expect(result.hits.hits).toEqual([]);
        });

        it('should insertProfile', async () => {
            (connector['client'].index as jest.Mock).mockResolvedValue({ result: 'created' });
            const result = await connector.insertProfile({ foo: 'bar' });
            expect(connector['client'].index).toHaveBeenCalledWith({
                index: expect.any(String),
                document: { foo: 'bar' }
            });
            expect(result.result).toBe('created');
        });

        it('should updateProfile', async () => {
            (connector['client'].update as jest.Mock).mockResolvedValue({ result: 'updated' });
            const result = await connector.updateProfile('id1', { script: {} }, { foo: 'bar' });
            expect(connector['client'].update).toHaveBeenCalledWith({
                index: expect.any(String),
                id: 'id1',
                script: { script: {} },
                body: { foo: 'bar' }
            });
            expect(result.result).toBe('updated');
        });

        it('should countProfile', async () => {
            (connector['client'].count as jest.Mock).mockResolvedValue({ body: { count: 7 } });
            const result = await connector.countProfile({ match_all: {} });
            expect(connector['client'].count).toHaveBeenCalled();
            expect(result.body.count).toBe(7);
        });
    });
});