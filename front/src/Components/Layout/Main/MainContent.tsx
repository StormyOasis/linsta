import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import * as styles from './Main.module.css';
import { getPosts, postAddComment, postToggleLike } from "../../../api/ServiceController";
import { Post, PostPaginationResponse } from "../../../api/types";
import MediaSlider from "../../../Components/Common/MediaSlider";

import MessageSVG from "/public/images/message.svg";
import ShareSVG from "/public/images/send.svg";
import { AuthUser } from "../../../api/Auth";
import { isOverflowed, getSanitizedText, isPostLiked, getPfpFromPost, togglePostLikedState } from "../../../utils/utils";
import { ContentWrapper, Div, Flex, FlexColumn, FlexColumnFullWidth, FlexRow, FlexRowFullWidth, LightLink, Link, Main, Section } from "../../../Components/Common/CombinedStyling";
import EmojiPickerPopup from "../../../Components/Common/EmojiPickerPopup";
import StyledLink from "../../../Components/Common/StyledLink";
import { HOST } from "../../../api/config";
import ProfileLink from "../../../Components/Common/ProfileLink";
import { LikeToggler, ViewLikesText } from "../../../Components/Common/Likes";
import { useAppDispatch, useAppSelector, actions } from "../../../Components/Redux/redux";
import { MODAL_TYPES, ModalState } from "../../../Components/Redux/slices/modals.slice";

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

interface CommentTextType {
    [key: string]: string;
}

