import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import { ContentWrapper, Div, Flex, FlexColumn, FlexRow, FlexRowFullWidth, Main, Section, Span } from "../../../Components/Common/CombinedStyling";
import { useAppDispatch, actions, useAppSelector, RootState } from "../../../Components/Redux/redux";
import { Post, PostPaginationResponse, Profile } from "../../../api/types";
import { postGetPostByPostId, postGetPostsByUserId, postGetProfileByUserName, postGetProfileStatsById, postGetSingleFollowStatus, ServiceResponse } from "../../../api/ServiceController";
import { followUser, getPfpFromProfile, isVideoFileFromPath } from "../../../utils/utils";
import StyledButton from "../../../Components/Common/StyledButton";
import { MODAL_TYPES, ModalState } from "../../../Components/Redux/slices/modals.slice";
import { FOLLOWERS_MODAL_TYPE, FOLLOWING_MODAL_TYPE } from "../Main/Modals/Profile/FollowersModal";
import HeartFilledSVG from "/public/images/heart-fill.svg";
import MessageSVG from "/public/images/message.svg";
import { AuthUser } from "../../../api/Auth";
import StyledLink from "../../../Components/Common/StyledLink";
import LoadingImage from "../../../Components/Common/LoadingImage";
import useInfiniteScroll from "../../../utils/useInfiniteScroll";
import Linkify from "../../../Components/Common/Linkify";

const ProfilePicWrapper = styled(Div)`
    display: flex;
    width: 150px;
    height: 150px;
    object-fit: contain;    
    border-radius: 50%;
    padding-right: 20px;
`;

const UserNameSpan = styled(Span)`
    font-weight: 400;
    line-height: 25px;
    font-size: 20px;
    margin-bottom: 32px;
`;

const FullNameSpan = styled(Span)`
    font-weight: 600;
    line-height: 18px;
    font-size: 14px;
`;

const PronounSpan = styled(Span)`
    font-weight: 400;
    font-size: 12px;    
    padding-left: 10px;
`;

const BioText = styled(Div)`
    font-weight: 400;
    font-size: 12px;
    padding-top: 4px;
    padding-bottom: 4px;
`;

const StatSpan = styled(Span)`
    color: ${props => props.theme['colors'].mediumTextColor};
    line-height: 20px;
    font-size: 16px;
    font-weight: 400;
`;

const StatList = styled.ul`
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
`;

const StatListItem = styled.li`
    color: ${props => props.theme['colors'].defaultTextColor};
    margin-right: 32px;
    font-weight: 600;
    line-height: 20px;
`;

const ProfileStatLink = styled.a`
    color: ${props => props.theme['colors'].defaultTextColor};
    text-decoration: none;
    cursor: pointer;
`;

const GridContainer = styled(Div)`
    padding-top: 36px;    
    border-top: 1px solid ${props => props.theme['colors'].borderDefaultColor};
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

const PfpImg = styled.img`
    cursor: pointer;
    border-radius: 50%;
    max-width: 150px;
    max-height: 150px;
