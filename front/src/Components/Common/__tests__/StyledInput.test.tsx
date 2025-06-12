import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StyledInput from "../StyledInput";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';


// Mock icons
jest.mock("../Icon", () => ({
    CheckCircleSVG: (props: any) => <svg data-testid="check-circle-svg" {...props} />,
    CircleXSVG: (props: any) => <svg data-testid="circle-x-svg" {...props} />,
}));

describe("StyledInput", () => {
    it("renders input with correct props", () => {
        const r = renderWithStore(
            <StyledInput
                name="test"
                value="hello"
                placeholder="Type here"
                onChange={jest.fn()}
                shouldValidate={false}
                datatestid="styled-input"
            />
        );
        const input = screen.getByTestId("styled-input");
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("name", "test");
        expect(input).toHaveAttribute("placeholder", "Type here");
        expect(input).toHaveValue("hello");
        expect(r).toMatchSnapshot();
    });

    it("calls onChange when input changes", () => {
        const handleChange = jest.fn();
        const r = renderWithStore(
            <StyledInput
                value=""
                onChange={handleChange}
                shouldValidate={false}
                datatestid="styled-input"
            />
        );
        const input = screen.getByTestId("styled-input");
        fireEvent.change(input, { target: { value: "abc" } });
        expect(handleChange).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("shows CheckCircleSVG when valid and shouldValidate is true", () => {
        const r = renderWithStore(
            <StyledInput
                value="abc"
                isValid={true}
                shouldValidate={true}
                datatestid="styled-input"
            />
        );
        expect(screen.getByTestId("check-circle-svg")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("shows CircleXSVG when invalid and shouldValidate is true", () => {
        const r = renderWithStore(
            <StyledInput
                value="abc"
                isValid={false}
                shouldValidate={true}
                datatestid="styled-input"
            />
        );
        expect(screen.getByTestId("circle-x-svg")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("does not show validation icon if value is empty", () => {
        const r = renderWithStore(
            <StyledInput
                value=""
                isValid={false}
                shouldValidate={true}
                datatestid="styled-input"
            />
        );
        expect(screen.queryByTestId("check-circle-svg")).not.toBeInTheDocument();
        expect(screen.queryByTestId("circle-x-svg")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("applies noMargin and width props", () => {
        const r = renderWithStore(
            <StyledInput
                value="abc"
                shouldValidate={false}
                noMargin={true}
                width="200px"
                datatestid="styled-input"
            />
        );
        const wrapper = screen.getByTestId("styled-input").closest("div");
        expect(wrapper).toHaveStyle("margin: 0");
        expect(wrapper).toHaveStyle("width: 200px");
        expect(r).toMatchSnapshot();
    });

    it("applies noBorder prop", () => {
        const r = renderWithStore(
            <StyledInput
                value="abc"
                shouldValidate={false}
                noBorder={true}
                datatestid="styled-input"
            />
        );
        const input = screen.getByTestId("styled-input");
        expect(input).toHaveStyle("border: none");
        expect(r).toMatchSnapshot();
    });

    it("calls onClick when input is clicked", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(
            <StyledInput
                value="abc"
                shouldValidate={false}
                onClick={handleClick}
                datatestid="styled-input"
            />
        );
        const input = screen.getByTestId("styled-input");
        fireEvent.click(input);
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });
});