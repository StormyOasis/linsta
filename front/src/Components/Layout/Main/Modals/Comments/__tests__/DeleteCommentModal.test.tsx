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

jest.mock("../../../../../Themes/Theme", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));


jest.mock("../../../../../../api/ServiceController", () => ({
  postDeleteComment: jest.fn(() => Promise.resolve({ status: 200 })),
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

import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import DeleteCommentModal from "../DeleteCommentModal";
import { renderWithStore } from "../../../../../../utils/test-utils";
import '@testing-library/jest-dom';

describe("DeleteCommentModal", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it("renders modal and matches snapshot", async () => {
    const r = renderWithStore(
      <DeleteCommentModal commentId="c1" onClose={onClose} zIndex={100} />
    );
    expect(screen.getByTestId("mock-multistepmodal")).toBeInTheDocument();
    expect(screen.getAllByTestId("mock-styled-link")[0]).toHaveTextContent("Delete Comment");
    expect(screen.getAllByTestId("mock-styled-link")[1]).toHaveTextContent("Cancel");
    expect(r.container).toMatchSnapshot();
  });

  it("calls postDeleteComment and onClose with isCommited true when Delete Comment is clicked", async () => {
    const { postDeleteComment } = require("../../../../../../api/ServiceController");
    postDeleteComment.mockResolvedValue({ status: 200 });
    renderWithStore(<DeleteCommentModal commentId="c1" onClose={onClose} zIndex={100} />);
    fireEvent.click(screen.getAllByTestId("mock-styled-link")[0]);
    await waitFor(() => {
      expect(postDeleteComment).toHaveBeenCalledWith({ commentId: "c1" });
      expect(onClose).toHaveBeenCalledWith({ isCommited: true });
    });
  });

  it("calls onClose with isCommited false when Cancel is clicked", () => {
    renderWithStore(<DeleteCommentModal commentId="c1" onClose={onClose} zIndex={100} />);
    fireEvent.click(screen.getAllByTestId("mock-styled-link")[1]);
    expect(onClose).toHaveBeenCalledWith({ isCommited: false });
  });
});