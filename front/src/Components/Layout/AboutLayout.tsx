import React, { useEffect, useState } from "react";
import { keyframes, styled } from "styled-components";
import StyledButton from "../Common/StyledButton";
import { Div, Flex, FlexRowFullWidth, Link } from "../Common/CombinedStyling";
import {
    FaReact,
    FaDocker,
    FaGithub,
    FaAws,
    FaHtml5,
    FaCss3Alt,
    FaNodeJs,
    FaJs,
    FaJira,    
} from 'react-icons/fa';

import {
    SiRedux,
    SiStyledcomponents,
    SiTypescript,
    SiJest,
    SiKoa,
    SiElastic,
    SiServerless,
    SiRedis,
    SiJsonwebtokens,
    SiNginx,
    SiGrafana,
    SiKibana,
    SiInsomnia,
    SiFacebook,
    SiGraphql,
    SiAxios,    
} from 'react-icons/si';
import { SiLocation } from 'react-icons/si';
import { SiAmazonaws
} from 'react-icons/si';
import LargeLogo from "../Common/LargeLogo";
import StyledLink from "../Common/StyledLink";


const fadeInUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

const Wrapper = styled(Div)`
    padding: 2rem 1rem;
    max-width: 1100px;
    margin: 0 auto;
    color: #333;
    line-height: 1.6;
`;

const Section = styled.section`
    margin-bottom: 3rem;
    animation: ${fadeInUp} 0.8s ease both;
`;

const Subtitle = styled.h2`
    font-size: 1.75rem;
    color: #222;
    margin-bottom: 1rem;
`;

const Text = styled.p`
    font-size: 1rem;
    margin-top: 0.5rem;
`;

const StackWrapper = styled(Flex)`
    flex-wrap: wrap;
    gap: 2rem;
    margin-top: 1rem;

    @media (max-width: ${props => props.theme["breakpoints"].md}px) {
        flex-direction: column;
    }
`;

const StackColumn = styled(Div)`
    flex: 1;
    min-width: 250px;
`;

const StackHeading = styled.h3`
    font-size: 1.2rem;
    color: #444;
    margin-bottom: 0.5rem;
`;

const TechList = styled.ul`
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    li {
        background: #f1f1f1;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        transition: background 0.3s ease;

        &:hover {
            background: #e0e0e0;
        }
    }
`;

const JiraList = styled(TechList)`    
    padding-left: 48px;
    padding-right:48px;
`;

const ScreenshotGrid = styled(Div)`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
`;

const ScreenshotCard = styled(Div)`
    position: relative;
    overflow: hidden;
    border-radius: 6px;
    border: 1px solid #ddd;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    cursor: pointer;

    &:hover div {
        opacity: 1;
        transform: translateY(0);
    }
`;

const ScreenshotImg = styled.img`
    width: 100%;
    display: block;
    height: auto;
`;

const ScreenshotOverlay = styled(Div)`
    position: absolute;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    color: #fff;
    width: 100%;
    padding: 1rem;
    opacity: 0;
    transform: translateY(100%);
    transition: all 0.3s ease;

    p {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.4;
    }

    @media (hover: none) and (pointer: coarse) {
        opacity: 1;
        transform: translateY(0);
        position: static;
        background: #333;
        color: #fff;
        margin-top: 0.5rem;
    }
`;


const Footer = styled.footer`
    text-align: center;
    font-size: 0.9rem;
    margin-top: 3rem;
`;

const WarningText = styled(Div)`
    text-align: center;    
    font-weight: 700;
    font-size: .99em;
`;

const VisitWrapperLink = styled(Link)`
    display: flex;
    justify-content: center;
`;

const VisitButton = styled(StyledButton)`
    margin: 0;
    @media (max-width: ${props => props.theme["breakpoints"].md}px) {
        text-align: center;
        width: 100%;
    }
`;

const LogoWrapper = styled(Div)`
    justify-self: center;
`;

const ModalBackdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: start;
    z-index: 1000;
    animation: ${fadeIn} 0.3s ease forwards;
`;

const ModalContent = styled.div`
    margin-top: 24px;
    background: #fff;
    padding: 1rem;
    border-radius: 8px;
    max-width: 75%;
    max-height: 75%;
    overflow: auto;
    position: relative;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);

    animation: ${fadeIn} 0.3s ease forwards;

    img {
        width: 100%;
        height: auto;
        display: block;
        border-radius: 6px;
        margin-bottom: 1rem;
    }

    p {
        font-size: 0.95rem;
        color: #333;
    }