`;

type ProfileStats = {
    postCount: number;
    followerCount: number;
    followingCount: number;
};

const ProfileContent: React.FC = () => {
    const authUser: AuthUser = useAppSelector((state: RootState) => state.auth.user);
    const authUserProfileState: Profile = useAppSelector((state: RootState) => state.profile.profile);
    const profileNonce: string = useAppSelector((state: RootState) => state.profile.nonce);
    const commentModalState = useAppSelector((state: RootState) => state.modal.openModalStack?.find((modal: ModalState) => modal.modalName === MODAL_TYPES.COMMENT_MODAL));
    const deletedCommentId: string | null = useAppSelector((state: RootState) => state.misc.deletedCommentId);
    const deletedPostId: string | null = useAppSelector((state: RootState) => state.misc.deletedPostId);
    const updatedPost: Post | null = useAppSelector((state: RootState) => state.misc.updatedPost);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
    const [paginationResult, setPaginationResult] = useState<PostPaginationResponse | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hoverPost, setHoverPost] = useState<Post | null>(null);
    const [isLoggedInFollowing, setIsLoggedInFollowing] = useState<boolean>(false);
    const { userName } = useParams<{ userName: string }>();
    const childRef = useRef<HTMLDivElement | null>(null);

    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                // Get the profile by the name passed in the url
                let result = await postGetProfileByUserName({ userName });
                setProfile(result.data);

                const userId: string | null = result?.data?.userId;

                // Get the post, follower, and following stats
                if (result.data != null) {
                    const statsResult: ServiceResponse = await postGetProfileStatsById({ userId });
                    setProfileStats(statsResult.data as ProfileStats);
                }

                // initial data request for the infinte scroll
                result = await postGetPostsByUserId({ userId });
                if (result.data != null) {
                    const response: PostPaginationResponse = result.data;
                    setPaginationResult(response);
                    setPosts(response.posts);
                }

                // Simple query to see if the logged in user follows this profile
                // skip if looking at own profile
                if (authUser.id != userId) {
                    const response = await postGetSingleFollowStatus({ userId: authUser.id, checkUserId: userId });
                    setIsLoggedInFollowing(response ? response.data : false);
                }

            } catch (err) {
                console.error(err);
                navigate("/404");
            }
        }

        fetchProfileData();

        // This is needed in case the logged in user's profile changes (For example the Pfp changed)
        if (authUserProfileState != null && profile?.profileId === authUserProfileState.profileId) {
            setProfile(authUserProfileState);
        }

        //profile nonce is changed when the followers dialog is closed        
        if (profile?.userId != null) {            
            postGetProfileStatsById({ userId: profile?.userId }).then((statsResult: ServiceResponse) => {
                setProfileStats(statsResult.data as ProfileStats);
            })
        }

    }, [userName, authUserProfileState, profileNonce]);

    useEffect(() => {
        if (posts == null || commentModalState == null) {
            return;
        }

        // Update the likes and comment count
        const newPostState: Post[] = structuredClone(posts);
        for (const post of newPostState) {
            if (post.postId == commentModalState?.data?.post?.postId) {
                post.global.likes = commentModalState?.data?.post.global.likes;
                post.global.commentCount = commentModalState?.data?.post.global.commentCount;
                break;
            }
        }

        setPosts(newPostState);

    }, [commentModalState]);

    useEffect(() => {
        const updatePostCommentCount = async () => {
            // A comment has been deleted, so we need to force a recount of the comment counts
            // for that specific post 
            const result = await postGetPostByPostId({ postId: commentModalState?.data?.post?.postId });
            if (result.data != null) {
                const response: Post = result.data.post;
                setPosts((posts: Post[]) => {
                    const newPosts = [...posts];
                    const index = newPosts.findIndex((post: Post) => post.postId === response.postId);
                    if (index !== -1) {
                        newPosts[index].global.commentCount = response.global.commentCount;
                    }
                    return newPosts;
                });
            }
        }
        if (deletedCommentId) {
            updatePostCommentCount();
        }
    }, [deletedCommentId]);

    useEffect(() => {
        if (deletedPostId) {
            // A post has been deleted so we need to remove it from the list
            // and update the post counts
            const newPosts = posts.filter((post: Post) => post.postId !== deletedPostId);
            setPosts(newPosts);

            // Get the post, follower, and following stats
            if (profile?.userId != null && profileStats != null) {
                const newStats: ProfileStats = profileStats;
                newStats.postCount--;
                setProfileStats(newStats);
            }
        }
    }, [deletedPostId]);

    useEffect(() => {
        // A post has been updated, so we need to update the post in the list
        if (updatedPost) {
            const newPosts = posts.map((post: Post) => {
                if (post.postId === updatedPost.postId) {
                    return updatedPost;
                }
                return post;
            });
            setPosts(newPosts);
        }
    }, [updatedPost]);

    const loadPosts = useCallback(async () => {
        if (isLoading || (paginationResult && paginationResult.done)) {
            return;
        }

        setIsLoading(true);

        try {
            const result = await postGetPostsByUserId({
                userId: profile?.userId,
                dateTime: paginationResult?.dateTime,
                postId: paginationResult?.postId
            });

            if (result.data != null) {
                const response: PostPaginationResponse = result.data;
                setPaginationResult(response);
                setPosts((posts: Post[]) => [...posts, ...response.posts]);
            }
        } finally {
            setIsLoading(false);
        }

    }, [isLoading, paginationResult, profile?.userId]);

    // Use the custom hook for infinite scroll
    useInfiniteScroll(loadPosts, isLoading, childRef);       

    const handleFollowCountClick = (modalType: number) => {
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.FOLLOW_MODAL, data: { followModalType: modalType, profile } }));
    };

    const handlePfPClick = () => {
        if (authUser != null && profile?.userId != authUser.id) {
            return;
        }

        // Open the upload profile pic dialog by setting the state in redux
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.PROFILE_PIC_MODAL, data: { profile } }));
    }

    const handleGridImageClicked = (post: Post | null) => {
        if (post == null) {
            return;
        }

        const newPost: Post = structuredClone(post);
        newPost.user.pfp = getPfpFromProfile(profile);

        // Open the comment dialog by setting the state in redux
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.COMMENT_MODAL, data: { post: newPost } }));
    }

    const toggleFollowState = async (userId: string, followUserId: string | undefined, shouldFollow: boolean) => {
        if (followUserId == undefined) {
            return;
        }

        const result = await followUser(userId, followUserId, shouldFollow);

        // If successful the state needs to be updated to reflect the new follow status
        if (result) {
            setIsLoggedInFollowing(shouldFollow);
        }
    }

    // Don't display anything until the profile data is populated so that we don't briefly show a
    // bunch of undefineds
    if (!profile) {
        return <></>
    }

    return (
        <>
            <ContentWrapper ref={childRef} $overflow="auto" $maxHeight="100vh">
                <Section style={{ paddingBottom: "64px" }}>
                    <Div $marginTop="14px">
                        <Main role="main">
                            <FlexRowFullWidth $justifyContent="center">
                                <ProfilePicWrapper>
                                    {profile && <PfpImg
                                        onClick={handlePfPClick}
                                        src={getPfpFromProfile(profile)}
                                        alt={`${profile.userName}'s profile picture`}
                                        aria-label={`${profile.userName}'s profile picture`} />
                                    }
                                </ProfilePicWrapper>
                                <Div>
                                    <FlexColumn>
                                        <Div $display="inline-flex">
                                            <UserNameSpan>{profile?.userName}</UserNameSpan>
                                            {(authUser != null && profile?.userId === authUser.id) &&
                                                <StyledButton
                                                    text="Edit Profile"
                                                    aria-label="Edit Profile"
                                                    useSecondaryColors={true}
                                                    onClick={() => navigate(`/edit`)} />
                                            }
                                            {!(authUser != null && profile?.userId === authUser.id) &&
                                                <StyledButton
                                                    style={{ marginBottom: "12px" }}
                                                    useSecondaryColors={isLoggedInFollowing}
                                                    text={isLoggedInFollowing ? "Following" : "Follow"}
                                                    aria-label={isLoggedInFollowing ? "Following" : "Follow"}
                                                    onClick={async () => await toggleFollowState(authUser.id, profile?.userId, !isLoggedInFollowing)}>
                                                </StyledButton>
                                            }
                                        </Div>
                                    </FlexColumn>
                                    <FlexColumn $marginBottom="32px">
                                        <StatList>
                                            <StatListItem>{profileStats?.postCount} <StatSpan>posts</StatSpan></StatListItem>
                                            <StatListItem>
                                                <ProfileStatLink onClick={() => handleFollowCountClick(FOLLOWERS_MODAL_TYPE)}>
                                                    {profileStats?.followerCount} <StatSpan>followers</StatSpan>
                                                </ProfileStatLink>
                                            </StatListItem>
                                            <StatListItem>
                                                <ProfileStatLink onClick={() => handleFollowCountClick(FOLLOWING_MODAL_TYPE)}>
                                                    {profileStats?.followingCount} <StatSpan>following</StatSpan>
                                                </ProfileStatLink>
                                            </StatListItem>
                                        </StatList>
                                    </FlexColumn>
                                    <FlexColumn>
                                        <Div>
                                            <FullNameSpan>{`${profile?.firstName} ${profile?.lastName}`}</FullNameSpan>
                                            {profile?.pronouns && <PronounSpan>{`${profile.pronouns}`}</PronounSpan>}
                                        </Div>
                                        {profile?.bio && <BioText><Linkify html={profile.bio} /></BioText>}
                                        {profile?.link && <StyledLink styleOverride={{ fontSize: "12px" }} to={`${profile?.link}`}>{profile.link}</StyledLink>}
                                    </FlexColumn>
                                </Div>
                            </FlexRowFullWidth>
                        </Main>
                    </Div>
                </Section>
                <Section style={{ alignItems: "center" }}>
                    <Flex $justifyContent="center" style={{ margin: "0 auto" }}>
                        <GridContainer $width="100%">
                            {posts.map((post: Post, index: number) => {
                                const likeCount = post.global.likes ? post.global.likes.length : 0;
                                const commentCount = post.global.commentsDisabled ? 0 : post.global.commentCount;
                                const isVideo = isVideoFileFromPath(post.media[0].path);
                                return (
                                    <GridImageContainer
                                        key={`${post.media[0].id}-${index}`}
                                        onClick={() => handleGridImageClicked(post)}
                                        onMouseEnter={() => setHoverPost(post)}
                                        onMouseLeave={() => setHoverPost(null)}>

                                        {!isVideo && <GridImage
                                            src={post.media[0].path}
                                            alt={`${post.media[0].altText}`}
                                            aria-label={`${post.media[0].altText}`}
                                        />
                                        }
                                        {isVideo && <GridVideo
                                            src={post.media[0].path}
                                            aria-label={`${post.media[0].altText}`}
                                        />
                                        }

                                        {(hoverPost && hoverPost === post) &&
                                            <GridImageOverlay>
                                                <Div>
                                                    <Flex>
                                                        <FlexRow>
                                                            {(!post.global.likesDisabled || (authUser != null && profile?.userId === authUser.id)) &&
                                                                <>
                                                                    <HeartFilled />
                                                                    <ImageOverlayText>{likeCount}</ImageOverlayText>
                                                                </>
                                                            }
                                                            <Message />
                                                            <ImageOverlayText>{commentCount}</ImageOverlayText>
                                                        </FlexRow>
                                                    </Flex>
                                                </Div>
                                            </GridImageOverlay>
                                        }
                                    </GridImageContainer>
                                );
                            }
                            )}
                        </GridContainer>
                    </Flex>
                    <LoadingImage isLoading={isLoading} />
                </Section>
            </ContentWrapper>
        </>
    )
};

export default ProfileContent;