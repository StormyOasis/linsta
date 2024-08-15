import React from 'react'
import { render } from '@testing-library/react';
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
    });

    it("should render logged in correctly", () => {
        historyUtils.isServer = true;
        const store = buildStore({auth: {user: {id: 19, token: "abcde"}}});        
        console.log(store.getState());
        const r = render(<MemoryRouter><Provider store={store}><App /></Provider></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
    });    
})
