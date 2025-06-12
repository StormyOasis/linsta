import React from "react";
import { screen } from "@testing-library/react";
import ProfileLayout from "../ProfileLayout";
import { renderWithStore } from "../../../../utils/test-utils";
import '@testing-library/jest-dom';

// Mocks
jest.mock("react-redux", () => {
  const actual = jest.requireActual("react-redux");
  return {
    ...actual,
    useDispatch: () => jest.fn(),
  };
});
jest.mock("../../../../Components/Themes/Theme", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));
jest.mock("../../Main/SideBar", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-sidebar" />
}));
jest.mock("../ProfileContent", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-profile-content" />
}));
jest.mock("../EditProfileContent", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-edit-profile-content" />
}));
jest.mock("../../../../Components/Common/CombinedStyling", () => ({
  __esModule: true,
  Div: (props: any) => <div data-testid="mock-div" {...props} />
}));
jest.mock("../../Main/Main.module.css", () => ({
  mainWrapper: "mainWrapper"
}));

describe("ProfileLayout", () => {
  it("renders ProfileContent when edit is false and matches snapshot", () => {
    const r = renderWithStore(<ProfileLayout edit={false} />);
    expect(screen.getByTestId("mock-div")).toHaveClass("mainWrapper");
    expect(screen.getByTestId("mock-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("mock-profile-content")).toBeInTheDocument();
    expect(r.container).toMatchSnapshot();
  });

  it("renders EditProfileContent when edit is true and matches snapshot", () => {
    const r = renderWithStore(<ProfileLayout edit={true} />);
    expect(screen.getByTestId("mock-div")).toHaveClass("mainWrapper");
    expect(screen.getByTestId("mock-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("mock-edit-profile-content")).toBeInTheDocument();
    expect(r.container).toMatchSnapshot();
  });
});