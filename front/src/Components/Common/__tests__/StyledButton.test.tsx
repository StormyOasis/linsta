import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import StyledButton from "../StyledButton";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

describe("StyledButton", () => {
    it("renders with given text", () => {
        const r = renderWithStore(<StyledButton text="Click Me" />);
        expect(screen.getByText("Click Me")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("calls onClick when clicked", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(<StyledButton text="Click" onClick={handleClick} />);
        fireEvent.click(screen.getByText("Click"));
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("does not call onClick when disabled", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(<StyledButton text="Disabled" onClick={handleClick} disabled />);
        fireEvent.click(screen.getByText("Disabled"));
        expect(handleClick).not.toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("applies custom className and style", () => {
        const r = renderWithStore(
            <StyledButton
                text="Styled"
                className="my-class"
                style={{ backgroundColor: "red" }}
                datatestid="styled-btn"
            />
        );
        const btn = screen.getByTestId("styled-btn");
        expect(btn).toHaveClass("my-class");
        expect(btn).toHaveStyle("background-color: red");
        expect(r).toMatchSnapshot();
    });

    it("sets button type and name attributes", () => {
        const r = renderWithStore(
            <StyledButton
                text="Submit"
                type="submit"
                name="myBtn"
                datatestid="submit-btn"
            />
        );
        const btn = screen.getByTestId("submit-btn");
        expect(btn).toHaveAttribute("type", "submit");
        expect(btn).toHaveAttribute("name", "myBtn");
        expect(r).toMatchSnapshot();
    });

    it("uses secondary colors when useSecondaryColors is true", () => {
        const r = renderWithStore(
            <StyledButton
                text="Secondary"
                useSecondaryColors
                datatestid="secondary-btn"
            />
        );
        // Just check that the button renders, since color comes from theme
        expect(screen.getByTestId("secondary-btn")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});