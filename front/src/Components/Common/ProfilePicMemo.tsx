import React from 'react';
import styled from "styled-components";

import { getPfpFromProfile } from "../../utils/utils";
import { Span } from './CombinedStyling';

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

const MemoizedProfilePic = React.memo(({ profile, marginRight = "0px" }: any) => {
    return (
        <ProfilePicWrapper $marginRight={marginRight}>
            {profile && <PfpImg
                src={getPfpFromProfile(profile)}
                alt={`${profile.userName}'s profile picture`}
                aria-label={`${profile.userName}'s profile picture`} />
            }
        </ProfilePicWrapper>
    );
});

export default MemoizedProfilePic