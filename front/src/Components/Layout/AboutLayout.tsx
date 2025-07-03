import React from "react";
import { keyframes, styled } from "styled-components";
import StyledButton from "../Common/StyledButton";
import { Div, Flex, Link } from "../Common/CombinedStyling";
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
    SiGraphql,
    SiGrafana,
    SiKibana,
    SiInsomnia,
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
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1rem;

    img {
        width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
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

const AboutLayout: React.FC = () => {
    return (
        <Wrapper>
            <Section>
                <LogoWrapper>
                    <Link href="/login" aria-label="Visit Linstagram">
                        <LargeLogo></LargeLogo>
                    </Link>
                </LogoWrapper>
                <Text style={{ textAlign: "center" }}>
                    A modern, full-scale Instagram-style application built with a cloud-native architecture. Designed for scalability, performance, and interactivity.
                </Text>
                <WarningText>
                    **Note: This is not meant for public use nor is it in anyway affilated with Meta.**
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
                            <li><SiGraphql /> Facebook Lexical</li>
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
                    <img src="/images/home.png" alt="Home screen" />
                    <img src="/images/profile.png" alt="User profile" />
                    <img src="/images/chat.png" alt="Chat screen" />
                </ScreenshotGrid>
            </Section>

            <Section>
                <Subtitle>Challenges & Solutions</Subtitle>
                <Text>The primary challenge was financial. As this is not meant to be a revenue generating application, having the best ROI on AWS fees is essential. </Text>
                <Text>The most notable tradeoff was with the graph database. The original plan was to develop locally using Gremlin in JanusGraph and then deploy to AWS Neptune. However, even a minimal Neptune databse proved to be too expensive.  The solution was to instead self host a JanusGraph install on an existing EC2 Instance.</Text>
                <Text>On the other hand, I tested deploying the back-end REST Api to AWS Lambda instead EC2.  While it would certainly save money, the cold start delays that Lambdas have were unacceptable. In this case, the extra cost of the EC2 instance uptime was the better value.</Text>
            </Section>

            <Section>
                <Subtitle>What's Next</Subtitle>
                <Text>The following are some of the current pending high priority Jira tickets for expanding functionality:</Text>
                <JiraList>
                    <li>LINSTA-130: Epic - Create notification and messaging systems</li>
                    <li>LINSTA-9: Move SNS and SES out of aws sandboxes</li>
                    <li>LINSTA-127: Collect front end metrics and send to SQS / Lambdas for processing</li>
                </JiraList>
            </Section>

            <Section>
                <VisitWrapperLink href="/login" aria-label="Visit Linstagram">
                    <VisitButton text="Visit Linstagram" />
                </VisitWrapperLink>
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