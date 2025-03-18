import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useParams } from "react-router-dom";
import { ContentWrapper, Div, Flex, FlexColumn, FlexRowFullWidth, Main, Section } from "../../../Components/Common/CombinedStyling";
import { useAppDispatch, actions } from "../../../Components/Redux/redux";
import { Profile } from "../../../api/types";
import { postGetProfileByUserName, postGetProfileStatsById, ServiceResponse } from "../../../api/ServiceController";
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
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* Creates 3 equal-width columns */
    gap: 10px; /* Adds space between items */
  `;
  
const GridItem = styled.div`
    background-color: #f0f0f0;
    padding: 20px;
    border: 1px solid #ddd;
    text-align: center;
`;

type ProfileStats = {
    postCount: number;
    followerCount: number;
    followingCount: number;
};

const ProfileContent: React.FC = () => {
    const [profile, setProfile] = useState<Profile>();
    const [profileStats, setProfileStats] = useState<ProfileStats>();
    const { userName } = useParams();

    const dispatch = useAppDispatch();

    useEffect(() => {
        postGetProfileByUserName({userName}).then(async (result) => { 
            setProfile(result.data);

            if(result.data != null) {
                const statsResult:ServiceResponse = await postGetProfileStatsById({ userId: result.data.userId });        
                setProfileStats(statsResult.data as ProfileStats);
            }
        });
    }, []);

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
            <ContentWrapper>
                <Section>
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
                <Section>
                    <Flex>
                        <GridContainer>
                            <GridItem>
                                asdasdasdas
                            </GridItem>
                            <GridItem>
                                asdasdasdas
                            </GridItem>
                            <GridItem>
                                asdasdasdas
                            </GridItem>
                            <GridItem>
                                asdasdasdas
                            </GridItem>
                            <GridItem>
                                asdasdasdas
                            </GridItem>
                            <GridItem>
                                asdasdasdas
                            </GridItem>
                            <GridItem>
                                asdasdasdas
                            </GridItem>                                                                                                                                                                        
                        </GridContainer>
                    </Flex>
                </Section>
            </ContentWrapper>
        </>
    )
};

export default ProfileContent;