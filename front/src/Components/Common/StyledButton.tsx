import React from "react";
import { styled } from "styled-components";

type StyledButtonProps = {
    name?: string;
    onClick?: any;
    type?: "button" | "submit" | "reset" | undefined;
    disabled?: boolean;
    text: string;
    style?: any;
    datatestid?: string;
    useSecondaryColors?: boolean;
};

const StyledButtonComponent = styled.button<{ $props?: any, $useSecondaryColors?: boolean | undefined }>`
    border: none;
    border-radius: 8px;
    text-decoration: none;
    align-items: center;
    font-weight: 600;
    justify-content: center;
    text-wrap: nowrap;
    color: ${props => props.$useSecondaryColors ? props.theme['colors'].buttonSecondaryTextColorDefault : props.theme['colors'].buttonTextColorDefault};
    background-color: ${(props) => props.disabled ?
        (props.$useSecondaryColors ? props.theme['colors'].buttonSecondaryDefaultColorTrans : props.theme['colors'].buttonDefaultColorTrans) :
        (props.$useSecondaryColors ? props.theme['colors'].buttonDefaultSecondaryColor : props.theme['colors'].buttonDefaultColor)};
    display: flex;
    height: 34px;
    position: relative;
    text-align: center;
    padding-left: 16px;
    padding-right: 16px;
    flex-direction: row;
    margin-bottom: 12px;
    margin-top: 0px;
    margin-left: 40px;
    margin-right: 40px;

    cursor: ${(props) => (props.disabled ? "default" : "pointer")};

    &:hover {
    background-color: ${(props) =>
        props.disabled ?
            (props.$useSecondaryColors ? props.theme['colors'].buttonSecondaryDefaultColorTrans : props.theme['colors'].buttonDefaultColorTrans) :
            (props.$useSecondaryColors ? props.theme['colors'].buttonSecondaryOnHoverColor : props.theme['colors'].buttonOnHoverColor)};
    }
`;

const StyledButton: React.FC<StyledButtonProps> = (props: StyledButtonProps) => {
    return (
        <StyledButtonComponent
            type={props.type}
            name={props.name}
            disabled={props.disabled}
            onClick={props.onClick}
            style={props.style}
            $useSecondaryColors={props.useSecondaryColors}
            data-testid={props.datatestid}>
            {props.text}
        </StyledButtonComponent>
    );
}

export default StyledButton;