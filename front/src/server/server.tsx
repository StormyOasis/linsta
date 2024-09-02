import Koa from "koa";
import Router from "@koa/router";
import http from "http";
import compress from "compression";
import cors from "@koa/cors";
import serve from "koa-static";
import path from "path";
import React from 'react';

import { ServerStyleSheet } from "styled-components";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import App from "../Components/App";
import {buildStore} from "../Components/Redux/redux";
import { Provider } from "react-redux";

const PORT = process.env["PORT"] || 8080;

const router = new Router();
const app = new Koa();

const renderHtml = (title: string, styles: any, html: any, preloadState: any) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">        
            <title>${title}</title>
            <link rel="stylesheet" href="public/defaults.css">
            <link rel="icon" href="public/images/logo_small.png">
            ${styles}
        </head>
        <body>
            <div id="root">${html}</div>
            <script>
                window.__PRELOADED_STATE__ = ${JSON.stringify(preloadState).replace(/</g,'\\u003c')}
            </script>
            <script type="application/javascript" src="main.bundle.js"></script>
            <script type="application/javascript" src="vendor.bundle.js"></script>
            <script crossorigin type="application/javascript" src="public/Pixels.js"></script>            
        </body>
    </html>`;
};

router.get(/.*/, async (ctx) => {
  try {
    return new Promise((_resolve, reject) => {
      const sheet = new ServerStyleSheet();

      const store = buildStore();
      const appElement = <App />;
      const withRouterElement = 
        <Provider store={store}>
          <StaticRouter location={ctx.req.url}>
            {sheet.collectStyles(appElement)}
          </StaticRouter>
        </Provider>;

      const appHtml = renderToString(sheet.collectStyles(withRouterElement));

      ctx.body = renderHtml("Linstagram", sheet.getStyleTags(), appHtml, store.getState());
      ctx.response.set("content-type", "text/html");
      ctx.status = 200;

      _resolve(true);
    });
  } catch (err) {
    console.log(err);
    ctx.status = 500;
    ctx.body = "Internal Server Error";
  }
  return null;
});

app.use(serve(path.resolve(__dirname)));
app.use(cors());
app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (ctx, next) => {
  compress();
  await next();
});

const server = http.createServer(app.callback());

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
