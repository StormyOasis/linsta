import React from 'react'
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { Provider } from 'react-redux';
import { buildStore } from '../Redux/redux';


describe("Primary App Component", () => {
    it("should render correctly", () => {
        const store = buildStore();
        const r = render(<MemoryRouter><Provider store={store}><App /></Provider></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
    });
})
