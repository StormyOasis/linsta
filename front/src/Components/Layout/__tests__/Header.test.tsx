// --- Mocks ---
jest.mock("styled-components", () => {
    const React = require("react");
    function fakeStyled(BaseComponent = "div") {
        const Styled = React.forwardRef((props, ref) =>
            React.createElement(BaseComponent, { ...props, ref }, props.children)
        );
        function templateFn(...args) { return Styled; }
        templateFn.withConfig = () => templateFn;
        Object.setPrototypeOf(templateFn, Styled);
        return templateFn;
    }
    fakeStyled.div = fakeStyled("div");
    fakeStyled.span = fakeStyled("span");
    fakeStyled.a = fakeStyled("a");
    fakeStyled.header = fakeStyled("header");
    fakeStyled.main = fakeStyled("main");
    fakeStyled.section = fakeStyled("section");
    fakeStyled.footer = fakeStyled("footer");
    return { __esModule: true, styled: fakeStyled };
});
jest.mock("../../Common/Icon", () => ({
    LogoSVG: () => <svg data-testid="logo-svg" />
}));
jest.mock("../../../Components/Themes/Theme", () => ({
    __esModule: true,
    default: ({ children }: any) => <div data-testid="theme">{children}</div>
}));
jest.mock("react-router-dom", () => {
    const actual = jest.requireActual("react-router-dom");
    return {
        ...actual,
        Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>
    };
});
jest.mock("../Header.module.css", () => ({
    fixedHeader: "fixedHeader",
    innerHeader: "innerHeader",
    actionWrapperInner: "actionWrapperInner"
}));
jest.mock("../../Common/CombinedStyling", () => {
    const React = require("react");
    const mockStyled = (tag = "div") =>
        Object.assign(
            React.forwardRef((props, ref) => React.createElement(tag, { ...props, ref }, props.children)),
            { styledComponentId: "mock" }
        );
    return {
        Div: mockStyled("div"),
        FlexColumn: mockStyled("div"),
        FlexRow: mockStyled("div"),
    };
});

// --- Imports ---
import React from "react";
import { render, screen } from "@testing-library/react";
import Header from "../Header";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// --- Tests ---
describe("Header", () => {
    it("renders logo, login, and signup links", () => {
        const r = renderWithStore(<Header />);
        expect(screen.getByTestId("logo-svg")).toBeInTheDocument();

        const loginLink = screen.getByRole("link", { name: /log in/i });
        expect(loginLink).toHaveAttribute("href", "/login");

        const signupLink = screen.getByRole("link", { name: /sign up/i });
        expect(signupLink).toHaveAttribute("href", "/signup");
        expect(r).toMatchSnapshot();
    });

    it("renders the correct structure and classes", () => {
        const r = renderWithStore(<Header />);
        expect(screen.getByText("Log In").closest(".actionWrapperInner")).toBeInTheDocument();
        expect(screen.getByText("Sign Up").closest(".actionWrapperInner")).toBeInTheDocument();
        expect(document.querySelector(".fixedHeader")).toBeInTheDocument();
        expect(document.querySelector(".innerHeader")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});