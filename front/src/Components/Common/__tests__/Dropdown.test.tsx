import React from "react";
import { screen, fireEvent } from "@testing-library/react";

import '@testing-library/jest-dom';
import Dropdown from "../Dropdown";
import { renderWithStore } from "../../../utils/test-utils";

jest.mock("../Icon", () => ({
    DownSVG: (props: any) => <svg data-testid="down-svg" {...props} />,
    UpSVG: (props: any) => <svg data-testid="up-svg" {...props} />,
}));

describe("Dropdown", () => {
    const title = "Dropdown Title";
    const content = <div data-testid="dropdown-content">Dropdown Content</div>;

    it("renders with closed state by default", () => {
        const r = renderWithStore(<Dropdown title={title}>{content}</Dropdown>);
        expect(screen.getByText(title)).toBeInTheDocument();
        expect(screen.getByTestId("down-svg")).toBeInTheDocument();
        expect(screen.queryByTestId("up-svg")).not.toBeInTheDocument();
        // Content should not be visible
        expect(screen.getByTestId("dropdown-content").parentElement).toHaveStyle("display: none");
        expect(r).toMatchSnapshot();
    });

    it("toggles open/close state on multiple clicks", () => {
        const r = renderWithStore(<Dropdown title={title}>{content}</Dropdown>);
        const mainContainer = screen.getByText(title).parentElement!;
        // Open
        fireEvent.click(mainContainer);
        expect(screen.getByTestId("up-svg")).toBeInTheDocument();
        expect(screen.getByTestId("dropdown-content").parentElement).toHaveStyle("display: flex");
        // Close
        fireEvent.click(mainContainer);
        expect(screen.getByTestId("down-svg")).toBeInTheDocument();
        expect(screen.getByTestId("dropdown-content").parentElement).toHaveStyle("display: none");
        expect(r).toMatchSnapshot();
    });

    it("renders without children", () => {
        const r = renderWithStore(<Dropdown title={title} />);
        expect(screen.getByText(title)).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});