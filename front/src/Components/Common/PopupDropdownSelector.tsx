import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

import { Div, FlexColumn, FlexRow, Span } from './CombinedStyling';
import Checkbox from './Checkbox';
import StyledInput from './StyledInput';
import UpSVG from "/public/images/up-line.svg";
import DownSVG from "/public/images/down-line.svg";

const DropdownContainer = styled.div`
    position: relative;
    width: 100%;
`;

const DropdownToggle = styled.button`
    width: 100%;
    padding: 10px;
    font-size: 16px;
    border: 2px solid ${props => props.theme['colors'].borderDefaultColor};   
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

const DropdownMenu = styled.div`
    position: absolute;
    left: 0;
    top: 100%;  
    width: 100%;
    background-color: ${props => props.theme['colors'].backgroundColor};
    border: 2px solid ${props => props.theme['colors'].borderDefaultColor};    
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

const ArrowContainer = styled.div`
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
            <Checkbox index={props.index} isChecked={props.isChecked} onSelect={() => { }}></Checkbox>
        </TextOptionContainer>
    );
};

export const CustomTextOption: React.FC<TextOptionProps> = (props: TextOptionProps) => {
    return (
        <TextOptionContainer onClick={() => props.onChange(props.index, props.text, props.dropdownId)}>
            <FlexColumn style={{ width: "100%" }}>
                <FlexRow style={{ justifyContent: "space-between" }}>
                    <Div>Custom</Div>
                    <Checkbox index={props.index} isChecked={props.isChecked} onSelect={() => { }}></Checkbox>
                </FlexRow>
                <Div style={{ paddingTop: "5px" }}>
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

type DropdownProps = {
    selectedItem: string;
    children: (onSelect: (index: number, text: string, dropdownId: number) => void) => React.ReactNode;
    onClose?: () => void;
    onSelect: (index: number, text: string, dropdownId: number) => void;
};

const PopupDropdownSelector: React.FC<DropdownProps> = (props: DropdownProps) => {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                props.onClose && props.onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [props.onClose]);

    return (
        <DropdownContainer ref={dropdownRef}>
            <DropdownToggle onClick={() => setIsOpen((prev) => !prev)}>
                <Span>{props.selectedItem}</Span>
                <ArrowContainer>
                    {isOpen ? <UpSVG /> : <DownSVG />}
                </ArrowContainer>
            </DropdownToggle>

            {isOpen && <DropdownMenu>{props.children(props.onSelect)}</DropdownMenu>}
        </DropdownContainer>
    );
};

export default PopupDropdownSelector;
