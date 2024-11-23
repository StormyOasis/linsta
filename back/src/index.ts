import Koa, { Context } from "koa";
import cors from "@koa/cors";
import json from 'koa-json';
import { koaBody } from "koa-body";
import router from "./router";
import Logger from "./logger/logger";
import DBConnector from "./Connectors/DBConnector";
import RedisConnector from "./Connectors/RedisConnector";

const PORT = process.env["PORT"] || 3001;
const HOST = process.env["HOST"] || "http://localhost";

const App = new Koa();

App.use(json())
  .use(cors())
  .use(async (ctx: Context, next) => {
    ctx.res.appendHeader(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    await next();
  })
  .use(async (ctx: Context, next) => {
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