const MainContent: React.FC = () => {
    const [viewShowMoreStates, setViewMoreStates] = useState<{}>({});
    const [commentText, setCommentText] = useState<CommentTextType>({});
    const [paginationResult, setPaginationResult] = useState<PostPaginationResponse>();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const childRef = useRef(null);

    const authUser: AuthUser = useAppSelector((state: any) => state.auth.user);
    const commentModalState = useAppSelector((state: any) => state.modal.openModalStack?.find((modal:ModalState) => modal.modalName === MODAL_TYPES.COMMENT_MODAL));

    const dispatch = useAppDispatch();
    
    useEffect(() => {       
       // initial data request for the infinte scroll
       getPosts({}).then(results => {            
            if (results.data != null) {
                const response: PostPaginationResponse = results.data;
                setPaginationResult(response);
                setPosts(response.posts);
            }
        })
    }, []);

    useEffect(() => {
        if(posts == null || commentModalState == null) {
            return;
        }

        const newPostState:Post[] = structuredClone(posts);
        for(const post of newPostState) {
            if(post.postId == commentModalState?.data?.post?.postId) {
                post.global.likes = commentModalState?.data?.post.global.likes;
                break;
            }
        }

        setPosts(newPostState);

    }, [commentModalState])

    useEffect(() => {
        if (childRef.current) {
            (childRef.current as any).addEventListener('scroll', handleScroll);
        }
        return () => {
            if(childRef && childRef.current) {
                (childRef.current as any).removeEventListener('scroll', handleScroll);
            }
        };        
    }, [paginationResult, isLoading]);
    
    const loadPosts = async () => {
        if (isLoading || (paginationResult && paginationResult.done)) {
            return;
        }

        setIsLoading(true);

        const result = await getPosts({ dateTime: paginationResult?.dateTime, postId: paginationResult?.postId });
        if (result.data != null) {
            const response: PostPaginationResponse = result.data;
            setPaginationResult(response);
            setPosts((posts: Post[]) => [...posts, ...response.posts]);
            setIsLoading(false);
        }
    };

    const handleScroll = () => {
        const element = (childRef?.current as any);
        const currentScroll = window.innerHeight + element.scrollTop;

        if (currentScroll + 256 >= element.scrollHeight) {
            loadPosts();
        }
    };    

    const toggleCaptionViewMoreState = (postId: string) => {
        const newState: any = Object.assign({}, viewShowMoreStates);
        newState[postId] = true;

        setViewMoreStates(newState);
    }

    const toggleLike = async (postId: string, userName: string, userId: string) => {
        //dispatch(togglePostLike({ postId, userName, userId }));
        const result = await postToggleLike({postId, userName, userId});
        if(result.status === 200) {
            const newPosts:Post[] = structuredClone(posts);
            for(const post of newPosts) {
                if(post.postId === postId) {
                    togglePostLikedState(userName, userId, post);
                }
            }
            setPosts(newPosts);
        }
    }

    const handleSubmitComment = async (text: string, post: Post) => {
        const data = {
            text,
            postId: `${post.postId}`,
            parentCommentId: null,
            userName: authUser.userName,
            userId: `${authUser.id}`
        };

        const result = await postAddComment(data);

        if (result.status === 200) {
            // Success adding comment, clear out comment text box
            const newCommentText = { ...commentText };
            newCommentText[`${post.postId}`] = '';
            setCommentText(newCommentText);
        }
    }

    const openCommentModal = (post: Post) => {
        if (post === null) {
            return;
        }

        // Open the comment dialog by setting the state in redux        
        const payload = {
            post
        };

        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.COMMENT_MODAL, data: payload }));
    }

    const openLikesModal = (post: Post) => {
        if (post === null) {
            return;
        }

        // Open the likes dialog by setting the state in redux        
        const payload = {
            post
        };

        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.LIKES_MODAL, data: payload }));
    }

    const renderCommentsSection = (post: Post) => {
        const [sanitizedHtml, sanitizedText] = getSanitizedText(post.global.captionText);
        const overflowed: boolean = isOverflowed(`postid_${post.postId}`);

        const isExpanded = viewShowMoreStates[post.postId as keyof typeof viewShowMoreStates]

        return (
            <>
                {sanitizedText?.length > 0 &&
                    <>
                        <CaptionContainer className={!isExpanded ? styles.lineClamp2 : {}}>
                            <div id={`postid_${post.postId}`}>
                                <span>
                                    <ProfileLink showFullName={false} showUserName={true} showPfp={false} url={`${HOST}/${post.user.userName}`} userName={post.user.userName}></ProfileLink>
                                    <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }}></span>
                                </span>
                            </div>
                        </CaptionContainer>
                        {(overflowed && !isExpanded) && <LightLink href="#"
                            onClick={() => toggleCaptionViewMoreState(post.postId)}>More</LightLink>}
                    </>}
                {post.global.commentCount > 0 &&
                    <Div $marginBottom="4px" $marginTop="4px">
                        <LightLink href="#" onClick={() => openCommentModal(post)}>View all {post.global.commentCount} comments</LightLink>
                    </Div>
                }
                {!post.global?.commentsDisabled &&
                    <div>
                        <FlexRow>
                            <CommentTextArea value={commentText[`${post.postId}`]}
                                placeholder="Add a new comment..."
                                aria-label="Add a new comment..."
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                    const newCommentText = { ...commentText };
                                    newCommentText[`${post.postId}`] = e.currentTarget.value;
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

                                        await handleSubmitComment(commentText[`${post.postId}`], post);
                                    }
                                }}
                            />
                            <Flex $marginTop="auto" $marginBottom="auto">
                                {
                                    (commentText[`${post.postId}`] && commentText[`${post.postId}`].length > 0) &&
                                    <Div $paddingLeft="5px" $paddingRight="5px">
                                        <StyledLink onClick={async () =>
                                            await handleSubmitComment(commentText[`${post.postId}`], post)}>
                                            Post
                                        </StyledLink>
                                    </Div>
                                }
                                <EmojiPickerPopup noPadding={true} onEmojiClick={(emoji: any) => {
                                    const newCommentText = { ...commentText };
                                    newCommentText[`${post.postId}`] += emoji.emoji;
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
            <ContentWrapper ref={childRef} style={{ overflow: "auto", maxHeight: "100vh" }}>
                <Section>
                    <Main role="main">
                        <FlexRowFullWidth $justifyContent="center">
                            <FeedContainer>
                                {posts && posts.length > 0 && posts.map((post, index) => {
                                    const isLiked = isPostLiked(authUser.userName, post);
                                    const pfp = getPfpFromPost(post);
                                    return (
                                        <article key={`${post.media[0].id}-${index}`}>
                                            <PostContainer>
                                                <Div $paddingBottom="5px">
                                                    <ProfileLink pfp={pfp} showUserName={true} showPfp={true} showFullName={false} userName={post.user.userName} url={`${HOST}/${post.user.userName}`}></ProfileLink>
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
                                                            <span>
                                                                <Div $cursor="pointer">
                                                                    <Flex $paddingRight="8px">
                                                                        <LikeToggler
                                                                            isLiked={isLiked}
                                                                            handleClick={() => toggleLike(post.postId, authUser.userName, authUser.id)} />
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
            </ContentWrapper>
        </>
    );
}

export default MainContent;