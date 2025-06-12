jest.mock("styled-components", () => {
    const React = require("react");
    function fakeStyled(BaseComponent = "div") {
        const Styled = React.forwardRef((props, ref) =>
            React.createElement(BaseComponent, { ...props, ref }, props.children)
        );
        function templateFn(...args) { return Styled; }
        templateFn.withConfig = () => templateFn;
        Styled.withConfig = () => templateFn;
        Object.setPrototypeOf(templateFn, Styled);
        return templateFn;
    }
    const styled = new Proxy(fakeStyled, {
        get: (target, prop) => fakeStyled(prop),
        apply: (target, thisArg, argArray) => fakeStyled(argArray[0])
    });
    return { __esModule: true, styled, default: styled };
});

jest.mock("react-redux", () => {
    const actual = jest.requireActual("react-redux");
    const mockDispatch = jest.fn();
    mockDispatch.withTypes = () => mockDispatch;
    const useDispatch = () => mockDispatch;
    useDispatch.withTypes = () => useDispatch;
    const useSelector = jest.fn();
    useSelector.withTypes = () => useSelector;
    return {
        ...actual,
        useDispatch,
        useSelector,
    };
});

jest.mock("../../../../../Redux/redux", () => ({
    ...jest.requireActual("../../../../../Redux/redux"),
    useAppDispatch: () => jest.fn(),
    useAppSelector: jest.fn(fn => fn({
        auth: { user: { id: "1", userName: "testuser" } },
        profile: { profile: { profileId: "1", userId: "1", userName: "testuser", firstName: "Test", lastName: "User", pronouns: "they/them", bio: "bio", link: "https://test.com", gender: "Male", pfp: "pfp.png" }, nonce: "nonce" },
        modal: { openModalStack: [] },
        misc: { deletedCommentId: null, deletedPostId: null, updatedPost: null }
    })),
    actions: {
        modalActions: {
            openModal: jest.fn(),
            updateModalData: jest.fn()
        }
    }
}));

jest.mock("../../../../../../api/ServiceController", () => ({
    postGetCommentsByPostId: jest.fn(() => Promise.resolve({ data: [] })),
    postAddComment: jest.fn(() => Promise.resolve({ status: 200, data: { id: "c1" } })),
    postToggleLike: jest.fn(() => Promise.resolve({ status: 200 })),
}));

jest.mock("../../../../../Common/CombinedStyling", () => {
    const React = require("react");
    const mockStyled = (tag = "div") =>
        Object.assign(
            React.forwardRef((props, ref) => React.createElement(tag, { ...props, ref }, props.children)),
            { styledComponentId: "mock" }
        );
    return {
        BoldLink: mockStyled("a"),
        Div: mockStyled("div"),
        Flex: mockStyled("div"),
        FlexColumn: mockStyled("div"),
        FlexColumnFullWidth: mockStyled("div"),
        FlexRow: mockStyled("div"),
        FlexRowFullWidth: mockStyled("div"),
        Span: mockStyled("span"),
    };
});

