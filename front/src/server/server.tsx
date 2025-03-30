import Koa from "koa";
import Router from "@koa/router";
import http from "http";
import compress from 'koa-compress';
import zlib from "node:zlib";
import cors from "@koa/cors";
import serve from "koa-static";
import path from "path";
import React from 'react';

import { ServerStyleSheet } from "styled-components";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import App from "../Components/App";
import { buildStore } from "../Components/Redux/redux";
import { Provider } from "react-redux";

export const PORT = process.env["PORT"] || 8080;

const router = new Router();
const app = new Koa();

const renderHtml = (title: string, styles: any, html: any, preloadState: any):string => {
    return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">    
            <meta name="description" content="Linstagram - An instagram clone">    
            <title>${title}</title>
            <link rel="preconnect" href="https://linsta-public.s3.us-west-2.amazonaws.com">
            <link rel="preconnect" href="http://localhost:3001">
            <link rel="stylesheet" href="/public/defaults.css">
            <link rel="icon" href="/public/images/logo_small.png">
            ${styles}
        </head>
        <body>
            <div id="root">${html}</div>
            <script>
                window.__PRELOADED_STATE__ = ${JSON.stringify(preloadState).replace(/</g, '\\u003c')}
            </script>
            <script type="application/javascript" src="vendor.bundle.js" async></script>
            <script type="application/javascript" src="main.bundle.js"></script>            
            <script crossorigin type="application/javascript" src="/public/Pixels.js" defer></script>            
        </body>
    </html>`;
};

router.get(/.*/, async (ctx) => {
    try {
        return new Promise((resolve, _reject) => {
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

            resolve(true);
        });
    } catch (err) {
        console.log(err);
        ctx.status = 500;
        ctx.body = "Internal Server Error";
    }
    return null;
});

// Middleware to strip off trailing slashes via a redirect
app.use(async (ctx, next) => {
    const { path } = ctx;

    if (path !== '/' && path.endsWith('/')) {
        ctx.status = 301;
        ctx.redirect(path.slice(0, -1));  // Redirect to the path without the trailing slash
    } else {
        await next();
    }
});
app.use(compress({
    filter: (contentType) => {
        return /text|javascript|json/.test(contentType);
    },
    gzip: {
        flush: zlib.constants.Z_SYNC_FLUSH
    },
    deflate: {
        flush: zlib.constants.Z_SYNC_FLUSH,
    },
    br: {}
}));
app.use(serve(path.resolve(__dirname)));
app.use(cors());
app.use(router.routes());
app.use(router.allowedMethods());

const server = http.createServer(app.callback());

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});