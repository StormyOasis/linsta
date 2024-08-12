import React from 'react'
import renderer from 'react-test-renderer';
import {render, fireEvent, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import Jest from 'jest';
import {http, HttpResponse, rest} from 'msw'
import {setupServer} from 'msw/node'

import  { getAccountsCheckUserUnique } from '../ServiceController';

const host = "http://localhost";
const port = 3001;

// declare which API requests to mock
const server = setupServer(
    http.get(`${host}:${port}/api/v1/accounts/check/a`, (req, res, ctx) => {
      // respond using a mocked JSON body
      return new HttpResponse(false, {
        status: 200
      });
    }),
    http.get(`${host}:${port}/api/v1/accounts/check/aa`, (req, res, ctx) => {
      return new HttpResponse(true, {
        status: 200
      });
    }),    
    http.post(`${host}:${port}/api/v1/accounts/attempt/`, (req, res, ctx) => {
      return new HttpResponse(true, {
        status: 200
      });        
    })
  )
  
  // establish API mocking before all tests
  beforeAll(() => server.listen())
  // reset any request handlers that are declared as a part of our tests
  // (i.e. for testing one-time error scenarios)
  afterEach(() => server.resetHandlers())
  // clean up once the tests are done
  afterAll(() => server.close())

test("getAccountsCheckUserUniqueFalse", async () => {
    let response:any = {};
    response = await getAccountsCheckUserUnique("a");
    expect(response).toBeDefined();
    expect(response.data).toBeFalsy();
    expect(response.status).toEqual(200);
});

test("getAccountsCheckUserUniqueTrue", async () => {
    let response:any = {};
    response = await getAccountsCheckUserUnique("aa");
    expect(response).toBeDefined();
    expect(response.data).toBeTruthy();
    expect(response.status).toEqual(200);
});