`;

const CloseButton = styled.button`
    position: absolute;
    top: 0.5rem;
    right: 0.75rem;
    font-size: 1.5rem;
    background: none;
    border: none;
    color: #333;
    cursor: pointer;

    &:hover {
        color: #000;
    }
`;

const imageUrl = `https://d1xxvwtswm7wsd.cloudfront.net/about`
const screenshots = [
    {
        src: `${imageUrl}/signup.png`,
        alt: 'Sign up form',
        description: 'User registration form with validation and backend integration via Koa + JWT',
    },
    {
        src: `${imageUrl}/confirmationEmail.png`,
        alt: 'Sign up confirmation',
        description: 'Confirmation email received as part of signup flow',
    },
    {
        src: `${imageUrl}/mainFeed.png`,
        alt: 'Main feed',
        description: "The user's primary feed, displaying posts from the specific users they follow"
    },
    {
        src: `${imageUrl}/exploreWithSearch.png`,
        alt: 'Explore with search',
        description: 'The Explore page showing posts and includes the search popout with example search results',
    },
    {
        src: `${imageUrl}/createPost.png`,
        alt: 'Create post',
        description: 'The final step in the create new post flow, showing adding captions, location, collaborators, and additional settings',
    },
    {
        src: `${imageUrl}/commentModal.png`,
        alt: 'Comment modal',
        description: 'Modal where a user can add, like, and reply to comments',
    },
    {
        src: `${imageUrl}/profilePage.png`,
        alt: 'Profile',
        description: "The profile page showing a user's bio and additional information, as well as showing each of that user's posts"
    },
    {
        src: `${imageUrl}/editProfile.png`,
        alt: 'Edit profile',
        description: "Page allowing the user to update their bio, profile picture, webpage, and additional information"
    },
    {
        src: `${imageUrl}/metrics.png`,
        alt: 'Metrics',
        description: "Example Grafana visualizations based on metrics collected via statsd"
    },
    {
        src: `${imageUrl}/createPostMobile.png`,
        alt: 'Create post on mobile',
        description: 'The final step in the create post flow as seen on mobile',
    },
    {
        src: `${imageUrl}/mainFeedMobile.png`,
        alt: 'Main feed on mobile',
        description: 'The main feed as it appears on mobile devices',
    },
];

