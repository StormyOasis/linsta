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
import { FlexColumn } from "../../../Components/Common/CombinedStyling";
import { useAppDispatch, useAppSelector, actions } from "../../../Components/Redux/redux";
import { NEW_POST_MODAL } from "../../../Components/Redux/slices/modals.slice";

const SideBarWrapper = styled.div`
    z-index: 50;
    margin: 0;
    padding: 0;
    width: ${props => props.theme["sizes"].sideBarNavWidthDefault};
    position: fixed;
    height: 100%;
    overflow: hidden;
    background-color: ${props => props.theme["colors"].backgroundColor};
    border-right: 1px solid ${props => props.theme["colors"].borderDefaultColor};

    @media (min-width: ${props => props.theme["breakpoints"].md}px) and 
            (max-width: ${props => props.theme["breakpoints"].lg - 1}px) {

        width: ${props => props.theme["sizes"].sideBarNavWidthNarrow};
    }

    @media screen and (max-width: ${props => props.theme["breakpoints"].md-1}px) {
      width: 100%;
      height: auto;
      position: fixed;
      bottom: 0;
      border-top: 1px solid ${props => props.theme["colors"].borderDefaultColor};
    }
`;

const NavWrapper = styled(FlexColumn)`
    width: 100%;
    flex-grow: 1;

    @media (max-width: ${props => props.theme["breakpoints"].md-1}px) {
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

    @media (min-width: ${props => props.theme["breakpoints"].lg-1}px) {
        width: 100%;
        align-items: center;
        flex-direction: row;
    }
`;

const SideBar: React.FC = () => {
    const matchesLargestBP = useMediaQuery({minWidth: 1280});
    const matchesSmallestBP = useMediaQuery({maxWidth: 767});

    const dispatch = useAppDispatch();

    const createPostHandler = (e: React.SyntheticEvent<MouseEvent>) => {
        e.preventDefault();
        e.stopPropagation();

        // Open the create dialog by setting the state in redux
        dispatch(actions.modalActions.openModal({modalName: NEW_POST_MODAL, data: {}}));
    }

    const renderMenuItem = (text: string, to: string, iconElement:any, onClick?: any) => {
        const onClickHandler = onClick ? onClick : () => true;

        return (
            <NavLink to={to} onClick={onClickHandler} aria-label={text}>
                <InnerNavLinkWrapper>
                    <div className={styles.iconWrapper}>
                        <div className={styles.iconWrapper}>
                            {iconElement}
                        </div>
                    </div>
                    {matchesLargestBP &&
                        <div className={styles.textWrapper}>
                            <span className={styles.text}>{text}</span>                                
                        </div>                            
                    }
                </InnerNavLinkWrapper>
            </NavLink>
        );
    }

    return (
        <SideBarWrapper>
            {!matchesSmallestBP && 
                <div className={styles.logoWrapper}>
                    <Link to="/" aria-label="Home">
                        {matchesLargestBP ? <LogoSVG /> : <MainSVG />}
                    </Link>
                </div>
            }
            <NavWrapper>
                {renderMenuItem("Home", "/", <HomeSVG/>, null)}
                {renderMenuItem("Search", "#", <SearchSVG/>, null)}
                {renderMenuItem("Explore", "/explore", <ExploreSVG/>, null)}
                {renderMenuItem("Reels", "/reels", <ReelsSVG/>, null)}
                {renderMenuItem("Messages", "/messages", <MessagesSVG/>, null)}
                {renderMenuItem("Notifications", "#", <NotificationsSVG/>, null)}
                {renderMenuItem("Create", "#", <CreateSVG/>, createPostHandler)}
            </NavWrapper>            
        </SideBarWrapper>
    );
}

export default SideBar;