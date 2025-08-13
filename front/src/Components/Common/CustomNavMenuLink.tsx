import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import { styled } from "styled-components";
import * as styles from '../Layout/Main/Main.module.css';
import { Div, Flex, Span } from "./CombinedStyling";

const InnerNavLinkWrapper = styled(Div)`
    padding: 12px;
    margin: 2px 0;
    display: inline-flex;
    cursor: pointer;
    border-radius: 8px;

    &:hover {
        background-color: ${(props) => props.theme['colors'].navLinkHoverColor};
    }        


    @media (min-width: ${props => props.theme["breakpoints"].md}px) and 
        (max-width: ${props => props.theme["breakpoints"].lg - 1}px) {
        padding-top: 9px;
    }

    @media (min-width: ${props => props.theme["breakpoints"].lg - 1}px) {
        width: 100%;
        align-items: center;
        flex-direction: row;
    }
`;

const NavLink = styled(Link)`
    text-decoration: none;
    color: ${props => props.theme["colors"].navLinkTextColor};

    display: flex;
    flex-basis: 100%;
    justify-content: center;
`;

const DivLink = styled(Flex)`
    text-decoration: none;
    color: ${props => props.theme["colors"].navLinkTextColor};
    flex-basis: 100%;
    justify-content: center;
`;

interface CustomNavMenuLinkProps {
    to: string | null;
    text: string;
    iconElement: ReactNode;
    paddingLeft?: number;
    onClick?: () => void;
    matchesLargestBP: boolean;
};

const CustomNavMenuLink: React.FC<CustomNavMenuLinkProps> = React.memo((props: CustomNavMenuLinkProps) => {
    const LinkContents: ReactNode =
        <InnerNavLinkWrapper>
            <Div className={styles.iconWrapper}>
                {props.iconElement}
            </Div>
            {props.matchesLargestBP &&
                <Div $paddingLeft={`${props.paddingLeft}px`}>
                    <Span className={styles.text}>{props.text}</Span>
                </Div>
            }
        </InnerNavLinkWrapper>;

    if (props.to != null) {
        return (
            <NavLink to={props.to} onClick={props.onClick} aria-label={props.text}>
                {LinkContents}
            </NavLink>
        );
    }

    return (
        <DivLink onClick={props.onClick} aria-description={props.text}>
            {LinkContents}
        </DivLink>
    );
});

export default CustomNavMenuLink;
