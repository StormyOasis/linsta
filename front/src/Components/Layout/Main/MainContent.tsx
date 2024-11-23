import React, { SyntheticEvent, useEffect, useState } from "react";
import styled from "styled-components";
import * as styles from './Main.module.css';
import { getPostById, getPosts, postToggleLike } from "../../../api/ServiceController";
import { Post } from "../../../api/types";
import MediaSlider from "../../../Components/Common/MediaSlider";

import HeartSVG from "/public/images/heart.svg";
import HeartFilledSVG from "/public/images/heart-fill.svg";
import MessageSVG from "/public/images/message.svg";
import ShareSVG from "/public/images/send.svg";
import { useSelector } from "react-redux";
import { AuthUser } from "../../../api/Auth";
import { isOverflowed, getSanitizedText, isPostLiked, searchPostsIndexById, togglePostLikedState } from "../../../utils/utils";
import LikesModal from "./Modals/Main/LikesModal";
import { Flex, FlexColumn, FlexRow, Link } from "../../../Components/Common/CombinedStyling";
import EmojiPickerPopup from "../../../Components/Common/EmojiPickerPopup";
import StyledLink from "../../../Components/Common/StyledLink";

const host = "http://localhost:8080"; //TODO: From config or env

const MainContentWrapper = styled.div`
    overflow-y: auto;
    margin-left: ${props => props.theme["sizes"].sideBarNavWidthDefault};
    padding-left: 10px;

    @media (min-width: ${props => props.theme["breakpoints"].md}px) and 
            (max-width: ${props => props.theme["breakpoints"].lg - 1}px) {

        margin-left: ${props => props.theme["sizes"].sideBarNavWidthNarrow};
    }
        
    @media (max-width: ${props => props.theme["breakpoints"].md-1}px) {
        margin-left: 0;
        padding-left: 0;
    }
`;

const FeedContainer = styled.div`
    display: flex;
    max-width: 700px;
    width: 100%;
    overflow: visible;
    flex-direction: column;
    align-items: center;
    position: relative;
`;

const PostContainer = styled.div`
    display: flex;
    flex-direction: column;
    min-width: min(${props => props.theme["sizes"].feedPostMinWidth}, 100%);
    width: 100%;
    padding-bottom: 16px;
    margin-bottom: 20px;
    border-bottom: 1px solid ${props => props.theme["colors"].borderDefaultColor};
`;

const ActionSVGContainer = styled.div<{$isLiked?:boolean}>`
    width: 28px;
    height: 28px;

    color: ${props => props.$isLiked ? "red" : "black" };

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
    color: ${props => props.theme["colors"].defaultTextColor };
`;

type MainContentProps = {
}

interface CommentTextType {
    [key: string]: string;
}

