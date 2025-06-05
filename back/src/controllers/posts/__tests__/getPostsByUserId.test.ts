/* eslint-disable @typescript-eslint/no-explicit-any */
import { handler } from '../getPostsByUserId';
import { APIGatewayProxyResult } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../../config';
import * as utils from '../../../utils/utils';
import logger from '../../../logger/logger';
import Metrics from '../../../metrics/Metrics';
import * as ESConnectorModule from '../../../connectors/ESConnector';

jest.mock('../../../config');
jest.mock('../../../utils/utils');
jest.mock('../../../logger/logger');
jest.mock('../../../connectors/ESConnector');
jest.mock('../../../metrics/Metrics');

const mockEvent = (body: any) => ({
    body: JSON.stringify(body)
}) as any;

const validUserId = 'user123';
const validRequestorUserId = 'user123';

const validData = {
    userId: validUserId,
    requestorUserId: validRequestorUserId,
    dateTime: '2024-01-01T00:00:00Z',
    postId: 'post123'
};

const validHit = {
    _source: {
        media: [{ postId: 'post123' }],
        user: { userId: 'user123', userName: 'alice', pfp: 'pfp' },
        global: {
            dateTime: '2024-01-01T00:00:00Z',
            captionText: 'caption',
            commentsDisabled: false,
            likesDisabled: false,
            locationText: 'loc',
            likes: []
        }
    },
    sort: ['2024-01-01T00:00:00Z', 'post123']
};

describe('getPostsByUserId handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Metrics.increment as jest.Mock).mockImplementation(() => {});
        (utils.handleValidationError as jest.Mock).mockImplementation((msg, code?) => ({ statusCode: code || 400, body: msg }));
        (utils.handleSuccess as jest.Mock).mockImplementation((msg) => ({ statusCode: 200, body: msg }));
        (utils.verifyJWT as jest.Mock).mockReturnValue(true);
        (utils.buildPostSortClause as jest.Mock).mockReturnValue([{ "global.dateTime": { order: "desc", nested: { path: "global" } } }, { postId: "asc" }]);
        (utils.addPfpsToPosts as jest.Mock).mockResolvedValue(undefined);
        (utils.addCommentCountsToPosts as jest.Mock).mockResolvedValue(undefined);
        (utils.addLikesToPosts as jest.Mock).mockResolvedValue(undefined);
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValue({
            searchWithPagination: jest.fn().mockResolvedValue({
                hits: { hits: [validHit] }
            })
        });
        (config as any).es = { defaultPaginationSize: 10 };
    });

    it('returns error if body is invalid JSON', async () => {
        const event = { body: '{invalid' } as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if userId is missing', async () => {
        const event = mockEvent({ requestorUserId: validRequestorUserId });
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });

    it('returns 403 if verifyJWT fails', async () => {
        (utils.verifyJWT as jest.Mock).mockReturnValue(false);
        const event = mockEvent(validData);
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("You do not have permission to access this data", 403);
        expect(result.statusCode).toBe(403);
    });

    it('returns empty posts if ES hits is empty', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValueOnce({
            searchWithPagination: jest.fn().mockResolvedValue({ hits: { hits: [] } })
        });
        const event = mockEvent(validData);
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(result.statusCode).toBe(200);
        expect(result.body).toContain('"posts":[]');
        expect(result.body).toContain('"done":true');
    });

    it('returns posts with pagination data if found', async () => {
        const event = mockEvent(validData);
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.addPfpsToPosts).toHaveBeenCalled();
        expect(utils.addCommentCountsToPosts).toHaveBeenCalled();
        expect(utils.addLikesToPosts).toHaveBeenCalled();
        expect(utils.handleSuccess).toHaveBeenCalledWith(expect.objectContaining({
            posts: expect.any(Array),
            dateTime: '2024-01-01T00:00:00Z',
            postId: 'post123',
            done: true
        }));
        expect(result.statusCode).toBe(200);
    });

    it('returns error if addPfpsToPosts throws', async () => {
        (utils.addPfpsToPosts as jest.Mock).mockRejectedValueOnce(new Error('pfpfail'));
        const event = mockEvent(validData);
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('pfpfail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting posts");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if addCommentCountsToPosts throws', async () => {
        (utils.addCommentCountsToPosts as jest.Mock).mockRejectedValueOnce(new Error('commentfail'));
        const event = mockEvent(validData);
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('commentfail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting posts");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if addLikesToPosts throws', async () => {
        (utils.addLikesToPosts as jest.Mock).mockRejectedValueOnce(new Error('likesfail'));
        const event = mockEvent(validData);
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('likesfail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting posts");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if ESConnector.searchWithPagination throws', async () => {
        (ESConnectorModule.getESConnector as jest.Mock).mockReturnValueOnce({
            searchWithPagination: jest.fn().mockRejectedValue(new Error('esfail'))
        });
        const event = mockEvent(validData);
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(logger.error).toHaveBeenCalledWith('esfail');
        expect(utils.handleValidationError).toHaveBeenCalledWith("Error getting posts");
        expect(result.statusCode).toBe(400);
    });

    it('returns error if event.body is undefined', async () => {
        const event = { body: undefined } as any;
        const result = await handler(event, {} as any, undefined as any) as APIGatewayProxyResult;
        expect(utils.handleValidationError).toHaveBeenCalledWith("Invalid params passed");
        expect(result.statusCode).toBe(400);
    });    
});