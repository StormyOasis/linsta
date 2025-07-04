import React from 'react';
import styled from "styled-components";

import { getPfpFromProfile } from "../../utils/utils";
import { Span } from './CombinedStyling';
import { DEFAULT_PFP } from '../../api/config';

const ProfilePicWrapper = styled(Span)`
    display: inline-block;
    width: 30px;
    height: 30px;
    object-fit: contain;
    border-radius: 50%;
    padding-right: 7px;
`;

const PfpImg = styled.img<{$isValidPfp:boolean}>`
    border-radius: 50%;
    max-width: 30px;
    max-height: 30px;
    width: 30px;
    height: 30px;
`;

const MemoizedProfilePic = React.memo(({ profile, marginRight = "0px" }: any) => {
    const pfp = getPfpFromProfile(profile);
    const isValidPfp = pfp !== DEFAULT_PFP;

    return (
        <ProfilePicWrapper $marginRight={marginRight}>
            {profile && <PfpImg
                $isValidPfp={isValidPfp}
                src={pfp}
                alt={`${profile.userName}'s profile picture`}
                aria-label={`${profile.userName}'s profile picture`} />
            }
        </ProfilePicWrapper>
    );
});

export default MemoizedProfilePic