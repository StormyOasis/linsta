import React from "react";
import { screen, fireEvent, act } from "@testing-library/react";
import ExploreContent from "../ExploreContent";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../../utils/test-utils';
import { useAppDispatch } from "../../../../Components/Redux/redux";

const mockDispatch = jest.fn();

// Mocks for dependencies
jest.mock("../../../../Components/Common/LoadingImage", () => () => <div data-testid="loading-image" />);
jest.mock("../../../../api/ServiceController", () => ({
    getSearch: jest.fn(),
}));
jest.mock("../../../../utils/useInfiniteScroll", () => jest.fn());
jest.mock("../../../../Components/Redux/redux", () => ({
    actions: {
        modalActions: {
            openModal: jest.fn(),
        },
    },
    useAppDispatch: jest.fn(() => mockDispatch),
    useAppSelector: jest.fn(fn => fn({ auth: { user: { id: "user1" } } })),
}));
jest.mock("../../../../utils/utils", () => ({
    isVideoFileFromPath: (path: string) => path.endsWith(".mp4"),
}));

// Mock SVGs
jest.mock("../../../../Components/Common/Icon", () => ({
    HeartFilledSVG: (props: any) => <svg data-testid="heart-svg" {...props} />,
    MessageSVG: (props: any) => <svg data-testid="message-svg" {...props} />,
}));

// Mock useSearchParams
const mockSearchParams = {
    get: jest.fn(),
};
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useSearchParams: () => [mockSearchParams],
}));

describe("ExploreContent", () => {
    beforeEach(() => {
        mockDispatch.mockClear();
        (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
        jest.clearAllMocks();
        mockSearchParams.get.mockReturnValue("cats");
        require("../../../../api/ServiceController").getSearch.mockResolvedValue({
            data: {
                q: "cats",
                posts: [
                    {
                        media: [{ id: "1", path: "cat.jpg", altText: "cat pic" }],
                        global: { likes: [1, 2], likesDisabled: false, commentsDisabled: false, commentCount: 3 },
                        user: { userId: "user1" }
                    },
                    {
                        media: [{ id: "2", path: "cat.mp4", altText: "cat video" }],
                        global: { likes: [], likesDisabled: false, commentsDisabled: false, commentCount: 0 },
                        user: { userId: "user2" }
                    }
                ]
            }
        });
    });

    it("renders loading image", async () => {
        const r = renderWithStore(<ExploreContent />);
        expect(screen.getByTestId("loading-image")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("renders posts after fetching", async () => {
        let r = null;
        await act(async () => {
            r = renderWithStore(<ExploreContent />);
        });
        expect(screen.getByText("cats")).toBeInTheDocument();
        expect(screen.getAllByRole("img", { hidden: true }).length).toBeGreaterThan(0);
        expect(r).toMatchSnapshot();
    });

    it("shows 'No results found' if posts are empty", async () => {
        require("../../../../api/ServiceController").getSearch.mockResolvedValueOnce({
            data: { q: "cats", posts: [] }
        });
        let r = null;
        await act(async () => {
            r = renderWithStore(<ExploreContent />);
        });
        expect(screen.getByText("No results found for term:")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("shows overlay with like and comment count on hover", async () => {
        let r = null;
        await act(async () => {
            r = renderWithStore(<ExploreContent />);
        });
        const gridImages = screen.getAllByRole("img", { hidden: true });
        fireEvent.mouseEnter(gridImages[0].parentElement!);
        expect(screen.getByTestId("heart-svg")).toBeInTheDocument();
        expect(screen.getByTestId("message-svg")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument(); // likes
        expect(screen.getByText("3")).toBeInTheDocument(); // comments
        expect(r).toMatchSnapshot();
    });

    it("dispatches openModal when image is clicked", async () => {
        let r = null;
        const dispatch = jest.fn();
        require("../../../../Components/Redux/redux").useAppDispatch.mockReturnValue(dispatch);
        await act(async () => {
            r = renderWithStore(<ExploreContent />);
        });
        const gridImages = screen.getAllByRole("img", { hidden: true });
        fireEvent.click(gridImages[0].parentElement!);
        expect(dispatch).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });
});