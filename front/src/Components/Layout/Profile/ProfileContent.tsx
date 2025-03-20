import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useParams } from "react-router-dom";
import { ContentWrapper, Div, Flex, FlexColumn, FlexRow, FlexRowFullWidth, Main, Section } from "../../../Components/Common/CombinedStyling";
import { useAppDispatch, actions } from "../../../Components/Redux/redux";
import { Post, PostPaginationResponse, Profile } from "../../../api/types";
import { postGetPostsByUserId, postGetProfileByUserName, postGetProfileStatsById, ServiceResponse } from "../../../api/ServiceController";
import { getPfpFromProfile } from "../../../utils/utils";
import StyledButton from "../../../Components/Common/StyledButton";
import { FOLLOW_MODAL, PROFILE_PIC_MODAL } from "../../../Components/Redux/slices/modals.slice";
import { FOLLOWERS_MODAL_TYPE, FOLLOWING_MODAL_TYPE } from "../Main/Modals/Profile/FollowersModal";

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

const GridContainer = styled.div`
    padding-top: 36px;    
    border-top: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    height: 100%;
    min-height: 100vh;
`;

const GridImage = styled.img`
    aspect-ratio: 1 / 1;
    object-fit: cover;
    cursor: pointer;
    width: 32%;
    max-width: 256px;
    height: auto;

    @media (max-width: ${props => props.theme["breakpoints"].md-1}px) {
        width: 50%;
    }  

    @media (max-width: ${props => props.theme["breakpoints"].sm-1}px) {
        width: 100%;
    }    
`;

type ProfileStats = {
    postCount: number;
    followerCount: number;
    followingCount: number;
};

const ProfileContent: React.FC = () => {
    const childRef = useRef(null);
    const [profile, setProfile] = useState<Profile>();
    const [profileStats, setProfileStats] = useState<ProfileStats>();
    const [paginationResult, setPaginationResult] = useState<PostPaginationResponse>();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const { userName } = useParams();
    const dispatch = useAppDispatch();

    useEffect(() => {
        postGetProfileByUserName({ userName }).then(async (result) => {
            setProfile(result.data);

            // Get the post, follower, and following stats
            if (result.data != null) {
                const statsResult: ServiceResponse = await postGetProfileStatsById({ userId: result.data.userId });
                setProfileStats(statsResult.data as ProfileStats);
            }

            // initial data request for the infinte scroll
            result = await postGetPostsByUserId({ userId: result.data.userId });
            if (result.data != null) {
                const response: PostPaginationResponse = result.data;
                setPaginationResult(response);
                setPosts(response.posts);
            }
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
        // Open the upload profile pic dialog by setting the state in redux        
        const payload = {
            profile
        };

        dispatch(actions.modalActions.openModal({ modalName: PROFILE_PIC_MODAL, data: payload }));
    }

    return (
        <>
            <ContentWrapper ref={childRef} style={{ overflow: "auto", maxHeight: "100vh" }}>
                <Section style={{ paddingBottom: "64px" }}>
                    <Div $marginTop="14px">
                        <Main role="main">
                            <FlexRowFullWidth $justifyContent="center">
                                <ProfilePicWrapper>
                                    {profile && <img
                                        style={{ cursor: "pointer", borderRadius: "50%", maxWidth: "150px", maxHeight: "150px" }}
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
                                            <StyledButton text="Edit Profile" useSecondaryColors={true} onClick={() => 1}></StyledButton>
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
                                        <FullNameSpan>{`${profile?.firstName} ${profile?.lastName}`}</FullNameSpan>
                                    </FlexColumn>
                                </Div>
                            </FlexRowFullWidth>
                        </Main>
                    </Div>
                </Section>
                <Section style={{alignItems: "center"}}>
                    <Flex style={{ justifyContent: "center", margin: "0 auto", width: "50%" }}>
                        <GridContainer style={{justifyContent: "center"}}>
                            {posts && posts.map((post: Post, index: number) => {
                                return (                                    
                                    <GridImage key={`${post.media[0].id}-${index}`}
                                        src={post.media[0].path}
                                        alt={`${post.media[0].altText}`}
                                        aria-label={`${post.media[0].altText}`} />                                    
                                );
                            }
                            )}
                        </GridContainer>
                    </Flex>
                    {isLoading &&
                        <div style={{ alignSelf: "center" }}>
                            <img src="/public/images/loading.gif" />
                        </div>
                    }
                </Section>
            </ContentWrapper>
        </>
    )
};

export default ProfileContent;