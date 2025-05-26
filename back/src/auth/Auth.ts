import jwt from 'jsonwebtoken';
import { Context } from 'koa';
import config from '../config';

export type JWTData = {
    id: string;
}

export const verifyJWT = async (ctx: Context, next: () => unknown) => {    
    const authHeader:string|undefined = ctx.request.headers['authorization'];
    let token:string|undefined = undefined;
    if(authHeader) {
        const bearer = authHeader.split(' ');
        token = bearer[1];
    }

    if (!token) {
        ctx.res.statusCode = 403;
        ctx.body = { status: "Invalid token" };
        return;
    }

    let result = null;
    await jwt.verify(
        token as string,
        config.auth.jwt.secret,
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
        ctx.res.statusCode = 403;
        ctx.body = { status: "Error verifying id" };
        return;
    }

    
    ctx.res.statusCode = 200;
    ctx.body = { status: "OK" };

    await next();
}