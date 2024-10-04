import React, { useEffect, useState } from "react";
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
import { calcTextLengthIgnoringTags, getSanitizedText, isPostLiked, searchPostsIndexById, togglePostLikedState } from "../../../utils/utils";
import LikesModal from "./Modals/Main/LikesModal";

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
    //overflow: hidden;
    //display: -webkit-box;
    //-webkit-box-orient: vertical;
    //-webkit-line-clamp: 2;
    width: min(470px, 100vw);
    height: 38px;
    overflow: hidden;

    //&:after {
    //    content: "More"
    //}
`;

type MainContentProps = {
}

const MainContent: React.FC<MainContentProps> = (props: MainContentProps) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [viewLikesModalPost, setViewLikesModalPost] = useState<Post|null>(null);

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
                <span>Liked by <a role="link" href={`${host}/${post.global.likes[0].userName}`} style={{color: "black", textDecoration: "none", fontWeight: "600"}}>{post.global.likes[0].userName}</a> 
                    {post.global.likes.length > 1 && <span> and <a role="link" href="#" onClick={() => setViewLikesModalPost(post)} style={{color: "black", textDecoration: "none", fontWeight: "600"}}>others</a></span>}
                </span>
            </div>
        );
    }

    const renderCommentsSection = (post: Post) => {
        const sanitizedText = getSanitizedText(post.global.captionText);
        
        return (
            <>
                <CaptionContainer>                                                            
                    <a role="link" href={`${host}/${post.user.userName}`} style={{color: "black", textDecoration: "none", fontWeight: "600", marginRight: "5px"}}>{post.user.userName}</a>
                    <span id={`postid_${post.global.id}`} dangerouslySetInnerHTML={{__html: sanitizedText}}></span>
                </CaptionContainer>                            
            </>
        );
    }

    return (
        <>
            {viewLikesModalPost !== null && <LikesModal post={viewLikesModalPost} onClose={() => {setViewLikesModalPost(null)}}/>}
            <MainContentWrapper>
                <section style={{display: "flex", flexDirection: "column", minHeight: "100vh"}}>
                    <main role="main" style={{flexDirection: "column", display: "flex", flexGrow: "1", overflow: "hidden"}}>
                        <div style={{display: "flex", flexDirection: "row", justifyContent: "center", width: "100%"}}>                    
                            <FeedContainer>
                                {posts.length > 0 && posts.map(post => {
                                    const isLiked = isPostLiked(authUser.userName, post);
                                    return (
                                        <article key={post.global.id}>
                                            <PostContainer>
                                                <div style={{paddingBottom: "12px"}}>
                                                    <div>
                                                        <div>                                                            
                                                            <a role="link" href={`${host}/${post.user.userName}`} style={{color: "black", textDecoration: "none", fontWeight: "600"}}>{post.user.userName}</a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{justifyContent: "center", display: "flex", flexDirection: "column", overflow: "hidden"}}>
                                                    <div style={{display: "flex", flexDirection: "column", position: "relative"}}>
                                                        <div style={{width: "min(470px, 100vw)"}}>
                                                            <MediaSlider media={post.media} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{position: "relative"}}>
                                                    <div style={{height: "100%", display: "flex", flexDirection: "column", position: "relative"}}>
                                                        <div style={{marginTop: "5px", marginBottom: "5px", display: "flex", flexDirection: "row"}}>
                                                            <div style={{display: "flex"}}>
                                                                <span>
                                                                    <div style={{cursor: "pointer"}}>
                                                                        <div style={{display: "flex", paddingRight: "8px"}}>
                                                                            <ActionSVGContainer $isLiked={isLiked} onClick={async () => await toggleLike(post.global.id, authUser.userName, authUser.id)}>
                                                                                {isLiked ? <HeartFilledSVG />: <HeartSVG /> }
                                                                            </ActionSVGContainer>
                                                                        </div>
                                                                    </div>
                                                                </span>
                                                            </div>
                                                            <div style={{display: "flex"}}>
                                                                <span>
                                                                    <div style={{cursor: "pointer"}}>
                                                                        <div style={{display: "flex", paddingRight: "8px"}}>
                                                                            <ActionSVGContainer>
                                                                                <MessageSVG />
                                                                            </ActionSVGContainer>
                                                                        </div>
                                                                    </div>
                                                                </span>
                                                            </div>
                                                            <div style={{display: "flex"}}>
                                                                <span>
                                                                    <div style={{cursor: "pointer"}}>
                                                                        <div style={{display: "flex", paddingRight: "8px"}}>
                                                                            <ActionSVGContainer>
                                                                                <ShareSVG/>
                                                                            </ActionSVGContainer>
                                                                        </div>
                                                                    </div>
                                                                </span>
                                                            </div>                                                                                                                     
                                                        </div>
                                                        <div>
                                                            {renderLikes(post)}
                                                        </div>
                                                        <div>                                                        
                                                            {renderCommentsSection(post)}
                                                        </div>
                                                    </div>
                                                </div>      
                                            </PostContainer>
                                        </article>
                                    );
                                })}
                            </FeedContainer>
                        </div>
                    </main>
                </section>
            </MainContentWrapper> 
        </>       
    );    
}

export default MainContent;