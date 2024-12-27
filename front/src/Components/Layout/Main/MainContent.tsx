import React, { useEffect, useState } from "react";
import styled from "styled-components";
import * as styles from './Main.module.css';
import { getPosts, postAddComment } from "../../../api/ServiceController";
import { Post } from "../../../api/types";
import MediaSlider from "../../../Components/Common/MediaSlider";

import MessageSVG from "/public/images/message.svg";
import ShareSVG from "/public/images/send.svg";
import { useSelector } from "react-redux";
import { AuthUser } from "../../../api/Auth";
import { isOverflowed, getSanitizedText, isPostLiked, searchPostsIndexById, toggleLike } from "../../../utils/utils";
import LikesModal from "./Modals/Main/LikesModal";
import { BoldLink, CursorPointerDiv, DivWithMarginPadding, Flex, FlexColumn, FlexRow, FlexRowFullWidth, Link } from "../../../Components/Common/CombinedStyling";
import EmojiPickerPopup from "../../../Components/Common/EmojiPickerPopup";
import StyledLink from "../../../Components/Common/StyledLink";
import CommentModal from "./Modals/Comments/CommentsModal";
import { HOST } from "../../../api/config";
import ProfileLink from "../../../Components/Common/ProfileLink";
import { LikeToggler, ViewLikesText } from "../../../Components/Common/Likes";

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

