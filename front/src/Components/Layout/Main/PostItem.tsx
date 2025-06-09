import React, { memo } from "react";
import { Post } from "../../../api/types";
import { AuthUser } from "../../../api/Auth";
import { HOST } from "../../../api/config";
import { isPostLiked, getPfpFromPost } from "../../../utils/utils";
import MediaSlider from "../../../Components/Common/MediaSlider";
import ProfileLink from "../../../Components/Common/ProfileLink";
import { LikeToggler, ViewLikesText } from "../../../Components/Common/Likes";
import { Div, Flex, FlexColumn, FlexRow, Span } from "../../../Components/Common/CombinedStyling";
import MessageSVG from "/public/images/message.svg";
import styled from "styled-components";
import CommentsSection from "./MainCommentSection";
import { actions, useAppDispatch } from "../../../Components/Redux/redux";
import { MODAL_TYPES } from "../../../Components/Redux/slices/modals.slice";

const PostContainer = styled(FlexColumn)`
    min-width: min(${props => props.theme["sizes"].feedPostMinWidth}, 100%);
    padding-bottom: 10px;
    margin-bottom: 20px;
    border-bottom: 1px solid ${props => props.theme["colors"].borderDefaultColor};
`;

const ActionContainer = styled(Div) <{ $isLiked?: boolean }>`
    width: 28px;
    height: 28px;
    margin-left: auto;
    cursor: pointer;
    color: ${props => props.$isLiked ? "red" : "black"};

    &:hover {
        color: ${props => props.theme["colors"].borderDarkColor};
    }
`;

interface Props {
    post: Post;
    authUser: AuthUser;
    commentText: string;
    isExpanded: boolean;
    onExpand: () => void;
    onCommentChange: (value: string) => void;
    onSubmitComment: () => void;
    onEmojiClick: (emoji: any) => void;
    onOpenCommentModal: () => void;
    onOpenLikesModal: () => void;
    onToggleLike: () => Promise<void>;
}

const PostItem: React.FC<Props> = ({
    post,
    authUser,
    commentText,
    isExpanded,
    onExpand,
    onCommentChange,
    onSubmitComment,
    onEmojiClick,
    onOpenCommentModal,
    onOpenLikesModal,
    onToggleLike
}) => {
    const dispatch = useAppDispatch();

    const isLiked = isPostLiked(authUser.userName, post);
    const pfp = getPfpFromPost(post);

    const handleCollaboratorsClick = () => {
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.COLLABORATORS_MODAL, data: { post } }));
    }    

    return (
        <article key={post.postId}>
            <PostContainer>
                <Div $paddingBottom="10px">
                    <ProfileLink
                        collaborators={post.global.collaborators}
                        showCollaborators={true}
                        onCollaboratorsClick={handleCollaboratorsClick}           
                        pfp={pfp}
                        showUserName={true}
                        showPfp={true}
                        showFullName={false}
                        showLocation={true}
                        location={post.global.locationText}
                        userName={post.user.userName}
                        url={`${HOST}/${post.user.userName}`} />
                </Div>

                <FlexColumn $justifyContent="center" $overflow="hidden" $position="relative" $width="min(470px, 100vw)">
                    <MediaSlider media={post.media} />
                </FlexColumn>

                <Div $position="relative">
                    <FlexColumn $height="100%" $position="relative">
                        <FlexRow $marginTop="5px" $marginBottom="5px">
                            <Span>
                                <Div $cursor="pointer">
                                    <Flex $paddingRight="8px">
                                        <LikeToggler
                                            aria-label="Toggle post like"
                                            isLiked={isLiked}
                                            handleClick={onToggleLike}
                                        />
                                    </Flex>
                                </Div>
                            </Span>
                            <Span>
                                <Div $cursor="pointer">
                                    <Flex $paddingRight="8px">
                                        <ActionContainer>
                                            <MessageSVG aria-label="Comment" onClick={onOpenCommentModal} />
                                        </ActionContainer>
                                    </Flex>
                                </Div>
                            </Span>
                            {/*<Span>
                                <Div $cursor="pointer">
                                    <Flex $paddingRight="8px">
                                        <ActionContainer>
                                            <ShareSVG aria-label="Share" />
                                        </ActionContainer>
                                    </Flex>
                                </Div>
                            </Span>*/}
                        </FlexRow>

                        <Div>
                            <Div $marginTop="5px" $marginBottom="5px">
                                <ViewLikesText post={post} authUserId={authUser?.id} handleClick={onOpenLikesModal} />
                            </Div>
                        </Div>

                        <Div>
                            <CommentsSection
                                post={post}
                                commentText={commentText}
                                isExpanded={isExpanded}
                                onExpand={onExpand}
                                onCommentChange={onCommentChange}
                                onSubmitComment={onSubmitComment}
                                onEmojiClick={onEmojiClick}
                                openCommentModal={onOpenCommentModal}
                            />
                        </Div>
                    </FlexColumn>
                </Div>
            </PostContainer>
        </article>
    );
};

export default memo(PostItem);
