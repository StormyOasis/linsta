import React from "react";
import styled from "styled-components";
import { Div, Link } from "./CombinedStyling";

export type StyledLinkProps = {
    to?: string;
    children?: any;
    onClick?: any;
    styleOverride?: any;
    className?: any;
    datatestid?: string;
    role?: string;
    noHover?: boolean;
    useSecondaryColors?: boolean;
};

const StyledLinkWrapperFromLink = styled(Link) <{ $noHover: boolean, $useSecondaryColors: boolean }>`
    color: ${props => props.$useSecondaryColors ?
        props.theme['colors'].buttonSecondaryTextColorDefault : props.theme['colors'].buttonDefaultColor};
    text-decoration: none;
    font-weight: 600;
    cursor: pointer;

    &:hover {
        color: ${(props) => props.$noHover ? "" :
        (props.$useSecondaryColors ? props.theme['colors'].buttonSecondaryOnHoverColor : props.theme['colors'].buttonOnHoverColor)};
    }
`;

const StyledLinkWrapper = styled(Div) <{ $noHover: boolean, $useSecondaryColors: boolean }>`
    color: ${props => props.$useSecondaryColors ?
        props.theme['colors'].buttonSecondaryTextColorDefault : props.theme['colors'].buttonDefaultColor};
    text-decoration: none;
    font-weight: 600;
    cursor: pointer;

    &:hover {
        color: ${(props) => props.$noHover ? "" :
        (props.$useSecondaryColors ? props.theme['colors'].buttonSecondaryOnHoverColor : props.theme['colors'].buttonOnHoverColor)};
    }
`;

const StyledLink: React.FC<StyledLinkProps> = (props: StyledLinkProps) => {
    const onClick = props.onClick ? props.onClick : () => true;
    const hasTo: boolean = (props.to != null && props.to.length > 0);
    const styleOverride = props.styleOverride || {};
    const noHover = props.noHover || false;
    const useSecondaryColors = props.useSecondaryColors || false;

    return (
        <>
            {hasTo && (
                <StyledLinkWrapperFromLink 
                    $useSecondaryColors={useSecondaryColors} 
                    $noHover={noHover} 
                    role={props.role || ""} 
                    data-testid={props.datatestid}
                    href={props.to || ""} 
                    onClick={onClick} 
                    className={props.className} 
                    style={styleOverride}>
                        {props.children}
                </StyledLinkWrapperFromLink>
            )}
            {!hasTo && (
                <StyledLinkWrapper 
                    $useSecondaryColors={useSecondaryColors} 
                    $noHover={noHover} 
                    role={props.role || ""} 
                    data-testid={props.datatestid}
                    onClick={onClick} 
                    className={props.className} 
                    style={styleOverride}>
                        {props.children}
                </StyledLinkWrapper>
            )}
        </>
    );
};

export default StyledLink;