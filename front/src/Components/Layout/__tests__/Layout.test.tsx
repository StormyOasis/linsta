import React from "react";
import { screen } from "@testing-library/react";
import Layout from "../Layout";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Mocks for all layouts and components used in routes
jest.mock("../Login/LoginLayout", () => () => <div data-testid="login-layout" />);
jest.mock("../Main/MainLayout", () => () => <div data-testid="main-layout" />);
jest.mock("../Header", () => () => <div data-testid="header" />);
jest.mock("../Signup/SignupLayout", () => () => <div data-testid="signup-layout" />);
jest.mock("../Login/ForgotPasswordLayout", () => () => <div data-testid="forgot-password-layout" />);
jest.mock("../Login/ChangePasswordLayout", () => () => <div data-testid="change-password-layout" />);
jest.mock("../Main/Modals/ModalManager", () => () => <div data-testid="modal-manager" />);
jest.mock("../Profile/ProfileLayout", () => (props: any) => <div data-testid={`profile-layout${props.edit ? "-edit" : ""}`} />);
jest.mock("../NotFoundLayout", () => () => <div data-testid="not-found-layout" />);
jest.mock("../Explore/ExploreLayout", () => () => <div data-testid="explore-layout" />);
jest.mock("../../Common/Private", () => ({ children }: any) => <>{children}</>);

describe("Layout routing", () => {
    const renderWithRoute = (route: string) =>
        renderWithStore(<Layout />, { route });

    it("renders MainLayout for /", () => {
        const r = renderWithRoute("/");
        expect(screen.getByTestId("main-layout")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders ProfileLayout in edit mode for /edit", () => {
        const r = renderWithRoute("/edit");
        expect(screen.getByTestId("profile-layout-edit")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders ExploreLayout for /explore", () => {
        const r = renderWithRoute("/explore");
        expect(screen.getByTestId("explore-layout")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders LoginLayout for /login", () => {
        const r = renderWithRoute("/login");
        expect(screen.getByTestId("login-layout")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders SignupLayout for /signup", () => {
        const r = renderWithRoute("/signup");
        expect(screen.getByTestId("signup-layout")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders ForgotPasswordLayout and Header for /forgot", () => {
        const r = renderWithRoute("/forgot");
        expect(screen.getByTestId("header")).toBeInTheDocument();
        expect(screen.getByTestId("forgot-password-layout")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders ChangePasswordLayout and Header for /change_password", () => {
        const r = renderWithRoute("/change_password");
        expect(screen.getByTestId("header")).toBeInTheDocument();
        expect(screen.getByTestId("change-password-layout")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders NotFoundLayout for /404", () => {
        const r = renderWithRoute("/404");
        expect(screen.getByTestId("not-found-layout")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("redirects /:userName/ to /:userName", () => {
        const r = renderWithRoute("/alice/");
        expect(screen.getByTestId("profile-layout")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders ProfileLayout for /:userName", () => {
        const r = renderWithRoute("/bob");
        expect(screen.getByTestId("profile-layout")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("always renders ModalManager", () => {
        const r = renderWithRoute("/");
        expect(screen.getByTestId("modal-manager")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });
});