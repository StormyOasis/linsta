import Koa from 'koa';
import Router from '@koa/router';
import http from 'http';
import compress from 'compression';
import cors from '@koa/cors';
import serve from 'koa-static';
import path from 'path';

import React from "react";
import { renderToPipeableStream } from 'react-dom/server';
import store from '../common/state/store';

import App from '../common/App';

const PORT = process.env['PORT'] || 3000;

const router = new Router();
const app = new Koa();

router.get('/', async (ctx) => {
  let didError = false;
  
  const entryPoint = ["main.bundle.js", "vendor.bundle.js"];

  try {
    return new Promise((_resolve, reject) => {
      const { pipe, abort } = renderToPipeableStream(
        <App store={store} initialState={store.getState()}/>,
        {
          bootstrapScripts: entryPoint, 
          onShellReady() {
            ctx.respond = false;
            ctx.status = didError ? 500 : 200;
            ctx.set('Content-Type', 'text/html');
            pipe(ctx.res);
            ctx.res.end();
          },
          onShellError() {
            ctx.status = 500;
            abort();
            didError = true;
            ctx.set('Content-Type', 'text/html');
            ctx.body = '<!doctype html><p>Loading...</p>';
            reject();
          },
          onError(error) {
            didError = true;
            console.error(error);
            reject();
          }
        },
      );
    })
  } catch (err) {
    console.log(err);
    ctx.status = 500;
    ctx.body = 'Internal Server Error';
  }
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