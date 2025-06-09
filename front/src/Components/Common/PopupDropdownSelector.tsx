import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import styled from 'styled-components';

import { Div, FlexColumn, FlexRow, FlexRowFullWidth, Span } from './CombinedStyling';
import Checkbox from './Checkbox';
import StyledInput from './StyledInput';
import UpSVG from "/public/images/up-line.svg";
import DownSVG from "/public/images/down-line.svg";

const DropdownContainer = styled(Div)`
    position: relative;
    width: 100%;
`;

const DropdownToggle = styled.button<{ $hideBorder?: boolean }>`
    width: 100%;
    padding: 10px;
    font-size: 16px;
    border: ${props => props.$hideBorder ? "none" : `2px solid ${props.theme['colors'].borderDefaultColor}`};
    border-radius: 10px;
    background-color: ${props => props.theme['colors'].backgroundColor};
    text-align: left;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    &:hover {
        background-color: ${props => props.theme['colors'].buttonDefaultSecondaryColor};
    }
`;

const DropdownMenu = styled(Div) <{ $hideBorder?: boolean }>`
    position: absolute;
    left: 0;
    top: 100%;  
    width: 100%;
    background-color: ${props => props.theme['colors'].backgroundColor};
    border: ${props => props.$hideBorder ? "none" : `2px solid ${props.theme['colors'].borderDefaultColor}`};
    border-radius: 16px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    max-height: 275px;
    overflow-y: auto;
    z-index: 999999;  
`;

const TextOptionContainer = styled(FlexRow)`
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    padding: 8px;

    &:hover {
        background-color: ${props => props.theme['colors'].buttonDefaultSecondaryColor};    
    }  
`;

const ArrowContainer = styled(Div)`
    height: 24px;
    width: 24px;
    position: relative;
    align-self: center;
`;

type TextOptionProps = {
    maxLength?: number;
    dropdownId: number;
    index: number;
    text: string;
    isChecked: boolean;
    onChange: (index: number, text: string, dropdownId: number) => void;
};

export const TextOption: React.FC<TextOptionProps> = (props: TextOptionProps) => {
    return (
        <TextOptionContainer onClick={() => props.onChange(props.index, props.text, props.dropdownId)}>
            <Div>{props.text}</Div>
            <Checkbox name={`${props.index}`} index={props.index} isChecked={props.isChecked} onSelect={() => { }}></Checkbox>
        </TextOptionContainer>
    );
};

export const CustomTextOption: React.FC<TextOptionProps> = (props: TextOptionProps) => {
    return (
        <TextOptionContainer onClick={() => props.onChange(props.index, props.text, props.dropdownId)}>
            <FlexColumn $width="100%">
                <FlexRow $justifyContent="space-between">
                    <Div>Custom</Div>
                    <Checkbox name={`${props.index}`} index={props.index} isChecked={props.isChecked} onSelect={() => { }}></Checkbox>
                </FlexRow>
                <Div $paddingTop="5px">
                    <StyledInput
                        maxLength={props.maxLength ? props.maxLength : 256}
                        name="styled_input"
                        isValid={true}
                        value={props.text}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            if (props.onChange) {
                                props.onChange(props.index, event.target.value, props.dropdownId);
                            }
                        }}>
                    </StyledInput>
                </Div>
            </FlexColumn>
        </TextOptionContainer>
    );
}

export type PopupDropdownSelectorHandle = {
    close: () => void;
};

type DropdownProps = {
    value?: string;
    placeholder?: string;
    inputIcon?: React.ReactNode;
    selectedItems: string[];
    isMultiSelect?: boolean;
    isInputBox?: boolean;
    hideArrow?: boolean;
    hideBorder?: boolean;
    children: (isOpen: boolean, onSelect: (index: number, text: string, dropdownId: number) => void) => React.ReactNode;
    onClose?: () => void;
    onSelect: (index: number, text: string, dropdownId: number) => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onInputClick?: () => void;    
};

const PopupDropdownSelector = forwardRef<PopupDropdownSelectorHandle, DropdownProps>((props, ref) => {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // Need to be able to close this popup without lifting state
    useImperativeHandle(ref, () => ({
        close: () => setIsOpen(false)
    }));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                props.onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [props.onClose]);

    return (
        <DropdownContainer ref={dropdownRef}>
            {!props.isInputBox &&
                <DropdownToggle
                    $hideBorder={props.hideBorder || false}
                    aria-expanded={isOpen ? 'true' : 'false'}
                    aria-controls="dropdown-menu"
                    onClick={() => setIsOpen((prev) => !prev)}>
                    <Span>{props.selectedItems[0]}</Span>
                    {!props.hideArrow &&
                        <ArrowContainer>
                            {isOpen ? <UpSVG /> : <DownSVG />}
                        </ArrowContainer>
                    }
                </DropdownToggle>
            }
            {props.isInputBox &&
                <FlexRowFullWidth>
                    <StyledInput 
                        name="collab-input"
                        placeholder={props.placeholder} 
                        noMargin={true} 
                        noBorder={props.hideBorder || false}
                        noValidation={true} width="100%"
                        onChange={props.onChange} 
                        value={props.value || ""}
                        onClick={() => {
                            setIsOpen((prev) => props.isMultiSelect ? true : !prev);
                            props.onInputClick?.()
                        }}></StyledInput>
                    {props.inputIcon && props.inputIcon}
                </FlexRowFullWidth>
            }

            {isOpen && <DropdownMenu $hideBorder={props.hideBorder || false}>{props.children(isOpen, props.onSelect)}</DropdownMenu>}
        </DropdownContainer>
    );
});

export default PopupDropdownSelector;
