import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import ToggleSwitch from "../ToggleSwitch";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Polyfill for crypto.randomUUID in Jest/node
if (!global.crypto) {
    global.crypto = {} as Crypto;
}
if (!global.crypto.randomUUID) {
    global.crypto.randomUUID = () => "test-uuid-1234-5678-910";
}

describe("ToggleSwitch", () => {
    it("renders the switch input and label", () => {
        const r = renderWithStore(<ToggleSwitch />);
        const input = screen.getByTestId("toggle-checkbox");
        expect(input).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("is unchecked by default", () => {
        const r = renderWithStore(<ToggleSwitch />);
        const input = screen.getByTestId("toggle-checkbox");
        expect(input).not.toBeChecked();
        expect(r).toMatchSnapshot();
    });

    it("respects isChecked prop", () => {
        const r = renderWithStore(<ToggleSwitch isChecked={true} />);
        const input = screen.getByTestId("toggle-checkbox");
        expect(input).toBeChecked();
        expect(r).toMatchSnapshot();
    });

    it("calls onChange with correct value when toggled", () => {
        const handleChange = jest.fn();
        const r = renderWithStore(<ToggleSwitch onChange={handleChange} />);
        const input = screen.getByTestId("toggle-checkbox");
        fireEvent.click(input);
        expect(handleChange).toHaveBeenCalledWith(true);
        fireEvent.click(input);
        expect(handleChange).toHaveBeenCalledWith(false);
        expect(r).toMatchSnapshot();
    });

    it("toggles checked state on click", () => {
        const r = renderWithStore(<ToggleSwitch />);
        const input = screen.getByTestId("toggle-checkbox");
        expect(input).not.toBeChecked();
        fireEvent.click(input);
        expect(input).toBeChecked();
        fireEvent.click(input);
        expect(input).not.toBeChecked();
        expect(r).toMatchSnapshot();
    });
});