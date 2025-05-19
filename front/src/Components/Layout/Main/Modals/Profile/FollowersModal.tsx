import React, { useEffect, useState, useCallback } from "react";
import styled from "styled-components";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { Profile, ProfileWithFollowStatus } from "../../../../../api/types";
import { postGetFollowersByUserId, postGetFollowingByUserId } from "../../../../../../src/api/ServiceController";
import StyledButton from "../../../../../Components/Common/StyledButton";
import { followUser } from "../../../../../utils/utils";
import { Div, FlexColumn, FlexRow, Link, Span } from "../../../../../Components/Common/CombinedStyling";
import { DEFAULT_PFP } from "../../../../../api/config";

export const FOLLOWERS_MODAL_TYPE: number = 0;
export const FOLLOWING_MODAL_TYPE: number = 1;

type FollowersModalProps = {
    onClose: () => void;
    profile: Profile;
    followModalType: number;
    zIndex: number;
}

type FollowersModalContentProps = {
    profile: Profile;
    followModalType: number;
}

const LikeEntryContainer = styled(Div)`
    width: 100%;
    max-width: 100%;
`;

const ProfilePicLink = styled(Link)`
    width: 45px;
    height: 45px;
    overflow: hidden;
    display: flex;
    position: relative;
    border-bottom-right-radius: 50%;
    border-top-left-radius: 50%;
`;

const ProfilePicImg = styled.img`
    width: 100%;
    height: 100%;
    border-radius:50%;
`;

type FollowData = {
    profiles: ProfileWithFollowStatus[];
}

const FollowersModalContent: React.FC<FollowersModalContentProps> = (props: FollowersModalContentProps) => {
    const [followData, setFollowData] = useState<FollowData>({ profiles: [] });

    // Fetch the followers and following data
    const fetchFollowData = useCallback(async () => {
        const userId = props.profile.userId;
        const fetchProfiles = props.followModalType === FOLLOWERS_MODAL_TYPE
            ? postGetFollowersByUserId({ userId })
            : postGetFollowingByUserId({ userId });

        const entry = await fetchProfiles;

        setFollowData({ profiles: entry.data });
    }, [props.profile.userId, props.followModalType]);

    useEffect(() => {
        fetchFollowData();
    }, [fetchFollowData]);

    const toggleFollowState = useCallback(async (userId: string, followUserId: string, shouldFollow: boolean) => {
        const result = await followUser(userId, followUserId, shouldFollow);

        // If successful the state needs to be updated to reflect the new follow status
        if (result) {
            const newFollowData = { ...followData };
            for (const profile of newFollowData.profiles) {
                if (profile.userId === followUserId) {
                    profile.isFollowed = shouldFollow;
                    break;
                }
            }

            setFollowData(newFollowData);
        }
    }, [followData]);

    const renderFollowList = () => {
        if (followData == null || followData.profiles.length === 0) {
            return <></>;
        }

        return followData.profiles.map((entry: ProfileWithFollowStatus) => {
            const { userId, userName, firstName, lastName, pfp, isFollowed } = entry;

            if (userId == props.profile.userId) {
                return <Div key="0"></Div>; //prevent 'element in list should have unique key' error                
            }

            const isFollowing: boolean = isFollowed;
            const pfpUrl: string = pfp || DEFAULT_PFP;

            return (
                <LikeEntryContainer key={userId}>
                    <FlexRow $paddingBottom="8px" $paddingTop="8px">
                        <Div>
                            <Div $marginRight="10px">
                                <ProfilePicLink href={`/${userName}/`} role="link">
                                    <ProfilePicImg src={pfpUrl}
                                        aria-label={`${userName}'s profile picture`}
                                        alt={`${userName}'s profile picture`} />
                                </ProfilePicLink>
                            </Div>
                        </Div>
                        <FlexRow $flexBasis="auto" $flexShrink="1" $flexGrow="1" $flexWrap="wrap" $position="relative" $paddingTop="5px">
                            <FlexColumn $flexGrow="1" $position="relative">
                                <Div>
                                    <Link href={`/${userName}/`} role="link">
                                        <Span $fontWeight="600">{userName}</Span>
                                    </Link>
                                </Div>
                                <Div>
                                    <Span>
                                        {`${firstName} ${lastName}`}
                                    </Span>
                                </Div>
                            </FlexColumn>
                        </FlexRow>
                        <Div>
                            <StyledButton
                                style={{ marginBottom: "12px" }}
                                useSecondaryColors={isFollowing}
                                text={isFollowing ? "Following" : "Follow"}
                                onClick={() => toggleFollowState(props.profile.userId, userId, !isFollowing)}>
                            </StyledButton>
                        </Div>
                    </FlexRow>
                </LikeEntryContainer>
            );
        });
    }

    if (props.profile == null) {
        return <></>;
    }

    return (
        <Div>
            <FlexColumn $alignItems="stretch" $paddingTop="15px">
                {renderFollowList()}
            </FlexColumn>
        </Div>
    );
}

const FollowersModal: React.FC<FollowersModalProps> = (props: FollowersModalProps) => {
    const steps = [
        {
            title: props.followModalType === FOLLOWERS_MODAL_TYPE ? "Followers" : "Following",
            element: <FollowersModalContent profile={props.profile} followModalType={props.followModalType} />,
            options: {
                showFooter: false,
            },
        }
    ];

    return (
        <>
            <MultiStepModal zIndex={props.zIndex} steps={steps} onClose={props.onClose} stepNumber={0} showLoadingAnimation={false} />
        </>
    );
}

export default FollowersModal;