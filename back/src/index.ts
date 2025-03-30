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

const App = new Koa();

App.use(json())
    .use(cors())
    .use(koaJwt({ secret: config.get("auth.jwt.secret") }).unless({
        path: [
            /^\/api\/v1\/accounts\/check\/[^/]+$/,  // Matches /api/v1/accounts/check/:userName (dynamic username)
            /^\/api\/v1\/accounts\/send_confirm_code\/?$/,  // Matches /api/v1/accounts/send_confirm_code
            /^\/api\/v1\/accounts\/attempt\/?$/,  // Matches /api/v1/accounts/attempt
            /^\/api\/v1\/accounts\/login\/?$/,  // Matches /api/v1/accounts/login
            /^\/api\/v1\/accounts\/forgot\/?$/,  // Matches /api/v1/accounts/forgot
            /^\/api\/v1\/accounts\/change_password\/?$/,  // Matches /api/v1/accounts/change_password
      ] }))
    .use(compress({
        gzip: {
            flush: zlib.constants.Z_SYNC_FLUSH
        },
        deflate: {
            flush: zlib.constants.Z_SYNC_FLUSH,
        },
        br: {}
    }))
    .use(async (ctx: Context, next: () => any) => {
        ctx.res.appendHeader(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        await next();
    })
    .use(async (ctx: Context, next: () => any) => {
        Logger.info(
            `Request: ${ctx.method} ${ctx.path} query=${ctx.querystring} from ${ctx.ip}`
        );
        await next();
    })
    .use(koaBody({
        multipart: true
    }))
    .use(router.routes())
    .use(router.allowedMethods())
    .listen(PORT, () => {
        Logger.info(`Server Started and listening at ${HOST}:${PORT}/`);

        DBConnector.connect();
        RedisConnector.connect();
    });