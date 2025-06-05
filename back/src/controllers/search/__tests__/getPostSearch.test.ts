/* eslint-disable @typescript-eslint/no-explicit-any */
import { handler } from '../getPostSearch';
import * as ESConnectorModule from '../../../connectors/ESConnector';
import * as utils from '../../../utils/utils';
import * as textUtils from '../../../utils/textUtils';
import Metrics from '../../../metrics/Metrics';
import logger from '../../../logger/logger';
import config from '../../../config';
import { APIGatewayProxyResult } from 'aws-lambda';

jest.mock('../../../connectors/ESConnector');
jest.mock('../../../utils/utils');
jest.mock('../../../utils/textUtils');
jest.mock('../../../metrics/Metrics');
jest.mock('../../../logger/logger');
jest.mock('../../../config');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

describe('getPostSearch handler', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => { });
        (utils.handleSuccess as jest.Mock).mockImplementation((x) => ({
            statusCode: 200,
            body: JSON.stringify(x),
        }));
        (utils.handleValidationError as jest.Mock).mockImplementation((x) => ({
            statusCode: 400,
            body: JSON.stringify(x),
        }));
        (logger.error as jest.Mock).mockImplementation(() => { });
    });

    it('returns validation error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith('Missing required search params');
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toBe('Missing required search params');
    });

    it('returns empty posts if ES returns no hits', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            searchWithPagination: jest.fn().mockResolvedValue({ hits: { hits: [] } })
        });
        const event = mockEvent({ postId: 'p1', q: 'foo' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalledWith({
            posts: [],
            dateTime: "",
            postId: "",
            done: true,
            q: 'foo'
        });
        const parsed = JSON.parse(result.body);
        expect(parsed.posts).toEqual([]);
    });

    it('returns posts with correct pagination and calls enrichment utils', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            searchWithPagination: jest.fn().mockResolvedValue({
                hits: {
                    hits: [
                        {
                            _source: {
                                media: [{ postId: 'p1' }],
                                global: {},
                                user: {},
                                hashtags: [],
                                comments: [],
                                likes: [],
                            },
                            sort: ['2024-01-01T00:00:00Z', 'p1']
                        }
                    ]
                }
            })
        });
        (utils.addPfpsToPosts as jest.Mock).mockResolvedValue(undefined);
        (utils.addCommentCountsToPosts as jest.Mock).mockResolvedValue(undefined);
        (utils.addLikesToPosts as jest.Mock).mockResolvedValue(undefined);

        const event = mockEvent({ postId: 'p1', q: 'foo' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;

        expect(utils.addPfpsToPosts).toHaveBeenCalled();
        expect(utils.addCommentCountsToPosts).toHaveBeenCalled();
        expect(utils.addLikesToPosts).toHaveBeenCalled();

        const parsed = JSON.parse(result.body);
        expect(parsed.posts.length).toBe(1);
        expect(parsed.dateTime).toBe('2024-01-01T00:00:00Z');
        expect(parsed.postId).toBe('p1');
        expect(parsed.done).toBe(true);
    });

    it('returns match_all query if q is empty', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            searchWithPagination: jest.fn().mockResolvedValue({ hits: { hits: [] } })
        });
        const event = mockEvent({ postId: 'p1', q: '' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleSuccess).toHaveBeenCalled();
        expect(result.statusCode).toBe(200);
    });

    it('returns hashtag query if q is hashtag', async () => {
        (textUtils.isHashtag as jest.Mock).mockReturnValue(true);
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            searchWithPagination: jest.fn().mockResolvedValue({ hits: { hits: [] } })
        });
        const event = mockEvent({ postId: 'p1', q: '#tag' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(textUtils.isHashtag).toHaveBeenCalledWith('#tag');
        expect(utils.handleSuccess).toHaveBeenCalled();
        expect(result.statusCode).toBe(200);
    });

    it('returns error if ES throws', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            searchWithPagination: jest.fn().mockRejectedValue(new Error('fail'))
        });
        const event = mockEvent({ postId: 'p1', q: 'foo' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith('Error getting posts');
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toBe('Error getting posts');
    });

    it('returns validation error if event.body is undefined', async () => {
        const event = { body: undefined } as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).not.toHaveBeenCalledWith('Missing required search params', 500);
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toBe('Missing required search params');
    });

    it('handles ESConnector returning undefined', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            searchWithPagination: jest.fn().mockResolvedValue(undefined)
        });
        const event = mockEvent({ postId: 'p1', q: 'foo' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        const parsed = JSON.parse(result.body);
        expect(parsed.posts).toEqual([]);
    });

    it('handles hit with missing sort array', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            searchWithPagination: jest.fn().mockResolvedValue({
                hits: {
                    hits: [
                        {
                            _source: {
                                media: [{ postId: 'p1' }],
                                global: {},
                                user: {},
                                hashtags: [],
                                comments: [],
                                likes: [],
                            }
                            // sort is missing
                        }
                    ]
                }
            })
        });
        (utils.addPfpsToPosts as jest.Mock).mockResolvedValue(undefined);
        (utils.addCommentCountsToPosts as jest.Mock).mockResolvedValue(undefined);
        (utils.addLikesToPosts as jest.Mock).mockResolvedValue(undefined);

        const event = mockEvent({ postId: 'p1', q: 'foo' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        const parsed = JSON.parse(result.body);
        expect(parsed.posts.length).toBe(1);
        expect(parsed.dateTime).toBeUndefined();
        expect(parsed.postId).toBeUndefined();
    });

    it('handles hit with empty media array gracefully', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            searchWithPagination: jest.fn().mockResolvedValue({
                hits: {
                    hits: [
                        {
                            _source: {
                                media: [],
                                global: {},
                                user: {},
                                hashtags: [],
                                comments: [],
                                likes: [],
                            },
                            sort: ['2024-01-01T00:00:00Z', 'p1']
                        }
                    ]
                }
            })
        });
        (utils.addPfpsToPosts as jest.Mock).mockResolvedValue(undefined);
        (utils.addCommentCountsToPosts as jest.Mock).mockResolvedValue(undefined);
        (utils.addLikesToPosts as jest.Mock).mockResolvedValue(undefined);

        const event = mockEvent({ postId: 'p1', q: 'foo' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        const parsed = JSON.parse(result.body);
        expect(parsed).toEqual("Error getting posts");        
    });

    it('handles addPfpsToPosts throwing error', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            searchWithPagination: jest.fn().mockResolvedValue({
                hits: {
                    hits: [
                        {
                            _source: {
                                media: [{ postId: 'p1' }],
                                global: {},
                                user: {},
                                hashtags: [],
                                comments: [],
                                likes: [],
                            },
                            sort: ['2024-01-01T00:00:00Z', 'p1']
                        }
                    ]
                }
            })
        });
        (utils.addPfpsToPosts as jest.Mock).mockRejectedValue(new Error('pfp fail'));
        (utils.addCommentCountsToPosts as jest.Mock).mockResolvedValue(undefined);
        (utils.addLikesToPosts as jest.Mock).mockResolvedValue(undefined);

        const event = mockEvent({ postId: 'p1', q: 'foo' });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalled();
        expect(utils.handleValidationError).toHaveBeenCalledWith('Error getting posts');
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toBe('Error getting posts');
    });
});