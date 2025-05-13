import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Div } from "./CombinedStyling";

export type StyledLinkProps = {
    to?: string;
    children?: any;
    onClick?: any;
    styleOverride?: any;
    className?: any;
    datatestid?: string
};

const StyledLinkWrapperFromLink = styled(Link)`
    color: ${props => props.theme['colors'].buttonDefaultColor};
    text-decoration: none;
    font-weight: 600;
    cursor: pointer;

    &:hover {
        color: ${(props) => props.theme['colors'].buttonOnHoverColor};
    }
`;

const StyledLinkWrapper = styled(Div)`
    color: ${props => props.theme['colors'].buttonDefaultColor};
    text-decoration: none;
    font-weight: 600;
    cursor: pointer;

    &:hover {
        color: ${(props) => props.theme['colors'].buttonOnHoverColor};
    }
`;

const StyledLink: React.FC<StyledLinkProps> = (props: StyledLinkProps) => {
    const onClick = props.onClick ? props.onClick : () => true;
    const hasTo: boolean = (props.to != null && props.to.length > 0);

    return (
        <>
            {hasTo && (
                <StyledLinkWrapperFromLink data-testid={props.datatestid} to={props.to || "#"} onClick={onClick} className={props.className} style={props.styleOverride}>
                    {props.children}
                </StyledLinkWrapperFromLink>
            )}
            {!hasTo && (
                <StyledLinkWrapper data-testid={props.datatestid} onClick={onClick} className={props.className} style={props.styleOverride}>
                    {props.children}
                </StyledLinkWrapper>
            )}
        </>
    );
};

export default StyledLink;