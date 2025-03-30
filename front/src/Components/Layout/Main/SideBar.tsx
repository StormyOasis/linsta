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
import { Div, FlexColumn, Span } from "../../../Components/Common/CombinedStyling";
import { useAppDispatch, useAppSelector, actions } from "../../../Components/Redux/redux";
import { MODAL_TYPES } from "../../../Components/Redux/slices/modals.slice";
import { Profile } from "../../../api/types";
import { AuthUser } from "../../../api/Auth";
import { getPfpFromProfile, historyUtils } from "../../../utils/utils";

const SideBarWrapper = styled(Div)`
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

const InnerNavLinkWrapper = styled(Div)`
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

const ProfilePicWrapper = styled(Span)`
    display: inline-block;
    width: 32px;
    height: 32px;
    object-fit: contain;
    border-radius: 50%;
    padding-right: 7px;
`;

const PfpImg = styled.img`
    border-radius: 50%;
    max-width: 32px;
    max-height: 32px;
`;

const SideBar: React.FC = () => {    
    const matchesLargestBP = useMediaQuery({minWidth: 1280});
    const matchesSmallestBP = useMediaQuery({maxWidth: 767});
    
    const authUser: AuthUser = useAppSelector((state: any) => state.auth.user);
    const profile: Profile = useAppSelector((state: any) => state.profile.profile);

    const dispatch = useAppDispatch();

    const createPostHandler = () => {
        // Open the create dialog by setting the state in redux
        dispatch(actions.modalActions.openModal({modalName: MODAL_TYPES.NEW_POST_MODAL, data: {}}));
    }

    const MemoizedNavLink = React.memo(({to, text, iconElement, paddingLeft, onClick}:any) => {
        return (
            <NavLink to={to} onClick={onClick} aria-label={text}>
                <InnerNavLinkWrapper>
                    <Div className={styles.iconWrapper}>
                        {iconElement}
                    </Div>
                    {matchesLargestBP &&
                        <Div style={{paddingLeft: `${paddingLeft}px`}}>
                            <Span className={styles.text}>{text}</Span>                                
                        </Div>                            
                    }
                </InnerNavLinkWrapper>
            </NavLink>
        );
    });    

    const renderMenuItem = (text: string, to: string, iconElement: JSX.Element, paddingLeft: number = 16, onClick?: (() => void)|null) => {
        const onClickHandler = onClick ? onClick : () => true;

        return (
            <MemoizedNavLink
                to={to}
                text={text}
                iconElement={iconElement}
                paddingLeft={paddingLeft}
                onClick={onClickHandler}
            />
        );
    }

    const profileUrl = (!historyUtils.isServer && authUser) ? authUser.userName : undefined;
    if(historyUtils.isServer) {
        return null;
    }

    return (
        <SideBarWrapper>
            {!matchesSmallestBP && 
                <Div className={styles.logoWrapper}>
                    <Link to="/" aria-label="Home">
                        {matchesLargestBP ? <LogoSVG /> : <MainSVG />}
                    </Link>
                </Div>
            }
            <NavWrapper>
                {renderMenuItem("Home", "/", <HomeSVG/>, undefined, null)}
                {renderMenuItem("Search", "#", <SearchSVG/>, undefined, null)}
                {renderMenuItem("Explore", "/explore", <ExploreSVG/>, undefined, null)}
                {renderMenuItem("Reels", "/reels", <ReelsSVG/>, undefined, null)}
                {renderMenuItem("Messages", "/messages", <MessagesSVG/>, undefined, null)}
                {renderMenuItem("Notifications", "#", <NotificationsSVG/>, undefined, null)}
                {renderMenuItem("Create", "#", <CreateSVG/>, undefined, createPostHandler)}
                {renderMenuItem("Profile", `/${profileUrl}`, 
                    <ProfilePicWrapper>
                        {profile && <PfpImg                            
                            src={getPfpFromProfile(profile)}
                            alt={`${profile.userName}'s profile picture`}
                            aria-label={`${profile.userName}'s profile picture`} />
                        }
                    </ProfilePicWrapper>, 0, null)}
            </NavWrapper>            
        </SideBarWrapper>
    );
}

export default SideBar;