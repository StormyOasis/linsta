jest.mock("../../../../Components/Themes/Theme", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));

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
    // Create a dispatch function with .withTypes attached
    const mockDispatch = jest.fn();
    mockDispatch.withTypes = () => mockDispatch;
    // useDispatch returns the dispatch function
    const useDispatch = () => mockDispatch;
    // Attach .withTypes to useDispatch itself for compatibility
    useDispatch.withTypes = () => useDispatch;
    // useSelector mock
    const useSelector = jest.fn();
    useSelector.withTypes = () => useSelector;
    return {
        ...actual,
        useDispatch,
        useSelector,
    };
});
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    Link: (props: any) => <a data-testid="mock-link" {...props}>{props.children}</a>,
    useNavigate: () => jest.fn(),
    useParams: () => ({}),
}));

jest.mock("../../../../Components/Redux/redux", () => ({
    ...jest.requireActual("../../../../Components/Redux/redux"),
    useAppDispatch: () => jest.fn(),
    useAppSelector: jest.fn(fn => fn({
        auth: { user: { id: "1", userName: "testuser" } },
        profile: { profile: { profileId: "1", userId: "1", userName: "testuser", firstName: "Test", lastName: "User", pronouns: "they/them", bio: "bio", link: "https://test.com" }, nonce: "nonce" },
        modal: { openModalStack: [] },
        misc: { deletedCommentId: null, deletedPostId: null, updatedPost: null }
    })),
    actions: {
        modalActions: {
            openModal: jest.fn()
        }
    }
}));
jest.mock("../../../../api/ServiceController", () => ({
    postGetProfileByUserName: jest.fn(() => Promise.resolve({ data: { userId: "1", userName: "testuser", firstName: "Test", lastName: "User", pronouns: "they/them", bio: "bio", link: "https://test.com", profileId: "1" } })),
    postGetProfileStatsById: jest.fn(() => Promise.resolve({ data: { postCount: 2, followerCount: 3, followingCount: 4 } })),
    postGetPostsByUserId: jest.fn(() => Promise.resolve({ data: { posts: [], done: true } })),
    postGetPostByPostId: jest.fn(() => Promise.resolve({ data: { post: { postId: "p1", global: { commentCount: 0 } } } })),
    postGetSingleFollowStatus: jest.fn(() => Promise.resolve({ data: false })),
}));
jest.mock("../../../../utils/utils", () => ({
    followUser: jest.fn(() => Promise.resolve(true)),
    getPfpFromProfile: jest.fn(() => "pfp.png"),
    isVideoFileFromPath: jest.fn(() => false),
}));
jest.mock("../../../../Components/Common/CombinedStyling", () => {
    const React = require("react");
    const mockStyled = (tag = "div") =>
        Object.assign(
            React.forwardRef((props, ref) => React.createElement(tag, { ...props, ref }, props.children)),
            { styledComponentId: "mock" }
        );
    return {
        Div: mockStyled("div"),
        FlexColumn: mockStyled("div"),
        Span: mockStyled("span"),
        FlexRow: mockStyled("div"),
        FlexRowFullWidth: mockStyled("div"),
        Main: mockStyled("main"),
        Section: mockStyled("section"),
        Flex: mockStyled("div"),
        ContentWrapper: mockStyled("div")
    };
});

jest.mock("../../../../Components/Common/StyledButton", () => ({
    __esModule: true,
    default: (props: any) => <button data-testid="mock-styled-button" {...props}>{props.text}</button>
}));
jest.mock("../../../../Components/Common/StyledLink", () => ({
    __esModule: true,
    default: (props: any) => <a data-testid="mock-styled-link" {...props}>{props.children}</a>
}));
jest.mock("../../../../Components/Common/LoadingImage", () => ({
    __esModule: true,
    default: (props: any) => <div data-testid="mock-loading-image" {...props} />
}));
jest.mock("../../../../Components/Common/Linkify", () => ({
    __esModule: true,
    default: (props: any) => <span data-testid="mock-linkify">{props.html}</span>
}));
jest.mock("../../../../Components/Common/Icon", () => ({
    HeartFilledSVG: (props: any) => <svg data-testid="mock-heart" {...props} />,
    MessageSVG: (props: any) => <svg data-testid="mock-message" {...props} />,
    XSVG: (props: any) => <svg data-testid="mock-xsvg" {...props} />,
    BackArrowSVG: (props: any) => <svg data-testid="mock-backarrow" {...props} />,
}));
jest.mock("../../../../utils/useInfiniteScroll", () => jest.fn());

import React from "react";
import { screen, waitFor } from "@testing-library/react";
import ProfileContent from "../ProfileContent";
import { renderWithStore } from "../../../../utils/test-utils";
import '@testing-library/jest-dom';

describe("ProfileContent", () => {
    it("renders profile content and matches snapshot", async () => {
        const r = renderWithStore(<ProfileContent />);

        expect(r.container).toMatchSnapshot();
    });
});