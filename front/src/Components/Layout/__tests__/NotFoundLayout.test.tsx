import React from "react";
import { screen } from "@testing-library/react";
import NotFoundLayout from "../NotFoundLayout";
import { renderWithStore } from "../../../utils/test-utils";
import '@testing-library/jest-dom';


// Mocks
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
jest.mock("../../Common/StyledLink", () => (props: any) => (
  <a data-testid="styled-link" href={props.to} {...props}>
    {props.children}
  </a>
));
jest.mock("../../Themes/Theme", () => ({
    __esModule: true,
    default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));
jest.mock("../Main/SideBar", () => () => <div data-testid="sidebar" />);
jest.mock("../../../utils/utils", () => ({
    historyUtils: { isServer: false }
}));
let mockUser: any = { token: "mock-token" };
jest.mock("../../Redux/redux", () => ({
    useAppSelector: (fn: any) => fn({ auth: { user: mockUser } })
}));

describe("NotFoundLayout", () => {
    it("renders with sidebar when logged in", () => {
        mockUser = { token: "mock-token" };
        const r = renderWithStore(<NotFoundLayout />);
        expect(screen.getByTestId("sidebar")).toBeInTheDocument();
        expect(screen.getByText("Sorry, this page is not available")).toBeInTheDocument();
        expect(screen.getByTestId("styled-link")).toHaveAttribute("href", "/");
        expect(r.container).toMatchSnapshot();
    });

    it("renders without sidebar when not logged in", () => {
        mockUser = null;
        const r = renderWithStore(<NotFoundLayout />);
        expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
        expect(screen.getByText("Sorry, this page is not available")).toBeInTheDocument();
        expect(screen.getByTestId("styled-link")).toHaveAttribute("href", "/");
        expect(r.container).toMatchSnapshot();
    });
});