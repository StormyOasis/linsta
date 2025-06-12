import React from "react";
import { screen } from "@testing-library/react";
import SignupLayout from "../SignupLayout";
import { renderWithStore } from "../../../../utils/test-utils";
import '@testing-library/jest-dom';

// Mocks
jest.mock("../../../Common/CombinedStyling", () => ({
    __esModule: true,
    ...jest.requireActual("../../../Common/CombinedStyling"),
    default: {
        innerDiv1: "innerDiv1",
        innerDiv2: "innerDiv2",
        signupBox: "signupBox"
    }
}));
jest.mock("../../../Themes/Theme", () => ({
    __esModule: true,
    default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));
jest.mock("../Flow/SignupMainForm", () => (props: any) => <div data-testid="signup-main-form">{JSON.stringify(props)}</div>);
jest.mock("../Flow/BirthdayForm", () => (props: any) => <div data-testid="birthday-form">{JSON.stringify(props)}</div>);
jest.mock("../Flow/ConfirmationCodeForm", () => (props: any) => <div data-testid="confirmation-code-form">{JSON.stringify(props)}</div>);
jest.mock("../../../Common/StyledLink", () => (props: any) => (
    <a data-testid="styled-link" href={props.to}>{props.children}</a>
));

describe("SignupLayout", () => {
    it("renders SignupMainForm on page 0", () => {
        const r = renderWithStore(<SignupLayout page={0} />);
        expect(screen.getByTestId("signup-main-form")).toBeInTheDocument();
        expect(screen.getByTestId("styled-link")).toHaveAttribute("href", "/login");
        expect(r.container).toMatchSnapshot();
    });

    it("renders BirthdayForm on page 1", () => {
        const r = renderWithStore(<SignupLayout page={1} />);
        expect(screen.getByTestId("birthday-form")).toBeInTheDocument();
        expect(screen.getByTestId("styled-link")).toHaveAttribute("href", "/login");
        expect(r.container).toMatchSnapshot();
    });

    it("renders ConfirmationCodeForm on page 2", () => {
        const r = renderWithStore(<SignupLayout page={2} />);
        expect(screen.getByTestId("confirmation-code-form")).toBeInTheDocument();
        expect(screen.getByTestId("styled-link")).toHaveAttribute("href", "/login");
        expect(r.container).toMatchSnapshot();
    });

    it("defaults to SignupMainForm if no page prop is given", () => {
        const r = renderWithStore(<SignupLayout />);
        expect(screen.getByTestId("signup-main-form")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });
});