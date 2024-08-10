import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import ForgotPasswordLayout from '../ForgotPasswordLayout';
import { MemoryRouter } from 'react-router-dom';


describe("ForgotPasswordLayout Component", () => {
    it("should render correctly", () => {
        const r = render(<MemoryRouter><ForgotPasswordLayout></ForgotPasswordLayout></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
        expect(screen.queryByTestId("forgotModal")).not.toBeInTheDocument();
    });

    // Mocking 
    const setup = () => {
        const funcs = render(<MemoryRouter><ForgotPasswordLayout></ForgotPasswordLayout></MemoryRouter>).asFragment();
        const input = screen.getByPlaceholderText("Email, Phone, or Username");

        if(input == null) {
            expect(1).toBe(0);
            return {};
        }
        
        return {
            input,
            ...funcs
        }
    }

    it("should render modal", () => {
        const {input, funcs} = setup();
        const element = input as HTMLInputElement;
        fireEvent.change(element, {target: {key: "A"}});
        expect(funcs).toMatchSnapshot();
        expect(screen.queryByTestId("forgotModal")).toBeNull();
    });
});