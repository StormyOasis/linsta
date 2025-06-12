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

jest.mock("../../../../../Common/CombinedStyling", () => {
  const React = require("react");
  const mockStyled = (tag = "div") =>
    Object.assign(
      React.forwardRef((props, ref) => React.createElement(tag, { ...props, ref }, props.children)),
      { styledComponentId: "mock" }
    );
  return {
    Div: mockStyled("div"),
    FlexColumnFullWidth: mockStyled("div"),
    Span: mockStyled("span"),
  };
});

jest.mock("../../../../../Common/MultiStepModal", () => {
    const React = require("react");
    return {
        __esModule: true,
        default: (props: any) => {
            const Step = props.steps[0].element;
            return (
                <div data-testid="mock-multistepmodal">
                    {React.cloneElement(Step, props.steps[0])}
                    <button data-testid="mock-next" onClick={props.steps[0].onNext}>Next</button>
                </div>
            );
        }
    };
});

jest.mock("../../CreatePost/CreatePostModalFinal", () => ({
    __esModule: true,
    default: (props: any) => (
        <div data-testid="mock-createpostmodalfinal" {...props}>
            <button data-testid="mock-submit" onClick={() => props.onSubmit && props.onSubmit()}>Submit</button>
        </div>
    )
}));

jest.mock("../../../../../../utils/utils", () => ({
    isVideoFileFromType: jest.fn(() => false),
    updatePostFields: jest.fn((post, fields, onClose) => onClose({ isCommited: true, post, fields })),
}));

jest.mock("../../../../../Themes/Theme", () => ({
    __esModule: true,
    default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));


import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import EditPostModal from "../EditPostModal";
import { renderWithStore } from "../../../../../../utils/test-utils";
import '@testing-library/jest-dom';

const mockPost = {
    postId: "p1",
    media: [
        { id: "m1", mimeType: "image/png", path: "/img1.png", altText: "alt1" },
        { id: "m2", mimeType: "image/png", path: "/img2.png", altText: "alt2" }
    ],
    global: {
        captionText: "caption",
        locationText: "location",
        collaborators: {},
        showCollaborators: false,
        showLocation: false,
        showUserName: true,
        showPfp: false,
        showFullName: false,
        commentsDisabled: false,
        likesDisabled: false,
        commentCount: 0,
        dateTime: "2024-01-01T00:00:00Z"
    }
};

describe("EditPostModal", () => {
    const onClose = jest.fn();

    beforeEach(() => {
        onClose.mockClear();
    });

    it("renders modal and matches snapshot", () => {
        const r = renderWithStore(
            <EditPostModal post={mockPost as any} onClose={onClose} zIndex={100} />
        );
        expect(screen.getByTestId("mock-multistepmodal")).toBeInTheDocument();
        expect(screen.getByTestId("mock-createpostmodalfinal")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("calls onClose with isCommited true when submitEditPost is triggered", async () => {
        const r = renderWithStore(<EditPostModal post={mockPost as any} onClose={onClose} zIndex={100} />);
        fireEvent.click(screen.getByTestId("mock-next"));
        const { updatePostFields } = require("../../../../../../utils/utils");
        await waitFor(() => {
            expect(updatePostFields).toHaveBeenCalled();
            expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ isCommited: true }));
        });
        expect(r).toMatchSnapshot();
    });
});