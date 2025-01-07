import React, { useEffect, useState } from "react";
import styled from "styled-components";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { Post } from "../../../../../api/types";
import { postBulkGetInfoAndFollowStatus } from "../../../../../../src/api/ServiceController";
import StyledButton from "../../../../../Components/Common/StyledButton";
import { followUser } from "../../../../../utils/utils";
import { Div, FlexColumn, FlexRow, Link, Span } from "../../../../../Components/Common/CombinedStyling";

type LikesModalProps = {
    onClose: any;
    post: Post;
    zIndex: number;
}

type LikesModalContentProps = {
    post: Post;
}

type BulkFollowResultEntry = {
    firstName: string;
    lastName: string;
    userName: string;
    userId: string;
    followId?: string|null;
    pfp?: string|null;
}

interface BulkFollowResultEntryInt {
    [key: string]: BulkFollowResultEntry;
}

const LikesModalInfoText = styled.span`
    color: ${props => props.theme['colors'].mediumTextColor};
`;

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

const LikesModalContent: React.FC<LikesModalContentProps> = (props: LikesModalContentProps) => {
    const [likeFollowData, setLikeFollowData] = useState<BulkFollowResultEntryInt|null>(null);

    useEffect(() => {
        const userIds:string[] = props.post.global.likes.map(entry => entry.userId);
        const userId:string = props.post.user.userId;

        postBulkGetInfoAndFollowStatus({userId, userIds}).then((result:any) => {
            setLikeFollowData(result.data);
        })
    }, []);
    
    const renderLikeList = () => {
        if(likeFollowData == null) {
            return <></>;
        }

        const results = props.post.global.likes.map(entry => {
            if(entry.userId == props.post.user.userId) {
                return <div key="0"></div>; //prevent 'element in list should have unique key' error
            }

            const lfd = likeFollowData[entry.userId];
            if(lfd == null) {
                return <div key="0"></div>; //prevent 'element in list should have unique key' error
            }

            const pfp = lfd.pfp ? lfd.pfp : "/public/images/profile-user-default-pfp.svg";
            const isFollowing = lfd.followId != null;

            return (
                <LikeEntryContainer key={entry.userId}>                        
                    <FlexRow $paddingBottom="8px" $paddingTop="8px">
                        <div>
                            <Div $marginRight="10px">
                                <ProfilePicLink href={`/${lfd.userName}/`} role="link">
                                    <ProfilePicImg src={pfp} 
                                        aria-label={`${lfd.userName}'s profile picture`} 
                                        alt={`${lfd.userName}'s profile picture`} />
                                </ProfilePicLink>
                            </Div>
                        </div>
                        <FlexRow $flexBasis="auto" $flexShrink="1" $flexGrow="1" $flexWrap="wrap" $position="relative" $paddingTop="5px">
                            <FlexColumn $flexGrow="1" $position="relative">
                                <div>
                                    <Link href={`/${lfd.userName}/`} role="link">
                                        <Span $fontWeight="700">{lfd.userName}</Span>
                                    </Link>
                                </div>
                                <div>
                                    <span>
                                        {`${lfd.firstName} ${lfd.lastName}`}
                                    </span>
                                </div>
                            </FlexColumn>
                        </FlexRow>
                        <div>
                            <StyledButton 
                                style={{marginBottom: "12px"}} 
                                useSecondaryColors={isFollowing} 
                                text={isFollowing ? "Following" : "Follow"}
                                onClick={() => toggleFollowState(props.post.user.userId, entry.userId, !isFollowing)}>                                
                            </StyledButton>
                        </div>
                    </FlexRow>                                        
                </LikeEntryContainer>
            );
        });

        return results;
    }

    const toggleFollowState = async (userId: string, followUserId: string, shouldFollow: boolean) => {        
        const result = await followUser(userId, followUserId, shouldFollow);

        // If succesfull the state needs to be updated to reflect the new follow status
        if(result) {
            const newLikeFollowData = {...likeFollowData};            
            newLikeFollowData[followUserId].followId = shouldFollow ? followUserId : null;
            setLikeFollowData(newLikeFollowData);
        }
    }

    if(props.post == null) {
        return <></>;
    }    
    
    return (
        <div>
            <LikesModalInfoText>{props.post.user.userName} can see the number of people who liked this post</LikesModalInfoText>
            <FlexColumn $alignItems="stretch" $paddingTop="15px">
                { renderLikeList() }
            </FlexColumn>
        </div>
    );
}

const LikesModal: React.FC<LikesModalProps> = (props: LikesModalProps) => {
    
    const steps = [
        {
            title: "Likes",
            element: <LikesModalContent post={props.post} />,
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

export default LikesModal;