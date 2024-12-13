import React, { ReactNode, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { CommentUiData, Like, Post } from "../../../../../api/types";
import { Flex, FlexColumn, FlexRow, Link } from "../../../../../Components/Common/CombinedStyling";
import MediaSlider from "../../../../../Components/Common/MediaSlider";
import { HOST } from "../../../../../api/config";
import ProfileLink from "../../../../../Components/Common/ProfileLink";
import { postAddComment, postGetCommentsByPostId, postToggleCommentLike } from "../../../../../api/ServiceController";
import { Comment } from '../../../../../api/types';
import { dateDiff, getSanitizedText, isCommentLiked, isPostLiked, mapCommentsToCommentData, searchCommentsById, searchCommentsIndexById, toggleCommentLikedState } from "../../../../../utils/utils";
import { renderToString } from "react-dom/server";
import Theme from "../../../../../Components/Themes/Theme";
import HeartSVG from "/public/images/heart.svg";
import HeartFilledSVG from "/public/images/heart-fill.svg";
import MessageSVG from "/public/images/message.svg";
import ShareSVG from "/public/images/send.svg";
import { useSelector } from "react-redux";
import { AuthUser } from "../../../../../../src/api/Auth";
import EmojiPickerPopup from "../../../../../Components/Common/EmojiPickerPopup";
import StyledLink from "../../../../../Components/Common/StyledLink";
import LikesModal from "./LikesModal";

const MediaSliderWrapper = styled.div<{$width: number}>`
    align-content: center;
    background-color: black;          
    overflow: hidden;
    max-width: ${props => props.$width}px;
    width: ${props => props.$width}px;        
`;

const HeadingWrapper = styled.div`
    max-width: 100%;
    width: 100%;
    border-bottom: 1px solid ${props => props.theme['colors'].borderDefaultColor};
`;

const PostOptionsWrapper = styled.div`
    padding-left: 5px;
    padding-right: 5px;    
`;

const CommentsWrapper = styled.div`
    overflow-y: scroll;
    min-width: 100%;
    max-width: 100%;
    max-height: calc(${props => props.theme['sizes'].maxCommentModalContentHeight} - 115px);
    min-height: calc(${props => props.theme['sizes'].minCommentModalContentHeight} - 40px);
    
    scrollbar-width: none;
    -ms-overflow-style: none;      
`;

const ActionWrapper = styled(FlexRow)`
    padding-top: 5px;
    padding-bottom: 15px;
    padding-left: 12px;
    border-top: 1px solid ${props => props.theme['colors'].borderDefaultColor};
`;

const ActionSVGContainer = styled.span<{$width: number, $height: number, $isLiked?:boolean}>`
    position: relative;
    top: 5px;
    width: ${props => props.$width}px;
    height: ${props => props.$height}px;
    margin-left: auto;
    cursor: pointer;
    color: ${props => props.$isLiked ? "red" : "black" };

    &:hover {
        color: ${props => props.theme["colors"].borderDarkColor};
    }
`;

const CommentInputWrapper = styled(FlexRow)`
    padding-left: 12px;
    padding-right: 10px;
    padding-top: 10px;
    padding-bottom: 10px;
    border-top: 1px solid ${props => props.theme['colors'].borderDefaultColor};
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

type CommentModalProps = {
    onClose: any;
    post: Post;
}

type CommentModalContentProps = {
    post: Post;
}

const CommentModalContent : React.FC<CommentModalContentProps> = (props: CommentModalContentProps) => {    
    const [comments, setComments] = useState<CommentUiData[]>([]);
    const [commentText, setCommentText] = useState<string>("");
    const [parentCommentId, setParentCommentId] = useState<string|null>(null);
    const [viewLikesModalPost, setViewLikesModalPost] = useState<Post|null>(null);

    const authUser:AuthUser = useSelector((state:any) => state.auth.user);
    const commentTextAreaRef = useRef(null);

    useEffect(() => {
        postGetCommentsByPostId({postId: props.post.global.id}).then((results) => {
            setComments(mapCommentsToCommentData(results.data));
            
        }).catch(e => console.error(e))
    }, []);

    const toggleLike = async (commentId: string, userName: string, userId: string) => {
        let result = await postToggleCommentLike({commentId, userName, userId});
        if(result.status === 200) {            
            const newCommentsList:CommentUiData[] = JSON.parse(JSON.stringify(comments));

            // update the comment list by updating the comment instance in the comment state array
            const comment:CommentUiData|null = searchCommentsById(commentId, newCommentsList);
            if(comment === null) {
                return;
            }
            
            // toggle the like flag
            const newComment:Comment|null = toggleCommentLikedState(userName, userId, comment.comment);

            if(newComment === null) { return }

            comment.comment = newComment;

            setComments(newCommentsList);      
        }
    }
    
    const renderLikes = (post: Post) => {
        if(post.global.likesDisabled || post.global.likes.length === 0) {
            return null;
        }

        return (
            <div style={{lineHeight: "18px"}}>
                <span>Liked by <Link role="link" href={`${HOST}/${post.global.likes[0].userName}`} style={{fontWeight: "600"}}>{post.global.likes[0].userName}</Link> 
                    {post.global.likes.length > 1 && <span> and <Link role="link" href="#" onClick={() => setViewLikesModalPost(post)} style={{fontWeight: "600"}}>others</Link></span>}
                </span>
            </div>
        );
    }    

    const renderComments = () => {
        if(comments == null || comments.length === 0) {
            return <></>;             
        }
        
        const nodes:ReactNode[] = [];

        // First comment should be the caption
        let [sanitizedHtml] = getSanitizedText(props.post.global.captionText);
        sanitizedHtml = renderToString(
            <Theme>
                <ProfileLink 
                    showUserName={true}
                    showPfp={false}
                    url={`${HOST}/${props.post.user.userName}`}
                    text={props.post.user.userName} />
            </Theme>
        ) + sanitizedHtml;

        nodes.push(
            <Flex key={props.post.global.id} style={{marginLeft: "10px", paddingTop: "15px", paddingBottom: "15px", paddingRight: "10px"}}>
                <FlexRow>
                    <ProfileLink 
                        showUserName={false}
                        showPfp={true}
                        url={`${HOST}/${props.post.user.userName}`}
                        text={props.post.user.userName}>                        
                    </ProfileLink>
                    <span style={{position: "relative", display: "flex", flexDirection: "column"}}>                        
                        <span style={{marginLeft: "2px", alignContent: "center"}} dangerouslySetInnerHTML={{__html: sanitizedHtml}}>
                        </span>
                        <div>
                            <span style={{fontSize: "13px", marginRight: "10px"}}>{dateDiff(props.post.global.dateTime)}</span>
                        </div>                          
                    </span>  
                </FlexRow>                
            </Flex>
        );

        // Now populate all other user comments
        nodes.push(Object.values(comments).map(entry => {
            const commentUiData:CommentUiData = entry as CommentUiData;
            let [sanitizedHtml] = getSanitizedText(commentUiData.comment.text);

            sanitizedHtml = renderToString(
                <Theme>
                    <ProfileLink 
                        showUserName={true}
                        showPfp={false}
                        url={`${HOST}/${props.post.user.userName}`}
                        text={props.post.user.userName} />                          
                </Theme>
            ) + sanitizedHtml;
            
            const isLiked = isCommentLiked(authUser.userName, commentUiData.comment);           

            return (
                <Flex key={commentUiData.comment.commentId} style={{marginLeft: "10px", paddingTop: "15px", paddingBottom: "15px", paddingRight: "10px"}}>
                    <FlexRow style={{width: "100%"}}>
                        <ProfileLink 
                            showPfp={true}
                            showUserName={false}
                            url={`${HOST}/${commentUiData.comment.user.userName}`}
                            text={commentUiData.comment.user.userName}>                                
                        </ProfileLink>
                        <span style={{position: "relative", display: "flex", flexDirection: "column"}}>
                            <span style={{marginLeft: "2px", alignContent: "center", marginRight: "10px"}} dangerouslySetInnerHTML={{__html: sanitizedHtml}}>
                            </span>
                            <div>
                                <span style={{fontSize: "13px", marginRight: "10px"}}>{dateDiff(commentUiData.comment.dateTime)}</span>
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    
                                    if(commentTextAreaRef.current) {                                                                           
                                        const textArea = (commentTextAreaRef.current as HTMLTextAreaElement);
                                        textArea.innerText = `@${commentUiData.comment.user.userName} `;
                                        textArea.focus();
                                        textArea.selectionStart = textArea.value.length;

                                        setCommentText(`@${commentUiData.comment.user.userName} `);
                                        setParentCommentId(commentUiData.comment.commentId);                                        
                                    }                        
                                }}
                                    style={{fontSize: "13px", fontWeight: 500, background: "none", cursor: "pointer", border: "none", padding: 0}}>Reply</button>
                            </div>
                            <div>                                
                                {
                                    (commentUiData && commentUiData.children && commentUiData.children.length > 0) && 
                                        <button style={{cursor: "pointer", backgroundColor: "white", border: 0, marginTop: "10px"}}>
                                            <div style={{borderBottom: "1px solid rgb(120, 120, 120)", width: "24px", display:"inline-block", position: "relative", verticalAlign: "middle", marginRight: "16px"}}></div>
                                            <span>{`View replies (${commentUiData.children.length})`}</span>
                                        </button>


                                        /*commentUiData.children.map(c => {
                                            return <div>{c.comment.text}</div>
                                        })*/                                    
                                }
                            </div>                                                                                                                  
                        </span>
                        <ActionSVGContainer $width={18} $height={18} $isLiked={isLiked} onClick={async () => await toggleLike(commentUiData.comment.commentId, authUser.userName, authUser.id)}>
                            {isLiked ? <HeartFilledSVG style={{width: "18px", height: "18px" }}/> : <HeartSVG style={{width: "18px", height: "18px" }} /> }
                        </ActionSVGContainer>
                    </FlexRow>                                         
                </Flex>             
            );
        }));

        return nodes;
    }

    const handleSubmitComment = async (text: string, post: Post) => {
        const data = {
            text,
            postId: post.global.id,
            parentCommentId: parentCommentId,
            userName: authUser.userName,
            userId: authUser.id,
        };

        const result = await postAddComment(data);

        if(result.status === 200) {
            // Success adding comment, clear out comment text box
            setCommentText("");
            setParentCommentId(null);
        }
    }    

    if(props.post == null) {
        return <></>;
    }    
    
    const sliderWidth = document.body.clientWidth >= 470 ? 470 : document.body.clientWidth;
    const isLiked = isPostLiked(authUser.userName, props.post);

    return (
        <>
        {viewLikesModalPost !== null && <LikesModal post={viewLikesModalPost} onClose={() => {setViewLikesModalPost(null)}}/>}
        <div>
            <Flex>
                <FlexRow>
                    <MediaSliderWrapper $width={sliderWidth}>
                        <MediaSlider media={props.post.media}>                    
                        </MediaSlider>
                    </MediaSliderWrapper>                
                    <Flex>                    
                        <FlexColumn style={{maxWidth: "500px"}}>
                            <HeadingWrapper>
                                <div style={{marginLeft: "10px", paddingTop: "10px", paddingBottom: "10px", paddingRight: "10px"}}>
                                    <FlexRow style={{justifyContent: "space-between"}}>
                                        <ProfileLink 
                                            showPfp={true}
                                            showUserName={true}
                                            url={`${HOST}/${props.post.user.userName}`}
                                            text={props.post.user.userName}
                                        >
                                        </ProfileLink>                                    
                                        <PostOptionsWrapper>
                                            <Link href="#" onClick={() => 1} style={{fontWeight: "600", fontSize: "1.5em"}}>...</Link>
                                        </PostOptionsWrapper>
                                    </FlexRow>
                                </div>
                            </HeadingWrapper>
                            <CommentsWrapper>
                                {renderComments()}
                            </CommentsWrapper>
                            <ActionWrapper>                                                            
                                <span>
                                    <div style={{cursor: "pointer"}}>
                                        <Flex style={{paddingRight: "8px"}}>
                                            <ActionSVGContainer $width={28} $height={28} $isLiked={isLiked} onClick={async () => 1}>
                                                {isLiked ? <HeartFilledSVG />: <HeartSVG /> }
                                            </ActionSVGContainer>
                                        </Flex>
                                    </div>
                                </span>                                                    
                                <span>
                                    <div style={{cursor: "pointer"}}>
                                        <Flex style={{paddingRight: "8px"}}>
                                            <ActionSVGContainer $width={28} $height={28}>
                                                <MessageSVG onClick={() => {
                                                    if(commentTextAreaRef.current) {
                                                        const textArea = (commentTextAreaRef.current as HTMLTextAreaElement);
                                                        textArea.innerText = `@${props.post.user.userName} `;
                                                        textArea.focus();
                                                        textArea.selectionStart = textArea.value.length;
                                                        setParentCommentId(null);
                                                    }    
                                                }
                                            } />
                                            </ActionSVGContainer>
                                        </Flex>
                                    </div>
                                </span>                                    
                                <span>
                                    <div style={{cursor: "pointer"}}>
                                        <Flex style={{paddingRight: "8px"}}>
                                            <ActionSVGContainer $width={28} $height={28}>
                                                <ShareSVG/>
                                            </ActionSVGContainer>
                                        </Flex>
                                    </div>
                                </span>                                                                                                                 
                            </ActionWrapper>
                            <div style={{paddingLeft: "10px", paddingBottom: "10px"}}>
                                {renderLikes(props.post)}
                                <span style={{fontSize: "13px", marginRight: "10px"}}>{new Date(props.post.global.dateTime).toLocaleDateString('en-us', { year:"numeric", month:"long", day: "numeric"})}</span>                                
                            </div>                            
                        { !props.post.global?.commentsDisabled && 
                        <div>
                        <CommentInputWrapper>
                            <CommentTextArea value={commentText} ref={commentTextAreaRef}
                                placeholder="Add a new comment..." 
                                aria-label="Add a new comment..." 
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                        setCommentText(e.currentTarget.value);
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

                                        await handleSubmitComment(commentText, props.post);                                        
                                    }                                    
                                }}
                            />
                            <Flex style={{marginTop: "auto", marginBottom: "auto"}}>
                                {
                                    (commentText && commentText.length > 0) &&
                                    <div style={{paddingLeft: "5px", paddingRight: "5px"}}>
                                        <StyledLink onClick={async () => 
                                            await handleSubmitComment(commentText, props.post)}>
                                            Post
                                        </StyledLink>
                                    </div>
                                }
                                <EmojiPickerPopup noPadding={true} onEmojiClick={(emoji: any) => {
                                    let newCommentText = commentText;
                                    newCommentText += emoji.emoji;
                                    setCommentText(newCommentText);                                
                                }}></EmojiPickerPopup>
                            </Flex>
                        </CommentInputWrapper>
                    </div>
                    }                                                        
                        </FlexColumn>
                    </Flex>
                </FlexRow>
            </Flex>
        </div>
        </>
    );
}

const CommentModal: React.FC<CommentModalProps> = (props: CommentModalProps) => {
    
    const steps = [
        {
            title: "Comments",
            element: <CommentModalContent post={props.post} />,
            options: {
                showFooter: false,
                hideMargins: true,
                alignItems: "normal"
            },
        }
    ];

    return (
        <>
            <MultiStepModal steps={steps} onClose={props.onClose} stepNumber={0} showLoadingAnimation={false} />
        </>
    );
}

export default CommentModal;