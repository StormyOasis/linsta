import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Media } from '../../api/types';
import * as styles from './Common.module.css';

import { Div, FlexRow } from './CombinedStyling';
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

  @media (min-width: 768px) {
    overflow-x: hidden; /* desktop hides native scroll */
  }
`;

const SlideItem = styled(Div)`
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

  // Scroll container to selected index (desktop only)
  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const childWidth = container.offsetWidth;
    container.scrollTo({
      left: index * childWidth,
      behavior: 'smooth',
    });
    setCurrentIndex(index);
  };

  // Arrow handlers
const advanceIndex = (changeBy: number) => {
  const newIndex = currentIndex + changeBy;
  setCurrentIndex(newIndex);
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
              onClick={() => isDesktop && scrollToIndex(i)}
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


/*import React, { useState } from 'react';
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
    background-color: ${props => props.theme['colors'].backgroundColor};
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
*/