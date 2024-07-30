import React from 'react'
import renderer from 'react-test-renderer';
import {render, fireEvent, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import Jest from 'jest';
import {http, HttpResponse, rest} from 'msw'
import {setupServer} from 'msw/node'

import  { getAccountsCheckUserUnique } from './ServiceController';

// declare which API requests to mock
const server = setupServer(
    // capture "GET /greeting" requests
    http.get('http://localhost:3001/accounts/check/', (req, res, ctx) => {
      // respond using a mocked JSON body
      return res(ctx.json({data: "true", status: 200, statusText: "OK"}));
    }),
  )
  
  // establish API mocking before all tests
  beforeAll(() => server.listen())
  // reset any request handlers that are declared as a part of our tests
  // (i.e. for testing one-time error scenarios)
  afterEach(() => server.resetHandlers())
  // clean up once the tests are done
  afterAll(() => server.close())

test("getAccountsCheckUserUnique", async () => {
    let response:any = {};
    response = await getAccountsCheckUserUnique("a");
    expect(response).toBeDefined();
    expect(response.data).toBeTruthy();
    expect(response.status).toEqual(200);
});