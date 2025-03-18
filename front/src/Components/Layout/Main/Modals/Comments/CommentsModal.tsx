import React, { ReactNode, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { renderToString } from "react-dom/server";
import styled from "styled-components";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { Post, User } from "../../../../../api/types";
import { BoldLink, Div, Flex, FlexColumn, FlexColumnFullWidth, FlexRow, FlexRowFullWidth, Link, Span } from "../../../../Common/CombinedStyling";
import MediaSlider from "../../../../Common/MediaSlider";
import { HOST } from "../../../../../api/config";
import ProfileLink from "../../../../Common/ProfileLink";
import { postAddComment, postGetCommentsByPostId } from "../../../../../api/ServiceController";
import { dateDiff, getDateAsText, getSanitizedText, isPostLiked } from "../../../../../utils/utils";
import Theme from "../../../../Themes/Theme";
import MessageSVG from "/public/images/message.svg";
import ShareSVG from "/public/images/send.svg";
import { AuthUser } from "../../../../../api/Auth";
import EmojiPickerPopup from "../../../../Common/EmojiPickerPopup";
import StyledLink from "../../../../Common/StyledLink";
import { CommentUiData, mapCommentsToCommentData, toggleCommentLike, toggleCommentReplyUiData, isCommentLiked, searchCommentsById } from "./CommentsModalUtils";
import { LikeToggler, ViewLikesText } from "../../../../../Components/Common/Likes";
import { LIKES_MODAL } from "../../../../../Components/Redux/slices/modals.slice";
import { togglePostLike } from "../../../../../Components/Redux/slices/post.slice";
import { actions, useAppDispatch } from "../../../../../Components/Redux/redux";

const MediaSliderWrapper = styled.div<{ $width: number }>`
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

const ActionContainer = styled(Div) <{ $isLiked?: boolean }>`
    position: relative;
    top: 2px;
    width: 28px;
    height: 28px;
    margin-left: auto;
    cursor: pointer;
    color: ${props => props.$isLiked ? "red" : "black"};

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

    border: none;
    outline: none;
    overflow: hidden;
    color: ${props => props.theme["colors"].defaultTextColor};
`;

const ViewHideRepliesButton = styled.button`
    cursor: pointer;
    background-color: ${props => props.theme["colors"].backgroundColor};
    border: 0;
    margin-top: 10px;
`;

const ViewHideRepliesLine = styled.div`
    border-bottom: 1px solid ${props => props.theme["colors"].mediumTextColor};
    width: 24px;
    display: inline-block;
    position: relative;
    vertical-align: middle;
    margin-right: 16px;
`;

const CommentReplyButton = styled.button`
    font-size: 13px;
    font-weight: 500;
    background: none;
    cursor: pointer;
    border: none;
    padding: 0;
`;

type CommentModalProps = {
    onClose: any;
    post: Post;
    zIndex: number;
}

type CommentModalContentProps = {
    post: Post;
}

const CommentModalContent: React.FC<CommentModalContentProps> = (props: CommentModalContentProps) => {
    const [comments, setComments] = useState<any>({});
    const [commentText, setCommentText] = useState<string>("");
    const [parentCommentId, setParentCommentId] = useState<string | null>(null);

    const commentTextAreaRef = useRef(null);

    const authUser: AuthUser = useSelector((state: any) => state.auth.user);
    const dispatch = useAppDispatch();

    useEffect(() => {
        postGetCommentsByPostId({ postId: props.post.postId }).then((results) => {            
            setComments(mapCommentsToCommentData(results.data, comments));
        }).catch(e => console.error(e))
    }, []);

    const renderSingleComment = (key: string, text: string, user: User, dateTime: Date, repliesEnabled: boolean,
        isLiked: boolean, showLikeToggle: boolean, commentUiData: CommentUiData | null, level: number) => {

        let [sanitizedHtml] = getSanitizedText(text);
        sanitizedHtml = renderToString(
            <Theme>
                <ProfileLink
                    showUserName={true}
                    showPfp={false}
                    url={`${HOST}/${user.userName}`}
                    text={user.userName} />
            </Theme>
        ) + sanitizedHtml;

        return (
            <Flex key={key} style={{ padding: "15px 10px" }}>
                <FlexRowFullWidth>
                    <ProfileLink
                        showUserName={false}
                        showPfp={true}
                        pfp={user.pfp}
                        url={`${HOST}/${user.userName}`}
                        text={user.userName}>
                    </ProfileLink>
                    <FlexColumnFullWidth>
                        <Span $marginLeft="2px" $alignContent="center" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                        <div>
                            <Span $marginRight="10px" $fontSize="13px">{dateDiff(dateTime)}</Span>
                            {repliesEnabled &&
                                <CommentReplyButton
                                    onClick={(e) => {
                                        e.stopPropagation();

                                        if (commentTextAreaRef.current) {
                                            const textArea = (commentTextAreaRef.current as HTMLTextAreaElement);
                                            const str: string = `@${user.userName} `;
                                            textArea.selectionStart = str.length;
                                            textArea.focus();

                                            setCommentText(str);
                                            setParentCommentId(key);
                                        }
                                    }}>
                                    Reply
                                </CommentReplyButton>
                            }
                        </div>
                        <div>
                            {
                                (commentUiData && commentUiData.children && commentUiData.childCount > 0) &&
                                <>
                                    <ViewHideRepliesButton onClick={(e => {
                                        e.stopPropagation();
                                        setComments(toggleCommentReplyUiData(commentUiData, comments));
                                    })}>
                                        <ViewHideRepliesLine />
                                        {!commentUiData.repliesVisibleFlag && <span>{`View replies (${commentUiData.childCount})`}</span>}
                                        {commentUiData.repliesVisibleFlag && <span>Hide replies</span>}
                                    </ViewHideRepliesButton>

                                    {commentUiData.repliesVisibleFlag &&
                                        <div>
                                            {                                                
                                                Object.values(commentUiData.children).map((c:any) => {
                                                    return renderSingleComment(
                                                        c.comment.commentId,
                                                        c.comment.text,
                                                        c.comment.user,
                                                        c.comment.dateTime,
                                                        !props.post.global.commentsDisabled,
                                                        isCommentLiked(authUser.userName, c.comment),
                                                        true,
                                                        c,
                                                        level + 1
                                                    )
                                                })
                                            }
                                        </div>
                                    }
                                </>
                            }
                        </div>
                    </FlexColumnFullWidth>
                    {showLikeToggle &&
                        <LikeToggler
                            offsetIndex={level}
                            width="18px"
                            height="18px"
                            isLiked={isLiked}
                            handleClick={async () => await toggleCommentLike(key, authUser.userName, authUser.id, comments, setComments)} />
                    }
                </FlexRowFullWidth>
            </Flex>
        )
    }

    const renderComments = () => {
        if (comments == null || comments.length === 0) {
            return <></>;
        }

        const nodes: ReactNode[] = [];

        // Render the caption first
        nodes.push(renderSingleComment(
            props.post.postId,
            props.post.global.captionText,
            props.post.user,
            props.post.global.dateTime,
            false,
            false,
            false,
            null,
            0
        ));

        // Now populate all other user comments
        nodes.push(Object.values(comments).map(entry => {
            const commentUiData: CommentUiData = entry as CommentUiData;

            return renderSingleComment(
                commentUiData.comment.commentId,
                commentUiData.comment.text,
                commentUiData.comment.user,
                commentUiData.comment.dateTime,
                !props.post.global.commentsDisabled,
                isCommentLiked(authUser.userName, commentUiData.comment),
                true,
                commentUiData,
                0);
        }));

        return nodes;
    }

    const handleSubmitComment = async (text: string, post: Post) => {
        const data = {
            text,
            postId: `${post.postId}`,
            parentCommentId: parentCommentId == null ? null : `${parentCommentId}`,
            userName: `${authUser.userName}`,
            userId: `${authUser.id}`,
        };

        const result = await postAddComment(data);

        if (result.status === 200) {            
            // Update comment list with new comment
            // To reduce server load, rather than pulling the comment list again
            // just merge the comment into the local list
            
            const newComment: CommentUiData = {
                comment: {
                    commentId: result.data.id,
                    dateTime: new Date(),
                    text,
                    user: {
                        userName: data.userName,
                        userId: data.userId,
                        pfp: ""
                    },
                    postId: post.postId,
                    parentCommentId: parentCommentId,
                    likes: []
                },
                repliesVisibleFlag: false,
                children: {},
                childCount: 0
            };            

            const newComments = Object.assign({}, comments);            
            const parent = searchCommentsById(parentCommentId as string, newComments);
            if(parent != null) {
                // New comment is a child node
                parent.childCount++;
                parent.children[result.data.id] = newComment;
            } else {
                // New comment is a root node
                newComments[result.data.id] = newComment;
            }
            
            setComments(newComments);
            // Success adding comment, clear out comment text box
            setCommentText("");
            setParentCommentId(null);         
        }
    }

    const openLikesModal = (post: Post) => {
        if (post === null) {
            return;
        }

        // Open the likes dialog by setting the state in redux        
        const payload = {
            postId: post.postId
        };

        dispatch(actions.modalActions.openModal({ modalName: LIKES_MODAL, data: payload }));
    }

    const toggleLike = async (postId: string, userName: string, userId: string) => {
        dispatch(await togglePostLike({ postId, userName, userId }));
    }

    if (props.post == null) {
        return <></>;
    }

    const sliderWidth = document.body.clientWidth >= 470 ? 470 : document.body.clientWidth;
    const isLiked = isPostLiked(authUser.userName, props.post);

    return (
        <>
            <div>
                <Flex>
                    <FlexRow>
                        <MediaSliderWrapper $width={sliderWidth}>
                            <MediaSlider media={props.post.media}>
                            </MediaSlider>
                        </MediaSliderWrapper>
                        <Flex>
                            <FlexColumn $maxWidth="500px">
                                <HeadingWrapper>
                                    <Div $marginLeft="10px" $paddingTop="10px" $paddingBottom="10px" $paddingRight="10px">
                                        <FlexRow $justifyContent="space-between">
                                            <ProfileLink
                                                showPfp={true}
                                                showUserName={true}
                                                pfp={props.post.user.pfp}
                                                url={`${HOST}/${props.post.user.userName}`}
                                                text={props.post.user.userName}
                                            >
                                            </ProfileLink>
                                            <PostOptionsWrapper>
                                                <BoldLink href="#" $fontSize="1.5em" onClick={() => 1}>...</BoldLink>
                                            </PostOptionsWrapper>
                                        </FlexRow>
                                        {props.post.global.locationText.length > 0 &&
                                            <Div $marginLeft="39px" $marginTop="-9px" $fontSize="13px">
                                                <Link href={`${HOST}/explore?text=${encodeURIComponent(props.post.global.locationText)}`}>
                                                    {props.post.global.locationText}
                                                </Link>
                                            </Div>
                                        }
                                    </Div>
                                </HeadingWrapper>
                                <CommentsWrapper>
                                    {renderComments()}
                                </CommentsWrapper>
                                <ActionWrapper>
                                    <Div $cursor="pointer">
                                        <Flex $paddingRight="8px" $position="relative" $top="2px">
                                            <LikeToggler
                                                isLiked={isLiked}
                                                handleClick={async () => {
                                                    await toggleLike(props.post.postId, authUser.userName, authUser.id)
                                                }}>
                                            </LikeToggler>
                                        </Flex>
                                    </Div>
                                    <Div $cursor="pointer">
                                        <Flex $paddingRight="8px">
                                            <ActionContainer>
                                                <MessageSVG onClick={() => {
                                                    if (commentTextAreaRef.current) {
                                                        const textArea = (commentTextAreaRef.current as HTMLTextAreaElement);
                                                        textArea.innerText = `@${props.post.user.userName} `;
                                                        textArea.focus();
                                                        textArea.selectionStart = textArea.value.length;
                                                        setParentCommentId(null);
                                                    }
                                                }
                                                } />
                                            </ActionContainer>
                                        </Flex>
                                    </Div>
                                    <Div $cursor="pointer">
                                        <Flex $paddingRight="8px">
                                            <ActionContainer>
                                                <ShareSVG />
                                            </ActionContainer>
                                        </Flex>
                                    </Div>
                                </ActionWrapper>
                                <Div $paddingLeft="10px" $paddingBottom="10px">
                                    <ViewLikesText post={props.post} handleClick={() => openLikesModal(props.post)}></ViewLikesText>
                                    <Span $marginRight="10px" $fontSize="13px">
                                        {getDateAsText(props.post.global.dateTime)}
                                    </Span>
                                </Div>
                                {!props.post.global?.commentsDisabled &&
                                    <div>
                                        <CommentInputWrapper>
                                            <CommentTextArea value={commentText} ref={commentTextAreaRef}
                                                placeholder="Add a new comment..."
                                                aria-label="Add a new comment..."
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                                    setCommentText(e.currentTarget.value);
                                                }
                                                }
                                                onInput={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                                    const element = e.currentTarget;
                                                    element.style.height = "";
                                                    element.style.height = element.scrollHeight + "px";
                                                }}
                                                onKeyDown={async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                                    if (e.key === "Enter") {
                                                        // Prevent adding a new line
                                                        e.preventDefault();

                                                        await handleSubmitComment(commentText, props.post);
                                                    }
                                                }}
                                            />
                                            <Flex $marginTop="auto" $marginBottom="auto">
                                                {
                                                    (commentText && commentText.length > 0) &&
                                                    <Div $paddingLeft="5px" $paddingRight="5px">
                                                        <StyledLink onClick={async () =>
                                                            await handleSubmitComment(commentText, props.post)}>
                                                            Post
                                                        </StyledLink>
                                                    </Div>
                                                }
                                                <EmojiPickerPopup noPadding={true} onEmojiClick={(emoji: any) => {
                                                    setCommentText(commentText + emoji.emoji);
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
            <MultiStepModal zIndex={props.zIndex} steps={steps} onClose={props.onClose} stepNumber={0} showLoadingAnimation={false} />
        </>
    );
}

export default CommentModal;