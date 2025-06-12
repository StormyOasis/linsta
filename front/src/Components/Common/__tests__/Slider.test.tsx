import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import Slider, { SliderProps } from "../Slider";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

describe("Slider", () => {
    const baseProps: SliderProps = {
        value: 50,
        min: 0,
        max: 100,
        step: 5,
        label: "Volume",
        labelledby: "slider-label",
        onChange: jest.fn(),
    };

    it("renders the slider input with correct props", () => {
        const r = renderWithStore(<Slider {...baseProps} />);
        const input = screen.getByRole("slider");
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("type", "range");
        expect(input).toHaveAttribute("aria-labelledby", "slider-label");
        expect(input).toHaveValue("50");
        expect(input).toHaveAttribute("min", "0");
        expect(input).toHaveAttribute("max", "100");
        expect(input).toHaveAttribute("step", "5");
        expect(r).toMatchSnapshot();
    });

    it("renders the label text", () => {
        const r = renderWithStore(<Slider {...baseProps} />);
        expect(screen.getByText("Volume")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("calls onChange when slider value changes", () => {
        const r = renderWithStore(<Slider {...baseProps} />);
        const input = screen.getByRole("slider");
        fireEvent.change(input, { target: { value: "75" } });
        expect(baseProps.onChange).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("renders without label if not provided", () => {
        const props = { ...baseProps, label: undefined };
        const r = renderWithStore(<Slider {...props} />);
        // Should not throw and input should still be present
        expect(screen.getByRole("slider")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});