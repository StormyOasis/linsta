import React, { useCallback, useEffect, useRef, useState } from "react";
import { EmojiClickData } from "emoji-picker-react";
import styled from "styled-components";
import { getPosts, postAddComment, postToggleLike } from "../../../api/ServiceController";
import { Post, PostPaginationResponse } from "../../../api/types";

import { AuthUser } from "../../../api/Auth";
import { togglePostLikedState } from "../../../utils/utils";
import { ContentWrapper, FlexColumn, FlexRowFullWidth, Main, Section } from "../../../Components/Common/CombinedStyling";
import { useAppDispatch, useAppSelector, actions, RootState } from "../../../Components/Redux/redux";
import { MODAL_TYPES, ModalState } from "../../../Components/Redux/slices/modals.slice";
import useInfiniteScroll from "../../../utils/useInfiniteScroll";
import PostItem from "./PostItem";

const FeedContainer = styled(FlexColumn)`
    max-width: 700px;
    width: 100%;
    overflow: visible;
    align-items: center;
    position: relative;
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
    const useEffectStrictModeCheckRef = useRef<boolean>(false); //For Dev only, can be removed
    const authUser: AuthUser = useAppSelector((state: RootState) => state.auth.user);
    const commentModalState = useAppSelector((state: RootState) => state.modal.openModalStack?.find((modal: ModalState) => modal.modalName === MODAL_TYPES.COMMENT_MODAL));

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!useEffectStrictModeCheckRef.current) {
            useEffectStrictModeCheckRef.current = true;
            loadPosts();
        }
    }, []);

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

        const result = await getPosts({ dateTime: paginationResult?.dateTime, postId: paginationResult?.postId, userId: authUser?.id });
        if (result.data != null && result.data.length !== 0) {
            const response: PostPaginationResponse = result.data;
            setPaginationResult(response);
            setPosts((posts: Post[]) => [...posts, ...response.posts]);
        }

        setIsLoading(false);
    }, [isLoading]);

    // Use the custom hook for infinite scroll
    useInfiniteScroll(loadPosts, isLoading, childRef);

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
                        break;
                    }
                }
                setPosts(newPosts);
            }
        } catch (err) {
            console.error("Error toggling like");
        }
    }

    const handleSubmitComment = async (text: string, post: Post): Promise<void> => {
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

    return (
        <>
            <ContentWrapper ref={childRef} $overflow="auto" $maxHeight="100vh">
                <Section>
                    <Main role="main">
                        <FlexRowFullWidth $justifyContent="center">
                            <FeedContainer>
                                {posts.map((post, index) => (
                                    <PostItem
                                        key={`${post.media[0].id}-${index}`}
                                        post={post}
                                        authUser={authUser}
                                        commentText={commentText[post.postId] || ""}
                                        isExpanded={viewShowMoreStates[post.postId] || false}
                                        onExpand={() => toggleCaptionViewMoreState(post.postId)}
                                        onCommentChange={(value) => handleCommentChange(post.postId, value)}
                                        onSubmitComment={async () => await handleSubmitComment(commentText[post.postId], post)}
                                        onEmojiClick={(emoji) => handleEmojiClick(emoji, post.postId)}
                                        onOpenCommentModal={() => openCommentModal(post)}
                                        onOpenLikesModal={() => openLikesModal(post)}
                                        onToggleLike={async () => await toggleLike(post.postId, authUser.userName, authUser.id)}
                                    />
                                ))}
                            </FeedContainer>
                        </FlexRowFullWidth>
                    </Main>
                </Section>
            </ContentWrapper>
        </>
    );
}

export default MainContent;