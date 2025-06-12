import React from "react";
import { screen } from "@testing-library/react";
import {
  Icon,
  makeStyledIcon,
  SearchSVG,
  HeartSVG,
  UpSVG,
} from "../Icon";
import '@testing-library/jest-dom';
import { renderWithStore } from "../../../utils/test-utils";

// Mock SPRITE_PATH for predictable output
jest.mock("../../../api/config", () => ({
  SPRITE_PATH: "/sprite.svg",
}));

describe("Icon component", () => {
  it("renders an svg with correct props and <use> href", () => {
    const r = renderWithStore(<Icon name="test-icon" width={32} height={32} fill="red" stroke="blue" strokeWidth={3} data-testid="icon" />);
    const svg = screen.getByTestId("icon");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveAttribute("height", "32");
    expect(svg).toHaveAttribute("fill", "red");
    expect(svg).toHaveAttribute("stroke", "blue");
    expect(svg).toHaveAttribute("stroke-width", "3");
    // Check <use> element
    const use = svg.querySelector("use");
    expect(use).toBeInTheDocument();
    expect(use).toHaveAttribute("href", "/sprite.svg#test-icon");
    expect(r).toMatchSnapshot();
  });

  it("renders with default fill, stroke, and strokeWidth if not provided", () => {
    const r = renderWithStore(<Icon name="default-icon" data-testid="icon-default" />);
    const svg = screen.getByTestId("icon-default");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("stroke-width", "2");
    expect(r).toMatchSnapshot();
  });
});

describe("makeStyledIcon", () => {
  it("returns a styled component that renders Icon with fixed name", () => {
    const CustomIcon = makeStyledIcon("custom-icon");
    const r = renderWithStore(<CustomIcon data-testid="custom-icon" />);
    const svg = screen.getByTestId("custom-icon");
    const use = svg.querySelector("use");
    expect(use).toHaveAttribute("href", "/sprite.svg#custom-icon");
    expect(r).toMatchSnapshot();
  });
});

describe("Exported styled icons", () => {
  it("renders SearchSVG with correct <use> href", () => {
    const r = renderWithStore(<SearchSVG data-testid="search-svg" />);
    const svg = screen.getByTestId("search-svg");
    const use = svg.querySelector("use");
    expect(use).toHaveAttribute("href", "/sprite.svg#search-icon");
    expect(r).toMatchSnapshot();
  });

  it("renders HeartSVG and UpSVG with correct <use> href", () => {
    const r = renderWithStore(<>
      <HeartSVG data-testid="heart-svg" />
      <UpSVG data-testid="up-svg" />
    </>);
    expect(screen.getByTestId("heart-svg").querySelector("use")).toHaveAttribute("href", "/sprite.svg#heart");
    expect(screen.getByTestId("up-svg").querySelector("use")).toHaveAttribute("href", "/sprite.svg#up-line");
    expect(r).toMatchSnapshot();
  });
});