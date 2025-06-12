import React, { useEffect, useRef } from 'react';
import useThrottle from './useThrottle';

/**
 * Type for the async load more function.
 */
type AsyncLoadMoreFunction = () => Promise<void>;

/**
 * Custom hook for infinite scrolling.
 * Attaches a throttled scroll event listener to a container and triggers `loadMore`
 * when the user scrolls near the bottom.
 *
 * @param loadMore - Async function to load more items.
 * @param isLoading - Whether a load is currently in progress.
 * @param containerRef - Ref to the scrollable container element.
 */
const useInfiniteScroll = (loadMore: AsyncLoadMoreFunction, 
    isLoading: boolean, 
    childRef: React.MutableRefObject<HTMLDivElement | null>) => {
        
    const hasScrolled = useRef<boolean>(false);  // Track if the user has scrolled

    // Throttled scroll handler
    const throttledHandleScroll = useThrottle(async () => {
        if (typeof window !== 'undefined' && childRef.current) {
            const element = childRef.current as HTMLElement;
            const currentScroll = window.innerHeight + element.scrollTop;

            if (currentScroll + 256 >= element.scrollHeight && !isLoading && !hasScrolled.current) {
                hasScrolled.current = true;  // Mark as scrolled at least once
                await loadMore();
            }
        }
    }, 200);

    useEffect(() => {
        const childElement = childRef.current;
        if (childElement) {
            childElement.addEventListener('scroll', throttledHandleScroll);
        }

        // Clean up event listener on unmount
        return () => {
            if (childElement) {
                childElement.removeEventListener('scroll', throttledHandleScroll);
            }
        };
    }, [throttledHandleScroll, childRef]);

    // Reset trigger flag when loading finishes
    useEffect(() => {
        if (!isLoading) {
            hasScrolled.current = false;
        }
    }, [isLoading]);
}

export default useInfiniteScroll;