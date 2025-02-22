import React, { useEffect, useState } from "react";
import styled from "styled-components";
import * as styles from '../Main/Main.module.css';
import { useParams } from "react-router-dom";
import { ContentWrapper, Div, Flex, FlexColumn, FlexRow, FlexRowFullWidth, Main, Section, Span } from "../../../Components/Common/CombinedStyling";
import { useAppSelector } from "../../../Components/Redux/redux";
import { Profile } from "../../../api/types";
import { postGetProfileByUserName, postGetProfileStatsById, ServiceResponse } from "../../../api/ServiceController";
import { getPfpFromProfile } from "../../../utils/utils";
import StyledButton from "../../../Components/Common/StyledButton";
import StyledLink from "../../../Components/Common/StyledLink";

const ProfilePicWrapper = styled(Div)`
    display: flex;
    width: 150px;
    height: 150px;
    border-radius: 50%;
    padding-right: 20px;
`;

const InfoWrapper = styled.div`
    
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

type ProfileStats = {
    postCount: number;
    followerCount: number;
    followingCount: number;
};

const ProfileContent: React.FC = () => {
    const [profile, setProfile] = useState<Profile>();
    const [profileStats, setProfileStats] = useState<ProfileStats>();
    const { userName } = useParams();

    useEffect(() => {
        postGetProfileByUserName({ userName }).then((result: ServiceResponse) => {
            const data: Profile = result.data as Profile;
            const userId: number = data.userId;

            return postGetProfileStatsById({ userId }).then((result: ServiceResponse) => {
                setProfile(data);
                setProfileStats(result.data as ProfileStats)
            });
        });
    }, []);

    const handleFollowerCountClick = () => {

    }

    const handleFollowingCountClick = () => {

    }

    const handlePfPClick = () => {

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
                                        style={{ cursor: "pointer" }}
                                        onClick={handlePfPClick}
                                        src={getPfpFromProfile(profile)}
                                        alt={`${profile.userName}'s profile picture`}
                                        aria-label={`${profile.userName}'s profile picture`} />
                                    }
                                </ProfilePicWrapper>
                                <InfoWrapper>
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
                                </InfoWrapper>
                            </FlexRowFullWidth>
                        </Main>
                    </Div>
                </Section>
                <Section>
                    <Flex>

                    </Flex>
                </Section>
            </ContentWrapper>
        </>
    )
};

export default ProfileContent;