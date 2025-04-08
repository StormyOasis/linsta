import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmojiClickData } from "emoji-picker-react";
import styled from "styled-components";
import * as styles from './Main.module.css';
import { getPosts, postAddComment, postToggleLike } from "../../../api/ServiceController";
import { Post, PostPaginationResponse } from "../../../api/types";
import MediaSlider from "../../../Components/Common/MediaSlider";

import MessageSVG from "/public/images/message.svg";
import ShareSVG from "/public/images/send.svg";
import { AuthUser } from "../../../api/Auth";
import { isOverflowed, getSanitizedText, isPostLiked, getPfpFromPost, togglePostLikedState } from "../../../utils/utils";
import { ContentWrapper, Div, Flex, FlexColumn, FlexColumnFullWidth, FlexRow, FlexRowFullWidth, LightLink, Link, Main, Section, Span } from "../../../Components/Common/CombinedStyling";
import EmojiPickerPopup from "../../../Components/Common/EmojiPickerPopup";
import StyledLink from "../../../Components/Common/StyledLink";
import { HOST } from "../../../api/config";
import ProfileLink from "../../../Components/Common/ProfileLink";
import { LikeToggler, ViewLikesText } from "../../../Components/Common/Likes";
import { useAppDispatch, useAppSelector, actions } from "../../../Components/Redux/redux";
import { MODAL_TYPES, ModalState } from "../../../Components/Redux/slices/modals.slice";
import useInfiniteScroll from "../../../utils/useInfiniteScroll";

const FeedContainer = styled(FlexColumn)`
    max-width: 700px;
    width: 100%;
    overflow: visible;
    align-items: center;
    position: relative;
`;

const PostContainer = styled(FlexColumnFullWidth)`
    min-width: min(${props => props.theme["sizes"].feedPostMinWidth}, 100%);
    padding-bottom: 10px;
    margin-bottom: 10px;
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

const CaptionContainer = styled(Div) <{ $isExpanded?: boolean }>`
    width: min(470px, 100vw);
    overflow: hidden;
    ${props => !props.$isExpanded && `${styles.lineClamp2}`}
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

interface CommentTextType {
    [key: string]: string;
}

interface ViewShowMoreState {
    [key: string]: boolean;
}

