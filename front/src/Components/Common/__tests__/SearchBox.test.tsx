import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import SearchBox from "../SearchBox";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Mock icons
jest.mock("../Icon", () => ({
    CircleXSVG: (props: any) => <svg data-testid="circle-x-svg" {...props} />,
    SearchBoxSVG: (props: any) => <svg data-testid="search-box-svg" {...props} />,
}));

describe("SearchBox", () => {
    const baseProps = {
        placeholder: "Search users...",
        value: "",
        onChange: jest.fn(),
        onClear: jest.fn(),
    };

    it("renders input and search icon", () => {
        const r = renderWithStore(<SearchBox {...baseProps} />);
        expect(screen.getByPlaceholderText("Search users...")).toBeInTheDocument();
        expect(screen.getByTestId("search-box-svg")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("shows clear button when value is not empty", () => {
        const r = renderWithStore(<SearchBox {...baseProps} value="alice" />);
        expect(screen.getByTestId("circle-x-svg")).toBeInTheDocument();
        expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("does not show clear button when value is empty", () => {
        const r = renderWithStore(<SearchBox {...baseProps} value="" />);
        expect(screen.queryByTestId("circle-x-svg")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("calls onChange when input changes", () => {
        const r = renderWithStore(<SearchBox {...baseProps} />);
        const input = screen.getByPlaceholderText("Search users...");
        fireEvent.change(input, { target: { value: "bob" } });
        expect(baseProps.onChange).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("calls onClear when clear button is clicked", () => {
        const r = renderWithStore(<SearchBox {...baseProps} value="alice" />);
        const clearBtn = screen.getByLabelText("Clear search");
        fireEvent.click(clearBtn);
        expect(baseProps.onClear).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });
});