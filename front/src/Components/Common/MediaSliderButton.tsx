import React from 'react';
import styled from 'styled-components';

import LeftArrowSVG from "/public/images/left_arrow.svg";
import RightArrowSVG from "/public/images/right_arrow.svg";

const MediaSliderWrapper = styled.div`
    z-index: 20;
    position: absolute;
    bottom: 0;
`;

const MediaSliderLeftNormalWrapper = styled(MediaSliderWrapper)`
    bottom: 43%;
    left: -3%;
`;

const MediaSliderRightNormalWrapper = styled(MediaSliderWrapper)`
    bottom: 43%;
    right: 51%;
`;

const MediaSliderBottomLeftWrapper = styled(MediaSliderWrapper)`
    right: 44px;
`;

const MediaSliderBottomRightWrapper = styled(MediaSliderWrapper)`
    right: 5px;
`;

const MediaSliderButtonContainer = styled.div`
    width: 24px;
    height: 24px;
    color: ${props => props.theme['colors'].borderDefaultColor};
    background-color: ${props => props.theme['colors'].cropperAspectBkgnd};
    border-radius: 50%;
    padding: 5px; 
    cursor: pointer;
    display: flex;
    
    &:hover {
        color: ${props => props.theme['colors'].borderDefaultColor};
        background-color: ${props => props.theme['colors'].cropperAspectBkgndNoTrans};
        border: 1px solid ${props => props.theme['colors'].borderDarkColor};
    };    
`;

type MediaSliderButtonProps = {
    direction: ("left" | "right" | "bottomLeft" | "bottomRight");
    onClick: () => void;
};

const MediaSliderButton: React.FC<MediaSliderButtonProps> = (props: MediaSliderButtonProps) => {
    const renderLeft = () => {
        return (
            <MediaSliderLeftNormalWrapper>
                <MediaSliderButtonContainer onClick={props.onClick}>
                    <LeftArrowSVG />
                </MediaSliderButtonContainer>
            </MediaSliderLeftNormalWrapper>
        );
    }
    
    const renderRight = () => {
        return (
            <MediaSliderRightNormalWrapper>
                <MediaSliderButtonContainer onClick={props.onClick}>
                    <RightArrowSVG />
                </MediaSliderButtonContainer>
            </MediaSliderRightNormalWrapper>
        );
    }

    const renderBottomLeft = () => {
        return (
            <MediaSliderBottomLeftWrapper>
                <MediaSliderButtonContainer onClick={props.onClick}>
                    <LeftArrowSVG />
                </MediaSliderButtonContainer>
            </MediaSliderBottomLeftWrapper>
        );        
    }

    const renderBottomRight = () => {
        return (
            <MediaSliderBottomRightWrapper>
                <MediaSliderButtonContainer onClick={props.onClick}>
                    <RightArrowSVG />
                </MediaSliderButtonContainer>
            </MediaSliderBottomRightWrapper>
        );        
    }

    return (
        <>
            {props.direction === "left" && renderLeft()}
            {props.direction === "right" && renderRight()}
            {props.direction === "bottomLeft" && renderBottomLeft()}
            {props.direction === "bottomRight" && renderBottomRight()}
        </>
    );
}

export default MediaSliderButton;