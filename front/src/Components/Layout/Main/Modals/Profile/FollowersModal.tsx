import React, { useEffect, useState } from "react";
import styled from "styled-components";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { Profile, ProfileWithFollowStatus } from "../../../../../api/types";
import { postGetFollowersByUserId, postGetFollowingByUserId } from "../../../../../../src/api/ServiceController";
import StyledButton from "../../../../../Components/Common/StyledButton";
import { followUser } from "../../../../../utils/utils";
import { Div, FlexColumn, FlexRow, Link, Span } from "../../../../../Components/Common/CombinedStyling";
import { DEFAULT_PFP } from "../../../../../api/config";

export const FOLLOWERS_MODAL_TYPE:number = 0;
export const FOLLOWING_MODAL_TYPE:number = 1;

type FollowersModalProps = {
    onClose: any;
    profile: Profile;
    followModalType: number;
    zIndex: number;
}

type FollowersModalContentProps = {
    profile: Profile;
    followModalType: number;
}

const LikeEntryContainer = styled.div`
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
`;

type FollowData = {
    profiles: ProfileWithFollowStatus[];
}

const FollowersModalContent: React.FC<FollowersModalContentProps> = (props: FollowersModalContentProps) => {
    const [followData, setFollowData] = useState<FollowData>({profiles: []});

    useEffect(() => {        
        const userId: string = props.profile.userId;
        const results: ProfileWithFollowStatus[] = [];

        if(props.followModalType === FOLLOWERS_MODAL_TYPE) {
            postGetFollowersByUserId({userId}).then(entry => {                
                for(const value of entry.data) {
                    results.push(value);
                }

                setFollowData({profiles: results});
            })
        } else if(props.followModalType === FOLLOWING_MODAL_TYPE) {
            postGetFollowingByUserId({userId}).then(entry => {
                for(const value of entry.data) {
                    results.push(value);
                }

                setFollowData({profiles: results});
            });
        }
    }, []);

    const toggleFollowState = async (userId: string, followUserId: string, shouldFollow: boolean) => {
        const result = await followUser(userId, followUserId, shouldFollow);

        // If successful the state needs to be updated to reflect the new follow status
        if (result) {
            const newFollowData = { ...followData };
            for(const profile of newFollowData.profiles) {
                if(profile.userId === followUserId) {
                    profile.isFollowed = shouldFollow;
                    break;
                }
            }
            
            setFollowData(newFollowData);
        }
    }


    const renderFollowList = () => {
        if (followData == null || followData.profiles.length === 0) {
            return <></>;
        }

        const results = followData.profiles.map((entry:ProfileWithFollowStatus) => {
            if(entry.userId == props.profile.userId) {
                return <div key="0"></div>; //prevent 'element in list should have unique key' error                
            }

            const profile:ProfileWithFollowStatus = entry;
            const pfp:string = profile.pfp ? profile.pfp : DEFAULT_PFP;
            const isFollowing:boolean = profile.isFollowed;

            return (
                <LikeEntryContainer key={entry.userId}>
                    <FlexRow $paddingBottom="8px" $paddingTop="8px">
                        <div>
                            <Div $marginRight="10px">
                                <ProfilePicLink href={`/${profile.userName}/`} role="link">
                                    <ProfilePicImg src={pfp}
                                        aria-label={`${profile.userName}'s profile picture`}
                                        alt={`${profile.userName}'s profile picture`} />
                                </ProfilePicLink>
                            </Div>
                        </div>
                        <FlexRow $flexBasis="auto" $flexShrink="1" $flexGrow="1" $flexWrap="wrap" $position="relative" $paddingTop="5px">
                            <FlexColumn $flexGrow="1" $position="relative">
                                <div>
                                    <Link href={`/${profile.userName}/`} role="link">
                                        <Span $fontWeight="700">{profile.userName}</Span>
                                    </Link>
                                </div>
                                <div>
                                    <span>
                                        {`${profile.firstName} ${profile.lastName}`}
                                    </span>
                                </div>
                            </FlexColumn>
                        </FlexRow>
                        <div>
                            <StyledButton
                                style={{ marginBottom: "12px" }}
                                useSecondaryColors={isFollowing}
                                text={isFollowing ? "Following" : "Follow"}
                                onClick={async () => await toggleFollowState(props.profile.userId, entry.userId, !isFollowing)}>                                
                            </StyledButton>
                        </div>
                    </FlexRow>
                </LikeEntryContainer>
            );
        });

        return results;
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
            element: <FollowersModalContent profile={props.profile} followModalType={props.followModalType}/>,
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