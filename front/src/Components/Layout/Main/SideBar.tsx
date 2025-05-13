import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useMediaQuery } from "react-responsive";

import * as styles from './Main.module.css';

import LogoSVG from "/public/images/linsta.svg";
import HomeSVG from "/public/images/home.svg";
import ExploreSVG from "/public/images/explore.svg";
import SearchSVG from "/public/images/search-icon.svg";
import CreateSVG from "/public/images/create.svg";
import MainSVG from "/public/images/main.svg";

import { Div, Flex, FlexColumn, FlexColumnFullWidth, FlexRowFullWidth } from "../../../Components/Common/CombinedStyling";
import { useAppDispatch, useAppSelector, actions } from "../../../Components/Redux/redux";
import { MODAL_TYPES } from "../../../Components/Redux/slices/modals.slice";
import { Profile } from "../../../api/types";
import { AuthUser } from "../../../api/Auth";
import { getStoredSearchQueries, historyUtils, removeStoredSearchQuery, storeSearchQueries } from "../../../utils/utils";
import SearchBox from "../../../Components/Common/SearchBox";
import LoadingImage from "../../../Components/Common/LoadingImage";
import StyledLink from "../../../Components/Common/StyledLink";
import { getSuggestions } from "../../../api/ServiceController";
import useThrottle from "../../../utils/useThrottle";
import SearchResultItem from "../../../Components/Common/SearchResultsItem";
import MemoizedProfilePic from "../../../Components/Common/ProfilePicMemo";
import CustomNavMenuLink from "../../../Components/Common/CustomNavMenuLink";

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

const SearchPanel = styled(Div) <{ $isExpanded: boolean }>`
    background-color: ${props => props.theme["colors"].backgroundColor};
    position: absolute;
    left: calc(2px + ${props => props.theme["sizes"].sideBarNavWidthDefault});
    top: 0;
    height: 100%;
    width: ${props => props.$isExpanded ? props.theme["sizes"].searchPanelWidth : "0px"};
    overflow-x: hidden;
    overflow-y: auto;
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
    padding-top: 16px;
    overflow-y: auto;
    overflow-x: hidden;
`;

const SideBar: React.FC = () => {
    const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
    const [searchText, setSearchText] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [recentSearches, setRecentSearches] = useState<(string | Profile)[]>([]);

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

    useEffect(() => {    
        if (searchText && searchText.length > 0) {
            throttledGetSuggestions(searchText);
        } else {
            setRecentSearches(getStoredSearchQueries());
        }

    }, [searchText]);

    const throttledGetSuggestions = useThrottle(async (searchText: string) => {
        setIsLoading(true);

        const results = await getSuggestions(searchText);
        if (!results) {
            setIsLoading(false);
            return;
        }

        const mergedSuggestions: string[] = [
            ...results.data.postSuggestions,
            ...results.data.profileSuggestions,
        ];

        mergedSuggestions.sort();

        setIsLoading(false);
        setProfiles(results.data.uniqueProfiles);
        setSuggestions([...new Set(mergedSuggestions)].slice(0, 5));
    }, 250);    

    const handleSearchClicked = useCallback(() => {
        setIsSearchExpanded(prev => !prev);
    }, []);

    const createPostHandler = () => {
        // Open the create dialog by setting the state in redux
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.NEW_POST_MODAL, data: {} }));
    }

    const renderMenuItem = (text: string, to: string | null, iconElement: JSX.Element, paddingLeft: number = 16, onClick?: (() => void) | null) => {
        const onClickHandler = onClick ? onClick : () => true;

        return (
            <CustomNavMenuLink
                to={to}
                text={text}
                iconElement={iconElement}
                paddingLeft={paddingLeft}                
                matchesLargestBP={matchesLargestBP}
                onClick={onClickHandler}
            />
        );
    }

    const handleSearchItemClicked = useCallback((item: string | Profile) => {
        setRecentSearches(storeSearchQueries(item));
    }, []);

    const handleRecentClearAllClicked = useCallback(() => {
        localStorage.removeItem("recentSearches");
        setRecentSearches([]);
    }, []);

    const handleRemoveRecentClicked = useCallback((item: string | Profile) => {
        setRecentSearches(removeStoredSearchQuery(item));
    }, []);

    const renderResults = useCallback(() => (
        <>
            <LoadingImage isLoading={isLoading} />
            {!isLoading && suggestions.map((s, i) => (
                <SearchResultItem key={`suggestion-${i}`} item={s} onClick={() => handleSearchItemClicked(s)} />
            ))}
            {!isLoading && profiles.map((p) => (
                <SearchResultItem key={`profile-${p.userName}`} item={p} onClick={() => handleSearchItemClicked(p)} />
            ))}
        </>
    ), [isLoading, suggestions, profiles, handleSearchItemClicked]);        

    const renderRecents = useCallback(() => {
        return (
            <>
                <FlexRowFullWidth $justifyContent="space-between">
                    <Div $fontWeight="600">Recent</Div>
                    <StyledLink onClick={handleRecentClearAllClicked}>Clear all</StyledLink>
                </FlexRowFullWidth>
                <FlexColumnFullWidth $paddingTop="12px">
                    {recentSearches.map((item) => (
                        <SearchResultItem
                            key={`recent-${typeof item === 'string' ? item : item.userName}`}
                            item={item}
                            onClick={() => handleSearchItemClicked(item)}
                            onRemove={() => handleRemoveRecentClicked(item)}
                        />
                    ))}
                </FlexColumnFullWidth>
            </>            
        );
    }, [recentSearches, handleRecentClearAllClicked, handleSearchItemClicked, handleRemoveRecentClicked]);

    const profileUrl = (!historyUtils.isServer && authUser) ? authUser.userName : undefined;
    if (historyUtils.isServer) {
        return null;
    }

    return (
        <>
            <SideBarWrapper role="navigation">
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
                    {/*renderMenuItem("Reels", "/reels", <ReelsSVG />, undefined, null)*/}
                    {/*renderMenuItem("Messages", "/messages", <MessagesSVG />, undefined, null)*/}
                    {/*renderMenuItem("Notifications", "/notify", <NotificationsSVG />, undefined, null)*/}
                    {renderMenuItem("Create", null, <CreateSVG />, undefined, createPostHandler)}
                    {renderMenuItem("Profile", `/${profileUrl}`, <MemoizedProfilePic profile={profile} />, 0, null)}
                </NavWrapper>
            </SideBarWrapper>

            <SearchPanel ref={panelRef} $isExpanded={isSearchExpanded}>
                <Div $fontSize="20px" $fontWeight="600" $lineHeight="32px" $paddingBottom="24px">Search</Div>
                <Div $paddingBottom="24px" $maxWidth="95%">
                    <SearchBox
                        placeholder="Search"
                        value={searchText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                            setSearchText(e.target.value)
                        }}
                        onClear={(): void => {
                            setSearchText("");
                            setProfiles([]);
                            setSuggestions([]);
                        }}
                    />
                </Div>
                <ResultsContainer>
                    <FlexColumnFullWidth>
                        {searchText.length === 0 && renderRecents()}
                        {searchText.length > 0 && renderResults()}
                    </FlexColumnFullWidth>
                </ResultsContainer>
            </SearchPanel>
        </>
    );
}

export default SideBar;