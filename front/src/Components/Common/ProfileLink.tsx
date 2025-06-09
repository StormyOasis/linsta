import React from 'react';
import styled from 'styled-components';
import { FlexColumn, FlexRow, Span } from './CombinedStyling';
import { DEFAULT_PFP, HOST } from '../../api/config';
import StyledLink from './StyledLink';
import { Profile } from '../../api/types';

type ProfileLinkProps = {
    collaborators: Record<string, Profile>;
    url: string|null;
    userName: string;
    fullName?: string|null;
    location?: string|null;
    pfp?: string|null;
    pfpWidth?: string;
    showFullName: boolean;
    showPfp: boolean;
    showCollaborators?: boolean;
    showUserName: boolean;
    showLocation: boolean;
    children?: any;
    onClick?: () => void;
    onCollaboratorsClick?: () => void;
};

const ProfilePicWrapper = styled(Span)`
    display: inline-block;
    border-radius: 50%;
    padding-right: 7px;
`;

const ProfileLinkWrapper = styled(Span)`
    height: fit-content;
`;

const PfPImg = styled.img<{ $pfpWidth: any }>`
    width: ${props => props.$pfpWidth ? props.$pfpWidth : "32px"};
    height: ${props => props.$pfpWidth ? props.$pfpWidth : "32px"};
    border-radius: 50%;
`;

const ProfileLink: React.FC<ProfileLinkProps> = (props: ProfileLinkProps) => {
    const renderProfilePic = () => {
        if(!props.showPfp) {
            return <></>;
        }
        
        const pfpUrl = props.pfp && props.pfp.length > 0 ? props.pfp : DEFAULT_PFP;
        return (
            <ProfilePicWrapper>
                <StyledLink noHover={true} to={props.url || ""} aria-label={`${props.userName}'s profile picture link`}>
                    <PfPImg
                        $pfpWidth={props.pfpWidth}
                        src={pfpUrl}
                        alt={`${props.userName}'s profile picture`}
                        aria-label={`${props.userName}'s profile picture`}
                    ></PfPImg>
                </StyledLink>
            </ProfilePicWrapper>
        )
    }

    const renderUserName = () => {
        if(!props.showUserName) {
            return <></>;
        }

        const collaboratorsCount = Object.values(props.collaborators || {})?.length - 1;//-1 because we don't want to include ourself
        const collaboratorsText = collaboratorsCount === 1 ? "other" : "others"

        return (
            <ProfileLinkWrapper>
                <FlexRow>
                    <StyledLink 
                        useSecondaryColors={true}
                        aria-label={`${props.userName}'s profile link`}
                        role="link"
                        to={props.url || ""}
                        noHover={true}
                        styleOverride={{ marginRight: "5px" }}>{props.userName}</StyledLink>
                    {(props.showCollaborators && collaboratorsCount > 0) && 
                        <>
                            <Span $marginRight="4px">and</Span>
                            <StyledLink
                                useSecondaryColors={true}
                                aria-label={`${props.userName}'s collaborators`}     
                                noHover={true}
                                onClick={props.onCollaboratorsClick}
                                >
                                    {`${collaboratorsCount} ${collaboratorsText}`}
                            </StyledLink>
                        </>
                    }
                </FlexRow>
            </ProfileLinkWrapper>   
        );
    }

    const renderFullName = () => {
        if(!props.showFullName) {
            return <></>;
        }

        return (
            <ProfileLinkWrapper>
                <StyledLink
                    useSecondaryColors={true}
                    noHover={true}
                    aria-label={`${props.fullName}'s profile link`}
                    role="link"
                    styleOverride={{ marginRight: "5px", fontWeight: "500", fontSize: "13px" }}
                    to={props.url || ""}>
                        {props.fullName}
                </StyledLink>
            </ProfileLinkWrapper>   
        );        
    }

    const renderLocation = () => {
        if(!props.showLocation) {
            return <></>;
        }

        return (
            <ProfileLinkWrapper>
                <StyledLink
                    useSecondaryColors={true}
                    noHover={true}                
                    aria-label={`Search ${props.location}`}
                    role="link"
                    styleOverride={{ marginRight: "5px", fontWeight: "500", fontSize: "13px" }}
                    to={`${HOST}/explore?q=${encodeURIComponent(props.location || "")}`}>
                        {props.location}
                </StyledLink>                        
            </ProfileLinkWrapper>     
        );        
    }


    if(!props.url && !props.onClick) {
        throw new Error("Profile link must have url or click handler");
    }

    return (
        <FlexRow>
            {renderProfilePic()}
            <FlexColumn $alignSelf="center">
                {renderUserName()}
                {renderFullName()}
                {renderLocation()}
            </FlexColumn>                  
        </FlexRow>
    );
};

export default ProfileLink;