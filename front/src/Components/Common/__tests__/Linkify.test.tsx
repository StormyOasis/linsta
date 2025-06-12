import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import Linkify from "../Linkify";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Mock StyledLink to a simple anchor for easier testing
jest.mock("../StyledLink", () => (props: any) => (
    <a data-testid="styled-link" href={props.to} onClick={props.onClick}>{props.children}</a>
));

describe("Linkify", () => {
    it("renders plain text without links", () => {
        const r = renderWithStore(<Linkify html="Hello world!" />);
        expect(screen.getByText("Hello world!")).toBeInTheDocument();
        expect(screen.queryByTestId("styled-link")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("linkifies @mentions", () => {
        const r = renderWithStore(<Linkify html="Hello @alice!" />);
        const link = screen.getByTestId("styled-link");
        expect(link).toHaveAttribute("href", "/alice");
        expect(link).toHaveTextContent("@alice");
        expect(r).toMatchSnapshot();
    });

    it("linkifies #hashtags", () => {
        const r = renderWithStore(<Linkify html="Check #reactjs" />);
        const link = screen.getByTestId("styled-link");
        expect(link).toHaveAttribute("href", "/explore?q=%23reactjs");
        expect(link).toHaveTextContent("#reactjs");
        expect(r).toMatchSnapshot();
    });

    it("renders multiple links and plain text", () => {
        const r = renderWithStore(<Linkify html="Hi @bob, check #js and @carol!" />);
        const links = screen.getAllByTestId("styled-link");
        expect(links[0]).toHaveAttribute("href", "/bob");
        expect(links[0]).toHaveTextContent("@bob");
        expect(links[1]).toHaveAttribute("href", "/explore?q=%23js");
        expect(links[1]).toHaveTextContent("#js");
        expect(links[2]).toHaveAttribute("href", "/carol");
        expect(links[2]).toHaveTextContent("@carol");
        expect(r).toMatchSnapshot();
    });

    it("calls onClick when a link is clicked", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(<Linkify html="Hello @alice!" onClick={handleClick} />);
        const link = screen.getByTestId("styled-link");
        fireEvent.click(link);
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("parses and applies inline styles and classes", () => {
        const r = renderWithStore(<Linkify html='<span class="my-class" style="color: red; font-weight: bold;">Styled @bob</span>' />);
        const span = screen.getByText(/Styled/).closest("span");
        expect(span).toHaveClass("my-class");
        expect(span).toHaveStyle({ color: "red", fontWeight: "bold" });
        // The @bob mention inside should be linkified
        const link = screen.getByTestId("styled-link");
        expect(link).toHaveAttribute("href", "/bob");
        expect(link).toHaveTextContent("@bob");
        expect(r).toMatchSnapshot();
    });

    it("parses nested HTML and linkifies text nodes", () => {
        const r = renderWithStore(<Linkify html='<div>Hello <b>@alice</b> and <i>#react</i></div>' />);
        const links = screen.getAllByTestId("styled-link");
        expect(links[0]).toHaveAttribute("href", "/alice");
        expect(links[0]).toHaveTextContent("@alice");
        expect(links[1]).toHaveAttribute("href", "/explore?q=%23react");
        expect(links[1]).toHaveTextContent("#react");
        expect(r).toMatchSnapshot();
    });
});