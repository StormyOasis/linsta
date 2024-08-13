import React from 'react'
import renderer from 'react-test-renderer';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Jest from 'jest';
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login, authHeader, logout, getCurrentUser, AuthUser } from '../Auth';

const host = "http://localhost";
const port = 3001;

// declare which API requests to mock
const server = setupServer(
    http.post(`${host}:${port}/api/v1/accounts/login`, async (req, res, ctx) => {
        return HttpResponse.json({
                token: "1234567abcd",
                userName: "linstatest00",
                id: 19}, 
                { status: 200 });
    })
)

// establish API mocking before all tests
beforeAll(() => server.listen())
// reset any request handlers that are declared as a part of our tests
// (i.e. for testing one-time error scenarios)
afterEach(() => {localStorage.clear(); return server.resetHandlers()})
// clean up once the tests are done
afterAll(() => server.close())

type AuthResult = {
    token?: string;
    userName?: string;
    id?: number;
}

describe("Auth Module", () => {
    it("should process a valid login", async () => {
        let response: any = {};
        response = await login("userName", "password");
        response = await login("userName", "password").catch(err => expect(err).not.toBeDefined());            

        expect(response).toBeDefined();
        expect(response).toBeTruthy();

        const user = localStorage.getItem("user");
        expect(user).toBeDefined();

        if(user !== null) {
            let local:AuthResult = JSON.parse(user) as AuthResult;
            expect(local.token).toBe('1234567abcd');
        }
    })

    it("should return false given invalid username/password", async () => {
        let response: any = {};

        response = await login("userName", "").catch(err => expect(err).toBeDefined());            

        expect(response).toBeFalsy();                    

        const user = localStorage.getItem("user");
        expect(user).toBeNull();  
    }) 

    it("should add token to x-access-token when authHeader called", async() => {
        localStorage.setItem("user", JSON.stringify({token: "12345", userName:"linstatest00", id: 19}));     
        const result = authHeader();

        expect(result).toBeDefined();
        expect(result).toStrictEqual({ 'x-access-token': '12345' });
    })

    it("authHeader should fail when nothing is in localstorage", async() => {
        localStorage.clear();
        const result = authHeader();

        expect(result).toStrictEqual({});
        expect(result).not.toStrictEqual({ 'x-access-token': '12345' });
    })   
    
    it("authHeader should fail when user in localstorage but missing token", async() => {
        localStorage.setItem("user", JSON.stringify({userName:"linstatest00", id: 19}));     
        const result = authHeader();

        expect(result).toStrictEqual({});
        expect(result).not.toStrictEqual({ 'x-access-token': '12345' });
    })    

    it("should fail if token doesn't exist", async() => {
        localStorage.setItem("user", JSON.stringify({token: null, userName:null, id: 19}));     
        const result = authHeader();

        expect(result).toStrictEqual({});
    })
    it("should fail if user not in localstorage", async() => {
        localStorage.clear();
        const result = authHeader();

        expect(result).toStrictEqual({});
    })      
    
    it("should logout single user", async() => {
        localStorage.setItem("user", JSON.stringify({token: "12345", userName:"linstatest00", id: 19}));     
        logout();
        
        expect(localStorage.getItem("user")).toBeNull();
    }) 
    
    it("should get user from local storage", async() => {
        localStorage.setItem("user", JSON.stringify({token: "12345", userName:"linstatest00", id: 19}));     
        
        const result = getCurrentUser();
        
        expect(result).not.toBeNull();
        expect(localStorage.getItem("user")).not.toBeNull();

    })         

    it("should get user from local storage but missing from localstorage", async() => {
        localStorage.clear()
        
        const result = getCurrentUser();
        
        expect(result).toBeNull();
        expect(localStorage.getItem("user")).toBeNull();

    })             
});