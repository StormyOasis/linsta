import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginLayout from "../LoginLayout";
import { historyUtils } from "../../../../utils/utils";
import { renderWithStore } from "../../../../utils/test-utils";
import { loginUser } from "../../../..//Components/Redux/slices/auth.slice";
import '@testing-library/jest-dom';


jest.mock("../../../../Components/Redux/slices/auth.slice", () => ({
  __esModule: true,
  loginUser: jest.fn(),
  default: () => ({
    authReducer: jest.fn(),
    authActions: {},
  }),
}));

jest.mock("../../../../utils/utils", () => ({
    ...jest.requireActual("../../../../utils/utils"),
    historyUtils: {
        navigate: jest.fn(),
    },
}));

describe("LoginLayout", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("disables login button when form is invalid", async () => {
        const r = renderWithStore(<LoginLayout />);
        const loginButton = screen.getByRole("button", { name: /login/i });
        expect(loginButton).toBeDisabled();

        const usernameInput = screen.getByPlaceholderText(/username/i);
        const passwordInput = screen.getByPlaceholderText(/password/i);

        await userEvent.type(usernameInput, "user");
        expect(loginButton).toBeDisabled();

        await userEvent.type(passwordInput, "bad"); // assume validatePassword fails
        expect(loginButton).toBeDisabled();

        await userEvent.clear(passwordInput);
        await userEvent.type(passwordInput, "ValidPass1!"); // assume this passes validatePassword
        expect(loginButton).toBeEnabled();

        expect(r).toMatchSnapshot();        
    });

    it("dispatches loginUser and shows error on failure", async () => {
        (loginUser as any as jest.Mock).mockImplementation(() => () =>
            Promise.resolve({
            response: {
                status: 400,
                data: { message: "Bad request" }
            }
        })
        );        

        const r = renderWithStore(<LoginLayout />);

        const usernameInput = screen.getByPlaceholderText(/username/i);
        const passwordInput = screen.getByPlaceholderText(/password/i);
        const loginButton = screen.getByRole("button", { name: /login/i });

        await userEvent.type(usernameInput, "user");
        await userEvent.type(passwordInput, "ValidPass1!");
        await userEvent.click(loginButton);

        await waitFor(() => {
            expect(loginUser).toHaveBeenCalledWith({ userName: "user", password: "ValidPass1!" });
        });

        // Error message appears after submission failure
        await waitFor(() => {
            expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
        });

        expect(r).toMatchSnapshot();
    });

    it("calls navigate on successful login", async () => {
        // mock loginUser to resolve
        (loginUser as any as jest.Mock).mockImplementation(() => () =>
            Promise.resolve()
        );

        const r = renderWithStore(<LoginLayout />, {
            preloadedState: {
                auth: { user: { id: 1, userName: "user" } },
            },
        });

        const usernameInput = screen.getByPlaceholderText(/username/i);
        const passwordInput = screen.getByPlaceholderText(/password/i);
        const loginButton = screen.getByRole("button", { name: /login/i });

        await userEvent.type(usernameInput, "user");
        await userEvent.type(passwordInput, "ValidPass1!");
        await userEvent.click(loginButton);

        await waitFor(() => {
            expect(loginUser).toHaveBeenCalledWith({ userName: "user", password: "ValidPass1!" });
            expect(historyUtils.navigate).toHaveBeenCalledWith("/");
        });

        expect(r).toMatchSnapshot();
    });
});
