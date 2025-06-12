import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import MultiStepModal, { MultiStepModalProps } from "../MultiStepModal";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Mock portal target
beforeEach(() => {
    const modalOverlay = document.createElement("div");
    modalOverlay.setAttribute("id", "modalOverlay");
    document.body.appendChild(modalOverlay);
});

afterEach(() => {
    const modalOverlay = document.getElementById("modalOverlay");
    if (modalOverlay) {
        document.body.removeChild(modalOverlay);
    }
});

// Mock dependencies
jest.mock("../LoadingImage", () => (props: any) =>
    props.isLoading ? <div data-testid="loading">Loading...</div> : null
);
jest.mock("../StyledLink", () => (props: any) => (
    <a data-testid="styled-link" onClick={props.onClick}>{props.children}</a>
));
jest.mock("../Icon", () => ({
    BackArrowSVG: (props: any) => <svg data-testid="back-arrow" {...props} />,
    XSVG: (props: any) => <svg data-testid="close-x" {...props} />,
}));

describe("MultiStepModal", () => {
    const stepElement = <div data-testid="step-content">Step Content</div>;
    const onClose = jest.fn();
    const onNext = jest.fn();
    const onPrev = jest.fn();

    const baseProps: MultiStepModalProps = {
        steps: [
            {
                title: "Step 1",
                options: {
                    showFooter: true,
                    hideHeader: false,
                    hideMargins: false,
                    footerNextPageText: "Next",
                    alignItems: "center"
                },
                element: stepElement,
                onNext,
                onPrev
            }
        ],
        onClose,
        stepNumber: 0,
        showLoadingAnimation: false,
        zIndex: 100
    };

    it("renders modal with title, content, and footer", () => {
        const r = renderWithStore(<MultiStepModal {...baseProps} />);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Step 1")).toBeInTheDocument();
        expect(screen.getByTestId("step-content")).toBeInTheDocument();
        expect(screen.getByTestId("back-arrow")).toBeInTheDocument();
        expect(screen.getByTestId("styled-link")).toHaveTextContent("Next");
        expect(r).toMatchSnapshot();
    });

    it("calls onClose when close button is clicked", () => {
        const r = renderWithStore(<MultiStepModal {...baseProps} />);
        const closeBtn = screen.getByRole("button", { name: /close/i });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("calls onNext and onPrev when footer buttons are clicked", () => {
        const r = renderWithStore(<MultiStepModal {...baseProps} />);
        fireEvent.click(screen.getByTestId("back-arrow"));
        expect(onPrev).toHaveBeenCalled();
        fireEvent.click(screen.getByTestId("styled-link"));
        expect(onNext).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("shows loading animation and hides content when showLoadingAnimation is true", () => {
        const r = renderWithStore(<MultiStepModal {...baseProps} showLoadingAnimation={true} />);
        expect(screen.getByTestId("loading")).toBeInTheDocument();
        expect(screen.queryByTestId("step-content")).not.toBeInTheDocument();
        // Footer should not be shown
        expect(screen.queryByTestId("back-arrow")).not.toBeInTheDocument();
        expect(screen.queryByTestId("styled-link")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("hides header if hideHeader is true", () => {
        const props = {
            ...baseProps,
            steps: [
                {
                    ...baseProps.steps[0],
                    options: { ...baseProps.steps[0].options, hideHeader: true }
                }
            ]
        };
        const r = renderWithStore(<MultiStepModal {...props} />);
        expect(screen.queryByText("Step 1")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("throws error if steps is empty", () => {
        expect(() =>
            renderWithStore(
                <MultiStepModal
                    {...baseProps}
                    steps={[]}
                />
            )
        ).toThrow("Invalid multi step modal length");
    });

    it("throws error if stepNumber is out of bounds", () => {
        expect(() =>
            renderWithStore(
                <MultiStepModal
                    {...baseProps}
                    stepNumber={2}
                />
            )
        ).toThrow("Invalid multi step modal length");
    });
});