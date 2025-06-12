// Mocks
jest.mock("styled-components", () => {
  const React = require("react");
  function fakeStyled(BaseComponent = "div") {
    // This is the actual component returned by styled()
    const Styled = React.forwardRef((props, ref) =>
      React.createElement(BaseComponent, { ...props, ref }, props.children)
    );
    // The function that acts as the tagged template
    function templateFn(...args) { return Styled; }
    // .withConfig should return a tagged template function
    templateFn.withConfig = () => templateFn;
    // Also add .withConfig to the component for chained calls
    Styled.withConfig = () => templateFn;
    // Make templateFn callable as a component (for React)
    Object.setPrototypeOf(templateFn, Styled);
    return templateFn;
  }
  // Proxy to handle styled.div, styled.span, styled(AnyComponent), etc.
  const styled = new Proxy(fakeStyled, {
    get: (target, prop) => fakeStyled(prop),
    apply: (target, thisArg, argArray) => fakeStyled(argArray[0])
  });
  return { __esModule: true, styled };
});

jest.mock("../../../../../Components/Common/StyledInput", () => ({
  __esModule: true,
  default: (props: any) => <input data-testid="mock-input" {...props} />
}));
jest.mock("../../../../../Components/Common/StyledButton", () => ({
  __esModule: true,
  default: (props: any) => (
    <button data-testid={props.datatestid} disabled={props.disabled} onClick={props.onClick}>{props.text}</button>
  )
}));
jest.mock("../../../../../api/ServiceController", () => ({
  getAccountsSendVerifyNotification: jest.fn(() => Promise.resolve({})),
  postAccountsAttempt: jest.fn(() => Promise.resolve({ status: 200 })),
}));
jest.mock("react-redux", () => {
  const actual = jest.requireActual("react-redux");
  return {
    ...actual,
    useDispatch: () => jest.fn(),
  };
});
jest.mock("../../../../../Components/Redux/redux", () => ({
  AppDispatch: {},
}));
jest.mock("../../../../../Components/Redux/slices/auth.slice", () => ({
  loginUser: jest.fn(),
}));

jest.mock("../../../../../Components/Themes/Theme", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));


import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmationCodeForm, { ConfirmationCodeFormProps } from "../ConfirmationCodeForm";
import { renderWithStore } from "../../../../../utils/test-utils";
import '@testing-library/jest-dom';

import Theme from "../../../../../Components/Themes/Theme";
console.log("Theme in test file:", Theme);

const defaultProps: ConfirmationCodeFormProps = {
  userName: "testuser",
  fullName: "Test User",
  emailOrPhone: "test@example.com",
  password: "password123",
  confirmationCode: "123456",
  month: 1,
  day: 1,
  year: 2000,
  confirmationCode_valid: true,
  handleFormChange: jest.fn(),
  changePage: jest.fn(),
};

describe("ConfirmationCodeForm", () => {
  it("renders all fields and matches snapshot", () => {
    const r = renderWithStore(<ConfirmationCodeForm {...defaultProps} />);
    expect(screen.getByText("Enter Confirmation Code")).toBeInTheDocument();
    expect(screen.getByTestId("mock-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-signupconfirm")).toBeInTheDocument();
    expect(screen.getByText("Go Back")).toBeInTheDocument();
    expect(r.container).toMatchSnapshot();
  });

  it("disables Next button if confirmationCode_valid is false", () => {
    const r = renderWithStore(<ConfirmationCodeForm {...defaultProps} confirmationCode_valid={false} />);
    expect(screen.getByTestId("submit-signupconfirm")).toBeDisabled();
    expect(r.container).toMatchSnapshot();
  });

  it("calls handleFormChange when input changes", () => {
    const handleFormChange = jest.fn();
    renderWithStore(<ConfirmationCodeForm {...defaultProps} handleFormChange={handleFormChange} />);
    fireEvent.change(screen.getByTestId("mock-input"), { target: { name: "confirmationCode", value: "654321" } });
    expect(handleFormChange).toHaveBeenCalledWith("confirmationCode", "654321", true);
  });

  it("calls changePage(-1) when Go Back is clicked", () => {
    const changePage = jest.fn();
    renderWithStore(<ConfirmationCodeForm {...defaultProps} changePage={changePage} />);
    fireEvent.click(screen.getByText("Go Back"));
    expect(changePage).toHaveBeenCalledWith(-1);
  });

  it("calls resendCode when Resend Code is clicked", () => {
    const { getAccountsSendVerifyNotification } = require("../../../../../api/ServiceController");
    renderWithStore(<ConfirmationCodeForm {...defaultProps} />);
    fireEvent.click(screen.getByText("Resend Code"));
    expect(getAccountsSendVerifyNotification).toHaveBeenCalledWith(defaultProps.emailOrPhone);
  });

  it("calls submitForm when Next is clicked", async () => {
    const { postAccountsAttempt } = require("../../../../../api/ServiceController");
    renderWithStore(<ConfirmationCodeForm {...defaultProps} />);
    fireEvent.click(screen.getByTestId("submit-signupconfirm"));
    // Wait for async effect
    expect(postAccountsAttempt).toHaveBeenCalled();
  });
});