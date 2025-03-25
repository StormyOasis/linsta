import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import { ContentWrapper, Div, Flex, FlexColumn, FlexRow, FlexRowFullWidth, Main, Section } from "../../../Components/Common/CombinedStyling";
import { useAppDispatch, actions, useAppSelector } from "../../../Components/Redux/redux";
import { Post, PostPaginationResponse, PostWithCommentCount, Profile } from "../../../api/types";
import { postGetPostsByUserId, postGetProfileByUserName, postGetProfileStatsById, postGetSingleFollowStatus, ServiceResponse } from "../../../api/ServiceController";
import { followUser, getPfpFromProfile } from "../../../utils/utils";
import StyledButton from "../../../Components/Common/StyledButton";
import { COMMENT_MODAL, FOLLOW_MODAL, PROFILE_PIC_MODAL } from "../../../Components/Redux/slices/modals.slice";
import { FOLLOWERS_MODAL_TYPE, FOLLOWING_MODAL_TYPE } from "../Main/Modals/Profile/FollowersModal";
import HeartFilledSVG from "/public/images/heart-fill.svg";
import MessageSVG from "/public/images/message.svg";
import { AuthUser } from "../../../api/Auth";
import StyledLink from "../../../Components/Common/StyledLink";

const ProfilePicWrapper = styled(Div)`
    display: flex;
    width: 150px;
    height: 150px;
    object-fit: contain;    
    border-radius: 50%;
    padding-right: 20px;
`;

const UserNameSpan = styled.span`
    font-weight: 400;
    line-height: 25px;
    font-size: 20px;
    margin-bottom: 32px;
`;

const FullNameSpan = styled.span`
    font-weight: 600;
    line-height: 18px;
    font-size: 14px;
`;

const PronounSpan = styled.span`
    font-weight: 400;
    font-size: 12px;    
    padding-left: 10px;
`;

const BioText = styled.div`
    font-weight: 400;
    font-size: 12px;
    padding-top: 4px;
    padding-bottom: 4px;
`;

const StatSpan = styled.span`
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
`;

const GridContainer = styled(Div)`
    padding-top: 36px;    
    border-top: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    height: 100%;
    min-height: 100vh;
`;

const GridImageContainer = styled(Div)<{$width: string}>`
    max-height: 256px;
    position: relative;
    max-width: 256px;
    height: auto;
    width: ${props => props.$width};
    cursor: pointer;

    @media (max-width: ${props => props.theme["breakpoints"].md-1}px) {
        width: 50%;
    }  

    @media (max-width: ${props => props.theme["breakpoints"].sm-1}px) {
        width: 100%;
    }        
`;

const GridImage = styled.img`
    aspect-ratio: 1 / 1;
    object-fit: cover;    
    width: 100%;
    height: 100%;
`;

