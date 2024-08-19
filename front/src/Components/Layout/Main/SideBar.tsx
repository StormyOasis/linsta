import React from "react";
import styled from "styled-components";
import LogoSVG from "/public/images/linsta.svg";
import HomeSVG from "/public/images/home.svg";
import ExploreSVG from "/public/images/explore.svg";
import SearchSVG from "/public/images/search-icon.svg";
import ReelsSVG from "/public/images/reels.svg";
import MessagesSVG from "/public/images/messages.svg";
import NotificationsSVG from "/public/images/notifications.svg";
import CreateSVG from "/public/images/create.svg";
import MainSVG from "/public/images/main.svg";

import * as styles from './Main.module.css';
import { Link } from "react-router-dom";
import { useMediaQuery } from "react-responsive";

const SideBarWrapper = styled.div`
    margin: 0;
    padding: 0;
    width: ${props => props.theme["sizes"].sideBarNavWidthDefault};
    position: fixed;
    height: 100%;
    overflow: hidden;
    background-color: ${props => props.theme["colors"].backgroundColor};
    border-right: 1px solid ${props => props.theme["colors"].borderDefaultColor};

    @media (min-width: 768px) and (max-width: 1279px) {
        width: ${props => props.theme["sizes"].sideBarNavWidthNarrow};
    }

    @media screen and (max-width: 767px) {
      width: 100%;
      height: auto;
      position: fixed;
      bottom: 0;
      border-top: 1px solid ${props => props.theme["colors"].borderDefaultColor};
    }
`;

const LogoWrapper = styled.div`
    margin-bottom: 20px;
    padding: 12px;
    text-align:center;
`;

const NavWrapper = styled.div`
    width: 100%;
    flex-grow: 1;
    display: flex;
    flex-direction: column;

    @media (max-width: 767px) {
        display: inline-flex;
        flex-direction: row;
        justify-content: center;
    }     
`;

const NavLink = styled(Link)`
    text-decoration: none;
    color: ${props => props.theme["colors"].navLinkTextColor};

    display: flex;
    flex-basis: 100%;
    justify-content: center;
`;

const InnerNavLinkWrapper = styled.div`
    padding: 12px;
    margin: 2px 0;
    display: inline-flex;

    cursor: pointer;
    border-radius: 8px;

    &:hover {
        background-color: ${(props) => props.theme['colors'].navLinkHoverColor};
    }        

    @media (min-width: 1280px) {
        width: 100%;
        align-items: center;
        flex-direction: row;
    }
`;

const IconWrapper = styled.div`
    overflow: visible;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    position: relative;
`;

const Icon = styled.div`
    width: 24px;
    height: 24px;
    position: relative;
    color: black;
`;

const TextWrapper = styled.div`
    padding-left: 16px;
    overflow: hidden;
    height: 24px;
    width: fit-content;
    display: flex;
`;

const Text = styled.span`
    color: black;
    font-size: 16px;
    font-weight: 700;
    word-wrap: break-word;
    word-break: break-word;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 100%;
    align-content: center;
`;

const SideBar: React.FC = () => {
    const matchesLargestBP = useMediaQuery({minWidth: 1280});
    const matchesSmallestBP = useMediaQuery({maxWidth: 767});

    const renderMenuItem = (text: string, to: string, iconElement:any, onClick?: any) => {
        const onClickHandler = onClick ? onClick : () => true;

        return (
            <NavLink to={to} onClick={onClickHandler}>
                <InnerNavLinkWrapper>
                    <IconWrapper>
                        <Icon>
                            {iconElement}
                        </Icon>
                    </IconWrapper>
                    {matchesLargestBP &&
                        <TextWrapper>
                            <Text>{text}</Text>                                
                        </TextWrapper>                            
                    }
                </InnerNavLinkWrapper>
            </NavLink>
        );
    }

    return (
        <SideBarWrapper>
            {!matchesSmallestBP && 
                <LogoWrapper>
                    <Link to="/">
                        {matchesLargestBP ? <LogoSVG /> : <MainSVG />}
                    </Link>
                </LogoWrapper>
            }
            <NavWrapper>
                {renderMenuItem("Home", "#", <HomeSVG/>, null)}
                {renderMenuItem("Search", "#", <SearchSVG/>, null)}
                {renderMenuItem("Explore", "/explore", <ExploreSVG/>, null)}
                {renderMenuItem("Reels", "/reels", <ReelsSVG/>, null)}
                {renderMenuItem("Messages", "/messages", <MessagesSVG/>, null)}
                {renderMenuItem("Notifications", "#", <NotificationsSVG/>, null)}
                {renderMenuItem("Create", "#", <CreateSVG/>, null)}
            </NavWrapper>            
        </SideBarWrapper>
    );
}

export default SideBar;