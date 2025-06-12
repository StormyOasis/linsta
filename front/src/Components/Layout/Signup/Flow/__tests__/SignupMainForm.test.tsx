import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import SignupMainForm, { SignupMainFormProps } from "../SignupMainForm";
import { renderWithStore } from "../../../../../utils/test-utils";
import '@testing-library/jest-dom';

// Mocks
jest.mock("react-redux", () => {
  const actual = jest.requireActual("react-redux");
  return {
    ...actual,
    useDispatch: () => jest.fn(),
  };
});
jest.mock("../../../../Common/CombinedStyling", () => ({
  __esModule: true,
  Div: (props: any) => <div data-testid="mock-div" {...props} />,
  Span: (props: any) => <span data-testid="mock-span" {...props} />,
  default: {
    signupFormDiv1: "signupFormDiv1",
    signupIntroSpan: "signupIntroSpan",
    termsDiv: "termsDiv",
  },
}));
jest.mock("../../../../Themes/Theme", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));
jest.mock("../../../../Common/StyledInput", () => ({
  __esModule: true,
  default: (props: any) => <input data-testid={`mock-input-${props.name}`} {...props} />
}));
jest.mock("../../../../Common/StyledButton", () => ({
  __esModule: true,
  default: (props: any) => (
    <button data-testid={props.datatestid} disabled={props.disabled} onClick={props.onClick}>{props.text}</button>
  )
}));
jest.mock("../../../../Common/LargeLogo", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-logo" />
}));
jest.mock("../../../../../api/ServiceController", () => ({
  postAccountsAttempt: jest.fn(() => Promise.resolve({ statusText: "OK" })),
  getAccountsCheckUserUnique: jest.fn(() => Promise.resolve({ data: false })),
}));
jest.mock("../../../../../utils/utils", () => ({
  validateEmailPhone: jest.fn(() => true),
  validateFullName: jest.fn(() => true),
  validatePassword: jest.fn(() => true),
}));

const defaultProps: SignupMainFormProps = {
  emailOrPhone: "test@example.com",
  fullName: "Test User",
  userName: "testuser",
  password: "password123",
  emailOrPhone_valid: true,
  fullName_valid: true,
  userName_valid: true,
  password_valid: true,
  changePage: jest.fn(),
  handleFormChange: jest.fn(),
};

describe("SignupMainForm", () => {
  it("renders all fields and matches snapshot", () => {
    const r = renderWithStore(<SignupMainForm {...defaultProps} />);
    expect(screen.getByTestId("mock-logo")).toBeInTheDocument();
    expect(screen.getByTestId("mock-input-emailOrPhone")).toBeInTheDocument();
    expect(screen.getByTestId("mock-input-fullName")).toBeInTheDocument();
    expect(screen.getByTestId("mock-input-userName")).toBeInTheDocument();
    expect(screen.getByTestId("mock-input-password")).toBeInTheDocument();
    expect(screen.getByTestId("submit-signupmain")).toBeInTheDocument();
    expect(r.container).toMatchSnapshot();
  });

  it("disables Sign Up button if form is invalid", () => {
    const r = renderWithStore(
      <SignupMainForm {...defaultProps} emailOrPhone_valid={false} />
    );
    expect(screen.getByTestId("submit-signupmain")).toBeDisabled();
    expect(r.container).toMatchSnapshot();
  });

  it("calls handleFormChange on input change", () => {
    const handleFormChange = jest.fn();
    renderWithStore(<SignupMainForm {...defaultProps} handleFormChange={handleFormChange} />);
    fireEvent.change(screen.getByTestId("mock-input-fullName"), { target: { name: "fullName", value: "New Name" } });
    expect(handleFormChange).toHaveBeenCalled();
  });

  it("calls handleFormChange and debounce on username change", async () => {
    const handleFormChange = jest.fn();
    renderWithStore(<SignupMainForm {...defaultProps} handleFormChange={handleFormChange} />);
    fireEvent.change(screen.getByTestId("mock-input-userName"), { target: { name: "userName", value: "newuser" } });
    // Wait for debounce
    await waitFor(() => {
      expect(handleFormChange).toHaveBeenCalled();
    });
  });

  it("calls changePage(1) on successful submit", async () => {
    const changePage = jest.fn();
    renderWithStore(<SignupMainForm {...defaultProps} changePage={changePage} />);
    fireEvent.click(screen.getByTestId("submit-signupmain"));
    await waitFor(() => {
      expect(changePage).toHaveBeenCalledWith(1);
    });
  });
});