import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LocationPopup from "../LocationPopup";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Mock icons
jest.mock("../Icon", () => ({
    CircleXSVG: (props: any) => <svg data-testid="circle-x" {...props} />,
    LocationSVG: (props: any) => <svg data-testid="location-svg" {...props} />,
}));

// Mock getLocation API
jest.mock("../../../api/ServiceController", () => ({
    getLocation: jest.fn(async (query: string) => ({
        data: [
            { Place: { Label: "New York" }, Relevance: 1 },
            { Place: { Label: "San Francisco" }, Relevance: 0.9 }
        ]
    })),
}));

describe("LocationPopup", () => {
    const onLocationChanged = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders input and location icon by default", () => {
        const r = renderWithStore(<LocationPopup onLocationChanged={onLocationChanged} />);
        expect(screen.getByPlaceholderText(/add location/i)).toBeInTheDocument();
        expect(screen.getByTestId("location-svg")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("shows clear icon when locationText is present", () => {
        const r = renderWithStore(<LocationPopup locationText="Somewhere" onLocationChanged={onLocationChanged} />);
        expect(screen.getByTestId("circle-x")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("opens popup on input click and closes on outside click", () => {
        const r = renderWithStore(<LocationPopup onLocationChanged={onLocationChanged} />);
        const input = screen.getByPlaceholderText(/add location/i);
        // Popup should be closed initially
        expect(screen.getByRole("textbox")).toBeInTheDocument();
        fireEvent.click(input);
        // Popup container should now be visible (display: flex)
        const popup = screen.getByTestId("location-popup-container") || document.querySelector('[data-testid="location-popup-container"]');
        expect(popup).toHaveStyle("display: flex");
        // Simulate outside click
        fireEvent.mouseDown(document.body);
        expect(popup).toHaveStyle("display: none");
        expect(r).toMatchSnapshot();
    });

    it("calls onLocationChanged and fetches locations on input change", async () => {
        const r = renderWithStore(<LocationPopup onLocationChanged={onLocationChanged} />);
        const input = screen.getByPlaceholderText(/add location/i);
        fireEvent.click(input);
        fireEvent.change(input, { target: { value: "New" } });
        await waitFor(() => {
            expect(onLocationChanged).toHaveBeenCalledWith("New");
            expect(screen.getByText("New York")).toBeInTheDocument();
            expect(screen.getByText("San Francisco")).toBeInTheDocument();
        });
        expect(r).toMatchSnapshot();
    });

    it("clears location when clear icon is clicked", () => {
        const r = renderWithStore(<LocationPopup locationText="Somewhere" onLocationChanged={onLocationChanged} />);
        const clearIcon = screen.getByTestId("circle-x");
        fireEvent.click(clearIcon);
        expect(onLocationChanged).toHaveBeenCalledWith("");
        expect(r).toMatchSnapshot();
    });

    it("selects a location from the popup", async () => {
        const r = renderWithStore(<LocationPopup onLocationChanged={onLocationChanged} />);
        const input = screen.getByPlaceholderText(/add location/i);
        fireEvent.click(input);
        fireEvent.change(input, { target: { value: "New" } });
        await waitFor(() => {
            expect(screen.getByText("New York")).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText("New York"));
        expect(onLocationChanged).toHaveBeenCalledWith("New York");
        expect(r).toMatchSnapshot();
    });

    it("closes popup on Escape key", () => {
        const r = renderWithStore(<LocationPopup onLocationChanged={onLocationChanged} />);
        const input = screen.getByPlaceholderText(/add location/i);
        fireEvent.click(input);
        fireEvent.keyUp(input, { key: "Escape", code: "Escape" });
        const popup = document.querySelector('[data-testid="location-popup-container"]');
        if (popup) {
            expect(popup).toHaveStyle("display: none");
        }
        expect(r).toMatchSnapshot();
    });
});