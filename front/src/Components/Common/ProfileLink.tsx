import React from 'react';
import styled from 'styled-components';
import { BoldLink, Link } from './CombinedStyling';
import { DEFAULT_PFP } from '../../api/config';

type ProfileLinkProps = {
    url: string;
    text: string;
    pfp?: string|null;
    showPfp: boolean;
    showUserName: boolean;
    children?: any;
};

const ProfilePicWrapper = styled.span`
    display: inline-block;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    padding-right: 10px;
`;

const ProfileLinkWrapper = styled.span`
    align-self: center;
    height: fit-content;
`;

const ProfileLink: React.FC<ProfileLinkProps> = (props: ProfileLinkProps) => {

    const pfpUrl = props.pfp ? props.pfp : DEFAULT_PFP;

    return (
        <span style={{display: "inline-flex"}}>
            {props.showPfp &&
                <ProfilePicWrapper>
                    <Link role="link" href={props.url}>
                        <img
                            src={pfpUrl}
                            alt={`${props.text}'s profile picture`}
                            aria-label={`${props.text}'s profile picture`}
                        ></img>
                    </Link>
                </ProfilePicWrapper>
            }
            {props.showUserName &&
                <ProfileLinkWrapper>
                    <BoldLink
                        role="link"
                        href={props.url}
                        style={{ marginRight: "5px" }}>{props.text}</BoldLink>
                </ProfileLinkWrapper>        
            }                   
        </span>
    );
};

export default ProfileLink;