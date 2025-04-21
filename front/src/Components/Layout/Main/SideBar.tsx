import React, { ReactNode, useEffect, useRef, useState } from "react";
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
import { Div, Flex, FlexColumn, Span } from "../../../Components/Common/CombinedStyling";
import { useAppDispatch, useAppSelector, actions } from "../../../Components/Redux/redux";
import { MODAL_TYPES } from "../../../Components/Redux/slices/modals.slice";
import { Profile } from "../../../api/types";
import { AuthUser } from "../../../api/Auth";
import { getPfpFromProfile, historyUtils } from "../../../utils/utils";
import SearchBox from "../../../Components/Common/SearchBox";

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

    @media screen and (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
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

    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
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

const DivLink = styled(Div)`
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

    @media (min-width: ${props => props.theme["breakpoints"].lg - 1}px) {
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

const SearchPanel = styled(Div)<{$isExpanded: boolean}>`
    background-color: ${props => props.theme["colors"].backgroundColor};
    position: absolute;
    left: calc(2px + ${props => props.theme["sizes"].sideBarNavWidthDefault});
    top: 0;
    height: 100%;
    width: ${props => props.$isExpanded ? props.theme["sizes"].searchPanelWidth : "0px"};
    overflow: hidden;
    transition: width 0.3s ease, padding 0.3s ease, box-shadow 0.3s ease;
    z-index: 50;
    box-sizing: border-box;
    box-shadow: ${(props) => props.$isExpanded ? '0 0 15px rgba(0, 0, 0, 0.2)' : 'none'};    
    padding: ${props => props.$isExpanded ? "1rem" : "0px"};
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;    

    @media (min-width: ${props => props.theme["breakpoints"].md}px) and 
        (max-width: ${props => props.theme["breakpoints"].lg - 1}px) {

        left: ${props => props.theme["sizes"].sideBarNavWidthNarrow};
    }    
`;

const ResultsContainer = styled(Flex)`
    border-top: 1px solid ${props => props.theme["colors"].borderDefaultColor};
`;

const SideBar: React.FC = () => {
    const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
    const [searchText, setSearchText] = useState<string>("");

    const panelRef = useRef<HTMLDivElement | null>(null);

    const matchesLargestBP = useMediaQuery({ minWidth: 1280 });
    const matchesSmallestBP = useMediaQuery({ maxWidth: 767 });

    const authUser: AuthUser = useAppSelector((state: any) => state.auth.user);
    const profile: Profile = useAppSelector((state: any) => state.profile.profile);

    const dispatch = useAppDispatch();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsSearchExpanded(false);
            }
        }

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSearchExpanded(false);
            }
        }

        if (isSearchExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isSearchExpanded]);

    const MemoizedNavLink = React.memo(({ to, text, iconElement, paddingLeft, onClick }: any) => {
        const LinkContents: ReactNode =
            <InnerNavLinkWrapper>
                <Div className={styles.iconWrapper}>
                    {iconElement}
                </Div>
                {matchesLargestBP &&
                    <Div $paddingLeft={`${paddingLeft}px`}>
                        <Span className={styles.text}>{text}</Span>
                    </Div>
                }
            </InnerNavLinkWrapper>;

        if (to != null) {
            return (
                <NavLink to={to} onClick={onClick} aria-label={text}>
                    {LinkContents}
                </NavLink>
            );
        }

        return (
            <DivLink onClick={onClick} aria-label={text}>
                {LinkContents}
            </DivLink>
        );
    });

    const MemoizedProfilePic = React.memo(() => {
        return (
            <ProfilePicWrapper>
                {profile && <PfpImg
                    src={getPfpFromProfile(profile)}
                    alt={`${profile.userName}'s profile picture`}
                    aria-label={`${profile.userName}'s profile picture`} />
                }
            </ProfilePicWrapper>
        );
    });

    const handleSearchClicked = () => {
        setIsSearchExpanded(!isSearchExpanded);
    }

    const createPostHandler = () => {
        // Open the create dialog by setting the state in redux
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.NEW_POST_MODAL, data: {} }));
    }

    const renderMenuItem = (text: string, to: string | null, iconElement: JSX.Element, paddingLeft: number = 16, onClick?: (() => void) | null) => {
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
    if (historyUtils.isServer) {
        return null;
    }

    return (
        <>
            <SideBarWrapper>
                {!matchesSmallestBP &&
                    <Div className={styles.logoWrapper}>
                        <Link to="/" aria-label="Home">
                            {matchesLargestBP ? <LogoSVG /> : <MainSVG />}
                        </Link>
                    </Div>
                }
                <NavWrapper>
                    {renderMenuItem("Home", "/", <HomeSVG />, undefined, null)}
                    {!matchesSmallestBP && renderMenuItem("Search", null, <SearchSVG />, undefined, handleSearchClicked)}
                    {renderMenuItem("Explore", "/explore", <ExploreSVG />, undefined, null)}
                    {renderMenuItem("Reels", "/reels", <ReelsSVG />, undefined, null)}
                    {renderMenuItem("Messages", "/messages", <MessagesSVG />, undefined, null)}
                    {renderMenuItem("Notifications", "/notify", <NotificationsSVG />, undefined, null)}
                    {renderMenuItem("Create", null, <CreateSVG />, undefined, createPostHandler)}
                    {renderMenuItem("Profile", `/${profileUrl}`, <MemoizedProfilePic />, 0, null)}
                </NavWrapper>
            </SideBarWrapper>

            <SearchPanel ref={panelRef} $isExpanded={isSearchExpanded}>
                <Div $fontSize="20px" $fontWeight="600" $lineHeight="32px" $paddingBottom="24px">Search</Div>
                <Div $paddingBottom="24px" $maxWidth="95%">
                    <SearchBox 
                        placeholder="Search" 
                        value={searchText} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>):void => {                        
                            setSearchText(e.target.value)
                        }}                    
                        onClear={():void => setSearchText("")}                    
                    />
                </Div>
                <ResultsContainer>
                    
                </ResultsContainer>
            </SearchPanel>
        </>
    );
}

export default SideBar;