const GridImageOverlay = styled.div`
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

const GridImageOverlayDetails = styled.div``;

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
    const authUser: AuthUser = useAppSelector((state: any) => state.auth.user);
    const childRef = useRef(null);
    const navigate = useNavigate();
    const [profile, setProfile] = useState<Profile>();
    const [profileStats, setProfileStats] = useState<ProfileStats>();
    const [paginationResult, setPaginationResult] = useState<PostPaginationResponse>();
    const [posts, setPosts] = useState<PostWithCommentCount[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hoverPost, setHoverPost] = useState<PostWithCommentCount|null>(null);
    const [isLoggedInFollowing, setIsLoggedInFollowing] = useState<boolean>(false);
    const { userName } = useParams();
    const dispatch = useAppDispatch();

    useEffect(() => {
        postGetProfileByUserName({ userName }).then(async (result) => {
            setProfile(result.data);

            const userId = result.data.userId;

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
            if(authUser.id != userId) {
                const results = await postGetSingleFollowStatus({userId: authUser.id, checkUserId: userId});
                setIsLoggedInFollowing(results ? results.data : false);
            }

        }).catch(() => {
            // A failure occurred, most likely the user navigated to a profile that doesn't exist
            // Send to a 404 not found page
            navigate("/404");
        });
    }, []);

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

        const result = await postGetPostsByUserId({ userId: profile?.userId, dateTime: paginationResult?.dateTime, postId: paginationResult?.postId });
        if (result.data != null) {
            const response: PostPaginationResponse = result.data;
            setPaginationResult(response);
            setPosts((posts: PostWithCommentCount[]) => [...posts, ...response.posts]);
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

    const handleFollowerCountClick = () => {
        const payload = {
            followModalType: FOLLOWERS_MODAL_TYPE,
            profile
        };

        dispatch(actions.modalActions.openModal({ modalName: FOLLOW_MODAL, data: payload }));
    }

    const handleFollowingCountClick = () => {
        const payload = {
            followModalType: FOLLOWING_MODAL_TYPE,
            profile
        };

        dispatch(actions.modalActions.openModal({ modalName: FOLLOW_MODAL, data: payload }));
    }

    const handlePfPClick = () => {
        if(authUser != null && profile?.userId != authUser.id) {
            return;
        }

        // Open the upload profile pic dialog by setting the state in redux        
        const payload = {
            profile
        };

        dispatch(actions.modalActions.openModal({ modalName: PROFILE_PIC_MODAL, data: payload }));
    }

    const handleMouseEnter = (post: PostWithCommentCount) => {
        setHoverPost(post);
    }

    const handleMouseLeave = () => {
        setHoverPost(null);
    }    

    const handleGridImageClicked = (post:PostWithCommentCount) => {
        if (post == null) {
            return;
        }
   
        const payload = {
            post: post as Post
        };

        const posts:Post[] = [];
        posts.push(post);
        dispatch(actions.postActions.setPosts(posts));
        dispatch(actions.modalActions.openModal({ modalName: COMMENT_MODAL, data: payload }));
    }

    const toggleFollowState = async (userId: string, followUserId: string|undefined, shouldFollow: boolean) => {
        if(followUserId == null) {
            return;
        }

        const result = await followUser(userId, followUserId, shouldFollow);

        // If successful the state needs to be updated to reflect the new follow status
        if(result) {
            setIsLoggedInFollowing(shouldFollow);
        }
    }

    
    return (
        <>
            <ContentWrapper ref={childRef} style={{ overflow: "auto", maxHeight: "100vh" }}>
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
                                                    useSecondaryColors={true}
                                                    onClick={() => navigate(`/edit`)}>                                                    
                                                </StyledButton>
                                            }
                                            {!(authUser != null && profile?.userId === authUser.id) &&
                                                <StyledButton
                                                    style={{ marginBottom: "12px" }}
                                                    useSecondaryColors={isLoggedInFollowing}
                                                    text={isLoggedInFollowing ? "Following" : "Follow"}
                                                    onClick={async () => await toggleFollowState(authUser.id, profile?.userId, !isLoggedInFollowing)}>                                
                                                </StyledButton>                                              
                                            }
                                        </Div>
                                    </FlexColumn>
                                    <FlexColumn $marginBottom="32px">
                                        <StatList>
                                            <StatListItem>{profileStats?.postCount} <StatSpan>posts</StatSpan></StatListItem>
                                            <StatListItem>
                                                <ProfileStatLink href="#" onClick={handleFollowerCountClick}>
                                                    {profileStats?.followerCount} <StatSpan>followers</StatSpan>
                                                </ProfileStatLink>
                                            </StatListItem>
                                            <StatListItem>
                                                <ProfileStatLink href="#" onClick={handleFollowingCountClick}>
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
                                        {profile?.bio && <BioText dangerouslySetInnerHTML={{__html: profile.bio}}></BioText>}
                                        {profile?.link && <StyledLink styleOverride={{fontSize: "12px"}} to={`${profile?.link}`}>{profile.link}</StyledLink>}
                                    </FlexColumn>
                                </Div>
                            </FlexRowFullWidth>
                        </Main>
                    </Div>
                </Section>
                <Section style={{alignItems: "center"}}>
                    <Flex $justifyContent="center" $width="50%" style={{margin: "0 auto"}}>
                        <GridContainer $width="100%" style={{justifyContent: "center"}}>
                            {posts && posts.map((post: PostWithCommentCount, index: number) => {
                                const likeCount = post.global.likes ? post.global.likes.length : 0;
                                const commentCount = post.commentCount;
                                return (
                                    <GridImageContainer
                                        $width="50%"
                                        key={`${post.media[0].id}-${index}`}
                                        onClick={() => handleGridImageClicked(post)}                                            
                                        onMouseEnter={() => handleMouseEnter(post)}
                                        onMouseLeave={() => handleMouseLeave()}>

                                        <GridImage
                                            src={post.media[0].path}
                                            alt={`${post.media[0].altText}`}
                                            aria-label={`${post.media[0].altText}`} 
                                            />                                    

                                        {(hoverPost && hoverPost === post) && 
                                            <GridImageOverlay>
                                                <GridImageOverlayDetails>
                                                    <Flex>
                                                        <FlexRow>
                                                            <HeartFilled />                                                            
                                                            <ImageOverlayText>{likeCount}</ImageOverlayText>
                                                            <Message />
                                                            <ImageOverlayText>{commentCount}</ImageOverlayText>
                                                        </FlexRow>
                                                    </Flex>                                                                                                        
                                                </GridImageOverlayDetails>
                                            </GridImageOverlay>
                                        }    
                                    </GridImageContainer>                                                                      
                                );}
                            )}
                        </GridContainer>
                    </Flex>
                    {isLoading &&
                        <Div $alignSelf="center">
                            <img src="/public/images/loading.gif" />
                        </Div>
                    }
                </Section>
            </ContentWrapper>
        </>
    )
};

export default ProfileContent;