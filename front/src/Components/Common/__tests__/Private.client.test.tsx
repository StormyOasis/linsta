import React from "react";
import { screen } from "@testing-library/react";
import '@testing-library/jest-dom';

globalThis.useSelectorMock = jest.fn();

jest.mock("react-redux", () => ({
    ...jest.requireActual("react-redux"),
    useSelector: (...args: any[]) => globalThis.useSelectorMock(...args),
}));

jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    Navigate: jest.fn(({ to }) => <div data-testid="navigate">Navigate to {to}</div>),
}));

jest.mock("../../../utils/utils", () => ({
    historyUtils: {
        isServer: false,
        location: "/some-location",
    },
}));

import Private from "../Private";
import { renderWithStore } from '../../../utils/test-utils';

describe("Private (client)", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders children if user exists and not server", () => {
        globalThis.useSelectorMock.mockReturnValue({ user: { id: 1, name: "test" } });
        const { container } = renderWithStore(
            <Private>
                <div data-testid="child">Private Content</div>
            </Private>
        );
        expect(screen.getByTestId("child")).toBeInTheDocument();
        expect(container).not.toContainHTML("navigate");
    });

    it("navigates to /login if no user and not server", () => {
        globalThis.useSelectorMock.mockReturnValue({ user: null });
        renderWithStore(
            <Private>
                <div>Should not render</div>
            </Private>
        );
        expect(screen.getByTestId("navigate")).toHaveTextContent("Navigate to /login");
    });
});