jest.mock("styled-components", () => {
  const React = require("react");
  function fakeStyled(BaseComponent = "div") {
    const Styled = React.forwardRef((props, ref) =>
      React.createElement(BaseComponent, { ...props, ref }, props.children)
    );
    function templateFn(...args) { return Styled; }
    templateFn.withConfig = () => templateFn;
    Object.setPrototypeOf(templateFn, Styled);
    Styled.withConfig = () => Styled;
    return templateFn;
  }
  fakeStyled.div = fakeStyled("div");
  fakeStyled.span = fakeStyled("span");
  fakeStyled.a = fakeStyled("a");
  fakeStyled.header = fakeStyled("header");
  fakeStyled.main = fakeStyled("main");
  fakeStyled.section = fakeStyled("section");
  fakeStyled.footer = fakeStyled("footer");
  fakeStyled.select = fakeStyled("select");
  fakeStyled.button = fakeStyled("button");
  return { __esModule: true, styled: fakeStyled };
});

jest.mock("../../../../../Components/Themes/Theme", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));

import React from "react";
import {render, screen, fireEvent } from "@testing-library/react";
import BirthdayForm, { BirthdayFormProps } from "../BirthdayForm";
import { renderWithStore } from "../../../../../utils/test-utils";
import '@testing-library/jest-dom';

// Mocks
jest.mock("../../../../../Components/Common/StyledButton", () => (props: any) => (
  <button data-testid={props.datatestid} disabled={props.disabled} onClick={props.onClick}>{props.text}</button>
));
jest.mock("../../../../../Components/Common/CombinedStyling", () => {
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
  };
});
jest.mock("../../../../Redux/redux", () => ({
  useAppDispatch: () => jest.fn(),
  actions: { modalActions: { openModal: jest.fn() } }
}));
jest.mock("../../../../Redux/slices/modals.slice", () => ({
  MODAL_TYPES: { SIGNUP_BIRTHDAY_MODAL: "SIGNUP_BIRTHDAY_MODAL" }
}));

const defaultProps: BirthdayFormProps = {
  month: 1,
  day: 1,
  year: 2000,
  date_valid: true,
  showBirthdayModal: false,
  changePage: jest.fn(),
  changeState: jest.fn(),
  handleFormChange: jest.fn(),
};

describe("BirthdayForm", () => {
  it("renders all fields and matches snapshot", () => {
    const r = renderWithStore(<BirthdayForm {...defaultProps} />);
    expect(screen.getByText("Add Your Birthday")).toBeInTheDocument();
    expect(screen.getByTestId("submit-signupbday")).toBeInTheDocument();
    expect(r.container).toMatchSnapshot();
  });

  it("disables Next button if date is invalid", () => {
    const r = renderWithStore(<BirthdayForm {...defaultProps} date_valid={false} />);
    expect(screen.getByTestId("submit-signupbday")).toBeDisabled();
    expect(r.container).toMatchSnapshot();
  });

  it("calls changePage(1) when Next is clicked", () => {
    const changePage = jest.fn();
    renderWithStore(<BirthdayForm {...defaultProps} changePage={changePage} />);
    fireEvent.click(screen.getByTestId("submit-signupbday"));
    expect(changePage).toHaveBeenCalledWith(1);
  });

  it("calls changePage(-1) when Go Back is clicked", () => {
    const changePage = jest.fn();
    renderWithStore(<BirthdayForm {...defaultProps} changePage={changePage} />);
    fireEvent.click(screen.getByText("Go Back"));
    expect(changePage).toHaveBeenCalledWith(-1);
  });

  it("calls handleFormChange when month is changed", () => {
    const handleFormChange = jest.fn();
    renderWithStore(<BirthdayForm {...defaultProps} handleFormChange={handleFormChange} />);
    fireEvent.change(screen.getByTitle("Month"), { target: { name: "month", value: "2" } });
    expect(handleFormChange).toHaveBeenCalledWith("month", 2, true);
  });

  it("calls handleFormChange when day is changed", () => {
    const handleFormChange = jest.fn();
    renderWithStore(<BirthdayForm {...defaultProps} handleFormChange={handleFormChange} />);
    fireEvent.change(screen.getByTitle("Day"), { target: { name: "day", value: "15" } });
    expect(handleFormChange).toHaveBeenCalledWith("day", 15, true);
  });

  it("calls handleFormChange when year is changed and checks date validity", () => {
    const handleFormChange = jest.fn();
    renderWithStore(<BirthdayForm {...defaultProps} handleFormChange={handleFormChange} />);
    const currentYear = new Date().getFullYear();
    fireEvent.change(screen.getByTitle("Year"), { target: { name: "year", value: (currentYear - 10).toString() } });
    expect(handleFormChange).toHaveBeenCalledWith("year", currentYear - 10, true);
    fireEvent.change(screen.getByTitle("Year"), { target: { name: "year", value: (currentYear - 2).toString() } });
    expect(handleFormChange).toHaveBeenCalledWith("year", currentYear - 2, false);
  });
});