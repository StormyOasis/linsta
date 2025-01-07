import React, { useEffect, useState } from "react";
import styled from "styled-components";
import * as styles from './Main.module.css';
import { postAddComment } from "../../../api/ServiceController";
import { Post } from "../../../api/types";
import MediaSlider from "../../../Components/Common/MediaSlider";

import MessageSVG from "/public/images/message.svg";
import ShareSVG from "/public/images/send.svg";
import { AuthUser } from "../../../api/Auth";
import { isOverflowed, getSanitizedText, isPostLiked } from "../../../utils/utils";
import { Div, Flex, FlexColumn, FlexColumnFullWidth, FlexRow, FlexRowFullWidth, LightLink } from "../../../Components/Common/CombinedStyling";
import EmojiPickerPopup from "../../../Components/Common/EmojiPickerPopup";
import StyledLink from "../../../Components/Common/StyledLink";
import { HOST } from "../../../api/config";
import ProfileLink from "../../../Components/Common/ProfileLink";
import { LikeToggler, ViewLikesText } from "../../../Components/Common/Likes";
import { useAppDispatch, useAppSelector, actions } from "../../../Components/Redux/redux";
import { COMMENT_MODAL, LIKES_MODAL } from "../../../Components/Redux/slices/modals.slice";
import { getPostList, togglePostLike } from "../../../Components/Redux/slices/post.slice";

const MainContentWrapper = styled.div`
    overflow-y: auto;
    margin-left: ${props => props.theme["sizes"].sideBarNavWidthDefault};
    padding-left: 10px;

    @media (min-width: ${props => props.theme["breakpoints"].md}px) and 
            (max-width: ${props => props.theme["breakpoints"].lg - 1}px) {

        margin-left: ${props => props.theme["sizes"].sideBarNavWidthNarrow};
    }
        
    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
        margin-left: 0;
        padding-left: 0;
    }
`;

const FeedContainer = styled(FlexColumn)`
    max-width: 700px;
    width: 100%;
    overflow: visible;
    align-items: center;
    position: relative;
`;

const PostContainer = styled(FlexColumnFullWidth)`
    min-width: min(${props => props.theme["sizes"].feedPostMinWidth}, 100%);
    padding-bottom: 16px;
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

const CaptionContainer = styled.div`
    width: min(470px, 100vw);
    overflow: hidden;
