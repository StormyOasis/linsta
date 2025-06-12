import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { ViewLikesText, LikeToggler } from "../Likes";
import { HOST } from "../../../api/config";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

jest.mock("../../../api/config", () => ({
    HOST: "http://localhost"
}));

jest.mock("../Icon", () => ({
    HeartFilledSVG: (props: any) => <svg data-testid="heart-filled" {...props} />,
    HeartSVG: (props: any) => <svg data-testid="heart-outline" {...props} />,
}));

describe("ViewLikesText", () => {
    const basePost = {
        user: { userId: "1", userName: "alice" },
        global: {
            likes: [{ userName: "bob", userId: "2" }],
            likesDisabled: false
        }
    };

    it("renders null if no likes", () => {
        const post = { ...basePost, global: { ...basePost.global, likes: [] } };
        const r = renderWithStore(<ViewLikesText post={post as any} handleClick={jest.fn()} />);
        expect(r).toMatchSnapshot();
    });

    it("renders null if likesDisabled and not post owner", () => {
        const post = { ...basePost, global: { ...basePost.global, likesDisabled: true } };
        const r = renderWithStore(<ViewLikesText post={post as any} authUserId="not-owner" handleClick={jest.fn()} />);
        expect(r).toMatchSnapshot();
    });

    it("renders likes text with single liker", () => {
        const r = renderWithStore(<ViewLikesText post={basePost as any} handleClick={jest.fn()} />);
        expect(screen.getByText(/Liked by/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "bob" })).toHaveAttribute("href", `${HOST}/bob`);
        expect(screen.queryByText(/and/)).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("renders likes text with multiple likers and calls handleClick", () => {
        const handleClick = jest.fn();
        const post = {
            ...basePost,
            global: {
                ...basePost.global,
                likes: [
                    { userName: "bob", userId: "2" },
                    { userName: "carol", userId: "3" }
                ]
            }
        };
        const r = renderWithStore(<ViewLikesText post={post as any} handleClick={handleClick} />);
        expect(screen.getByText(/Liked by/i)).toBeInTheDocument();
        expect(screen.getByText(/and/)).toBeInTheDocument();
        const othersLink = screen.getByText("others");
        fireEvent.click(othersLink);
        expect(handleClick).toHaveBeenCalledWith(post);
        expect(r).toMatchSnapshot();
    });
});

describe("LikeToggler", () => {
    it("renders HeartFilledSVG when isLiked is true", () => {
        const r = renderWithStore(<LikeToggler isLiked={true} handleClick={jest.fn()} />);
        expect(screen.getByTestId("heart-filled")).toBeInTheDocument();
        expect(screen.queryByTestId("heart-outline")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("renders HeartSVG when isLiked is false", () => {
        const r = renderWithStore(<LikeToggler isLiked={false} handleClick={jest.fn()} />);
        expect(screen.getByTestId("heart-outline")).toBeInTheDocument();
        expect(screen.queryByTestId("heart-filled")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("calls handleClick when clicked", () => {
        const handleClick = jest.fn();
        const r = renderWithStore(<LikeToggler isLiked={false} handleClick={handleClick} />);
        fireEvent.click(screen.getByTestId("heart-outline").parentElement!);
        expect(handleClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("applies custom width, height, and offsetIndex", () => {
        const r = renderWithStore(<LikeToggler isLiked={false} width="40px" height="50px" offsetIndex={2} handleClick={jest.fn()} />);
        const container = screen.getByTestId("heart-outline").parentElement!;
        expect(container).toHaveStyle("width: 40px");
        expect(container).toHaveStyle("height: 50px");
        expect(container).toHaveStyle("transform: translateX(50px)");
        expect(r).toMatchSnapshot();
    });
});