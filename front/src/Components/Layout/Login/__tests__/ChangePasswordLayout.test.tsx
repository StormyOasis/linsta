import React from 'react'
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import ChangePasswordLayout from '../ChangePasswordLayout';
import { MemoryRouter } from 'react-router-dom';

describe("ChangePasswordLayout Component", () => {
    it("should render using current password as input", () => {
        const r = render(<MemoryRouter><ChangePasswordLayout></ChangePasswordLayout></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
        expect(screen.getByTestId("currentPassword")).toBeInTheDocument();
    });

    it("should render based on token", () => {
        const r = render(<MemoryRouter initialEntries={[`?token="1234"`]}><ChangePasswordLayout></ChangePasswordLayout></MemoryRouter>).asFragment();

        expect(r).toMatchSnapshot();
        expect(screen.queryByTestId("currentPassword")).toBeNull();
    });
});