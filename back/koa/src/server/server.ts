import Koa, { Context } from "koa";
import cors from "@koa/cors";
import json from 'koa-json';
import { koaBody } from "koa-body";
import koaJwt from 'koa-jwt';
import compress from 'koa-compress';
import zlib from "node:zlib";
import path from "node:path";

// Load .env file
//require("dotenv").config({ path: path.resolve(__dirname, '../../../.env') });

import { config, DBConnector, logger, RedisConnector } from "@linsta/shared";

import router from "./router";

// Constants for the API paths to exclude from JWT authentication
const EXCLUDED_API_PATHS = [
    /^\/api\/v1\/accounts\/check\/[^/]+$/, // Matches /api/v1/accounts/check/:userName
    /^\/api\/v1\/accounts\/sendConfirmCode\/?$/, // Matches /api/v1/accounts/send_confirm_code
    /^\/api\/v1\/accounts\/attempt\/?$/, // Matches /api/v1/accounts/attempt
    /^\/api\/v1\/accounts\/login\/?$/, // Matches /api/v1/accounts/login
    /^\/api\/v1\/accounts\/forgot\/?$/, // Matches /api/v1/accounts/forgot
    /^\/api\/v1\/accounts\/changePassword\/?$/, // Matches /api/v1/accounts/change_password
];

const App = new Koa();
App.use(json())
    .use(cors())
    .use(koaJwt({ secret: config.auth.jwt.secret as string }).unless({ path: EXCLUDED_API_PATHS }))
    .use(compress({
        gzip: {
            flush: zlib.constants.Z_SYNC_FLUSH
        },
        deflate: {
            flush: zlib.constants.Z_SYNC_FLUSH,
        },
        br: {}
    }))
    .use(async (ctx: Context, next: () => Promise<void>) => {
        ctx.res.appendHeader(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        await next();
    })
    .use(async (ctx: Context, next: () => Promise<void>) => {
        logger.info(
            `Request: ${ctx.method} ${ctx.path} query=${ctx.querystring} from ${ctx.ip}`
        );
        await next();
    })
    .use(koaBody({ multipart: true }))
    .use(router.routes())
    .use(router.allowedMethods())
    .listen(config.port, async () => {
        logger.info(`Server started in ${process.env.NODE_ENV || 'development'} mode and listening at ${config.host}:${config.port}/`);

        try {
            await DBConnector.connect(); // Make sure DB is connected
            await RedisConnector.connect(); // Make sure Redis is connected
        } catch (error) {
            logger.error("Error during connection initialization", error);
            process.exit(1);
        }
    });    