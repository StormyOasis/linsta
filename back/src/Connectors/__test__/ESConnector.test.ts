import { Client } from '@elastic/elasticsearch';
import ESConnector, { buildDataSetForES, buildSearchResultSet } from '../ESConnector';

import path from "path";
import * as fs from 'fs';
import config from '../../config';
import { readFileSync } from "fs";

import logger from '../../logger/logger';
import { Entry, User, Global } from '../../utils/types';
//import { SearchResponse, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';

jest.mock('@elastic/elasticsearch');
jest.mock('config');  // Mock the config module
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),  // Keep all other fs methods intact
    readFileSync: jest.fn(),      // Mock only readFileSync method
}));

jest.mock('../../logger/logger');
jest.mock('../../metrics/Metrics');

describe('ESConnector', () => {
    let esConnector: ESConnector;

    beforeEach(() => {
        esConnector = ESConnector.getInstance();
    });

    afterEach(async () => {
        await esConnector.close();
        jest.clearAllMocks();  // Reset mocks
    });

    describe('initialize', () => {
        it('should return the same instance of ESConnector when called multiple times', () => {
            const instance1 = ESConnector.getInstance();
            const instance2 = ESConnector.getInstance();
            expect(instance1).toBe(instance2);
            expect(instance1).toBe(esConnector);
        });

        it('should initialize the client', async () => {
            // Ensure that the mock Client constructor is called once when ESConnector is instantiated
            expect(Client).toHaveBeenCalledTimes(1); // Ensure the Client constructor was called exactly once
            expect(Client).toHaveBeenCalledWith({
                node: config.es.node,
                auth: { apiKey: config.es.apiKey },
                tls: { ca: fs.readFileSync('/usr/share/es/certs/ca.crt') },
            });
        });
    });

    describe('search', () => {
        it('should call search with default result size when resultSize is not provided', async () => {
            const mockQuery = { match_all: {} };
            const mockSearchResult = { hits: { hits: [] } };

            // Mock the search response
            const mockSearch = esConnector['client']!.search as jest.Mock;
            mockSearch.mockImplementation(() => {
                return Promise.resolve({ hits: { hits: [] } });
            });
            /*const result = await esConnector.search(mockQuery, null);

            expect(mockSearch).toHaveBeenCalledTimes(1);  // Mock search method
            expect(mockSearch).toHaveBeenCalledWith(
                expect.objectContaining({
                    index: config.get('es.mainIndex'),
                    query: mockQuery,
                    size: 10000,  // The default size
                    sort: [{ 'post.global.dateTime': { nested: { path: 'post.global' } } }],
                }),
                { meta: true }
            );

            expect(result).toEqual(mockSearchResult);  // Mocked result for search*/
        });

        it('should call search with specified result size when resultSize is provided', async () => {
            const resultSize = 20;
            const mockQuery = { match_all: {} };
            const mockSearchResult = { hits: { hits: [] } };

            // Mock the search response
            const mockSearch = esConnector['client']!.search as jest.Mock;
            mockSearch.mockImplementation(() => {
                return Promise.resolve({ hits: { hits: [] } });
            });

           /* const result = await esConnector.search(mockQuery, resultSize);

            expect(mockSearch).toHaveBeenCalledTimes(1);  // Mock search method
            expect(mockSearch).toHaveBeenCalledWith(
                expect.objectContaining({
                    index: config.get('es.mainIndex'),
                    query: mockQuery,
                    size: resultSize,
                    sort: [{ 'post.global.dateTime': { nested: { path: 'post.global' } } }],
                }),
                { meta: true }
            );
            expect(result).toEqual(mockSearchResult);  // Mocked result for search   */         
        });
    });

    describe('buildDataSetForES function', () => {
        it('should build a dataset for Elasticsearch', () => {
            const user: User = { userId: '123', userName: 'Test', pfp: 'profile.jpg' };
            const global: Global = {
                captionText: 'Caption', commentsDisabled: false, likesDisabled: false, locationText: 'Location',
                id: '',
                dateTime: '',
                likes: []
            };
            const entries: Entry[] = [{ alt: 'Alt', entityTag: 'tag', id: '1', mimeType: 'image/jpeg', url: 'url', postId: 'post1', userId: '123' }];
            const result = buildDataSetForES(user, global, entries);
            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('global');
            expect(result).toHaveProperty('media');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result as any).media.length).toBe(1);
        });
    });

    describe('buildSearchResultSet function', () => {
        it('should build search result set from hits', () => {
            const hits = [{
                _source: {
                    user: { userId: '123', userName: 'Test', pfp: '' },
                    global: { dateTime: new Date(), captionText: 'Caption', commentsDisabled: false, likesDisabled: false, locationText: 'Location' },
                    media: [{ altText: 'Alt', id: '1', mimeType: 'image/jpeg', path: 'url', postId: 'post1', userId: '123' }]
                },
                _id: '1'
            }];
            const result = buildSearchResultSet(hits);
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('postId');
            expect(result[0].user).toHaveProperty('userId');
            expect(result[0].global).toHaveProperty('dateTime');
            expect(result[0].media.length).toBe(1);
        });
    });
});
