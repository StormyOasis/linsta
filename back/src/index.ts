import Koa, { Context } from "koa";
import cors from "@koa/cors";
import json from 'koa-json';
import { koaBody } from "koa-body";
import koaJwt from 'koa-jwt';
import compress from 'koa-compress';
import zlib from "node:zlib";
import config from 'config';
import router from "./router";
import Logger from "./logger/logger";
import DBConnector from "./Connectors/DBConnector";
import RedisConnector from "./Connectors/RedisConnector";

const PORT = process.env["PORT"] || 3001;
const HOST = process.env["HOST"] || "http://localhost";

// Constants for the API paths to exclude from JWT authentication
const EXCLUDED_API_PATHS = [
    /^\/api\/v1\/accounts\/check\/[^/]+$/, // Matches /api/v1/accounts/check/:userName
    /^\/api\/v1\/accounts\/send_confirm_code\/?$/, // Matches /api/v1/accounts/send_confirm_code
    /^\/api\/v1\/accounts\/attempt\/?$/, // Matches /api/v1/accounts/attempt
    /^\/api\/v1\/accounts\/login\/?$/, // Matches /api/v1/accounts/login
    /^\/api\/v1\/accounts\/forgot\/?$/, // Matches /api/v1/accounts/forgot
    /^\/api\/v1\/accounts\/change_password\/?$/, // Matches /api/v1/accounts/change_password
];

const App = new Koa();

App.use(json())
    .use(cors())
    .use(koaJwt({ secret: config.get("auth.jwt.secret") }).unless({ path: EXCLUDED_API_PATHS }))
    .use(compress({
        gzip: {
            flush: zlib.constants.Z_SYNC_FLUSH
        },
        deflate: {
            flush: zlib.constants.Z_SYNC_FLUSH,
        },
        br: {}
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .use(async (ctx: Context, next: () => any) => {
        ctx.res.appendHeader(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        await next();
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .use(async (ctx: Context, next: () => any) => {
        Logger.info(
            `Request: ${ctx.method} ${ctx.path} query=${ctx.querystring} from ${ctx.ip}`
        );
        await next();
    })
    .use(koaBody({ multipart: true }))
    .use(router.routes())
    .use(router.allowedMethods())
    .listen(PORT, async () => {
        Logger.info(`Server started and listening at ${HOST}:${PORT}/`);

        try {
            await DBConnector.connect(); // Make sure DB is connected asynchronously
            await RedisConnector.connect(); // Make sure Redis is connected asynchronously
        } catch (error) {
            Logger.error("Error during connection initialization", error);
            process.exit(1);
        }
    });