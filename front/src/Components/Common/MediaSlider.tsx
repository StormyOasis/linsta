import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Media } from '../../api/types';
import * as styles from './Common.module.css';

import { Div, Flex, FlexRow } from './CombinedStyling';
import { LeftArrowSVG, RightArrowSVG } from './Icon';

const MediaSliderContainer = styled.div`
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none;  /* IE/Edge */
    width: 100%;

    &::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
    }

    @media (min-width: ${props => props.theme["breakpoints"].md}px) {
        overflow-x: hidden; /* desktop hides native scroll */
        height:100%;
    }
`;

const SlideItem = styled(Flex)`
    flex: 0 0 100%;
    scroll-snap-align: start;
    box-sizing: border-box;
    background-color: ${props => props.theme['colors'].backgroundColor};
`;

const MediaSliderButtonWrapper = styled(Div)`
    z-index: 20;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
`;

const MediaSliderLeftButtonWrapper = styled(MediaSliderButtonWrapper)`
    left: 10px;
`;

const MediaSliderRightButtonWrapper = styled(MediaSliderButtonWrapper)`
    right: 10px;
`;

const MediaSliderButtonContainer = styled(FlexRow)`
    width: 32px;
    height: 32px;
    color: ${props => props.theme['colors'].borderDefaultColor};
    background-color: ${props => props.theme['colors'].cropperAspectBkgnd};
    border-radius: 50%;
    padding: 5px;
    align-items: center;
    justify-content: center;

    &:hover {
        color: ${props => props.theme['colors'].borderDefaultColor};
        background-color: ${props => props.theme['colors'].cropperAspectBkgndNoTrans};
        border: 1px solid ${props => props.theme['colors'].borderDarkColor};
    }
`;

const MediaCircle = styled(Div)`
    background-color: ${props => props.theme['colors'].backgroundColor};
    margin-right: 5px;
    border-radius: 50%;
    height: 6px;
    width: 6px;
`;

type MediaSliderProps = {
    media: Media[];
    onSlideChange?: (index: number) => void;
};

const MediaSlider: React.FC<MediaSliderProps> = ({ media, onSlideChange }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const mediaCount = media.length;

    // Detect desktop based on window width
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    useEffect(() => {
        const onResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const scrollToIndex = (index: number) => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const childWidth = container.offsetWidth;

        if (isDesktop) {
            container.scrollTo({
                left: index * childWidth,
                behavior: 'smooth',
            });
        }

        setCurrentIndex(index);
    };


    const advanceIndex = (changeBy: number) => {
        const newIndex = Math.min(Math.max(currentIndex + changeBy, 0), mediaCount - 1);
        scrollToIndex(newIndex);

        if (onSlideChange) {
            onSlideChange(newIndex);
        }
    };

    // Sync currentIndex on manual scroll (mobile)
    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;

        const onScroll = () => {
            if (isDesktop) return; // ignore on desktop (controlled)
            const scrollLeft = container.scrollLeft;
            const width = container.offsetWidth;
            const idx = Math.round(scrollLeft / width);
            if (idx !== currentIndex) setCurrentIndex(idx);
        };

        container.addEventListener('scroll', onScroll, { passive: true });
        return () => container.removeEventListener('scroll', onScroll);
    }, [currentIndex, isDesktop]);

    // Render arrows only on desktop
    const renderLeftArrow = () =>
        currentIndex > 0 && (
            <MediaSliderLeftButtonWrapper onClick={() => advanceIndex(-1)} aria-label="Previous media">
                <MediaSliderButtonContainer>
                    <LeftArrowSVG width="20px" height="20px" fill="currentColor" stroke="none" />
                </MediaSliderButtonContainer>
            </MediaSliderLeftButtonWrapper>
        );

    const renderRightArrow = () =>
        currentIndex < mediaCount - 1 && (
            <MediaSliderRightButtonWrapper onClick={() => advanceIndex(1)} aria-label="Next media">
                <MediaSliderButtonContainer>
                    <RightArrowSVG width="20px" height="20px" fill="currentColor" stroke="none" />
                </MediaSliderButtonContainer>
            </MediaSliderRightButtonWrapper>
        );

    return (
        <Div $position="relative" $width="100%" $height="100%">
            {isDesktop && renderLeftArrow()}
            {isDesktop && renderRightArrow()}
            <MediaSliderContainer ref={containerRef} role="list" aria-label="Media gallery">
                {media.map((item, index) => (
                    <SlideItem
                        key={index}
                        role="listitem"
                        aria-current={index === currentIndex ? 'true' : undefined}
                    >
                        {item.mimeType.includes('video') ? (
                            <video
                                role="video"
                                autoPlay
                                muted
                                controls
                                src={item.path}
                                aria-label={item.altText}
                                className={styles.mediaSliderMedia}
                            />
                        ) : (
                            <img
                                role="img"
                                src={item.path}
                                alt={item.altText}
                                aria-label={item.altText}
                                className={styles.mediaSliderMedia}
                            />
                        )}
                    </SlideItem>
                ))}
            </MediaSliderContainer>
            {/* Media circles */}
            {mediaCount > 1 && (
                <Div
                    $position="absolute"
                    $bottom="10px"
                    $width="100%"
                    $display="flex"
                    $justifyContent="center"
                    aria-label="Media navigation dots"
                >
                    {media.map((_, i) => (
                        <MediaCircle
                            key={i}
                            style={{ opacity: i === currentIndex ? 1 : 0.4, cursor: 'pointer' }}
                            onClick={() => scrollToIndex(i)}
                            aria-current={i === currentIndex ? 'true' : undefined}
                            aria-label={`Go to media ${i + 1}`}
                        />
                    ))}
                </Div>
            )}
        </Div>
    );
};

export default MediaSlider;