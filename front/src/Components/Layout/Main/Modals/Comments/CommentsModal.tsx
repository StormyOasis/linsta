import React, { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import styled from "styled-components";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { Post, PostWithCommentCount, Profile } from "../../../../../api/types";
import { BoldLink, Div, Flex, FlexColumn, FlexColumnFullWidth, FlexRow, FlexRowFullWidth, Link, Span } from "../../../../Common/CombinedStyling";
import MediaSlider from "../../../../Common/MediaSlider";
import { DEFAULT_PFP, HOST } from "../../../../../api/config";
import ProfileLink from "../../../../Common/ProfileLink";
import { postAddComment, postGetCommentsByPostId, postToggleLike } from "../../../../../api/ServiceController";
import { dateDiff, getDateAsText, getSanitizedText, isPostLiked, togglePostLikedState } from "../../../../../utils/utils";
import Theme from "../../../../Themes/Theme";
import MessageSVG from "/public/images/message.svg";
import ShareSVG from "/public/images/send.svg";
import { AuthUser } from "../../../../../api/Auth";
import EmojiPickerPopup from "../../../../Common/EmojiPickerPopup";
import StyledLink from "../../../../Common/StyledLink";
import { CommentUiData, mapCommentsToCommentData, toggleCommentLike, toggleCommentReplyUiData, isCommentLiked, searchCommentsById } from "./CommentsModalUtils";
import { LikeToggler, ViewLikesText } from "../../../../../Components/Common/Likes";
import { MODAL_TYPES } from "../../../../../Components/Redux/slices/modals.slice";
import { actions, useAppDispatch, useAppSelector } from "../../../../../Components/Redux/redux";

const MediaSliderWrapper = styled(Div) <{ $width: number }>`
    align-content: center;
    background-color: ${props => props.theme['colors'].backgroundColorSecondary};          
    overflow: hidden;
    max-width: ${props => props.$width}px;
    width: ${props => props.$width}px;        
`;

const HeadingWrapper = styled(Div)`
    max-width: 100%;
    width: 100%;
    border-bottom: 1px solid ${props => props.theme['colors'].borderDefaultColor};
`;

const PostOptionsWrapper = styled(Div)`
    padding-left: 5px;
    padding-right: 5px;    
`;

const CommentsWrapper = styled(Div)`
    overflow-y: scroll;

    max-height: calc(${props => props.theme['sizes'].maxCommentModalContentHeight} - 115px);
    min-height: calc(${props => props.theme['sizes'].minCommentModalContentHeight} - 40px);
    height:100%;
    
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

const ViewHideRepliesLine = styled(Div)`
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

const DotMenuButton = styled.button`
    font-size: 1.5em;
    font-weight: 600;
    background: none;
    cursor: pointer;
    border: none;
    padding-left: 5px;
    padding-right: 5px;
`;

type CommentModalProps = {
    onClose: () => void;
    post: PostWithCommentCount;
    zIndex: number;
}

type CommentModalContentProps = {
    onClose: () => void;
    post: PostWithCommentCount;
}

const CommentModalContent: React.FC<CommentModalContentProps> = (props: CommentModalContentProps) => {
    const [comments, setComments] = useState<any>({});
    const [commentText, setCommentText] = useState<string>("");
    const [parentCommentId, setParentCommentId] = useState<string | null>(null);

    const commentTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const authUser: AuthUser = useAppSelector((state: any) => state.auth.user);
    const profile: Profile = useAppSelector((state: any) => state.profile.profile);
    const deletedCommentId:string|null = useAppSelector((state: any) => state.misc.deletedCommentId);    
    
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (props.post != null) {
            postGetCommentsByPostId({ postId: props.post.postId })
                .then((results) => setComments(mapCommentsToCommentData(results.data, comments)))
                .catch(e => console.error(e))
        }
    }, [props.post]);

    useEffect(() => {        
        if (deletedCommentId) {
            const newComments = structuredClone(comments);
            const comment = searchCommentsById(deletedCommentId, newComments);
            
            if (comment) {
                // A comment exists with the given id. It is either a root comment (if parentCommentId is null)
                // Or a child comment (if parentCommentId is not null)                
                if(comment.comment.parentCommentId == null) {
                    // parent, can just delete from the list
                    delete newComments[deletedCommentId];                    
                } else {
                    // A child comment, which means we need to find the parent, then remove this
                    // comment from the parent's children array
                    const parentComment = searchCommentsById(comment.comment.parentCommentId, newComments);
                    if(parentComment) {
                        parentComment.childCount--;
                        delete parentComment.children[deletedCommentId];
                    }
                }

                setComments(newComments);
            }
        }
    }, [deletedCommentId]);

    const renderSingleComment = (commentUiData: CommentUiData, level: number, isRegularComment: boolean) => {
        const { comment, repliesVisibleFlag, children, childCount } = commentUiData;
        const { text, user, dateTime, commentId } = comment;
        const { commentsDisabled } = props.post.global;

        const isCommentLikedFlag: boolean = isCommentLiked(authUser.userName, comment);
        const [sanitizedHtml] = getSanitizedText(text);

        const profileLink = renderToString(
            <Theme>
                <ProfileLink
                    showUserName={true}
                    showPfp={false}
                    showFullName={false}
                    url={`${HOST}/${user.userName}`}
                    userName={user.userName} />
            </Theme>
        );

        return (
            <Flex key={commentId} style={{ padding: "15px 10px" }}>
                <FlexRowFullWidth>
                    <ProfileLink
                        showUserName={false}
                        showPfp={true}
                        showFullName={false}
                        pfp={user.pfp}
                        url={`${HOST}/${user.userName}`}
                        userName={user.userName}>
                    </ProfileLink>
                    <FlexColumnFullWidth>
                        <Span $marginLeft="2px" $alignContent="center" dangerouslySetInnerHTML={{ __html: `${profileLink}${sanitizedHtml}` }} />
                        <Div>
                            <Span $marginRight="10px" $fontSize="13px">{dateDiff(dateTime)}</Span>
                            {!commentsDisabled &&
                                <>
                                    <CommentReplyButton
                                        aria-label="Reply to comment"
                                        onClick={(e) => {
                                            e.stopPropagation();

                                            if (commentTextAreaRef.current) {
                                                const textArea = (commentTextAreaRef.current as HTMLTextAreaElement);
                                                const str: string = `@${user.userName} `;
                                                textArea.selectionStart = str.length;
                                                textArea.focus();

                                                setCommentText(str);
                                                setParentCommentId(commentId);
                                            }
                                        }}>
                                        Reply
                                    </CommentReplyButton>
                                    {(isRegularComment && authUser.id === user.userId) &&
                                        <DotMenuButton 
                                            aria-label="Comment Options"
                                            onClick={() => 
                                                dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.COMMENT_DELETE_MODAL, data: { commentId } }))
                                            }> 
                                                ...
                                        </DotMenuButton>
                                    }
                                </>
                            }
                        </Div>
                        <Div>
                            {(childCount > 0) &&
                                <>
                                    <ViewHideRepliesButton onClick={(e => {
                                        e.stopPropagation();
                                        setComments(toggleCommentReplyUiData(commentUiData, comments))
                                    })}>
                                        <ViewHideRepliesLine />
                                        {!repliesVisibleFlag && <Span>{`View replies (${childCount})`}</Span>}
                                        {repliesVisibleFlag && <Span>Hide replies</Span>}
                                    </ViewHideRepliesButton>

                                    {repliesVisibleFlag && (
                                        <Div>
                                            {Object.values(children).map((c: any) => renderSingleComment(c, level + 1, true))}
                                        </Div>
                                    )}
                                </>
                            }
                        </Div>
                    </FlexColumnFullWidth>
                    {isRegularComment &&
                        <LikeToggler
                            aria-label="Toogle comment like"
                            offsetIndex={level}
                            width="18px"
                            height="18px"
                            isLiked={isCommentLikedFlag}
                            handleClick={async () => await toggleCommentLike(commentId, authUser.userName, authUser.id, comments, setComments)} />
                    }
                </FlexRowFullWidth>
            </Flex>
        )
    }

    const renderComments = () => {
        if (comments == null || comments.length === 0) {
            return <></>;
        }

        const commentNodes = [];

        if(props.post.global.captionText?.length > 0) {
            commentNodes.push(
                renderSingleComment({
                    comment: {
                        ...props.post.global, 
                        user: props.post.user, 
                        postId: props.post.postId,
                        commentId: "",
                        text: props.post.global.captionText,
                        parentCommentId: null
                    },
                    repliesVisibleFlag: false,
                    children: {},
                    childCount: 0
                }, 0, false));
        }

        if(!props.post.global.commentsDisabled) {            
            Object.values(comments).forEach((commentUiData: any) => {
                commentNodes.push(renderSingleComment(commentUiData, 0, true));
            });
        }

        return commentNodes;
    }

    const handleSubmitComment = async (text: string) => {
        if(props.post.global.commentsDisabled) {
            return;
        }
        
        const data = {
            text,
            postId: props.post.postId,
            parentCommentId,
            userName: authUser.userName,
            userId: authUser.id,
        };

        const result = await postAddComment(data);
        if (result.status !== 200) {
            return;
        }

        // Update comment list with new comment
        // To reduce server load, rather than pulling the comment list again
        // just merge the comment into the local list

        // first update the commentCount
        let post: PostWithCommentCount | null = structuredClone(props.post);
        post.commentCount++;
        dispatch(actions.modalActions.updateModalData({ modalName: MODAL_TYPES.COMMENT_MODAL, data: { post } }));

        const newComment: CommentUiData = {
            comment: {
                commentId: result.data.id,
                dateTime: new Date(),
                text,
                user: {
                    userName: data.userName,
                    userId: data.userId,
                    pfp: profile.pfp || DEFAULT_PFP
                },
                postId: post.postId,
                parentCommentId: parentCommentId,
                likes: []
            },
            repliesVisibleFlag: false,
            children: {},
            childCount: 0
        };

        const newComments = structuredClone(comments);
        const parent = searchCommentsById(parentCommentId as string, newComments);
        if (parent != null) {
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

    const openLikesModal = (post: PostWithCommentCount) => {
        if (post === null) {
            return;
        }

        // Open the likes dialog by setting the state in redux        
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.LIKES_MODAL, data: { post } }));
    }

    const openPostMenuModal = (post: PostWithCommentCount) => {
        if(post === null) {
            return;
        }

        // open the post menu dialog by setting the state in redux
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.POST_EDIT_MENU_MODAL, data: { post } }));
    }

    const toggleLike = async (userName: string, userId: string) => {
        // Greedily update only the local UI regardless of server response
        let post: PostWithCommentCount | null = structuredClone(props.post);
        post = togglePostLikedState(userName, userId, post) as PostWithCommentCount;
        dispatch(actions.modalActions.updateModalData({ modalName: MODAL_TYPES.COMMENT_MODAL, data: { post } }));

        // Send the actual command to the server
        await postToggleLike({ postId: props.post.postId, userName, userId });
    }
    
    if (props.post == null) {
        return <></>;
    }

    const sliderWidth = document.body.clientWidth >= 470 ? 470 : document.body.clientWidth;
    const isLiked = isPostLiked(authUser.userName, props.post);
    
    return (
        <>
            <Div>
                <Flex>
                    <FlexRow>
                        <MediaSliderWrapper $width={sliderWidth}>
                            <MediaSlider media={props.post.media} />
                        </MediaSliderWrapper>
                        <Flex>
                            <FlexColumn $maxWidth="500px" $width="350px">
                                <HeadingWrapper>
                                    <Div $marginLeft="10px" $paddingTop="10px" $paddingBottom="10px" $paddingRight="10px">
                                        <FlexRow $justifyContent="space-between">
                                            <ProfileLink
                                                showPfp={true}
                                                showUserName={true}
                                                showFullName={false}
                                                pfp={props.post.user.pfp}
                                                url={`${HOST}/${props.post.user.userName}`}
                                                userName={props.post.user.userName} />
                                            {(authUser.id == props.post.user.userId) &&
                                                <PostOptionsWrapper>
                                                    <BoldLink $fontSize="1.5em" onClick={() => openPostMenuModal(props.post)}>...</BoldLink>
                                                </PostOptionsWrapper>
                                            }
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
                                    {!props.post.global.commentsDisabled && renderComments()}
                                    {(props.post.global.commentsDisabled || props.post.commentCount === 0) && 
                                        <FlexColumnFullWidth $height="100%" $justifyContent="center">
                                            <Div $alignSelf="center" $fontSize="1.3em" $fontWeight="500">No Comments Yet</Div>
                                        </FlexColumnFullWidth>
                                    }
                                </CommentsWrapper>
                                <ActionWrapper>
                                    <Div $cursor="pointer">
                                        <Flex $paddingRight="8px" $position="relative" $top="2px">
                                            <LikeToggler
                                                aria-label="Toogle post like"
                                                isLiked={isLiked}
                                                handleClick={async () => await toggleLike(authUser.userName, authUser.id)}>
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
                                                }} />
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
                                    <ViewLikesText post={props.post} authUserId={authUser.id} handleClick={() => openLikesModal(props.post)}></ViewLikesText>
                                    <Span $marginRight="10px" $fontSize="13px">
                                        {getDateAsText(props.post.global.dateTime)}
                                    </Span>
                                </Div>
                                {!props.post.global?.commentsDisabled &&
                                    <Div>
                                        <CommentInputWrapper>
                                            <CommentTextArea value={commentText} ref={commentTextAreaRef}
                                                placeholder="Add a new comment..."
                                                aria-label="Add a new comment..."
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                                    setCommentText(e.currentTarget.value);
                                                }}
                                                onInput={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                                    const element = e.currentTarget;
                                                    element.style.height = "";
                                                    element.style.height = element.scrollHeight + "px";
                                                }}
                                                onKeyDown={async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                                    if (e.key === "Enter" && commentText.trim()) {
                                                        // Prevent adding a new line
                                                        e.preventDefault();

                                                        await handleSubmitComment(commentText);
                                                    }
                                                }}
                                            />
                                            <Flex $marginTop="auto" $marginBottom="auto">
                                                {
                                                    (commentText && commentText.length > 0) &&
                                                    <Div $paddingLeft="5px" $paddingRight="5px">
                                                        <StyledLink
                                                            onClick={async () => await handleSubmitComment(commentText.trim())}>
                                                            Post
                                                        </StyledLink>
                                                    </Div>
                                                }
                                                <EmojiPickerPopup noPadding={true} onEmojiClick={(emoji: any) => {
                                                    setCommentText(commentText + emoji.emoji);
                                                }}></EmojiPickerPopup>
                                            </Flex>
                                        </CommentInputWrapper>
                                    </Div>
                                }
                            </FlexColumn>
                        </Flex>
                    </FlexRow>
                </Flex>
            </Div>
        </>
    );
}

const CommentModal: React.FC<CommentModalProps> = (props: CommentModalProps) => {
    const steps = [
        {
            title: "Comments",
            element: <CommentModalContent post={props.post} onClose={props.onClose} />,
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