`;

const CommentTextArea = styled.textarea`
    height: 18px;
    max-height: 80px;
    resize: none;
    display: flex;
    flex-grow: 1;
    max-width: 100%;
    width: 100%;
    border: none;
    outline: none;
    overflow: hidden;
    color: ${props => props.theme["colors"].defaultTextColor};
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding-top: 10px;
`;

const Main = styled.main`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
`;

interface CommentTextType {
    [key: string]: string;
}

const MainContent: React.FC = () => {
    const [viewShowMoreStates, setViewMoreStates] = useState<{}>({});
    const [commentText, setCommentText] = useState<CommentTextType>({});

    const authUser: AuthUser = useAppSelector((state: any) => state.auth.user);
    const posts: Post[] = useAppSelector((state: any) => state.post.posts);

    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(getPostList())
    }, []);

    const toggleCaptionViewMoreState = (postId: string) => {
        const newState: any = Object.assign({}, viewShowMoreStates);
        newState[postId] = true;

        setViewMoreStates(newState);
    }

    const toggleLike = (postId: string, userName: string, userId: string) => {
        dispatch(togglePostLike({ postId, userName, userId }));
    }

    const handleSubmitComment = async (text: string, post: Post) => {
        const data = {
            text,
            postId: post.global.id,
            parentCommentId: null,
            userName: authUser.userName,
            userId: authUser.id,
        };

        const result = await postAddComment(data);

        if (result.status === 200) {
            // Success adding comment, clear out comment text box
            const newCommentText = { ...commentText };
            newCommentText[`${post.global.id}`] = '';
            setCommentText(newCommentText);
        }
    }

    const openCommentModal = (post: Post) => {
        if (post === null) {
            return;
        }

        // Open the comment dialog by setting the state in redux        
        const payload = {
            postId: post.global.id
        };

        dispatch(actions.modalActions.openModal({ modalName: COMMENT_MODAL, data: payload }));
    }

    const openLikesModal = (post: Post) => {
        if (post === null) {
            return;
        }

        // Open the comment dialog by setting the state in redux        
        const payload = {
            postId: post.global.id
        };

        dispatch(actions.modalActions.openModal({ modalName: LIKES_MODAL, data: payload }));
    }

    const renderCommentsSection = (post: Post) => {
        const [sanitizedHtml, sanitizedText] = getSanitizedText(post.global.captionText);
        const overflowed: boolean = isOverflowed(`postid_${post.global.id}`);

        const isExpanded = viewShowMoreStates[post.global.id as keyof typeof viewShowMoreStates]

        return (
            <>
                {sanitizedText?.length > 0 &&
                    <>
                        <CaptionContainer className={!isExpanded ? styles.lineClamp2 : {}}>
                            <div id={`postid_${post.global.id}`}>
                                <span>
                                    <ProfileLink showUserName={true} showPfp={false} url={`${HOST}/${post.user.userName}`} text={post.user.userName}></ProfileLink>
                                    <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }}></span>
                                </span>
                            </div>
                        </CaptionContainer>
                        {(overflowed && !isExpanded) && <LightLink href="#"
                            onClick={() => toggleCaptionViewMoreState(post.global.id)}>More</LightLink>}
                    </>}
                {post.global.commentCount > 0 &&
                    <Div $marginBottom="4px" $marginTop="4px">
                        <LightLink href="#" onClick={() => openCommentModal(post)}>View all {post.global.commentCount} comments</LightLink>
                    </Div>
                }
                {!post.global?.commentsDisabled &&
                    <div>
                        <FlexRow>
                            <CommentTextArea value={commentText[`${post.global.id}`]}
                                placeholder="Add a new comment..."
                                aria-label="Add a new comment..."
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                    const newCommentText = { ...commentText };
                                    newCommentText[`${post.global.id}`] = e.currentTarget.value;
                                    setCommentText(newCommentText);
                                }
                                }
                                onInput={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                    const element = e.currentTarget;
                                    element.style.height = "";
                                    element.style.height = element.scrollHeight + "px";
                                }}
                                onKeyDown={async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                    if (e.key === "Enter") {
                                        // Prevent adding a new line
                                        e.preventDefault();

                                        await handleSubmitComment(commentText[`${post.global.id}`], post);
                                    }
                                }}
                            />
                            <Flex $marginTop="auto" $marginBottom="auto">
                                {
                                    (commentText[`${post.global.id}`] && commentText[`${post.global.id}`].length > 0) &&
                                    <Div $paddingLeft="5px" $paddingRight="5px">
                                        <StyledLink onClick={async () =>
                                            await handleSubmitComment(commentText[`${post.global.id}`], post)}>
                                            Post
                                        </StyledLink>
                                    </Div>
                                }
                                <EmojiPickerPopup noPadding={true} onEmojiClick={(emoji: any) => {
                                    const newCommentText = { ...commentText };
                                    newCommentText[`${post.global.id}`] += emoji.emoji;
                                    setCommentText(newCommentText);
                                }}></EmojiPickerPopup>
                            </Flex>
                        </FlexRow>
                    </div>
                }
            </>
        );
    }

    return (
        <>
            <MainContentWrapper>
                <Section>
                    <Main role="main">
                        <FlexRowFullWidth $justifyContent="center">
                            <FeedContainer>
                                {posts && posts.length > 0 && posts.map(post => {
                                    const isLiked = isPostLiked(authUser.userName, post);

                                    return (
                                        <article key={post.global.id}>
                                            <PostContainer>
                                                <Div $paddingBottom="5px">
                                                    <ProfileLink showUserName={true} showPfp={true} text={post.user.userName} url={`${HOST}/${post.user.userName}`}></ProfileLink>
                                                </Div>
                                                <FlexColumn $justifyContent="center" $overflow="hidden" $position="relative" $width="min(470px, 100vw)">
                                                    <MediaSlider media={post.media} />
                                                </FlexColumn>
                                                <Div $position="relative">
                                                    <FlexColumn $height="100%" $position="relative">
                                                        <FlexRow $marginTop="5px" $marginBottom="5px">
                                                            <span>
                                                                <Div $cursor="pointer">
                                                                    <Flex $paddingRight="8px">
                                                                        <LikeToggler
                                                                            isLiked={isLiked}
                                                                            handleClick={() => toggleLike(post.global.id, authUser.userName, authUser.id)} />
                                                                    </Flex>
                                                                </Div>
                                                            </span>
                                                            <span>
                                                                <Div $cursor="pointer">
                                                                    <Flex $paddingRight="8px">
                                                                        <ActionContainer>
                                                                            <MessageSVG onClick={() => openCommentModal(post)} />
                                                                        </ActionContainer>
                                                                    </Flex>
                                                                </Div>
                                                            </span>
                                                            <span>
                                                                <Div $cursor="pointer">
                                                                    <Flex $paddingRight="8px">
                                                                        <ActionContainer>
                                                                            <ShareSVG />
                                                                        </ActionContainer>
                                                                    </Flex>
                                                                </Div>
                                                            </span>
                                                        </FlexRow>
                                                        <div>
                                                            <Div $marginTop="5px" $marginBottom="5px">
                                                                <ViewLikesText post={post} handleClick={() => openLikesModal(post)}></ViewLikesText>
                                                            </Div>
                                                        </div>
                                                        <div>
                                                            {renderCommentsSection(post)}
                                                        </div>
                                                    </FlexColumn>
                                                </Div>
                                            </PostContainer>
                                        </article>
                                    );
                                })}
                            </FeedContainer>
                        </FlexRowFullWidth>
                    </Main>
                </Section>
            </MainContentWrapper>
        </>
    );
}

export default MainContent;