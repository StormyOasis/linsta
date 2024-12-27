import React, { ReactNode, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { renderToString } from "react-dom/server";
import styled from "styled-components";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { Post, User } from "../../../../../api/types";
import { BoldLink, CursorPointerDiv, CursorPointerSpan, DivWithMarginPadding, Flex, FlexColumn, FlexColumnFullWidth, FlexRow, FlexRowFullWidth, Link, SpanWithMarginPadding } from "../../../../Common/CombinedStyling";
import MediaSlider from "../../../../Common/MediaSlider";
import { HOST } from "../../../../../api/config";
import ProfileLink from "../../../../Common/ProfileLink";
import { postAddComment, postGetCommentsByPostId, postToggleLike } from "../../../../../api/ServiceController";
import { dateDiff, getDateAsText, getSanitizedText, isPostLiked, togglePostLikedState } from "../../../../../utils/utils";
import Theme from "../../../../Themes/Theme";
import MessageSVG from "/public/images/message.svg";
import ShareSVG from "/public/images/send.svg";
import { AuthUser } from "../../../../../api/Auth";
import EmojiPickerPopup from "../../../../Common/EmojiPickerPopup";
import StyledLink from "../../../../Common/StyledLink";
import LikesModal from "../Main/LikesModal";
import { CommentUiData, mapCommentsToCommentData, toggleCommentLike, toggleCommentReplyUiData, isCommentLiked } from "./CommentsModalUtils";
import { LikeToggler, ViewLikesText } from "../../../../../Components/Common/Likes";

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

const ActionContainer = styled(CursorPointerSpan) <{ $isLiked?: boolean }>`
    position: relative;
    top: 2px;
    width: 28px;
    height: 28px;
    margin-left: auto;
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
    updatePost: any;
    post: Post;
}

type CommentModalContentProps = {
    post: Post;
    updatePost: any;
}

const CommentModalContent: React.FC<CommentModalContentProps> = (props: CommentModalContentProps) => {
    const [comments, setComments] = useState<any>({});
    const [commentText, setCommentText] = useState<string>("");
    const [parentCommentId, setParentCommentId] = useState<string | null>(null);
    const [viewLikesModalPost, setViewLikesModalPost] = useState<Post | null>(null);

    const authUser: AuthUser = useSelector((state: any) => state.auth.user);
    const commentTextAreaRef = useRef(null);

    useEffect(() => {
        postGetCommentsByPostId({ postId: props.post.global.id }).then((results) => {
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
                        url={`${HOST}/${user.userName}`}
                        text={user.userName}>
                    </ProfileLink>
                    <FlexColumnFullWidth>
                        <SpanWithMarginPadding $marginLeft="2px" style={{ alignContent: "center" }} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                        <div>
                            <SpanWithMarginPadding $marginRight="10px" style={{ fontSize: "13px" }}>{dateDiff(dateTime)}</SpanWithMarginPadding>
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
                                (commentUiData && commentUiData.children && commentUiData.children.length > 0) &&
                                <>
                                    <ViewHideRepliesButton onClick={(e => {
                                        e.stopPropagation();
                                        setComments(toggleCommentReplyUiData(commentUiData, comments));
                                    })}>
                                        <ViewHideRepliesLine />
                                        {!commentUiData.repliesVisibleFlag && <span>{`View replies (${commentUiData.children.length})`}</span>}
                                        {commentUiData.repliesVisibleFlag && <span>Hide replies</span>}
                                    </ViewHideRepliesButton>

                                    {commentUiData.repliesVisibleFlag &&
                                        <div>
                                            {
                                                commentUiData.children.map((c: CommentUiData) => {
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
            props.post.global.id,
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
            postId: post.global.id,
            parentCommentId: parentCommentId,
            userName: authUser.userName,
            userId: authUser.id,
        };

        const result = await postAddComment(data);

        if (result.status === 200) {
            // Success adding comment, clear out comment text box
            setCommentText("");
            setParentCommentId(null);

            // Update comment list with new comment
            // TODO: Fix this..shouldn't need to wrap this in a delay but ES doesn't always get updated in time when inserting
            setTimeout(async () => {
                const results = await postGetCommentsByPostId({ postId: post.global.id });
                setComments(mapCommentsToCommentData(results.data, comments));
            }, 1000);
        }
    }

    if (props.post == null) {
        return <></>;
    }

    const sliderWidth = document.body.clientWidth >= 470 ? 470 : document.body.clientWidth;
    const isLiked = isPostLiked(authUser.userName, props.post);

    return (
        <>
            {viewLikesModalPost !== null && <LikesModal post={viewLikesModalPost} onClose={() => { setViewLikesModalPost(null) }} />}
            <div>
                <Flex>
                    <FlexRow>
                        <MediaSliderWrapper $width={sliderWidth}>
                            <MediaSlider media={props.post.media}>
                            </MediaSlider>
                        </MediaSliderWrapper>
                        <Flex>
                            <FlexColumn style={{ maxWidth: "500px" }}>
                                <HeadingWrapper>
                                    <DivWithMarginPadding $marginLeft="10px" $paddingTop="10px" $paddingBottom="10px" $paddingRight="10px">
                                        <FlexRow style={{ justifyContent: "space-between" }}>
                                            <ProfileLink
                                                showPfp={true}
                                                showUserName={true}
                                                url={`${HOST}/${props.post.user.userName}`}
                                                text={props.post.user.userName}
                                            >
                                            </ProfileLink>
                                            <PostOptionsWrapper>
                                                <BoldLink href="#" onClick={() => 1} style={{ fontSize: "1.5em" }}>...</BoldLink>
                                            </PostOptionsWrapper>
                                        </FlexRow>
                                        {props.post.global.locationText.length > 0 &&
                                            <DivWithMarginPadding $marginLeft="42px" $marginTop="-9px" style={{ fontSize: "13px" }}>
                                                <Link href={`${HOST}/explore?text=${encodeURIComponent(props.post.global.locationText)}`}>
                                                    {props.post.global.locationText}
                                                </Link>
                                            </DivWithMarginPadding>
                                        }
                                    </DivWithMarginPadding>
                                </HeadingWrapper>
                                <CommentsWrapper>
                                    {renderComments()}
                                </CommentsWrapper>
                                <ActionWrapper>
                                    <CursorPointerDiv>
                                        <Flex $paddingRight="8px" style={{position: "relative", top: "2px"}}>
                                            <LikeToggler
                                                isLiked={isLiked}
                                                handleClick={async () => {
                                                    const result = await postToggleLike({
                                                        postId: props.post.global.id,
                                                        userName: props.post.user.userName,
                                                        userId: props.post.user.userId
                                                    });

                                                    if (result.status === 200) {
                                                        const post = togglePostLikedState(
                                                            props.post.user.userName,
                                                            props.post.user.userId,
                                                            props.post
                                                        );
                                                        if (post != null) {
                                                            props.updatePost(post);
                                                        }
                                                    }
                                                }}>
                                            </LikeToggler>
                                        </Flex>
                                    </CursorPointerDiv>
                                    <CursorPointerDiv>
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
                                    </CursorPointerDiv>
                                    <CursorPointerDiv>
                                        <Flex $paddingRight="8px">
                                            <ActionContainer>
                                                <ShareSVG />
                                            </ActionContainer>
                                        </Flex>
                                    </CursorPointerDiv>
                                </ActionWrapper>
                                <DivWithMarginPadding $paddingLeft="10px" $paddingBottom="10px">
                                    <ViewLikesText post={props.post} handleClick={setViewLikesModalPost}></ViewLikesText>
                                    <SpanWithMarginPadding $marginRight="10px" style={{ fontSize: "13px" }}>
                                        {getDateAsText(props.post.global.dateTime)}
                                    </SpanWithMarginPadding>
                                </DivWithMarginPadding>
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
                                                    <DivWithMarginPadding $paddingLeft="5px" $paddingRight="5px">
                                                        <StyledLink onClick={async () =>
                                                            await handleSubmitComment(commentText, props.post)}>
                                                            Post
                                                        </StyledLink>
                                                    </DivWithMarginPadding>
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
            element: <CommentModalContent updatePost={props.updatePost} post={props.post} />,
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