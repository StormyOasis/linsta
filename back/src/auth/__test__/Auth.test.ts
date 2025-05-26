import { verifyJWT } from '../Auth'
import jwt from 'jsonwebtoken';
import config from '../../config';
import { Context } from 'koa';

// Mocking the modules
jest.mock('config', () => ({
    get: jest.fn(),
}));
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));

describe('verifyJWT middleware', () => {
    let ctx: Context;
    let next: jest.Mock;

    beforeEach(() => {
        ctx = {
            request: { headers: {} },
            res: { statusCode: 0, body: {} },
        } as unknown as Context;
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should respond with status 403 if no token is provided', async () => {
        ctx.request.headers['authorization'] = undefined;

        await verifyJWT(ctx, next);

        expect(ctx.res.statusCode).toBe(403);
        expect(ctx.body).toEqual({ status: "Invalid token" });
    });

    it('should respond with status 403 if token is invalid', async () => {
        const invalidToken = 'invalidToken';
        ctx.request.headers['authorization'] = `Bearer ${invalidToken}`;

        // Mock jwt.verify to simulate an error
        (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
            callback(new Error('Error verifying id'), null);
        });

        await verifyJWT(ctx, next);

        expect(ctx.res.statusCode).toBe(403);
        expect(ctx.body).toEqual({ status: "Error verifying id" });
    });

    it('should respond with status 403 if token verification fails', async () => {
        const validToken = 'validToken';
        ctx.request.headers['authorization'] = `Bearer ${validToken}`;

        // Mock jwt.verify to simulate an error
        (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
            callback(null, null);
        });

        await verifyJWT(ctx, next);

        expect(ctx.res.statusCode).toBe(403);
        expect(ctx.body).toEqual({ status: "Error verifying id" });
    });

    it('should respond with status 200 if token is valid and verified', async () => {
        const validToken = 'validToken';
        const mockDecoded = { id: '12345' };
        ctx.request.headers['authorization'] = `Bearer ${validToken}`;

        // Mock jwt.verify to simulate successful verification
        (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
            callback(null, mockDecoded);
        });

        // Mock config.get to return a secret
        //(config.get as jest.Mock).mockReturnValue('secretKey');

        await verifyJWT(ctx, next);

        expect(ctx.res.statusCode).toBe(200);
        expect(ctx.body).toEqual({ status: "OK" });
        expect(next).toHaveBeenCalledTimes(1);
    });
});
