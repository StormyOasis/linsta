import Koa, { Context } from "koa";
import cors from "@koa/cors";
import json from 'koa-json';
import router from "./router";
import bodyParser from "koa-bodyparser";
import Logger from "./logger/logger";
import DBConnector from "./db/DBConnector";

const PORT = process.env["PORT"] || 3001;

const App = new Koa();

App.use(json())
  .use(cors())
  .use(async (ctx : Context, next) => {
    Logger.info(
      `Request: ${ctx.method} ${ctx.path} query=${ctx.querystring} from ${ctx.ip}`
    );
    await next();
  })
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(PORT, () => {
    Logger.info(`Server Started and listening at http://127.0.0.1:${PORT}/`);

    DBConnector.connect();
  });