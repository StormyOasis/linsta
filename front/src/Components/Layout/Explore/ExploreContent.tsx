import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { ContentWrapper, Div, Flex, FlexColumnFullWidth, FlexRow, FlexRowFullWidth, Section, Span } from "../../../Components/Common/CombinedStyling";
import LoadingImage from "../../../Components/Common/LoadingImage";
import { MODAL_TYPES } from "../../../Components/Redux/slices/modals.slice";
import { PostPaginationResponse, Post } from "../../../api/types";
import { isVideoFileFromPath } from "../../../utils/utils";
import { getSearch } from "../../../api/ServiceController";
import { actions, useAppDispatch, useAppSelector } from "../../../Components/Redux/redux";
import { AuthUser } from "../../../api/Auth";
import useInfiniteScroll from "../../../utils/useInfiniteScroll";
import { HeartFilledSVG, MessageSVG } from "../../../Components/Common/Icon";

const GridContainer = styled(Div)`
    padding-top: 20px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 4px;
    height: 100%;

    max-width: calc((256px * 3) + (4px * 2)); /* 3 items + 2 gaps */
`;

const GridImageContainer = styled(Div)`
    position: relative;
    width: 256px;
    height: 256px;
    box-sizing: border-box;
    cursor: pointer;
    overflow: hidden;
    flex: 0 0 auto;

    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
        width: 48%;
    }

    @media (max-width: ${props => props.theme["breakpoints"].sm - 1}px) {
        width: 100%;
    }
`;

const GridImage = styled.img`
    aspect-ratio: 1 / 1;
    object-fit: cover;    
    width: 100%;
    height: 100%;
`;

const GridVideo = styled.video`
    aspect-ratio: 1 / 1;
    display:flex;
    width: 386px;
    height:412px;
    object-fit: cover;
    overflow: hidden;
`;

const GridImageOverlay = styled(Div)`
    position: absolute;
    top:0;
    left:0;
    width:100%;
    height:100%;
    background-color: rgba(0,0,0, .65);
    display: flex;
    justify-content: center;
    align-items: center;
`;

const HeartFilled = styled(HeartFilledSVG)`
    width: 32px;
    height: 32px;
    color: ${props => props.theme['colors'].backgroundColor};
`;

const Message = styled(MessageSVG)`
    width: 32px;
    height: 32px;
    color: ${props => props.theme['colors'].backgroundColor};
    padding-left: 10px;
`;

const ImageOverlayText = styled(Div)`
    color: ${props => props.theme['colors'].backgroundColor};
    font-size: 18px;
    padding-left: 10px;
    align-content: center;
`;

const ExploreContent: React.FC = () => {
    const authUser: AuthUser = useAppSelector((state: any) => state.auth.user);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [posts, setPosts] = useState<Post[]>([]);
    const [hoverPost, setHoverPost] = useState<Post | null>(null);
    const [q, setQ] = useState<string>("");

    const dispatch = useAppDispatch();
    const [searchParams] = useSearchParams();

    const childRef = useRef<HTMLDivElement | null>(null);
    const paginationRef = useRef<PostPaginationResponse | null>(null); // Ref to keep fully up to date pagination data
    const lastQueryRef = useRef<string>(""); // Tracks the last query string
    const qRef = useRef<string>("");
    const hasFetchedRef = useRef<boolean>(false);
    const loadInProgressRef = useRef<boolean>(false);

    useEffect(() => {
        const term = decodeURIComponent(searchParams.get("q") ?? "");

        if (!hasFetchedRef.current || lastQueryRef.current !== term) {
            hasFetchedRef.current = true;
            lastQueryRef.current = term;
            qRef.current = term;
            paginationRef.current = null;

            setQ(term);
            setPosts([]);
            loadPosts(term);
        }
    }, [searchParams]);

    const loadPosts = useCallback(async (term?: string) => {
        const query = term ?? qRef.current;

        if (isLoading || loadInProgressRef.current) {
            return;
        }

        const currentPagination = paginationRef.current;

        // Stop if this query is already fully paginated
        if (currentPagination?.done && currentPagination.q === query) {
            return;
        }

        loadInProgressRef.current = true;
        setIsLoading(true);

        try {
            const result = await getSearch({
                q: query,
                dateTime: currentPagination?.dateTime,
                postId: currentPagination?.postId
            });

            if (result.data != null) {
                const response: PostPaginationResponse = result.data;

                // Discard stale response
                if (response.q !== qRef.current) {
                    return;
                }

                paginationRef.current = response;

                setPosts((posts: Post[]) => [...posts, ...response.posts]);
            }
        } finally {
            setIsLoading(false);
            loadInProgressRef.current = false;
        }

    }, [isLoading]);

    // Use the custom hook for infinite scroll
    useInfiniteScroll(loadPosts, isLoading, childRef);

    const handleGridImageClicked = (post: Post) => {
        // Open the comment dialog by setting the state in redux
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.COMMENT_MODAL, data: { post } }));
    }

    const renderMedia = (post: Post) => {
        const media = post.media[0];
        return isVideoFileFromPath(media.path) ?
            <GridVideo src={media.path} aria-label={media.altText} /> :
            <GridImage src={media.path} alt={media.altText} aria-label={media.altText} />
    };

    const renderOverlay = (post: Post) => {
        const likeCount = post.global.likes?.length || 0;
        const commentCount = post.global.commentsDisabled ? 0 : post.global.commentCount;
        const isOwner = authUser?.id === post.user?.userId;

        return (
            <GridImageOverlay>
                <FlexRow>
                    {(!post.global.likesDisabled || isOwner) && (
                        <>
                            <HeartFilled />
                            <ImageOverlayText>{likeCount}</ImageOverlayText>
                        </>
                    )}
                    <Message />
                    <ImageOverlayText>{commentCount}</ImageOverlayText>
                </FlexRow>
            </GridImageOverlay>
        );
    };

    return (
        <>
            <ContentWrapper ref={childRef} $overflow="auto" $maxHeight="100vh">
                <Section style={{ alignItems: "center" }}>
                    <FlexColumnFullWidth>
                        <Flex $justifyContent="center" style={{ margin: "0 auto" }}>
                            <GridContainer $width="100%">
                                <FlexRowFullWidth $paddingBottom="20px">
                                    {(!isLoading && hasFetchedRef.current && posts.length === 0) &&
                                        <Span $fontSize="18px" $lineHeight="25px" $paddingRight="6px">No results found for term:</Span>
                                    }
                                    <Span $fontWeight="600" $fontSize="18px" $lineHeight="25px">{q}</Span>
                                </FlexRowFullWidth>
                                {posts.map((post: Post, index: number) => (
                                    <GridImageContainer
                                        key={`${post.media[0].id}-${index}`}
                                        onClick={() => handleGridImageClicked(post)}
                                        onMouseEnter={() => setHoverPost(post)}
                                        onMouseLeave={() => setHoverPost(null)}>

                                        {renderMedia(post)}
                                        {hoverPost && hoverPost === post && renderOverlay(post)}
                                    </GridImageContainer>
                                ))}
                            </GridContainer>
                        </Flex>
                    </FlexColumnFullWidth>
                    <LoadingImage isLoading={isLoading} />
                </Section>
            </ContentWrapper>
        </>
    )
};

export default ExploreContent;