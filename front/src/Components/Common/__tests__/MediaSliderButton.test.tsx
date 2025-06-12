import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import MediaSliderButton from "../MediaSliderButton";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Mock icons
jest.mock("../Icon", () => ({
    LeftArrowSVG: (props: any) => <svg data-testid="left-arrow" {...props} />,
    RightArrowSVG: (props: any) => <svg data-testid="right-arrow" {...props} />,
}));

describe("MediaSliderButton", () => {
    it("renders left direction and calls onClick", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(<MediaSliderButton direction="left" onClick={handleClick} />);
        const leftArrow = screen.getByTestId("left-arrow");
        expect(leftArrow).toBeInTheDocument();
        fireEvent.click(leftArrow.parentElement!);
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("renders right direction and calls onClick", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(<MediaSliderButton direction="right" onClick={handleClick} />);
        const rightArrow = screen.getByTestId("right-arrow");
        expect(rightArrow).toBeInTheDocument();
        fireEvent.click(rightArrow.parentElement!);
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("renders bottomLeft direction and calls onClick", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(<MediaSliderButton direction="bottomLeft" onClick={handleClick} />);
        const leftArrow = screen.getByTestId("left-arrow");
        expect(leftArrow).toBeInTheDocument();
        fireEvent.click(leftArrow.parentElement!);
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("renders bottomRight direction and calls onClick", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(<MediaSliderButton direction="bottomRight" onClick={handleClick} />);
        const rightArrow = screen.getByTestId("right-arrow");
        expect(rightArrow).toBeInTheDocument();
        fireEvent.click(rightArrow.parentElement!);
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });
});