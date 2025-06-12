import React, { useState } from 'react';
import styled from 'styled-components';
import { Media } from '../../api/types';
import * as styles from './Common.module.css';

import { Div, Flex, FlexRow } from './CombinedStyling';
import { LeftArrowSVG, RightArrowSVG } from './Icon';

const MediaSliderWrapper = styled(Div)`
    z-index: 20;
    position: absolute;
    bottom: calc(50% - 9px);
`;

const MediaSliderLeftButtonWrapper = styled(MediaSliderWrapper)`    
`;

const MediaSliderRightButtonWrapper = styled(MediaSliderWrapper)`
    left: calc(100% - 26px);
`;

const MediaSliderButtonContainer = styled(Flex)`
    width: 16px;
    height: 16px;
    color: ${props => props.theme['colors'].mediaSliderButtonColor};
    background-color: ${props => props.theme['colors'].mediaSliderButtonBkgndColor};
    border-radius: 50%;
    padding: 5px; 
    cursor: pointer;

    &:hover {
        color: ${props => props.theme['colors'].borderDefaultColor};
        background-color: ${props => props.theme['colors'].mediaSliderButtonColor};
    };    
`;

const MediaCircle = styled(Div)`
    background-color: ${props => props.theme['colors'].backgroundColor};
    margin-right: 5px;
    border-radius: 50%;
    height: 6px;
    width: 6px;
`;

const SlideItem = styled(Div)`
    box-sizing: border-box;
    min-width: 100%;
    height: auto;
    overflow: hidden;
    transform: translateX(0);
    transition: transform .5s ease;
`;
  
type MediaSliderProps = {
    media: Media[]
};

const MediaSlider: React.FC<MediaSliderProps> = (props: MediaSliderProps) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [mediaCount, _setMediaCount] = useState<number>(props.media.length);

    const advanceIndex = (changeBy: number) => {
        setCurrentIndex(currentIndex + changeBy);
    }

    const hasNext = () => (currentIndex < mediaCount-1)
    const hasPrev = () => (currentIndex > 0)

    const renderLeft = () => {
        return (
            <MediaSliderLeftButtonWrapper>
                <MediaSliderButtonContainer onClick={() => advanceIndex(-1)}>
                    <LeftArrowSVG />
                </MediaSliderButtonContainer>
            </MediaSliderLeftButtonWrapper>
        );
    }
    
    const renderRight = () => {
        return (
            <MediaSliderRightButtonWrapper>
                <MediaSliderButtonContainer onClick={() => advanceIndex(1)}>
                    <RightArrowSVG />
                </MediaSliderButtonContainer>
            </MediaSliderRightButtonWrapper>
        );
    }

    const renderMedia = () => {
        const width = document.body.clientWidth >= 470 ? 470 : document.body.clientWidth;
        const mediaCircles = [];

        for(let i = 0; i < mediaCount; i++) {
            const opacity = (i === currentIndex) ? 1 : .4;
            mediaCircles.push(<MediaCircle key={i} style={{opacity: opacity}}/>);
        }
        
        return (
            <>
                { hasPrev() && renderLeft() }
                { hasNext() && renderRight() }
                {props.media.map((media, index) => {
                    const translateX = currentIndex*width;
                    return (
                        <SlideItem key={index} style={{transform: `translateX(-${translateX}px)`}}>
                        {
                            media.mimeType.indexOf('video') !== -1 ? 
                                <video role="video" autoPlay src={media.path} 
                                    aria-label={media.altText} 
                                    className={styles.mediaSliderMedia} /> :
                                <img role="img" src={media.path} alt={media.altText}
                                    aria-label={media.altText} 
                                    className={styles.mediaSliderMedia} />            
                        }
                        </SlideItem>                    
                    );
                })}
                {
                    (mediaCount > 1) && (
                        <div className={styles.mediaCircles}>
                            {mediaCircles}
                        </div>
                    )
                }
            </>
        );
    }

    return (
        <FlexRow $height="100%" $alignItems="stretch" $position="relative" $verticalAlign="baseline">
            {renderMedia()}        
        </FlexRow>
    );
}

export default MediaSlider;