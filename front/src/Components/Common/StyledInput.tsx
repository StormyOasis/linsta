import React, {FC} from "react";
import { styled } from "styled-components";

import { Div, FlexRow } from "./CombinedStyling";
import { CheckCircleSVG, CircleXSVG } from "./Icon";

const StyledInputWrapper = styled(FlexRow)<{ $noMargin?: boolean | undefined, $width?: string | undefined }>`
    margin: ${props => props.$noMargin ? 0 : "0 40px 5px 40px"};
    width: ${props => props.$width ? props.$width : "unset"};
`;

const StyledInputInput = styled.input<{ $noBorder?: boolean | undefined }>`
    border: ${props => props.$noBorder ? "none" : `2px solid ${props.theme['colors'].borderDefaultColor}`};
    background-color: ${props => props.theme['colors'].backgroundColor};
    display: block;
    width: 99%;
    height: 24px;
    border-radius: 5px;

    &:focus {
        outline: ${props => props.$noBorder ? "none" : ""};
    }    
`;

const StyledInputLabel = styled.label<{ $top: string, $right: string }>`
    position: relative;
    width: 100%;

    &::after {
        top: ${props => props.$top} !important;
        right: ${props => props.$right} !important;
    }    
`;

const ValidationIcon = styled(Div)<{ $top: string; $right: string }>`
    position: absolute;
    top: ${props => props.$top};
    right: ${props => props.$right};
    width: 16px;
    height: 16px;

    svg {
        width: 100%;
        height: 100%;
        color: currentColor;
    }
`;

type StyledInputProps = {
    name?: string;
    value?: string | Number | undefined;
    placeholder?: string | undefined;
    isValid?: boolean;
    onChange?: any;
    type?: string;
    maxLength?: number;
    style?: any;
    datatestid?: string;
    noMargin?: boolean;
    noBorder?: boolean;
    shouldValidate: boolean;
    validationYpos?: string;
    validationXpos?: string;
    width?: string;
    onClick?: () => void;
}

const StyledInput: FC<StyledInputProps> = (props: StyledInputProps) => {
    // Determine validation classname (None, valid, invalid)
    const value = `${props.value}`;

    const top = props.validationYpos ? props.validationYpos : "7px";
    const right = props.validationXpos ? props.validationXpos : "10px";

    return (
        <StyledInputWrapper $noMargin={props.noMargin} $width={props.width}>
            <StyledInputLabel $top={top} $right={right}>
                <StyledInputInput
                    style={props.style}
                    type={props.type}
                    name={props.name}
                    value={value}
                    placeholder={props.placeholder}
                    onChange={props.onChange}
                    maxLength={props.maxLength ? props.maxLength : 255}
                    data-testid={props.datatestid}
                    $noBorder={props.noBorder}
                    onClick={props.onClick ?? undefined}
                />
                {(props.shouldValidate && value.length !== 0) && (
                    <ValidationIcon $top={top} $right={right}>
                        {props.isValid ? <CheckCircleSVG stroke="none" fill="currentColor" /> : <CircleXSVG stroke="none" fill="currentColor"/>}
                    </ValidationIcon>
                )}                
            </StyledInputLabel>
        </StyledInputWrapper>
    );
}

export default StyledInput;