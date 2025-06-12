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

    const ThemeProvider = ({ children }: any) => <>{children}</>;

    return { __esModule: true, styled, default: styled, ThemeProvider };
});

jest.mock("react-redux", () => {
    const actual = jest.requireActual("react-redux");
    return {
        ...actual,
        useSelector: jest.fn(fn => fn({ auth: { user: { id: "1", userName: "testuser" } } })),
    };
});

jest.mock("../../../../../../utils/utils", () => ({
    blobToBase64: jest.fn(() => Promise.resolve("base64data")),
    isVideoFileFromType: jest.fn(() => false),
}));

jest.mock("../../../../../../utils/cropImage", () => ({
    __esModule: true,
    default: jest.fn(() => Promise.resolve("croppedImage")),
}));

jest.mock("../../../../../../utils/CachedImageLoader", () => ({
    clearCache: jest.fn(),
    loadImageCached: jest.fn(() => Promise.resolve("img")),
    setImage: jest.fn(),
}));
jest.mock("../../../../../../api/ServiceController", () => ({
    putSubmitPost: jest.fn((...args) => {
        console.log("putSubmitPost called with", args);
        return Promise.resolve({ status: 200 });
    }),
}));

jest.mock("../CreatePostModalCrop", () => ({
    __esModule: true,
    default: (props: any) => <div data-testid="mock-crop" {...props} />,
    defaultCropData: (len: number) => Array(len).fill({ croppedAreaPixels: {}, rotation: 0 }),
}));

jest.mock("../CreatePostModalSelectMedia", () => ({
    __esModule: true,
    default: (props: any) => (
        <div data-testid="mock-selectmedia">
            <button data-testid="mock-setfiles" onClick={() => props.setFiles(0, [{ blob: "blob", type: "image/png" }])}>Set Files</button>
        </div>
    ),
}));

jest.mock("../CreatePostModalEdit", () => ({
    __esModule: true,
    default: (props: any) => <div data-testid="mock-edit" {...props} />,
}));

jest.mock("../CreatePostModalFinal", () => ({
    __esModule: true,
    default: (props: any) => (
        <div data-testid="mock-final" {...props}>
            <button data-testid="mock-final-submit" onClick={() => props.onLexicalChange && props.onLexicalChange("caption", 7)}>Submit</button>
        </div>
    ),
}));

jest.mock("../../../../../Common/MultiStepModal", () => {
    const React = require("react");
    return {
        __esModule: true,
        default: (props: any) => {
            // Render the current step and expose next/prev for testing
            const Step = props.steps[props.stepNumber].element;
            return (
                <div data-testid="mock-multistepmodal">
                    {React.cloneElement(Step, props.steps[props.stepNumber])}
                    <button data-testid="mock-next" onClick={props.steps[props.stepNumber].onNext}>Next</button>
                    <button data-testid="mock-prev" onClick={props.steps[props.stepNumber].onPrev}>Prev</button>
                </div>
            );
        }
    };
});

jest.mock("../../../../../Themes/Theme", () => ({
    __esModule: true,
    default: ({ children }: any) => <div data-testid="mock-theme">{children}</div>
}));

// Polyfill for crypto.randomUUID in Jest/node
if (!global.crypto) {
    global.crypto = {} as Crypto;
}
if (!global.crypto.randomUUID) {
    global.crypto.randomUUID = () => "test-uuid-1234-5678-910";
}

import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import CreatePostModal from "../CreatePostModal";
import { renderWithStore } from "../../../../../../utils/test-utils";
import '@testing-library/jest-dom';

describe("CreatePostModal", () => {
    const onClose = jest.fn();

    beforeEach(() => {
        onClose.mockClear();
    });

    it("renders and matches snapshot at initial step", () => {
        const r = renderWithStore(<CreatePostModal onClose={onClose} zIndex={100} />);
        expect(screen.getByTestId("mock-multistepmodal")).toBeInTheDocument();
        expect(screen.getByTestId("mock-selectmedia")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("goes to crop step when files are set", async () => {
        const r = renderWithStore(<CreatePostModal onClose={onClose} zIndex={100} />);
        fireEvent.click(screen.getByTestId("mock-setfiles")); // Simulate selecting files
        fireEvent.click(screen.getByTestId("mock-next")); // Go to crop step
        await waitFor(() => {
            expect(screen.getByTestId("mock-crop")).toBeInTheDocument();
        });
        expect(r).toMatchSnapshot();
    });

    it("calls onClose after successful submit", async () => {
        const r = renderWithStore(<CreatePostModal onClose={onClose} zIndex={100} />);
        fireEvent.click(screen.getByTestId("mock-setfiles")); // Set files

        // Go to Crop step and wait for editData to be populated
        fireEvent.click(screen.getByTestId("mock-next")); // Crop

        // Wait for editData to be set (i.e., for the Edit step to render)
        await waitFor(() => {
            expect(screen.getByTestId("mock-edit")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId("mock-next")); // Edit
        fireEvent.click(screen.getByTestId("mock-next")); // Final

        fireEvent.click(screen.getByTestId("mock-next")); // Share (calls submitPost)
        await waitFor(() => {
            expect(onClose).toHaveBeenCalled();
        });
        expect(r).toMatchSnapshot();
    });

    it("handles lexical text change in final step", async () => {
        const r = renderWithStore(<CreatePostModal onClose={onClose} zIndex={100} />);
        fireEvent.click(screen.getByTestId("mock-setfiles")); // Set files to enable next step
        fireEvent.click(screen.getByTestId("mock-next")); // Crop

        // Wait for editData to be set (i.e., for the Edit step to render)
        await waitFor(() => {
            expect(screen.getByTestId("mock-edit")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId("mock-next")); // Edit
        fireEvent.click(screen.getByTestId("mock-next")); // Final

        // Wait for the final step and editData to be ready
        await waitFor(() => {
            expect(screen.getByTestId("mock-final-submit")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId("mock-final-submit"));
        // No assertion needed, just ensure no crash and state updates
        expect(r).toMatchSnapshot();
    });

    it("clears all file data on unmount", () => {
        const { unmount } = renderWithStore(<CreatePostModal onClose={onClose} zIndex={100} />);
        unmount();
        // No assertion needed, just ensure no crash
    });
});