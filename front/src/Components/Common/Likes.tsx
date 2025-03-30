import React from "react";
import styled from "styled-components";

import { Post } from "../../api/types";
import { HOST } from "../../api/config";
import { BoldLink, Div, Span } from "./CombinedStyling";

import HeartSVG from "/public/images/heart.svg";
import HeartFilledSVG from "/public/images/heart-fill.svg";

type ViewLikesTextProps = {
    post: Post;
    handleClick: (post: Post) => void;
}

export const ViewLikesText = (props: ViewLikesTextProps) => {
    if (props.post?.global?.likes == null || props.post.global.likesDisabled || props.post.global.likes.length === 0) {
        return null;
    }

    return (
        <Div>
            <Span>Liked by <BoldLink role="link" href={`${HOST}/${props.post.global.likes[0].userName}`}>{props.post.global.likes[0].userName}</BoldLink>
                {props.post.global.likes.length > 1 && <Span> and <BoldLink role="link" onClick={() => props.handleClick(props.post)}>others</BoldLink></Span>}
            </Span>
        </Div>
    );
}

const Container = styled(Div) <{ $isLiked?: boolean, $width: string, $height: string, $offsetIndex: number }>`
    width: ${props => props.$width};
    height: ${props => props.$height};
    color: ${props => props.$isLiked ? "red" : "black"};
    transform: ${props => `translateX(${25 * props.$offsetIndex}px)`}; 

    &:hover {
        color: ${props => props.theme["colors"].borderDarkColor};
    }
`;

type LikeTogglerProps = {
    isLiked: boolean;
    width?: string;
    height?: string;
    offsetIndex?: number;
    handleClick: any;
}

export const LikeToggler = (props: LikeTogglerProps) => {
    const { isLiked = false, width = "28px", height = "28px", offsetIndex = 0 } = props;

    return (
        <Container
            $offsetIndex={offsetIndex}
            $width={width}
            $height={height}
            $isLiked={isLiked}
            onClick={props.handleClick}>

            {isLiked ?
                <HeartFilledSVG style={{ width, height }} /> :
                <HeartSVG style={{ width, height }} />
            }
        </Container>
    );
};