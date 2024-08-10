import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';


describe("Primary App Component", () => {
    it("should render correctly", () => {
        const r = render(<MemoryRouter><App /></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
    });
})
