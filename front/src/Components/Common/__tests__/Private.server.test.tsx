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
        isServer: true,
        location: "/server-location",
    },
}));

import Private from "../Private";
import { renderWithStore } from '../../../utils/test-utils';

describe("Private (server)", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("returns null if isServer is true", () => {
        globalThis.useSelectorMock.mockReturnValue({ user: null });
        const { container } = renderWithStore(
            <Private>
                <div>Should not render</div>
            </Private>
        );
        expect(container).toBeEmptyDOMElement();
    });
});