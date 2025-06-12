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

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

jest.mock("../../../../Components/Redux/redux", () => ({
  ...jest.requireActual("../../../../Components/Redux/redux"),
  useAppDispatch: () => () => Promise.resolve({ payload: { data: {
    profileId: "1",
    userId: "1",
    userName: "testuser",
    firstName: "Test",
    lastName: "User",
    pronouns: "they/them",
    bio: "bio",
    link: "https://test.com",
    gender: "Male"
  }}}),
  useAppSelector: jest.fn(fn => fn({
    auth: { user: { id: "1", userName: "testuser" } },
    profile: { profile: { profileId: "1", userId: "1", userName: "testuser", firstName: "Test", lastName: "User", pronouns: "they/them", bio: "bio", link: "https://test.com", gender: "Male" }, nonce: "nonce" },
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
  postUpdateProfileByUserId: jest.fn(() => Promise.resolve({ status: 200 })),
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
    Flex: mockStyled("div"),
    FlexColumn: mockStyled("div"),
    FlexRow: mockStyled("div"),
    Main: mockStyled("main"),
    Section: mockStyled("section"),
    Span: mockStyled("span"),
    ContentWrapper: mockStyled("div"),
  };
});
jest.mock("../../../../Components/Themes/Theme", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));

jest.mock("../../../../Components/Common/ProfileLink", () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="mock-profile-link" {...props} />
}));
jest.mock("../../../../Components/Common/StyledButton", () => ({
  __esModule: true,
  default: (props: any) => <button data-testid="mock-styled-button" {...props}>{props.text}</button>
}));
jest.mock("../../../../Components/Common/StyledInput", () => ({
  __esModule: true,
  default: (props: any) => <input data-testid={`mock-input-${props.name}`} {...props} />
}));
jest.mock("../../../../Components/Common/Lexical/TextEditor", () => ({
  __esModule: true,
  default: (props: any) => <textarea data-testid="mock-text-editor" {...props} />
}));
jest.mock("../../../../Components/Common/EmojiPickerPopup", () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="mock-emoji-picker" {...props} />
}));
jest.mock("../../../Common/PopupDropdownSelector", () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="mock-dropdown">{props.children && props.children()}</div>,
  CustomTextOption: (props: any) => <input data-testid="mock-custom-text-option" {...props} />,
  TextOption: (props: any) => <input data-testid="mock-text-option" {...props} />,
}));
jest.mock("../../../../utils/utils", () => ({
  splitFullName: jest.fn(() => ({ firstName: "Test", middleNames: "", lastName: "User" })),
  validateFullName: jest.fn(() => true),
  validateUrl: jest.fn(() => true),
}));

import React from "react";
import { screen, waitFor } from "@testing-library/react";
import EditProfileContent from "../EditProfileContent";
import { renderWithStore } from "../../../../utils/test-utils";
import '@testing-library/jest-dom';

describe("EditProfileContent", () => {
  it("renders edit profile form and matches snapshot", async () => {
    const r = renderWithStore(<EditProfileContent />);
    expect(r.container).toMatchSnapshot();
  });
});