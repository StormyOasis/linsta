import React, { createRef } from "react";
import { screen, fireEvent } from "@testing-library/react";
import PopupDropdownSelector, { TextOption, CustomTextOption, PopupDropdownSelectorHandle } from "../PopupDropdownSelector";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Mock dependencies
jest.mock("../Checkbox", () => (props: any) => (
    <button data-testid={`checkbox-${props.name}`} aria-checked={props.isChecked} onClick={() => props.onSelect(props.index, !props.isChecked)}>{props.isChecked ? "Checked" : "Unchecked"}</button>
));
jest.mock("../StyledInput", () => (props: any) => (
    <input data-testid="styled-input" {...props} />
));
jest.mock("../Icon", () => ({
    DownSVG: (props: any) => <svg data-testid="down-svg" {...props} />,
    UpSVG: (props: any) => <svg data-testid="up-svg" {...props} />,
}));

describe("PopupDropdownSelector", () => {
    const baseProps = {
        selectedItems: ["Option 1"],
        shouldValidate: true,
        onSelect: jest.fn(),
        children: (isOpen: boolean, onSelect: any) => (
            <div data-testid="dropdown-children">{isOpen ? "Open" : "Closed"}</div>
        ),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders DropdownToggle and toggles menu on click", () => {
        const r = renderWithStore(<PopupDropdownSelector {...baseProps} />);
        expect(screen.getByRole("button")).toBeInTheDocument();
        expect(screen.queryByTestId("dropdown-children")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByTestId("dropdown-children")).toHaveTextContent("Open");
        // Arrow changes
        expect(screen.getByTestId("up-svg")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button"));
        expect(screen.queryByTestId("dropdown-children")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("renders DownSVG when closed and UpSVG when open", () => {
        const r = renderWithStore(<PopupDropdownSelector {...baseProps} />);
        expect(screen.getByTestId("down-svg")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByTestId("up-svg")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("calls onSelect when child is clicked", () => {
        const onSelect = jest.fn();
        const r = renderWithStore(
            <PopupDropdownSelector
                {...baseProps}
                onSelect={onSelect}
                children={(isOpen, onSelect) => (
                    <button data-testid="child-option" onClick={() => onSelect(1, "Option 2", 0)}>Child</button>
                )}
            />
        );
        fireEvent.click(screen.getByRole("button"));
        fireEvent.click(screen.getByTestId("child-option"));
        expect(onSelect).toHaveBeenCalledWith(1, "Option 2", 0);
        expect(r).toMatchSnapshot();
    });

    it("renders StyledInput when isInputBox is true", () => {
        const r = renderWithStore(
            <PopupDropdownSelector
                {...baseProps}
                isInputBox={true}
                placeholder="Type here"
                value="abc"
                onChange={jest.fn()}
                onInputClick={jest.fn()}
            />
        );
        expect(screen.getByTestId("styled-input")).toBeInTheDocument();
        expect(screen.getByTestId("styled-input")).toHaveValue("abc");
        expect(r).toMatchSnapshot();
    });

    it("calls onChange and onInputClick when input is used", () => {
        const onChange = jest.fn();
        const onInputClick = jest.fn();
        const r = renderWithStore(
            <PopupDropdownSelector
                {...baseProps}
                isInputBox={true}
                value=""
                onChange={onChange}
                onInputClick={onInputClick}
            />
        );
        const input = screen.getByTestId("styled-input");
        fireEvent.click(input);
        expect(onInputClick).toHaveBeenCalled();
        fireEvent.change(input, { target: { value: "new" } });
        expect(onChange).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("closes menu when clicking outside", () => {
        const r = renderWithStore(<PopupDropdownSelector {...baseProps} />);
        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByTestId("dropdown-children")).toBeInTheDocument();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByTestId("dropdown-children")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("calls onClose when closed by outside click", () => {
        const onClose = jest.fn();
        const r = renderWithStore(<PopupDropdownSelector {...baseProps} onClose={onClose} />);
        fireEvent.click(screen.getByRole("button"));
        fireEvent.mouseDown(document.body);
        expect(onClose).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("exposes close method via ref", () => {
        const ref = createRef<PopupDropdownSelectorHandle>();
        const r = renderWithStore(<PopupDropdownSelector {...baseProps} ref={ref} />);
        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByTestId("dropdown-children")).toBeInTheDocument();
        ref.current?.close();
        expect(r).toMatchSnapshot();
    });
});

describe("TextOption", () => {
    it("renders text and calls onChange on click", () => {
        const onChange = jest.fn();
        const r = renderWithStore(
            <TextOption
                maxLength={20}
                dropdownId={1}
                index={0}
                text="Option"
                isChecked={false}
                onChange={onChange}
            />
        );
        fireEvent.click(screen.getByText("Option"));
        expect(onChange).toHaveBeenCalledWith(0, "Option", 1);
        expect(screen.getByTestId("checkbox-0")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});

describe("CustomTextOption", () => {
    it("renders input and calls onChange on input change", () => {
        const onChange = jest.fn();
        const r = renderWithStore(
            <CustomTextOption
                maxLength={10}
                dropdownId={2}
                index={1}
                text="Custom"
                isChecked={true}
                onChange={onChange}
            />
        );
        const input = screen.getByTestId("styled-input");
        fireEvent.change(input, { target: { value: "NewVal" } });
        expect(onChange).toHaveBeenCalledWith(1, "NewVal", 2);
        expect(screen.getByTestId("checkbox-1")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});