jest.mock("../../../../../Common/MediaSlider", () => ({
    __esModule: true,
    default: (props: any) => <div data-testid="mock-media-slider" {...props} />
}));
jest.mock("../../../../../Common/ProfileLink", () => ({
    __esModule: true,
    default: (props: any) => <div data-testid="mock-profile-link" {...props} />
}));
jest.mock("../../../../../Common/EmojiPickerPopup", () => ({
    __esModule: true,
    default: (props: any) => <div data-testid="mock-emoji-picker" {...props} />
}));
jest.mock("../../../../../Common/StyledLink", () => ({
    __esModule: true,
    default: (props: any) => <a data-testid="mock-styled-link" {...props}>{props.children}</a>
}));
jest.mock("../../../../../Common/Linkify", () => ({
    __esModule: true,
    default: (props: any) => <span data-testid="mock-linkify">{props.html}</span>
}));
jest.mock("../../../../../Common/Likes", () => ({
    LikeToggler: (props: any) => <button data-testid="mock-like-toggler" {...props} />,
    ViewLikesText: (props: any) => <span data-testid="mock-view-likes-text" {...props} />
}));
jest.mock("../../../../../Common/Icon", () => ({
    MessageSVG: (props: any) => <svg data-testid="mock-message-svg" {...props} />,
    ShareSVG: (props: any) => <svg data-testid="mock-share-svg" {...props} />,
}));
jest.mock("../../../../../../utils/utils", () => ({
    dateDiff: jest.fn(() => "1d"),
    getDateAsText: jest.fn(() => "Today"),
    getSanitizedText: jest.fn((text: string) => [text]),
    isPostLiked: jest.fn(() => false),
    togglePostLikedState: jest.fn((userName, userId, post) => post),
    isCommentLiked: jest.fn(() => false),
    toggleCommentLike: jest.fn(() => Promise.resolve()),
    toggleCommentReplyUiData: jest.fn((commentUiData, comments) => comments),
    searchCommentsById: jest.fn(() => null),
}));
jest.mock("../../../../../Common/MultiStepModal", () => ({
    __esModule: true,
    default: (props: any) => <div data-testid="mock-multistepmodal">{props.steps[0].element}</div>
}));
jest.mock("../../../../../Themes/Theme", () => ({
    __esModule: true,
    default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));

import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import CommentsModal from "../CommentsModal";
import { renderWithStore } from "../../../../../../utils/test-utils";
import '@testing-library/jest-dom';

const mockPost = {
    postId: "p1",
    user: { userName: "testuser", userId: "1", pfp: "pfp.png" },
    media: [],
    global: {
        collaborators: {},
        locationText: "",
        showCollaborators: false,
        showLocation: false,
        showUserName: true,
        showPfp: false,
        showFullName: false,
        captionText: "caption",
        commentsDisabled: false,
        commentCount: 0,
        dateTime: "2024-01-01T00:00:00Z"
    }
};

// ...existing code...

describe("CommentsModal", () => {
    it("renders modal and matches snapshot", async () => {
        const r = renderWithStore(
            <CommentsModal post={mockPost as any} onClose={jest.fn()} zIndex={100} />
        );
        expect(r.container).toMatchSnapshot();
    });

    it("renders profile link, media slider, and like toggler", async () => {
        const r = renderWithStore(
            <CommentsModal post={mockPost as any} onClose={jest.fn()} zIndex={100} />
        );
        const profileLinks = screen.getAllByTestId("mock-profile-link");
        expect(profileLinks.length).toBeGreaterThan(0);
        expect(screen.getByTestId("mock-media-slider")).toBeInTheDocument();
        expect(screen.getByTestId("mock-like-toggler")).toBeInTheDocument();
        expect(screen.getByTestId("mock-view-likes-text")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders theme and multistep modal", async () => {
        const r = renderWithStore(
            <CommentsModal post={mockPost as any} onClose={jest.fn()} zIndex={100} />
        );
        expect(screen.getByTestId("mock-theme")).toBeInTheDocument();
        expect(screen.getByTestId("mock-multistepmodal")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders message and share icons", async () => {
        const r = renderWithStore(
            <CommentsModal post={mockPost as any} onClose={jest.fn()} zIndex={100} />
        );
        expect(screen.getByTestId("mock-message-svg")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders linkify and emoji picker", async () => {
        const r = renderWithStore(
            <CommentsModal post={mockPost as any} onClose={jest.fn()} zIndex={100} />
        );
        expect(screen.getByTestId("mock-linkify")).toBeInTheDocument();
        expect(screen.getByTestId("mock-emoji-picker")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders styled link", async () => {
        const r = renderWithStore(
            <CommentsModal post={mockPost as any} onClose={jest.fn()} zIndex={100} />
        );
        fireEvent.change(screen.getByLabelText("Add a new comment..."), { target: { value: "Hello" } });
        expect(screen.getByTestId("mock-styled-link")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("submits a comment when Post is clicked", async () => {
        const { postAddComment } = require("../../../../../../api/ServiceController");
        postAddComment.mockResolvedValue({ status: 200, data: { id: "newid" } });

        const r = renderWithStore(
            <CommentsModal post={mockPost as any} onClose={jest.fn()} zIndex={100} />
        );
        fireEvent.change(screen.getByLabelText("Add a new comment..."), { target: { value: "Hello" } });
        fireEvent.click(screen.getByTestId("mock-styled-link"));
        expect(postAddComment).toHaveBeenCalledWith(expect.objectContaining({ text: "Hello" }));
        expect(r.container).toMatchSnapshot();
    }); 
    
    it("submits a comment when Enter is pressed", async () => {
        const { postAddComment } = require("../../../../../../api/ServiceController");
        postAddComment.mockResolvedValue({ status: 200, data: { id: "newid" } });

        const r = renderWithStore(
            <CommentsModal post={mockPost as any} onClose={jest.fn()} zIndex={100} />
        );
        const textarea = screen.getByLabelText("Add a new comment...");
        fireEvent.change(textarea, { target: { value: "Hello" } });
        fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });
        expect(postAddComment).toHaveBeenCalledWith(expect.objectContaining({ text: "Hello" }));
        expect(r.container).toMatchSnapshot();
    });    
    it("adds emoji to comment text when emoji is picked", () => {
        const r = renderWithStore(
            <CommentsModal post={mockPost as any} onClose={jest.fn()} zIndex={100} />
        );
        fireEvent.change(screen.getByLabelText("Add a new comment..."), { target: { value: "Hi" } });
        fireEvent.click(screen.getByTestId("mock-emoji-picker"), { target: { emoji: { emoji: "😀" } } });
        expect(r.container).toMatchSnapshot();
    });
    it("shows 'No Comments Yet' when there are no comments", () => {
        const r = renderWithStore(
            <CommentsModal post={{ ...mockPost, global: { ...mockPost.global, commentCount: 0 } } as any} onClose={jest.fn()} zIndex={100} />
        );
        expect(screen.getByText("No Comments Yet")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });          
});