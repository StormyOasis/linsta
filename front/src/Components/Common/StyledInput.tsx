import React from "react";
import { styled } from "styled-components";

import * as styles from "./Common.module.css";

const StyledInputWrapper = styled.div<{ $noMargin?: boolean | undefined }>`
    display: flex;
    flex-direction: row;
    margin: ${props => props.$noMargin ? 0 : "0 40px 5px 40px"};
`;

const StyledInputInput = styled.input`
    border: 2px solid ${props => props.theme['colors'].borderDefaultColor};
    background-color: ${props => props.theme['colors'].inputBackgroundColor};
    display: block;
    width: 100%;
    height: 24px;
`;

const StyledInputLabel = styled.label<{ $top: string }>`
    position: relative;
    width: 100%;

    &::after {
        top: ${props => props.$top} !important;
    }    
`;

type StyledInputProps = {
    name: string;
    value?: string | Number | undefined;
    placeholder?: string | undefined;
    isValid?: boolean;
    onChange?: any;
    type?: string;
    maxLength?: number;
    style?: any;
    datatestid?: string;
    noMargin?: boolean;
    validationYpos?: string;
}

const StyledInput: React.FC<StyledInputProps> = (props: StyledInputProps) => {

    // Determine validation classname (None, valid, invalid)
    const value = `${props.value}`;
    let validationClass = "";
    if (value.length != 0) {
        validationClass = props.isValid ? styles.validationPass : styles.validationFail;
    }

    const top = props.validationYpos ? props.validationYpos : "6px";

    return (
        <StyledInputWrapper $noMargin={props.noMargin}>
            <StyledInputLabel $top={top} className={validationClass}>
                <StyledInputInput
                    style={props.style}
                    type={props.type}
                    name={props.name}
                    value={value}
                    placeholder={props.placeholder}
                    onChange={props.onChange}
                    maxLength={props.maxLength ? props.maxLength : 255}
                    data-testid={props.datatestid}
                />
            </StyledInputLabel>
        </StyledInputWrapper>
    );
}

export default StyledInput;