// Mock styled-components and react-redux
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
jest.mock("../../../../../Common/CombinedStyling", () => ({
    Div: (props: any) => <div {...props} />,
    Flex: (props: any) => <div {...props} />,
}));

jest.mock("react-redux", () => {
    const actual = jest.requireActual("react-redux");
    return {
        ...actual,
        useSelector: jest.fn(),
        useDispatch: () => jest.fn(),
    };
});

jest.mock("../../../../../../utils/utils", () => ({
    isVideoFileFromType: jest.fn(() => false),
}));

jest.mock("../../../../../Common/MultiStepModal", () => ({
    ModalSectionWrapper: (props: any) => <div data-testid="mock-modal-section-wrapper" {...props} />,
}));

jest.mock("../../../../../Common/Slider", () => ({
    __esModule: true,
    default: (props: any) => (
        <input
            data-testid={`mock-slider-${props.label}`}
            type="range"
            value={props.value}
            min={props.min}
            max={props.max}
            step={props.step}
            onChange={props.onChange}
        />
    ),
}));

jest.mock("../../../../../Common/MediaSliderButton", () => ({
    __esModule: true,
    default: (props: any) => (
        <button data-testid={`mock-media-slider-btn-${props.direction}`} onClick={props.onClick} />
    ),
}));

jest.mock("../../../../../Common/Icon", () => ({
    CropSVG: () => <svg data-testid="mock-crop-svg" />,
    FourToFiveSVG: () => <svg data-testid="mock-4-5-svg" />,
    ImageSVG: () => <svg data-testid="mock-image-svg" />,
    OneToOneSVG: () => <svg data-testid="mock-1-1-svg" />,
    SixteenToNineSVG: () => <svg data-testid="mock-16-9-svg" />,
}));

jest.mock("../../../../../Themes/Theme", () => {
    const React = require("react");
    const MockTheme = ({ children }: any) => {
        return <div data-testid="mock-theme">{children}</div>;
    };
    return {
        __esModule: true,
        default: MockTheme
    };
});

jest.mock('react-easy-crop', () => {
    const React = require("react");
    return {
        __esModule: true,
        default: (props: any) => {
            React.useEffect(() => {
                // Simulate what the real Cropper would do
                if (props.onCropComplete) {
                    props.onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 100, height: 100 });
                }
            }, []);
            return <div data-testid="mock-cropper" />;
        }
    };
});

import React from "react";

import { screen, fireEvent } from "@testing-library/react";
import CreatePostModalCrop, { defaultCropData } from "../CreatePostModalCrop";
import { renderWithStore } from "../../../../../../utils/test-utils";
import '@testing-library/jest-dom';


describe("CreatePostModalCrop", () => {
    const baseFile = { blob: "blob", type: "image/png" };
    const baseCropData = defaultCropData(1);

    it("renders nothing if files is null", () => {
        const r = renderWithStore(
            <CreatePostModalCrop files={null as any} cropData={[]} setCropData={jest.fn()} />
        );
        const themeDiv = r.container.querySelector('[data-testid="mock-theme"]');
        expect(themeDiv).toBeInTheDocument();
        expect(themeDiv?.children.length).toBe(0);
    });

    it("renders nothing if files is empty", () => {
        const r = renderWithStore(
            <CreatePostModalCrop files={[]} cropData={[]} setCropData={jest.fn()} />
        );
        const themeDiv = r.container.querySelector('[data-testid="mock-theme"]');
        expect(themeDiv).toBeInTheDocument();
        expect(themeDiv?.children.length).toBe(0); 
    });

    it("renders cropper and sliders for image file", () => {
        const r = renderWithStore(
            <CreatePostModalCrop files={[baseFile]} cropData={baseCropData} setCropData={jest.fn()} />
        );
        expect(screen.getByTestId("mock-cropper")).toBeInTheDocument();
        expect(screen.getByTestId("mock-slider-Zoom")).toBeInTheDocument();
        expect(screen.getByTestId("mock-slider-Rotation")).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("renders video warning if file is video", () => {
        const { isVideoFileFromType } = require("../../../../../../utils/utils");
        isVideoFileFromType.mockReturnValueOnce(true);
        const r = renderWithStore(
            <CreatePostModalCrop files={[{ ...baseFile, type: "video/mp4" }]} cropData={baseCropData} setCropData={jest.fn()} />
        );
        expect(screen.getByText(/Editing video files is currently unsupported/i)).toBeInTheDocument();
        expect(r.container).toMatchSnapshot();
    });

    it("handles next/prev file navigation", () => {
        const files = [baseFile, baseFile];
        const cropData = defaultCropData(2);
        const r = renderWithStore(
            <CreatePostModalCrop files={files} cropData={cropData} setCropData={jest.fn()} />
        );
        // Next button should be present
        expect(screen.getByTestId("mock-media-slider-btn-bottomRight")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("mock-media-slider-btn-bottomRight"));
        // Prev button should now be present
        expect(screen.getByTestId("mock-media-slider-btn-bottomLeft")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("mock-media-slider-btn-bottomLeft"));
        expect(r.container).toMatchSnapshot();
    });

    it("toggles aspect ratio menu", () => {
        const r = renderWithStore(
            <CreatePostModalCrop files={[baseFile]} cropData={baseCropData} setCropData={jest.fn()} />
        );
        const aspectBtn = screen.getByTestId("mock-crop-svg").closest("div");
        fireEvent.click(aspectBtn!);
        // The aspect ratio menu should now be open (rendered)
        expect(r.container).toMatchSnapshot();
    });
});