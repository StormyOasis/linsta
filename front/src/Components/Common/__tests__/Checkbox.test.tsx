import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Checkbox from "../Checkbox";
import { renderWithStore } from "../../../utils/test-utils";
import '@testing-library/jest-dom';

describe("Checkbox", () => {
    const defaultProps = {
        name: "test",
        isChecked: false,
        onSelect: jest.fn(),
    };

    it("renders without crashing", () => {
        const r = renderWithStore(<Checkbox {...defaultProps} />);
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("shows checkmark when checked", () => {
        const r = renderWithStore(<Checkbox {...defaultProps} isChecked={true} />);
        // The checkmark is rendered as an SVG, so check for svg in the label
        const label = screen.getByTestId("checkbox-label");
        expect(label.querySelector("svg")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("does not show checkmark when not checked", () => {
        const r = renderWithStore(<Checkbox {...defaultProps} isChecked={false} />);
        const label = screen.getByTestId("checkbox-label");
        expect(label.querySelector("svg")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("calls onSelect with correct arguments when clicked", () => {
        const r = renderWithStore(<Checkbox {...defaultProps} index={2} />);
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
        expect(defaultProps.onSelect).toHaveBeenCalledWith(2, true);
        expect(r).toMatchSnapshot();
    });

    it("uses default width and height if not provided", () => {
        const r = renderWithStore(<Checkbox {...defaultProps} />);
        const label = screen.getByTestId("checkbox-label");
        expect(label).toHaveStyle("width: 20px");
        expect(label).toHaveStyle("height: 20px");
        expect(r).toMatchSnapshot();
    });

    it("applies custom width and height if provided", () => {
        const r = renderWithStore(<Checkbox {...defaultProps} width="30px" height="40px" />);
        const label = screen.getByTestId("checkbox-label");
        expect(label).toHaveStyle("width: 30px");
        expect(label).toHaveStyle("height: 40px");
        expect(r).toMatchSnapshot();
    });
});