const MainContent: React.FC<MainContentProps> = (props: MainContentProps) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [viewLikesModalPost, setViewLikesModalPost] = useState<Post|null>(null);
    const [viewShowMoreStates, setViewMoreStates] = useState<{}>({});
    const [commentText, setCommentText] = useState<CommentTextType>({});

    const authUser:AuthUser = useSelector((state:any) => state.auth.user);

    useEffect(() => {
        getPosts().then(result => {
            setPosts(result.data)
        }).catch(err => console.error(err));
    }, []);

    const toggleLike = async (postId: string, userName: string, userId: string) => {
        let result = await postToggleLike({postId, userName, userId});
        if(result.status === 200) {            
            // update the post list by updating the post instance in the post state array
            const index = searchPostsIndexById(postId, posts);
            if(index === -1) {
                return;
            }

            const newPostsList = [...posts];
            const newPost:Post|null = togglePostLikedState(userName, userId, newPostsList[index]);

            if(newPost === null) { return }

            newPostsList[index] = newPost;
            setPosts(newPostsList);            
        }
    }

    const renderLikes = (post: Post) => {
        if(post.global.likesDisabled || post.global.likes.length === 0) {
            return null;
        }

        return (
            <div style={{marginTop: "5px", marginBottom: "5px", lineHeight: "18px"}}>
                <span>Liked by <Link role="link" href={`${host}/${post.global.likes[0].userName}`} style={{fontWeight: "600"}}>{post.global.likes[0].userName}</Link> 
                    {post.global.likes.length > 1 && <span> and <Link role="link" href="#" onClick={() => setViewLikesModalPost(post)} style={{fontWeight: "600"}}>others</Link></span>}
                </span>
            </div>
        );
    }

    const toggleCaptionViewMoreState = (postId: string) => {
        const newState:any = Object.assign({}, viewShowMoreStates);
        newState[postId] = true;

        setViewMoreStates(newState);
    }

    const renderCommentsSection = (post: Post) => {
        const [sanitizedHtml, sanitizedText] = getSanitizedText(post.global.captionText);
        const overflowed:boolean = isOverflowed(`postid_${post.global.id}`);
        
        const isExpanded = viewShowMoreStates[post.global.id as keyof typeof viewShowMoreStates]

        return (
            <>
                {sanitizedText?.length > 0 &&
                    <CaptionContainer className={!isExpanded ? styles.lineClamp2 : {}}> 
                        <div id={`postid_${post.global.id}`}>
                            <Link role="link" href={`${host}/${post.user.userName}`} style={{fontWeight: "600", marginRight: "5px"}}>{post.user.userName}</Link>
                            <span dangerouslySetInnerHTML={{__html: sanitizedHtml}}></span>                            
                        </div>
                        {(overflowed && !isExpanded) && <Link href="#" 
                                        onClick={() => toggleCaptionViewMoreState(post.global.id)}
                                        style={{position: "absolute", bottom: "-16px", left: 0, color: "rgb(120, 120, 120)"}}>More</Link>}
                    </CaptionContainer>
                }
                { post.global?.comments?.length > 0 &&
                    <div>
                        <Link href="#" onClick={() => {}} style={{color: "rgb(120, 120, 120)"}}>View all {post.global.comments.length} comments</Link>
                    </div>
                }
                { !post.global?.commentsDisabled && 
                    <div>
                        <FlexRow>
                            <CommentTextArea value={commentText[`${post.global.id}`]}
                                placeholder="Add a new comment..." 
                                aria-label="Add a new comment..." 
                                onChange={(e) => {                                    
                                        const newCommentText = {...commentText};
                                        newCommentText[`${post.global.id}`] = e.target.value;
                                        setCommentText(newCommentText);
                                    }                             
                                }
                                onInput={(e) => {
                                    const element = e.currentTarget;
                                    element.style.height = "";
                                    element.style.height = element.scrollHeight + "px";
                                }
                            }/>
                            <Flex style={{marginTop: "auto", marginBottom: "auto"}}>
                                {
                                    (commentText[`${post.global.id}`] && commentText[`${post.global.id}`]) &&
                                    <div style={{paddingLeft: "5px", paddingRight: "5px"}}>
                                        <StyledLink onClick={(event) => {
                                            //call/create the add comment service
                                        }}>Post</StyledLink>
                                    </div>
                                }
                                <EmojiPickerPopup noPadding={true} onEmojiClick={(emoji: any) => {
                                    const newCommentText = {...commentText};
                                    newCommentText[`${post.global.id}`] += emoji.emoji;
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
            {viewLikesModalPost !== null && <LikesModal post={viewLikesModalPost} onClose={() => {setViewLikesModalPost(null)}}/>}
            <MainContentWrapper>
                <section style={{display: "flex", flexDirection: "column", minHeight: "100vh"}}>
                    <main role="main" style={{flexDirection: "column", display: "flex", flexGrow: "1", overflow: "hidden"}}>
                        <FlexRow style={{justifyContent: "center", width: "100%"}}>                    
                            <FeedContainer>
                                {posts.length > 0 && posts.map(post => {
                                    const isLiked = isPostLiked(authUser.userName, post);
                                    return (
                                        <article key={post.global.id}>
                                            <PostContainer>
                                                <div style={{paddingBottom: "12px"}}>
                                                    <div>
                                                        <div>                                                            
                                                            <Link role="link" href={`${host}/${post.user.userName}`} style={{fontWeight: "600"}}>{post.user.userName}</Link>
                                                        </div>
                                                    </div>
                                                </div>
                                                <FlexColumn style={{justifyContent: "center", overflow: "hidden"}}>
                                                    <FlexColumn style={{position: "relative"}}>
                                                        <div style={{width: "min(470px, 100vw)"}}>
                                                            <MediaSlider media={post.media} />
                                                        </div>
                                                    </FlexColumn>
                                                </FlexColumn>
                                                <div style={{position: "relative"}}>
                                                    <FlexColumn style={{height: "100%", position: "relative"}}>
                                                        <FlexRow style={{marginTop: "5px", marginBottom: "5px"}}>
                                                            <Flex>
                                                                <span>
                                                                    <div style={{cursor: "pointer"}}>
                                                                        <Flex style={{paddingRight: "8px"}}>
                                                                            <ActionSVGContainer $isLiked={isLiked} onClick={async () => await toggleLike(post.global.id, authUser.userName, authUser.id)}>
                                                                                {isLiked ? <HeartFilledSVG />: <HeartSVG /> }
                                                                            </ActionSVGContainer>
                                                                        </Flex>
                                                                    </div>
                                                                </span>
                                                            </Flex>
                                                            <Flex style={{display: "flex"}}>
                                                                <span>
                                                                    <div style={{cursor: "pointer"}}>
                                                                        <Flex style={{display: "flex", paddingRight: "8px"}}>
                                                                            <ActionSVGContainer>
                                                                                <MessageSVG />
                                                                            </ActionSVGContainer>
                                                                        </Flex>
                                                                    </div>
                                                                </span>
                                                            </Flex>
                                                            <Flex style={{display: "flex"}}>
                                                                <span>
                                                                    <div style={{cursor: "pointer"}}>
                                                                        <Flex style={{paddingRight: "8px"}}>
                                                                            <ActionSVGContainer>
                                                                                <ShareSVG/>
                                                                            </ActionSVGContainer>
                                                                        </Flex>
                                                                    </div>
                                                                </span>
                                                            </Flex>                                                                                                                     
                                                        </FlexRow>
                                                        <div>
                                                            {renderLikes(post)}
                                                        </div>
                                                        <div>                                                        
                                                            {renderCommentsSection(post)}
                                                        </div>
                                                    </FlexColumn>
                                                </div>      
                                            </PostContainer>
                                        </article>
                                    );
                                })}
                            </FeedContainer>
                        </FlexRow>
                    </main>
                </section>
            </MainContentWrapper> 
        </>       
    );    
}

export default MainContent;