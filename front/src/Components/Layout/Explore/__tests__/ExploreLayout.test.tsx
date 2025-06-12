import React from "react";
import { screen } from "@testing-library/react";
import ExploreLayout from "../ExploreLayout";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../../utils/test-utils';

// Mock dependencies
jest.mock("../../../Themes/Theme", () => ({
    __esModule: true,
    default: ({ children }: any) => <div data-testid="theme-mock">{children}</div>
}));
jest.mock("../../Main/SideBar", () => ({
    __esModule: true,
    default: () => <div data-testid="sidebar" />
}));
jest.mock("../ExploreContent", () => ({
    __esModule: true,
    default: () => <div data-testid="explore-content" />
}));
jest.mock("../../Main/Main.module.css", () => ({
    mainWrapper: "mainWrapper"
}));

jest.mock("../../../Common/CombinedStyling", () => ({
    Div: ({ children, ...props }: any) => <div {...props}>{children}</div>
}));

describe("ExploreLayout", () => {
    it("renders Theme, SideBar, and ExploreContent", () => {
        const r = renderWithStore(<ExploreLayout />);
        expect(screen.getByTestId("sidebar")).toBeInTheDocument();
        expect(screen.getByTestId("explore-content")).toBeInTheDocument();
        // Check wrapper class
        expect(screen.getByTestId("sidebar").parentElement).toHaveClass("mainWrapper");
        expect(r).toMatchSnapshot();
    });
});