const AboutLayout: React.FC = () => {
    const [modalImage, setModalImage] = useState(null);

    const openModal = (image: any) => setModalImage(image);
    const closeModal = () => setModalImage(null);

    useEffect(() => {
        const handleEsc = (e: any) => {
            if (e.key === 'Escape') closeModal();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <Wrapper>
            <Section>
                <LogoWrapper>
                    <Link href="/login" aria-label="Visit Linstagram">
                        <LargeLogo></LargeLogo>
                    </Link>
                </LogoWrapper>
                <Text style={{ textAlign: "center" }}>
                    A full-featured, enterprise-grade social networking platform inspired by Instagram. Built with a cloud-native architecture for high performance, scalability, and real-time interactivity.
                </Text>
                <WarningText>
                    **Note: This is not meant for public use nor is it in any way affilated with Meta.**
                </WarningText>
            </Section>

            <Section>
                <Subtitle>Project Overview</Subtitle>
                <Text>
                    This project replicates core social media functionality. Users can create profiles, post media, comment, like, and follow others. In addition, it includes enterprise-ready features such as secure authentication, AWS-powered geolocation suggestions, and a distributed event-driven backend architecture.
                </Text>
            </Section>

            <Section>
                <Subtitle>Tech Stack</Subtitle>
                <StackWrapper>
                    {/* Front-End */}
                    <StackColumn>
                        <StackHeading>Front-End</StackHeading>
                        <TechList>
                            <li><FaReact /> React + SSR</li>
                            <li><SiRedux /> Redux</li>
                            <li><SiTypescript /> TypeScript</li>
                            <li><FaJs /> JavaScript</li>
                            <li><FaHtml5 /> HTML</li>
                            <li><FaCss3Alt /> CSS</li>
                            <li><SiStyledcomponents /> styled-components</li>
                            <li><SiJest /> Jest</li>
                            <li><SiFacebook /> Facebook Lexical</li>
                        </TechList>
                    </StackColumn>

                    {/* Back-End */}
                    <StackColumn>
                        <StackHeading>Back-End</StackHeading>
                        <TechList>
                            <li><FaNodeJs /> Node.js</li>
                            <li><SiKoa /> Koa</li>
                            <li><SiJsonwebtokens /> JWT</li>
                            <li><SiRedis /> Redis</li>
                            <li><SiElastic /> ElasticSearch</li>
                            <li><SiGraphql /> JanusGraph</li>
                            <li><FaAws /> AWS S3, SES, SNS</li>
                            <li><FaAws /> AWS Location Services</li>
                            <li><FaAws /> AWS SQS</li>
                            <li><SiAxios /> Axios connection to OpenAI</li>
                        </TechList>
                    </StackColumn>

                    {/* DevOps & Tools */}
                    <StackColumn>
                        <StackHeading>Infrastructure, DevOps & Tools</StackHeading>
                        <TechList>
                            <li><FaDocker /> Docker / Docker Compose</li>
                            <li><FaGithub /> GitHub</li>
                            <li><SiServerless /> Serverless Framework</li>
                            <li><FaAws /> AWS EC2, Lambda, Cloudfront</li>
                            <li><SiNginx /> NGINX</li>
                            <li><FaJira /> Jira</li>
                            <li><SiGrafana /> Grafana</li>
                            <li><SiKibana /> Kibana</li>
                            <li><SiInsomnia /> Insomnia REST Client</li>
                        </TechList>
                    </StackColumn>
                </StackWrapper>
            </Section>

            <Section>
                <Subtitle>Screenshots</Subtitle>
                <ScreenshotGrid>
                    {screenshots.map((screenshot, index) => (
                        <ScreenshotCard key={index} onClick={() => openModal(screenshot)}>
                            <ScreenshotImg src={screenshot.src} alt={screenshot.alt} />
                            <ScreenshotOverlay>
                                <p>{screenshot.description}</p>
                            </ScreenshotOverlay>
                        </ScreenshotCard>
                    ))}
                </ScreenshotGrid>
                {modalImage && (
                    <ModalBackdrop onClick={closeModal}>
                        <ModalContent onClick={(e) => e.stopPropagation()}>
                            <CloseButton onClick={closeModal}>&times;</CloseButton>
                            <img src={modalImage.src} alt={modalImage.alt} />
                            <p>{modalImage.description}</p>
                        </ModalContent>
                    </ModalBackdrop>
                )}
            </Section>

            <Section>
                <Subtitle>Challenges & Solutions</Subtitle>
                <Text>The biggest challenge was infrastructure cost. Since this project is not intended to generate revenue, I had to design for cost-efficiency without sacrificing architecture quality.</Text>
                <Text>The most notable tradeoff was with the graph database. The original plan was to develop locally using Gremlin in JanusGraph and then deploy to AWS Neptune. However, even a minimal Neptune database proved to be too expensive.  The solution was to instead self host a JanusGraph install on an existing EC2 Instance.</Text>
                <Text>On the other hand, I tested deploying the back-end REST Api to AWS Lambda instead of EC2.  While it would certainly save money, AWS Lambda cold starts introduced unacceptable latency for user-facing APIs. In this case, a continuously running EC2 instance offered a better balance between performance and cost.</Text>
            </Section>

            <Section>
                <Subtitle>What's Next</Subtitle>
                <Text>The following are some of the current pending high priority Jira tickets for expanding functionality:</Text>
                <JiraList>
                    <li><b>LINSTA-130</b>: Epic - Create notification and messaging systems</li>
                    <li><b>LINSTA-127</b>: Collect front end metrics and send to SQS / Lambdas for processing</li>
                    <li><b>LINSTA-131</b>: Adjust Gremlin to not use read then write transactions in order to prevent lock contention</li>
                    <li><b>LINSTA-133</b>: Setup Jenkins or AWS CodeBuild / Deploy for CI/CD</li>
                </JiraList>
            </Section>

            <Section>
                <VisitWrapperLink href="/login" aria-label="Visit Linstagram">
                    <VisitButton text="Visit Linstagram" />
                </VisitWrapperLink>
                <Div>
                    <Text><b>Note</b>: I’m currently operating in the AWS test (sandbox) environment for email and SMS, which restricts messaging to pre-approved addresses only.  As a result, the signup process will be blocked at the confirmation code step for now.</Text>
                    <Text>I’ve submitted a request to move to production mode. Once approved, I’ll be able to send messages to any address. </Text>
                    <Text>In the meantime, I have provided two valid logins for use in the app:</Text>
                    <FlexRowFullWidth>
                        <TechList>
                            <li>Username: linstatest01</li>
                            <li>Password: Linstatest01!</li>
                        </TechList>
                        <TechList style={{ marginLeft: "28px" }}>
                            <li>Username: linstatest02</li>
                            <li>Password: Linstatest02!</li>
                        </TechList>
                    </FlexRowFullWidth>
                </Div>
            </Section>

            <Footer>
                <StyledLink to="https://github.com/StormyOasis/linsta">
                    View Source on GitHub
                </StyledLink>
            </Footer>
        </Wrapper>
    );
};

export default AboutLayout;