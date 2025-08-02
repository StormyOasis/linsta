// koa/src/types/koa.d.ts

import "koa";

declare module "koa" {
  interface Request {
    body: any;
    files: any
  }
}
