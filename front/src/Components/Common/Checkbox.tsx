import React from 'react';
import styled from 'styled-components';
import { Flex } from './CombinedStyling';
import { CheckSVG } from './Icon';

const CheckboxWrapper = styled(Flex)`
    align-items: center;    
`;

const CheckboxInput = styled.input`    
    opacity: 0;
    width: 0;
    height: 0;
`;

const CheckboxLabel = styled.label<{ $isChecked: boolean, $width: string, $height: string }>`
    align-items: center;
    display: flex;
    position: relative;
    cursor: pointer;    
    justify-content: center;    
    width: ${props => props.$width};
    height: ${props => props.$height};
    border-radius: 50%;
    border: 2px solid ${props => props.theme['colors'].borderDefaultColor};    
    color: ${props => props.$isChecked ? props.theme['colors'].buttonDefaultColor : props.theme['colors'].background};
    transition: all 0.35s ease;

    &:hover {
        background-color: ${props => props.$isChecked ? props.theme['colors'].background : props.theme['colors'].buttonDefaultColor};
    }
`;

const CheckMark = styled(CheckSVG)`  
    color: ${props => props.theme['colors'].buttonDefaultColor};   
`;

type CheckboxProps = {
    name: string;
    index?: number;
    isChecked: boolean;
    width? :string;
    height?: string;
    onSelect: (index: number, newSelectState: boolean) => void;
};

const Checkbox: React.FC<CheckboxProps> = (props: CheckboxProps) => {
    const index = props.index ? props.index : 0;
    const width = props.width ? props.width : "20px";
    const height = props.height ? props.height : "20px";

    return (
        <CheckboxWrapper>
            <CheckboxInput id={`${props.name}_input`} type="checkbox" checked={props.isChecked} onChange={() => props.onSelect(index, !props.isChecked)} />
            <CheckboxLabel id={`${props.name}_label`} $width={width} $height={height} $isChecked={props.isChecked}>
                {props.isChecked && <CheckMark />}
            </CheckboxLabel>
        </CheckboxWrapper>
    );
};

export default Checkbox;
