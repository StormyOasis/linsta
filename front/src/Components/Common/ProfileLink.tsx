import React from 'react';
import styled from 'styled-components';
import { BoldLink, FlexColumn, FlexRow, Link, Span } from './CombinedStyling';
import { DEFAULT_PFP, HOST } from '../../api/config';

type ProfileLinkProps = {
    url: string;
    userName: string;
    fullName?: string|null;
    location?: string|null;
    pfp?: string|null;
    pfpWidth?: string;
    showFullName: boolean;
    showPfp: boolean;
    showUserName: boolean;
    showLocation: boolean;
    children?: any;
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

const FullNameLink = styled(Link)`
    margin-right: 5px;
    font-size: 13px;
    font-weight: 500;
`;

const ProfileLink: React.FC<ProfileLinkProps> = (props: ProfileLinkProps) => {

    const pfpUrl = props.pfp && props.pfp.length > 0 ? props.pfp : DEFAULT_PFP;
    return (
        <FlexRow>
            {props.showPfp &&
                <ProfilePicWrapper>
                    <Link role="link" href={props.url} aria-label={`${props.userName}'s profile picture link`}>
                        <PfPImg
                            $pfpWidth={props.pfpWidth}
                            src={pfpUrl}
                            alt={`${props.userName}'s profile picture`}
                            aria-label={`${props.userName}'s profile picture`}
                        ></PfPImg>
                    </Link>
                </ProfilePicWrapper>
            }
            <FlexColumn style={{alignSelf: "center"}}>
                {props.showUserName &&
                    <ProfileLinkWrapper>
                        <BoldLink
                            aria-label={`${props.userName}'s profile link`}
                            role="link"
                            href={props.url}
                            style={{ marginRight: "5px" }}>{props.userName}</BoldLink>
                    </ProfileLinkWrapper>        
                }
                {props.showFullName && 
                    <ProfileLinkWrapper>
                        <FullNameLink
                            aria-label={`${props.fullName}'s profile link`}
                            role="link"
                            href={props.url}>{props.fullName}</FullNameLink>
                    </ProfileLinkWrapper>                 
                }
                {props.showLocation && 
                    <ProfileLinkWrapper>
                        <FullNameLink
                            aria-label={`Search ${props.location}`}
                            role="link"
                            href={`${HOST}/explore?q=${encodeURIComponent(props.location || "")}`}>
                                {props.location}
                        </FullNameLink>                        
                    </ProfileLinkWrapper>                 
                }
            </FlexColumn>                  
        </FlexRow>
    );
};

export default ProfileLink;