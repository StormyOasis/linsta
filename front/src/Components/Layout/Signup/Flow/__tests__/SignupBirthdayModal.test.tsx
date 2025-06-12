import React from "react";
import { screen } from "@testing-library/react";
import { renderWithStore } from "../../../../../utils/test-utils";
import { SignupBirthdayModal } from "../SignupBirthdayModal";
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
}));
jest.mock("../../../../Common/MultiStepModal", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: (props: any) => (
      <div data-testid="mock-multistepmodal">
        {props.steps[0].element}
        <button data-testid="close-btn" onClick={props.onClose}>Close</button>
      </div>
    ),
    ModalContentWrapper: (props: any) => <div data-testid="mock-content-wrapper" {...props} />,
    ModalSectionWrapper: (props: any) => <div data-testid="mock-section-wrapper" {...props} />,
  };
});

describe("SignupBirthdayModal", () => {
  const defaultProps = {
    onClose: jest.fn(),
    zIndex: 100,
  };

  it("renders modal content and matches snapshot", () => {
    const r = renderWithStore(<SignupBirthdayModal {...defaultProps} />);
    expect(screen.getByText("Birthdays on Linstagram")).toBeInTheDocument();
    expect(r.container).toMatchSnapshot();
  });

  it("calls onClose when close button is clicked", () => {
    renderWithStore(<SignupBirthdayModal {...defaultProps} />);
    screen.getByTestId("close-btn").click();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});