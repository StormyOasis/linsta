import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MediaSlider from "../MediaSlider";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';


// Mock styles and icons
jest.mock("../Common.module.css", () => ({
    mediaSliderMedia: "mediaSliderMedia",
    mediaCircles: "mediaCircles"
}));
jest.mock("../Icon", () => ({
    LeftArrowSVG: (props: any) => <svg data-testid="left-arrow" {...props} />,
    RightArrowSVG: (props: any) => <svg data-testid="right-arrow" {...props} />,
}));

// Mock document.body.clientWidth for consistent tests
Object.defineProperty(document.body, "clientWidth", {
    value: 470,
    writable: true,
});

const imageMedia = [
    { path: "/img1.jpg", mimeType: "image/jpeg", altText: "Image 1" },
    { path: "/img2.jpg", mimeType: "image/jpeg", altText: "Image 2" }
];

const videoMedia = [
    { path: "/video1.mp4", mimeType: "video/mp4", altText: "Video 1" }
];

describe("MediaSlider", () => {
    it("renders images and navigation circles", () => {
        const r = renderWithStore(<MediaSlider media={imageMedia as any} />);
        expect(screen.getByAltText("Image 1")).toBeInTheDocument();
        expect(screen.getByAltText("Image 2")).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Image 1" })).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Image 2" })).toBeInTheDocument();
        // Circles for navigation
        expect(document.querySelectorAll(".mediaCircles").length).toBe(1);
        expect(r).toMatchSnapshot();
    });

    it("renders video when mimeType includes 'video'", () => {
        const r = renderWithStore(<MediaSlider media={videoMedia as any} />);
        expect(screen.getByLabelText("Video 1")).toBeInTheDocument();
        expect(screen.getByRole("video", { hidden: true })).toBeTruthy();
        expect(r).toMatchSnapshot();
    });

    it("shows right arrow if has next", () => {
        const r = renderWithStore(<MediaSlider media={imageMedia as any} />);
        expect(screen.getByTestId("right-arrow")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("shows left arrow after advancing", () => {
        const r = renderWithStore(<MediaSlider media={imageMedia as any} />);
        // Click right arrow to advance
        fireEvent.click(screen.getByTestId("right-arrow").parentElement!);
        expect(screen.getByTestId("left-arrow")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("advances and reverses slides on arrow click", () => {
        const r = renderWithStore(<MediaSlider media={imageMedia as any} />);
        // Start at first image
        expect(screen.getByAltText("Image 1").parentElement).toHaveStyle("transform: translateX(-0px)");
        // Advance to next
        fireEvent.click(screen.getByTestId("right-arrow").parentElement!);
        expect(screen.getByAltText("Image 1").parentElement).toHaveStyle("transform: translateX(-470px)");
        // Go back to previous
        fireEvent.click(screen.getByTestId("left-arrow").parentElement!);
        expect(screen.getByAltText("Image 1").parentElement).toHaveStyle("transform: translateX(-0px)");
        expect(r).toMatchSnapshot();
    });

    it("does not render arrows if only one media", () => {
        const r = renderWithStore(<MediaSlider media={videoMedia as any} />);
        expect(screen.queryByTestId("left-arrow")).not.toBeInTheDocument();
        expect(screen.queryByTestId("right-arrow")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});