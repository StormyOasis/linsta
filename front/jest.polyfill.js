// jest.polyfills.js
/**
 * @note The block below contains polyfills for Node.js globals
 * required for Jest to function when running JSDOM tests.
 * These HAVE to be require's and HAVE to be in this exact
 * order, since "undici" depends on the "TextEncoder" global API.
 *
 * Consider migrating to a more modern test runner if
 * you don't want to deal with this.
 */

const { TextDecoder, TextEncoder } = require("node:util")
const { ReadableStream } = require("node:stream/web");
const dotenv = require('dotenv');

dotenv.config();

window.env = {
    REACT_APP_PORT: process.env.REACT_APP_PORT,
    REACT_APP_HOST: process.env.REACT_APP_HOST,
    REACT_APP_API_HOST: process.env.REACT_APP_API_HOST,
    REACT_APP_METRICS_HOST: process.env.REACT_APP_METRICS_HOST,
    REACT_APP_METRICS_PORT: process.env.REACT_APP_METRICS_PORT
};

Object.defineProperties(globalThis, {
    TextDecoder: { value: TextDecoder },
    TextEncoder: { value: TextEncoder },
    ReadableStream: { value: ReadableStream },
})

const { Blob, File } = require("node:buffer")
const { fetch, Headers, FormData, Request, Response } = require("undici")

Object.defineProperties(globalThis, {
    fetch: { value: fetch, writable: true },
    Blob: { value: Blob },
    File: { value: File },
    Headers: { value: Headers },
    FormData: { value: FormData },
    Request: { value: Request },
    Response: { value: Response },
})

if (typeof global.structuredClone !== "function") {
    global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}