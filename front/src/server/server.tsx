import Koa from "koa";
import Router from "@koa/router";
import http from "http";
import compress from 'koa-compress';
import zlib from "node:zlib";
import cors from "@koa/cors";
import serve from "koa-static";
import path from "path";
import React from 'react';
import { ChunkExtractor } from '@loadable/server';

import { ServerStyleSheet } from "styled-components";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import App from "../Components/App";
import { buildStore } from "../Components/Redux/redux";
import { Provider } from "react-redux";
import { API_HOST, PORT } from "../api/config";
import { putIpAddress } from "../api/ServiceController";

const router = new Router();
const app = new Koa();

app.proxy = true;

const renderHtml = (title: string, styles: any, html: any, preloadState: any): string => {
    return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">    
            <meta name="description" content="Linstagram - An instagram clone">    
            <title>${title}</title>
	        <link rel="icon" type="image/png" href="${process.env.REACT_APP_HOST}/favicon.png">
            <script>
                window.env = {
                    REACT_APP_PORT: "${process.env.REACT_APP_PORT}",
                    REACT_APP_HOST: "${process.env.REACT_APP_HOST}",
                    REACT_APP_API_HOST: "${process.env.REACT_APP_API_HOST}",
                    REACT_APP_LAMBDA_HOST: "${process.env.REACT_APP_LAMBDA_HOST}",
                    REACT_APP_METRICS_HOST: "${process.env.REACT_APP_METRICS_HOST}",
                    REACT_APP_METRICS_PORT: "${process.env.REACT_APP_METRICS_PORT}"             
                };
            </script>
            <link rel="preconnect" href="https://linsta-public.s3.us-west-2.amazonaws.com">
            <link rel="preconnect" href="${API_HOST}">
            <style>
                body {
                    margin: 0;
                }

                * {
                    line-height: 18px;
                    font-size: 14px;
                    font-family: -apple-system, 
                                BlinkMacSystemFont, 
                                "Apple Color Emoji", 
                                "Segoe UI Emoji", 
                                "Segoe UI Symbol", 
                                "Noto Color Emoji", 
                                "Twemoji Mozilla", 
                                "Segoe UI", 
                                "EmojiOne Color",
                                "Android Emoji", 
                                Roboto, 
                                Helvetica, 
                                Arial, 
                                sans-serif;
                }

                @keyframes modalAnimation {
                    0% {
                        opacity: 0;
                        transform: scale(1.25);
                        transform-origin: center;
                    }

                    100% {
                        opacity: 1;
                        transform: scale(1);
                        transform-origin: center;
                    }
                }

                .EmojiPickerReact * {
                    --epr-emoji-size: 20px;
                    --epr-category-label-height: 20px;    
                    --epr-horizontal-padding: 5px;
                    --epr-emoji-padding: 5px;
                    --epr-emoji-fullsize: calc(var(--epr-emoji-size) + var(--epr-emoji-padding)* 2);    
                }

                .emoji-node {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                }

                #editor-selector-parent:first-child {
                    outline: none;
                    min-height: 105px;
                    max-height: 105px;
                    height: 105px;
                    overflow-y: auto;
                }

                #editor-selector-parent div[contenteditable] {
                    outline: none;
                    margin-top: 14px;
                    margin-left: 2px;    
                }

                #editor-selector-parent div[contenteditable]:focus {
                    outline: none;
                    margin-top: 14px;
                    margin-left: 2px;    
                }

                .editor-placeholder {
                    position: absolute;
                    top: 0px;
                    margin-top: 14px;
                    margin-left: 2px;
                }
            </style>       
            ${styles}
        </head>
        <body>
            <div id="root">${html}</div>
            <script>
                window.__PRELOADED_STATE__ = ${JSON.stringify(preloadState).replace(/</g, '\\u003c')}
            </script>         
            <script crossorigin type="application/javascript" src="/public/Pixels.js" defer></script>                   
        </body>
    </html>`;
};

router.get("/.well-known/:path*", async (ctx, _next) => {
    ctx.status = 404;
    ctx.body = "Not found";
});

router.get(/.*/, async (ctx) => {
    try {
        return new Promise((resolve, _reject) => {
            const sheet = new ServerStyleSheet();

            const store = buildStore();

            const statsFile = path.resolve(__dirname, '../dist/loadable-stats.json'); // Adjust path as needed
            const extractor = new ChunkExtractor({ statsFile });

            const appElement = <App />;
            const withRouterElement =
                <Provider store={store}>
                    <StaticRouter location={ctx.req.url}>
                        {sheet.collectStyles(appElement)}
                    </StaticRouter>
                </Provider>;

            const jsx = extractor.collectChunks(withRouterElement);
            const appHtml = renderToString(sheet.collectStyles(jsx));

            const styles = sheet.getStyleTags();
            const scripts = extractor.getScriptTags();
            const links = extractor.getLinkTags();

            ctx.body = renderHtml("Linstagram", `${styles}${links}`, appHtml, store.getState()).replace('</body>', `${scripts}</body>`);
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
        return /text|javascript|json|svg/.test(contentType);
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
app.use(async (ctx, next) => {
    await next(); // Let route handler run

    // Skip static assets
    if (ctx.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|mov|mp3|mp4|mpeg|json|map|js\.map)$/i)) {
        return;
    }

    const clientIp = ctx.ip;

    // Normalize the path for StatsD
    const normalizedPath = ctx.path
        .split('?')[0]            // remove query string
        .replace(/^\//, '')       // remove leading slash
        .replace(/\//g, '_')      // replace remaining slashes with underscores
        .replace(/[^a-zA-Z0-9_-]/g, ''); // remove invalid chars

    putIpAddress({ ip: clientIp, path: normalizedPath })
        .catch(err => console.error('Failed to log IP:', err));
});
app.use(router.routes());
app.use(router.allowedMethods());

const server = http.createServer(app.callback());

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
