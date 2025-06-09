import React, { useEffect, useState } from "react";
import styled from "styled-components";

import MultiStepModal from "../../../Common/MultiStepModal";
import { Post, ProfileWithFollowStatusInt } from "../../../../api/types";
import { postBulkGetProfileAndFollowStatus } from "../../../../../src/api/ServiceController";
import StyledButton from "../../../../Components/Common/StyledButton";
import { followUser } from "../../../../utils/utils";
import { Div, FlexColumn, FlexRow, Link, Span } from "../../../../Components/Common/CombinedStyling";
import { AuthUser } from "../../../../api/Auth";
import { useAppSelector } from "../../../../Components/Redux/redux";
import { DEFAULT_PFP } from "../../../../api/config";

type CollaboratorsModalProps = {
    onClose: () => void;
    post: Post;
    zIndex: number;
}

type CollaboratorsModalContentProps = {
    post: Post;
}

const CollaboratorEntryContainer = styled(Div)`
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
    border-radius: 50%;
`;

const CollaboratorsModalContent: React.FC<CollaboratorsModalContentProps> = (props: CollaboratorsModalContentProps) => {
    const [collaboratorData, setCollaboratorData] = useState<ProfileWithFollowStatusInt | null>(null);
    const authUser: AuthUser = useAppSelector((state: any) => state.auth.user);
    
    useEffect(() => {        
        const userIds: string[] = Object.values(props.post.global.collaborators || {}).map((entry) => entry.userId);
        const userId: string = authUser.id;
        
        postBulkGetProfileAndFollowStatus({ userId, userIds }).then((result: any) => {
            setCollaboratorData(result.data);
        })
    }, []);

    const renderCollaboratorList = () => {
        if (collaboratorData == null) {
            return <></>;
        }

        const results = Object.values(props.post.global.collaborators || {}).map((entry, index:number) => {                             
            const lfd = collaboratorData[entry.userId];
            if (lfd == null) {
                return <Div key={`${index}`}></Div>; //prevent 'element in list should have unique key' error
            } 

            const pfp = lfd.pfp ? lfd.pfp : DEFAULT_PFP;
            const isFollowing = lfd.isFollowed;

            return (
                <CollaboratorEntryContainer key={entry.userId}>
                    <FlexRow $paddingBottom="8px" $paddingTop="8px">
                        <Div>
                            <Div $marginRight="10px">
                                <ProfilePicLink href={`/${lfd.userName}/`} role="link">
                                    <ProfilePicImg src={pfp}
                                        aria-label={`${lfd.userName}'s profile picture`}
                                        alt={`${lfd.userName}'s profile picture`} />
                                </ProfilePicLink>
                            </Div>
                        </Div>
                        <FlexRow $flexBasis="auto" $flexShrink="1" $flexGrow="1" $flexWrap="wrap" $position="relative" $paddingTop="5px">
                            <FlexColumn $flexGrow="1" $position="relative">
                                <Div>
                                    <Link href={`/${lfd.userName}/`} role="link">
                                        <Span $fontWeight="700">{lfd.userName}</Span>
                                    </Link>
                                </Div>
                                <Div>
                                    <Span>
                                        {`${lfd.firstName} ${lfd.lastName}`}
                                    </Span>
                                </Div>
                            </FlexColumn>
                        </FlexRow>
                        {entry.userId != authUser.id && 
                            <Div>
                                <StyledButton
                                    style={{ marginBottom: "12px" }}
                                    useSecondaryColors={isFollowing}
                                    text={isFollowing ? "Following" : "Follow"}
                                    onClick={async () => await toggleFollowState(props.post.user.userId, entry.userId, !isFollowing)}>
                                </StyledButton>
                            </Div>
                        }
                    </FlexRow>
                </CollaboratorEntryContainer>
            );
        });

        return results;
    }

    const toggleFollowState = async (userId: string, followUserId: string, shouldFollow: boolean) => {
        const result = await followUser(userId, followUserId, shouldFollow);

        // If successful the state needs to be updated to reflect the new follow status
        if (result) {
            const newCollaboratorData = { ...collaboratorData };
            newCollaboratorData[followUserId].isFollowed = shouldFollow;
            setCollaboratorData(newCollaboratorData);
        }
    }

    if (props.post == null) {
        return <></>;
    }

    return (
        <FlexColumn $alignItems="stretch">
            {renderCollaboratorList()}
        </FlexColumn>
    );
}

const CollaboratorsModal: React.FC<CollaboratorsModalProps> = (props: CollaboratorsModalProps) => {

    const steps = [
        {
            title: "Collaborators",
            element: <CollaboratorsModalContent post={props.post} />,
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

export default CollaboratorsModal;