const MainContent: React.FC = () => {
    const [viewShowMoreStates, setViewMoreStates] = useState<ViewShowMoreState>({});
    const [commentText, setCommentText] = useState<CommentTextType>({});
    const [paginationResult, setPaginationResult] = useState<PostPaginationResponse>();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const childRef = useRef<HTMLDivElement | null>(null);
    const hasScrolled = useRef<boolean>(false);  // Track if the user has scrolled
    const useEffectStrictModeCheckRef = useRef<boolean>(false); //For Dev only, can be removed
    const authUser: AuthUser = useAppSelector((state: any) => state.auth.user);
    const commentModalState = useAppSelector((state: any) => state.modal.openModalStack?.find((modal: ModalState) => modal.modalName === MODAL_TYPES.COMMENT_MODAL));

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!useEffectStrictModeCheckRef.current) {
            useEffectStrictModeCheckRef.current = true;
            loadPosts();
        }
    }, []);

    useEffect(() => {
        if (!isLoading) {
            hasScrolled.current = false;
        }
    }, [isLoading]);    

    useEffect(() => {
        if (posts == null || commentModalState == null) {
            return;
        }

        const newPostState: Post[] = structuredClone(posts);
        for (const post of newPostState) {
            if (post.postId == commentModalState?.data?.post?.postId) {
                post.global.likes = commentModalState?.data?.post.global.likes;
                break;
            }
        }

        setPosts(newPostState);

    }, [commentModalState])

    const loadPosts = useCallback(async () => {
        if (isLoading || (paginationResult && paginationResult.done)) {
            return;
        }

        setIsLoading(true);

        const result = await getPosts({ dateTime: paginationResult?.dateTime, postId: paginationResult?.postId, userId: authUser.id });
        if (result.data != null) {
            const response: PostPaginationResponse = result.data;
            setPaginationResult(response);
            setPosts((posts: Post[]) => [...posts, ...response.posts]);
        }

        setIsLoading(false);
    }, [isLoading]);

    // Use the custom hook for infinite scroll
    useInfiniteScroll(loadPosts, isLoading, childRef, hasScrolled);

    const toggleCaptionViewMoreState = useCallback((postId: string) => {
        setViewMoreStates((prevState) => ({ ...prevState, [postId]: true }));
    }, []);

    const toggleLike = async (postId: string, userName: string, userId: string) => {
        try {
            const result = await postToggleLike({ postId, userName, userId });
            if (result.status === 200) {
                const newPosts: Post[] = structuredClone(posts);
                for (const post of newPosts) {
                    if (post.postId === postId) {
                        togglePostLikedState(userName, userId, post);
                    }
                }
                setPosts(newPosts);
            }
        } catch (err) {
            console.error("Error toggling like");
        }
    }

    const handleSubmitComment = async (text: string, post: Post):Promise<void> => {
        const data = {
            text,
            postId: `${post.postId}`,
            parentCommentId: null,
            userName: authUser.userName,
            userId: `${authUser.id}`
        };

        try {
            const result = await postAddComment(data);

            if (result.status === 200) {
                // Success adding comment, clear out comment text box
                const newCommentText = { ...commentText };
                newCommentText[`${post.postId}`] = '';
                setCommentText(newCommentText);
            }
        } catch (err) {
            console.error("Error posting comment");
        }
    }

    const handleEmojiClick = useCallback((emoji: EmojiClickData, postId: string) => {
        const newText = (commentText[`${postId}`] || "") + emoji.emoji;
        setCommentText((prevState) => ({ ...prevState, [postId]: newText }));
    }, [commentText]);

    const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>, post: Post) => {
        if (e.key === "Enter") {
            e.preventDefault();
            await handleSubmitComment(commentText[`${post.postId}`], post);
        }
    }, [commentText, handleSubmitComment]);

    const openCommentModal = (post: Post) => {
        // Open the comment dialog by setting the state in redux        
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.COMMENT_MODAL, data: { post } }));
    }

    const openLikesModal = (post: Post) => {
        // Open the likes dialog by setting the state in redux        
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.LIKES_MODAL, data: { post } }));
    }

    const handleCommentChange = useCallback((postId: string, value: string) => {
        setCommentText((prevState) => { return { ...prevState, [postId]: value }; });
    }, []);

    const renderCommentsSection = useCallback((post: Post) => {
        const [sanitizedHtml, sanitizedText] = getSanitizedText(post.global.captionText);
        const overflowed: boolean = isOverflowed(`postid_${post.postId}`);
        const isExpanded: boolean = viewShowMoreStates[post.postId];

        return (
            <>
                {sanitizedText?.length > 0 &&
                    <>
                        <CaptionContainer $isExpanded={isExpanded}>
                            <Div id={`postid_${post.postId}`}>
                                <Span>
                                    <ProfileLink
                                        showFullName={false}
                                        showUserName={true}
                                        showPfp={false}
                                        url={`${HOST}/${post.user.userName}`}
                                        userName={post.user.userName} />
                                    <Span dangerouslySetInnerHTML={{ __html: sanitizedHtml }}></Span>
                                </Span>
                            </Div>
                        </CaptionContainer>
                        {(overflowed && !isExpanded) &&
                            <LightLink onClick={() => toggleCaptionViewMoreState(post.postId)}>More</LightLink>}
                    </>}
                {post.global.commentCount > 0 &&
                    <Div $marginBottom="4px" $marginTop="4px">
                        <LightLink onClick={() => openCommentModal(post)}>View all {post.global.commentCount} comments</LightLink>
                    </Div>
                }
                {!post.global?.commentsDisabled &&
                    <Div>
                        <FlexRow>
                            <CommentTextArea
                                value={commentText[`${post.postId}`]}
                                placeholder="Add a new comment..."
                                aria-label="Add a new comment..."
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleCommentChange(post.postId, e.target.value)}
                                onInput={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                    const element = e.currentTarget;
                                    element.style.height = "";
                                    element.style.height = element.scrollHeight + "px";
                                }}
                                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => handleKeyDown(e, post)}
                            />
                            <Flex $marginTop="auto" $marginBottom="auto">
                                {(commentText[`${post.postId}`] && commentText[`${post.postId}`].length > 0) &&
                                    <Div $paddingLeft="5px" $paddingRight="5px">
                                        <StyledLink onClick={async () => {
                                            await handleSubmitComment(commentText[`${post.postId}`], post)
                                        }}>
                                            Post
                                        </StyledLink>
                                    </Div>
                                }
                                <EmojiPickerPopup
                                    noPadding={true}
                                    onEmojiClick={(emoji) => handleEmojiClick(emoji, post.postId)} />
                            </Flex>
                        </FlexRow>
                    </Div>
                }
            </>
        );
    }, [viewShowMoreStates, commentText]);

    return (
        <>
            <ContentWrapper ref={childRef} $overflow="auto" $maxHeight="100vh">
                <Section>
                    <Main role="main">
                        <FlexRowFullWidth $justifyContent="center">
                            <FeedContainer>
                                {posts.map((post, index) => {
                                    const isLiked = isPostLiked(authUser.userName, post);
                                    const pfp = getPfpFromPost(post);
                                    return (
                                        <article key={`${post.media[0].id}-${index}`}>
                                            <PostContainer>
                                                <Div $paddingBottom="5px">
                                                    <ProfileLink
                                                        pfp={pfp}
                                                        showUserName={true}
                                                        showPfp={true}
                                                        showFullName={false}
                                                        userName={post.user.userName}
                                                        url={`${HOST}/${post.user.userName}`} />

                                                    {post.global.locationText.length > 0 &&
                                                        <Div $marginLeft="39px" $marginTop="-9px" $fontSize="13px">
                                                            <Link href={`${HOST}/explore?text=${encodeURIComponent(post.global.locationText)}`}>
                                                                {post.global.locationText}
                                                            </Link>
                                                        </Div>
                                                    }
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
                                                                            aria-label="Toogle post like"
                                                                            isLiked={isLiked}
                                                                            handleClick={async () => await toggleLike(post.postId, authUser.userName, authUser.id)} />
                                                                    </Flex>
                                                                </Div>
                                                            </Span>
                                                            <Span>
                                                                <Div $cursor="pointer">
                                                                    <Flex $paddingRight="8px">
                                                                        <ActionContainer>
                                                                            <MessageSVG aria-label="Comment" onClick={() => openCommentModal(post)} />
                                                                        </ActionContainer>
                                                                    </Flex>
                                                                </Div>
                                                            </Span>
                                                            <Span>
                                                                <Div $cursor="pointer">
                                                                    <Flex $paddingRight="8px">
                                                                        <ActionContainer>
                                                                            <ShareSVG aria-label="Share" />
                                                                        </ActionContainer>
                                                                    </Flex>
                                                                </Div>
                                                            </Span>
                                                        </FlexRow>
                                                        <Div>
                                                            <Div $marginTop="5px" $marginBottom="5px">
                                                                <ViewLikesText post={post} handleClick={() => openLikesModal(post)}></ViewLikesText>
                                                            </Div>
                                                        </Div>
                                                        <Div>
                                                            {renderCommentsSection(post)}
                                                        </Div>
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
            </ContentWrapper>
        </>
    );
}

export default MainContent;