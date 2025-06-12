import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import CustomNavMenuLink from "../CustomNavMenuLink";
import { renderWithStore } from "../../../utils/test-utils";
import '@testing-library/jest-dom';

describe("CustomNavMenuLink", () => {
    const icon = <svg data-testid="icon" />;
    const text = "Menu Link";
    const paddingLeft = 24;

    it("renders NavLink when 'to' prop is provided", () => {
        const r = renderWithStore(
            <CustomNavMenuLink
                to="/test"
                text={text}
                iconElement={icon}
                paddingLeft={paddingLeft}
                matchesLargestBP={true}
            />
        );
        // Should render a link with correct aria-label and text
        const link = screen.getByRole("link", { name: text });
        expect(link).toBeInTheDocument();
        expect(screen.getByTestId("icon")).toBeInTheDocument();
        expect(screen.getByText(text)).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("renders DivLink when 'to' prop is null", () => {
        const r = renderWithStore(
            <CustomNavMenuLink
                to={null}
                text={text}
                iconElement={icon}
                paddingLeft={paddingLeft}
                matchesLargestBP={true}
            />
        );
        // Should render a div with aria-description and text
        const div = screen.getByText(text).closest("div");
        expect(div).toBeInTheDocument();
        expect(screen.getByTestId("icon")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("calls onClick when clicked (NavLink)", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(
                <CustomNavMenuLink
                    to="/test"
                    text={text}
                    iconElement={icon}
                    paddingLeft={paddingLeft}
                    matchesLargestBP={true}
                    onClick={handleClick}
                />
        );
        const link = screen.getByRole("link", { name: text });
        fireEvent.click(link);
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot()
    });

    it("calls onClick when clicked (DivLink)", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(
            <CustomNavMenuLink
                to={null}
                text={text}
                iconElement={icon}
                paddingLeft={paddingLeft}
                matchesLargestBP={true}
                onClick={handleClick}
            />
        );
        const div = screen.getByText(text).closest("div");
        fireEvent.click(div!);
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("does not render text when matchesLargestBP is false", () => {
        const r = renderWithStore(
            <CustomNavMenuLink
                to={null}
                text={text}
                iconElement={icon}
                paddingLeft={paddingLeft}
                matchesLargestBP={false}
            />
        );
        expect(screen.queryByText(text)).not.toBeInTheDocument();
        expect(screen.getByTestId("icon")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});