const ActionContainer = styled(CursorPointerDiv) <{ $isLiked?: boolean }>`
    width: 28px;
    height: 28px;
    margin-left: auto;
    color: ${props => props.$isLiked ? "red" : "black"};

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

interface CommentTextType {
    [key: string]: string;
}

const MainContent: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [viewLikesModalPost, setViewLikesModalPost] = useState<Post|null>(null);
    const [viewCommentModalPost, setViewCommentModalPost] = useState<Post|null>(null);
    const [viewShowMoreStates, setViewMoreStates] = useState<{}>({});
    const [commentText, setCommentText] = useState<CommentTextType>({});
    
    const authUser:AuthUser = useSelector((state:any) => state.auth.user);

    useEffect(() => {
        getPosts().then(result => {
            setPosts(result.data)
        }).catch(err => console.error(err));
    }, []);

    const toggleCaptionViewMoreState = (postId: string) => {
        const newState:any = Object.assign({}, viewShowMoreStates);
        newState[postId] = true;

        setViewMoreStates(newState);
    }

    const handleSubmitComment = async (text: string, post: Post) => {
        const data = {
            text,
            postId: post.global.id,
            parentCommentId: null,
            userName: authUser.userName,
            userId: authUser.id,
        };

        const result = await postAddComment(data);

        if(result.status === 200) {
            // Success adding comment, clear out comment text box
            const newCommentText = {...commentText};
            newCommentText[`${post.global.id}`] = '';
            setCommentText(newCommentText);   
        }
    }

    const handleUpdateFromCommentModal = (post: Post) => {
        const newPosts: Post[] = [...posts];
        const index: number = searchPostsIndexById(post.global.id, posts);
        newPosts[index] = post;

        setPosts(newPosts);        
    }    

    const renderCommentsSection = (post: Post) => {
        const [sanitizedHtml, sanitizedText] = getSanitizedText(post.global.captionText);
        const overflowed:boolean = isOverflowed(`postid_${post.global.id}`);
        
        const isExpanded = viewShowMoreStates[post.global.id as keyof typeof viewShowMoreStates]

        return (
            <>
                {sanitizedText?.length > 0 &&
                <>
                    <CaptionContainer className={!isExpanded ? styles.lineClamp2 : {}}> 
                        <div id={`postid_${post.global.id}`}>
                            <span>
                                <ProfileLink showUserName={true} showPfp={false} url={`${HOST}/${post.user.userName}`} text={post.user.userName}></ProfileLink>
                                <span dangerouslySetInnerHTML={{__html: sanitizedHtml}}></span>
                            </span>                                          
                        </div>
                    </CaptionContainer>
                    {(overflowed && !isExpanded) && <Link href="#" 
                        onClick={() => toggleCaptionViewMoreState(post.global.id)}
                        style={{color: "rgb(120, 120, 120)"}}>More</Link>}                    
                </>}
                { post.global.commentCount > 0 &&
                    <DivWithMarginPadding $marginBottom="4px" $marginTop="4px">
                        <Link href="#" onClick={() => setViewCommentModalPost(post)} style={{color: "rgb(120, 120, 120)"}}>View all {post.global.commentCount} comments</Link>
                    </DivWithMarginPadding>
                }
                { !post.global?.commentsDisabled && 
                    <div>
                        <FlexRow>
                            <CommentTextArea value={commentText[`${post.global.id}`]}
                                placeholder="Add a new comment..." 
                                aria-label="Add a new comment..." 
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {                               
                                        const newCommentText = {...commentText};
                                        newCommentText[`${post.global.id}`] = e.currentTarget.value;
                                        setCommentText(newCommentText);
                                    }                             
                                }
                                onInput={(e:React.KeyboardEvent<HTMLTextAreaElement>) => {
                                    const element = e.currentTarget;
                                    element.style.height = "";
                                    element.style.height = element.scrollHeight + "px";
                                }}
                                onKeyDown={async (e:React.KeyboardEvent<HTMLTextAreaElement>) => {
                                    if (e.key === "Enter") {
                                        // Prevent adding a new line
                                        e.preventDefault();

                                        await handleSubmitComment(commentText[`${post.global.id}`], post);                                        
                                    }                                    
                                }}
                            />
                            <Flex $marginTop="auto" $marginBottom="auto">
                                {
                                    (commentText[`${post.global.id}`] && commentText[`${post.global.id}`].length > 0) &&
                                    <DivWithMarginPadding $paddingLeft="5px" $paddingRight="5px">
                                        <StyledLink onClick={async () => 
                                            await handleSubmitComment(commentText[`${post.global.id}`], post)
                                        }>
                                            Post
                                        </StyledLink>
                                    </DivWithMarginPadding>
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
            {viewCommentModalPost !== null && <CommentModal updatePost={handleUpdateFromCommentModal} post={viewCommentModalPost} onClose={() => {setViewCommentModalPost(null)}}/>}
            <MainContentWrapper>
                <section style={{display: "flex", flexDirection: "column", minHeight: "100vh", paddingTop: "10px"}}>
                    <main role="main" style={{flexDirection: "column", display: "flex", flexGrow: "1", overflow: "hidden"}}>
                        <FlexRowFullWidth style={{justifyContent: "center"}}>                    
                            <FeedContainer>
                                {posts.length > 0 && posts.map(post => {
                                    const isLiked = isPostLiked(authUser.userName, post);
                                    return (
                                        <article key={post.global.id}>
                                            <PostContainer>
                                                <DivWithMarginPadding $paddingBottom="12px">                                                                                                          
                                                    <ProfileLink showUserName={true} showPfp={true} text={post.user.userName} url={`${HOST}/${post.user.userName}`}></ProfileLink>                                                    
                                                </DivWithMarginPadding>
                                                <FlexColumn style={{justifyContent: "center", overflow: "hidden", position: "relative", width: "min(470px, 100vw)"}}>                                                                                                        
                                                    <MediaSlider media={post.media} />                                                                                                       
                                                </FlexColumn>
                                                <div style={{position: "relative"}}>
                                                    <FlexColumn style={{height: "100%", position: "relative"}}>
                                                        <FlexRow style={{marginTop: "5px", marginBottom: "5px"}}>                                                            
                                                            <span>
                                                                <CursorPointerDiv>
                                                                    <Flex $paddingRight="8px">
                                                                    <LikeToggler
                                                                        isLiked={isLiked}
                                                                        handleClick={async () => {
                                                                            setPosts(await toggleLike(post.global.id, authUser.userName, authUser.id, posts))}} />
                                                                    </Flex>
                                                                </CursorPointerDiv>
                                                            </span>                                                    
                                                            <span>
                                                                <CursorPointerDiv>
                                                                    <Flex $paddingRight="8px">
                                                                        <ActionContainer>
                                                                            <MessageSVG onClick={() => setViewCommentModalPost(post)}/>
                                                                        </ActionContainer>
                                                                    </Flex>
                                                                </CursorPointerDiv>
                                                            </span>                                    
                                                            <span>
                                                                <CursorPointerDiv>
                                                                    <Flex $paddingRight="8px">
                                                                        <ActionContainer>
                                                                            <ShareSVG/>
                                                                        </ActionContainer>
                                                                    </Flex>
                                                                </CursorPointerDiv>
                                                            </span>                                                                                                                 
                                                        </FlexRow>
                                                        <div>
                                                            <DivWithMarginPadding $marginTop="5px" $marginBottom="5px">
                                                                <ViewLikesText post={post} handleClick={() => setViewLikesModalPost(post)}></ViewLikesText>
                                                            </DivWithMarginPadding>
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
                        </FlexRowFullWidth>
                    </main>
                </section>
            </MainContentWrapper> 
        </>       
    );    
}

export default MainContent;