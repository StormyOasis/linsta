import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { Flex, FlexColumnFullWidth, FlexRowFullWidth, Div } from "../Common/CombinedStyling";
import { isHashtag } from "../../utils/utils";
import { Profile } from "../../api/types";
import StyledLink from "./StyledLink";
import XSVG from "/public/images/x.svg";
import SearchSVG from "/public/images/search-icon.svg";
import HashtagSVG from "/public/images/hashtag.svg";
import MemoizedProfilePic from "./ProfilePicMemo";

const InnerNavLinkWrapper = styled(Div)`
    padding: 5px;
    margin-bottom: 2px;
    display: inline-flex;
    cursor: pointer;
    border-radius: 8px;
    width: 100%;

    &:hover {
        background-color: ${(props) => props.theme['colors'].navLinkHoverColor};
    }        

    @media (min-width: ${props => props.theme["breakpoints"].lg - 1}px) {        
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

const SearchIconWrapper = styled(Div)`
    border-radius: 50%;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    display: inline-flex;
    position: relative;    
    font-weight: 600;
    padding: 4px;
    background-color: ${(props) => props.theme['colors'].borderDefaultColor};
`;

const MemoizedSearchIcon = React.memo(({ text }: any) => {
    return (
        <SearchIconWrapper $marginRight="20px">
            {isHashtag(text as string) ? <HashtagSVG /> : <SearchSVG />}
        </SearchIconWrapper>
    );
});

interface SearchResultItemProps {
    item: string | Profile; // string or Profile
    onClick?: () => void;
    onRemove?: () => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ item, onClick, onRemove }) => {
    const isProfile = typeof item !== "string";
    const url = isProfile ? `/${item.userName}` : isHashtag(item)
            ? `/explore/tags/${item.substring(1)}`
            : `/explore/search/${item}`;

    return (
        <Flex>
            <NavLink to={url} style={{ justifyContent: "normal" }} onClick={onClick} aria-label={url}>
                <InnerNavLinkWrapper>
                    <FlexRowFullWidth $alignItems="center">
                        <Div>
                            {isProfile
                                ? <MemoizedProfilePic profile={item} marginRight="20px" />
                                : <MemoizedSearchIcon text={item} />
                            }
                        </Div>
                        <FlexColumnFullWidth>
                            {isProfile ? (
                                <>
                                    <Div $fontWeight="600">{item.userName}</Div>
                                    <Div $fontSize="12px">{`${item.firstName} ${item.lastName}`.trim()}</Div>
                                </>
                            ) : (
                                <Div>{`${item}`.trim()}</Div>
                            )}
                        </FlexColumnFullWidth>
                        {onRemove &&
                            <StyledLink styleOverride={{marginRight: "5px"}} onClick={(e:MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onRemove();
                            }}>
                                <XSVG />
                            </StyledLink>
                        }
                    </FlexRowFullWidth>
                </InnerNavLinkWrapper>
            </NavLink>
        </Flex>
    );
};

export default SearchResultItem;
