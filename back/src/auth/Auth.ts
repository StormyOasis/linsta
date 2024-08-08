import jwt from 'jsonwebtoken';
import config from 'config';
import { Context } from 'koa';

export type JWTData = {
    id: string;
}

export const verifyJWT = async (ctx: Context, next: () => unknown) => {
    const token = ctx.request.headers["x-access-token"];

    if (!token) {
        ctx.res.statusCode = 403;
        ctx.body = { status: "Invalid token" };
        return;
    }

    let result = null;
    await jwt.verify(
        token as string,
        config.get("auth.jwt.secret"),
        (err, decoded) => {
            const data = decoded as JWTData;
            if (err || decoded == null) {
                ctx.res.statusCode = 403;
                ctx.body = { status: "Invalid token" };
                return;
            }
            result = data.id;
        })

    if (result == null) {
        // an error occred
        return;
    }

    ctx.res.statusCode = 200;
    ctx.body = { status: "OK" };

    await next();
}