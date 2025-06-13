import React, { useCallback } from "react";
import styled from "styled-components";

import {
    Div,
    Flex,
    FlexRow,
    LightLink,
    Span,
} from "../../Common/CombinedStyling";
import EmojiPickerPopup from "../../Common/EmojiPickerPopup";
import ProfileLink from "../../Common/ProfileLink";
import Linkify from "../../Common/Linkify";
import StyledLink from "../../Common/StyledLink";
import { getSanitizedText, isOverflowed } from "../../../utils/utils";
import { Post } from "../../../api/types";
import { HOST } from "../../../api/config";
import loadable from "@loadable/component";

const LazyEmojiClickData = loadable(() =>
    import('emoji-picker-react').then(module => ({
        default: module.EmojiClickData
    }))
);

const CaptionContainer = styled(Div) <{ $isExpanded?: boolean }>`
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
    color: ${props => props.theme["colors"].defaultTextColor};
`;

type CommentsSectionProps = {
    post: Post;
    commentText: string;
    isExpanded: boolean;
    onExpand: () => void;
    onCommentChange: (value: string) => void;
    onSubmitComment: () => void;
    onEmojiClick: (emoji: typeof LazyEmojiClickData) => void;
    openCommentModal: () => void;
}

const CommentsSection: React.FC<CommentsSectionProps> = React.memo((props: CommentsSectionProps) => {
    const { post, commentText, isExpanded, onExpand, onCommentChange, onSubmitComment, onEmojiClick, openCommentModal } = props;
    const [sanitizedHtml, sanitizedText] = getSanitizedText(post.global.captionText);
    const overflowed = isOverflowed(`postid_${post.postId}`);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            onSubmitComment();
        }
    }, [onSubmitComment]);

    return (
        <>
            {sanitizedText?.length > 0 && (
                <>
                    <CaptionContainer $isExpanded={isExpanded}>
                        <Div id={`postid_${post.postId}`}>
                            <Span>
                                <ProfileLink
                                    showLocation={false}
                                    showFullName={false}
                                    showUserName={true}
                                    showPfp={false}
                                    url={`${HOST}/${post.user.userName}`}
                                    userName={post.user.userName}
                                    collaborators={{}} />
                                <Span><Linkify html={sanitizedHtml} /></Span>
                            </Span>
                        </Div>
                    </CaptionContainer>
                    {overflowed && !isExpanded && (
                        <LightLink onClick={onExpand}>More</LightLink>
                    )}
                </>
            )}
            {post.global.commentCount > 0 && (
                <Div $marginBottom="4px" $marginTop="4px">
                    <LightLink onClick={openCommentModal}>
                        View all {post.global.commentCount} comments
                    </LightLink>
                </Div>
            )}
            {!post.global?.commentsDisabled && (
                <Div>
                    <FlexRow>
                        <CommentTextArea
                            value={commentText}
                            placeholder="Add a new comment..."
                            onChange={(e) => onCommentChange(e.target.value)}
                            onInput={(e) => {
                                const el = e.currentTarget;
                                el.style.height = "";
                                el.style.height = `${el.scrollHeight}px`;
                            }}
                            onKeyDown={handleKeyDown}
                        />
                        <Flex $marginTop="auto" $marginBottom="auto">
                            {commentText.length > 0 && (
                                <Div $paddingLeft="5px" $paddingRight="5px">
                                    <StyledLink onClick={onSubmitComment}>Post</StyledLink>
                                </Div>
                            )}
                            <EmojiPickerPopup
                                noPadding
                                onEmojiClick={onEmojiClick}
                            />
                        </Flex>
                    </FlexRow>
                </Div>
            )}
        </>
    );
});

export default CommentsSection;
