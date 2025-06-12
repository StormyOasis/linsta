import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import SearchResultItem from "../SearchResultsItem";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Mock dependencies
jest.mock("../ProfilePicMemo", () => (props: any) => (
    <img data-testid="profile-pic" alt={`${props.profile.userName}'s profile picture`} />
));
jest.mock("../Icon", () => ({
    HashtagSVG: (props: any) => <svg data-testid="hashtag-svg" {...props} />,
    SearchSVG: (props: any) => <svg data-testid="search-svg" {...props} />,
    XSVG: (props: any) => <svg data-testid="x-svg" {...props} />,
}));
jest.mock("../../../utils/utils", () => ({
    isHashtag: (text: string) => text.startsWith("#"),
}));
jest.mock("../StyledLink", () => (props: any) => (
    <a data-testid="styled-link" onClick={props.onClick} style={props.styleOverride}>{props.children}</a>
));

describe("SearchResultItem", () => {
    const profile = {
        userName: "alice",
        firstName: "Alice",
        lastName: "Smith",
        pfp: "/alice.jpg",
        profileId: "12345",
        userId: "4444",
    };

    it("renders a profile result with profile pic and user info", () => {
        const r = renderWithStore(<SearchResultItem item={profile} />);
        expect(screen.getByTestId("profile-pic")).toBeInTheDocument();
        expect(screen.getByText("alice")).toBeInTheDocument();
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
        // Should link to /alice
        expect(screen.getByRole("link", { name: "/alice" })).toHaveAttribute("href", "/alice");
        expect(r).toMatchSnapshot();
    });

    it("renders a hashtag result with HashtagSVG", () => {
        const r = renderWithStore(<SearchResultItem item="#reactjs" />);
        expect(screen.getByTestId("hashtag-svg")).toBeInTheDocument();
        expect(screen.getByText("#reactjs")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "/explore?q=%23reactjs" })).toHaveAttribute(
            "href",
            "/explore?q=%23reactjs"
        );
        expect(r).toMatchSnapshot();
    });

    it("renders a plain string result with SearchSVG", () => {
        const r = renderWithStore(<SearchResultItem item="hello" />);
        expect(screen.getByTestId("search-svg")).toBeInTheDocument();
        expect(screen.getByText("hello")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "/explore?q=hello" })).toHaveAttribute(
            "href",
            "/explore?q=hello"
        );
        expect(r).toMatchSnapshot();
    });

    it("calls onClick when result is clicked", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(<SearchResultItem item={profile} onClick={handleClick} />);
        fireEvent.click(screen.getByRole("link", { name: "/alice" }));
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("renders remove button and calls onRemove when clicked", () => {
        const handleRemove = jest.fn();
        const r = renderWithStore(<SearchResultItem item={profile} onRemove={handleRemove} />);
        const removeBtn = screen.getByTestId("styled-link");
        fireEvent.click(removeBtn);
        expect(handleRemove).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });
});