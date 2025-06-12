import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ForgotPasswordLayout from '../ForgotPasswordLayout';

import { renderWithStore, mockInitialState } from '../../../../utils/test-utils';

import * as serviceController from '../../../../api/ServiceController';
import { actions, buildStore } from '../../../Redux/redux';
import { MODAL_TYPES } from '../../../Redux/slices/modals.slice';

jest.mock('../../../../api/ServiceController');


describe("ForgotPasswordLayout", () => {
    let store: ReturnType<typeof buildStore>;

    beforeAll(() => {
        store = buildStore(); // ✅ Save the store that initializes actions.modalActions
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("dispatches openModal with success response on clicking send link", async () => {
        const fakeResponse = {
            status: 200,
            data: {
                title: "Success!",
                text: "A login link has been sent to your email.",
            },
        };
        (serviceController.postForgotPassword as jest.Mock).mockResolvedValueOnce(
            fakeResponse
        );

        // Spy on openModal modal action
        const openModalSpy = jest.spyOn(actions.modalActions, "openModal");

        const r = renderWithStore(<ForgotPasswordLayout />, { store })
        const input = screen.getByPlaceholderText(/Email, Phone, or Username/i);
        const sendButton = screen.getByRole("button", { name: /Send Login Link/i });

        await userEvent.type(input, "user@example.com");
        userEvent.click(sendButton);

        await waitFor(() => {
            expect(openModalSpy).toHaveBeenCalled();
        });
        expect(r).toMatchSnapshot();
    });

    it("dispatches openModal with error response on API failure", async () => {
        (serviceController.postForgotPassword as jest.Mock).mockRejectedValueOnce({
            response: {
                status: 400,
                data: { message: "Bad request" }
            }
        })

        // Spy on openModal modal action
        const openModalSpy = jest.spyOn(actions.modalActions, "openModal");

        const r = renderWithStore(<ForgotPasswordLayout />, { store });
        const input = screen.getByPlaceholderText(/Email, Phone, or Username/i);
        const sendButton = screen.getByRole("button", { name: /Send Login Link/i });

        await userEvent.type(input, "user@example.com");
        userEvent.click(sendButton);

        await waitFor(() => {
            expect(openModalSpy).toHaveBeenCalledWith({
                modalName: MODAL_TYPES.FORGOT_PASSWORD_MODAL,
                data: {
                    queryResponseTitle: "Error Sending Link",
                    queryResponseText:
                        "An unexpected error has occurred while sending the login link",
                },
            });
        });
        expect(r).toMatchSnapshot();
    });
});