import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import StyledLink from "../StyledLink";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';


describe("StyledLink", () => {
    it("renders as a link when 'to' is provided", () => {
        const r = renderWithStore(
            <StyledLink to="/profile" datatestid="styled-link">
                Profile
            </StyledLink>
        );
        const link = screen.getByTestId("styled-link");
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/profile");
        expect(link).toHaveTextContent("Profile");
        expect(r).toMatchSnapshot();
    });

    it("renders as a div when 'to' is not provided", () => {
        const r = renderWithStore(
            <StyledLink datatestid="styled-link">No Link</StyledLink>
        );
        const div = screen.getByTestId("styled-link");
        expect(div).toBeInTheDocument();
        expect(div.tagName.toLowerCase()).toBe("div");
        expect(div).toHaveTextContent("No Link");
        expect(r).toMatchSnapshot();
    });

    it("calls onClick when clicked", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(
            <StyledLink datatestid="styled-link" onClick={handleClick}>
                Clickable
            </StyledLink>
        );
        const div = screen.getByTestId("styled-link");
        fireEvent.click(div);
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("applies styleOverride and className", () => {
        const r = renderWithStore(
            <StyledLink
                datatestid="styled-link"
                styleOverride={{ color: "red" }}
                className="my-class"
            >
                Styled
            </StyledLink>
        );
        const div = screen.getByTestId("styled-link");
        expect(div).toHaveClass("my-class");
        expect(div).toHaveStyle("color: red");
        expect(r).toMatchSnapshot();
    });

    it("applies role and passes children", () => {
        const r = renderWithStore(
            <StyledLink datatestid="styled-link" role="link">
                ChildText
            </StyledLink>
        );
        const div = screen.getByTestId("styled-link");
        expect(div).toHaveAttribute("role", "link");
        expect(div).toHaveTextContent("ChildText");
        expect(r).toMatchSnapshot();
    });

    it("uses secondary colors when useSecondaryColors is true", () => {
        const r = renderWithStore(
            <StyledLink datatestid="styled-link" useSecondaryColors>
                Secondary
            </StyledLink>
        );
        expect(screen.getByTestId("styled-link")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("renders with noHover prop", () => {
        const r = renderWithStore(
            <StyledLink datatestid="styled-link" noHover>
                NoHover
            </StyledLink>
        );
        expect(screen.getByTestId("styled-link")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});