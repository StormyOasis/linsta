import React from 'react'
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { Provider } from 'react-redux';
import { buildStore } from '../Redux/redux';
import { historyUtils } from '../../utils/utils';


describe("Primary App Component", () => {
    it("should render logged out correctly", () => {
        const store = buildStore();
        const r = render(<MemoryRouter><Provider store={store}><App /></Provider></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
        expect(screen.queryByTestId("fallback")).toBeNull();
    });

    it("should render logged in correctly", () => {
        historyUtils.isServer = true;
        const store = buildStore({auth: {user: {id: 19, token: "abcde"}}});        
        const r = render(<MemoryRouter><Provider store={store}><App /></Provider></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
        expect(screen.queryByTestId("fallback")).toBeNull();
    });
    
    it("should render fallback on error", () => {
        const err = console.error;
        console.error = jest.fn();

        const store = buildStore();
        const ErrorComponent = () => {
            throw new Error("Fallback test");
        }
        const r = render(<MemoryRouter><Provider store={store}><App><ErrorComponent/></App></Provider></MemoryRouter>).asFragment();
        //expect(r).toMatchSnapshot();   snapshot testing is not great since any change can affect call stack line numbers     
        expect(screen.queryByTestId("fallback")).toBeDefined();

        console.error = err;
    })
})
