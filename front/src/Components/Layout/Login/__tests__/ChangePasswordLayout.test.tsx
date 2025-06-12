import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import ChangePasswordLayout from '../ChangePasswordLayout';
import * as api from '../../../../api/ServiceController';
import * as auth from '../../../../api/Auth';
import { renderWithStore } from '../../../../utils/test-utils';

jest.mock('../../../../api/ServiceController');
jest.mock('../../../../api/Auth');

describe('ChangePasswordLayout', () => {
    const mockUser = { userName: 'testuser' };

    beforeEach(() => {
        jest.resetAllMocks();
        (auth.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
    });

    it('renders current password when token is missing', () => {
        const r = renderWithStore(<ChangePasswordLayout />, {
            route: '/change_password',
        });

        expect(screen.getByPlaceholderText(/Current Password/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/New Password/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Retype Password/i)).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it('hides current password when token is present', () => {
        const r = renderWithStore(<ChangePasswordLayout />, {
            route: '/change_password?token=abc123',
        });

        expect(screen.queryByPlaceholderText(/Current Password/i)).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it('disables submit button if inputs are invalid', () => {
        const r = renderWithStore(<ChangePasswordLayout />, {
            route: '/change_password',
        });

        const button = screen.getByRole('button', { name: /Change Password/i });
        expect(button).toBeDisabled();
        expect(r).toMatchSnapshot();
    });

    it("submits and redirects on success", async () => {
        // Mock successful password change API response
        (api.postChangePassword as jest.Mock).mockResolvedValueOnce({
            status: 200,
            statusText: "OK",
            data: { status: "OK" },
        });

        // Render component with token query param to skip current password field
        const r = renderWithStore(<ChangePasswordLayout />, {
            route: "/change_password?token=validtoken",
        });

        const newPasswordInput = screen.getByPlaceholderText(/New Password/i);
        const retypePasswordInput = screen.getByPlaceholderText(/Retype Password/i);
        const changeButton = screen.getByRole("button", { name: /Change Password/i });

        // Type matching valid passwords
        await userEvent.type(newPasswordInput, "ValidPass1!");
        await userEvent.type(retypePasswordInput, "ValidPass1!");

        // Button should be enabled
        expect(changeButton).toBeEnabled();

        // Click submit
        userEvent.click(changeButton);

        const navigateDiv = await screen.findByTestId('change-pass-navigate-element');
        expect(navigateDiv).toBeInTheDocument();

        expect(r).toMatchSnapshot();
    });

    it('handles API error without crash', async () => {
        (api.postChangePassword as jest.Mock).mockRejectedValueOnce({
            response: {
                status: 400,
                data: { message: "Bad request" }
            }
        });

        const r = renderWithStore(<ChangePasswordLayout />, {
            route: '/change_password',
        });

        await userEvent.type(screen.getByPlaceholderText(/Current Password/i), 'ValidPass1!');
        await userEvent.type(screen.getByPlaceholderText(/New Password/i), 'ValidPass1!');
        await userEvent.type(screen.getByPlaceholderText(/Retype Password/i), 'ValidPass1!');

        userEvent.click(screen.getByRole('button', { name: /Change Password/i }));

        await waitFor(() => {
            expect(api.postChangePassword).toHaveBeenCalled();
            expect(screen.getByPlaceholderText(/New Password/i)).toBeInTheDocument();
        });

        expect(r).toMatchSnapshot();
    });
});