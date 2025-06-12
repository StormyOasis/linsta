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

jest.mock("../../../../../../api/ServiceController", () => ({
  postDeletePost: jest.fn(() => Promise.resolve({ status: 200 })),
}));

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

jest.mock("../../../../../Common/StyledLink", () => ({
  __esModule: true,
  default: (props: any) => <a data-testid="mock-styled-link" {...props}>{props.children}</a>
}));

jest.mock("../../../../../Common/MultiStepModal", () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="mock-multistepmodal">{props.steps[0].element}</div>
}));

jest.mock("../../../../../../utils/utils", () => ({
  updatePost: jest.fn(),
  updatePostFields: jest.fn((post, fields, onClose) => onClose({ isCommited: false, post, fields })),
}));

jest.mock("../../../../../Redux/redux", () => ({
  ...jest.requireActual("../../../../../Redux/redux"),
  useAppDispatch: () => jest.fn(),
  actions: {
    modalActions: {
      openModal: jest.fn()
    }
  }
}));

jest.mock("../../../../../Themes/Theme", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));



import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import EditPostMenuModal from "../EditPostMenuModal";
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
    likesDisabled: false,
    commentCount: 0,
    dateTime: "2024-01-01T00:00:00Z"
  }
};

describe("EditPostMenuModal", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it("renders modal and matches snapshot", () => {
    const r = renderWithStore(
      <EditPostMenuModal post={mockPost as any} onClose={onClose} zIndex={100} />
    );
    expect(screen.getByTestId("mock-multistepmodal")).toBeInTheDocument();
    expect(screen.getAllByTestId("mock-styled-link")[0]).toHaveTextContent("Delete Post");
    expect(screen.getAllByTestId("mock-styled-link")[1]).toHaveTextContent("Edit");
    expect(r.container).toMatchSnapshot();
  });

  it("calls postDeletePost and onClose with isCommited true when Delete Post is clicked", async () => {
    const { postDeletePost } = require("../../../../../../api/ServiceController");
    postDeletePost.mockResolvedValue({ status: 200 });
    renderWithStore(<EditPostMenuModal post={mockPost as any} onClose={onClose} zIndex={100} />);
    fireEvent.click(screen.getAllByTestId("mock-styled-link")[0]);
    await waitFor(() => {
      expect(postDeletePost).toHaveBeenCalledWith({ postId: "p1" });
      expect(onClose).toHaveBeenCalledWith({ isCommited: true, post: mockPost, isDeleted: true });
    });
  });

  it("calls onClose with isCommited false when Cancel is clicked", () => {
    renderWithStore(<EditPostMenuModal post={mockPost as any} onClose={onClose} zIndex={100} />);
    fireEvent.click(screen.getAllByTestId("mock-styled-link")[4]);
    expect(onClose).toHaveBeenCalledWith({ isCommited: false });
  });

  it("calls onClose with isCommited false and opens edit modal when Edit is clicked", () => {
    const { actions } = require("../../../../../Redux/redux");
    renderWithStore(<EditPostMenuModal post={mockPost as any} onClose={onClose} zIndex={100} />);
    fireEvent.click(screen.getAllByTestId("mock-styled-link")[1]);
    expect(actions.modalActions.openModal).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith({ isCommited: false });
  });

  it("calls updatePostFields and onClose when toggling like count", () => {
    const { updatePostFields } = require("../../../../../../utils/utils");
    renderWithStore(<EditPostMenuModal post={mockPost as any} onClose={onClose} zIndex={100} />);
    fireEvent.click(screen.getAllByTestId("mock-styled-link")[2]);
    expect(updatePostFields).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("calls updatePostFields and onClose when toggling commenting", () => {
    const { updatePostFields } = require("../../../../../../utils/utils");
    renderWithStore(<EditPostMenuModal post={mockPost as any} onClose={onClose} zIndex={100} />);
    fireEvent.click(screen.getAllByTestId("mock-styled-link")[3]);
    expect(updatePostFields).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});