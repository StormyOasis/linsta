import React, { useEffect, useRef } from 'react';
import useThrottle from './useThrottle';

type asyncLoadMoreFuncton = () => Promise<void>;

const useInfiniteScroll = (loadMore: asyncLoadMoreFuncton, isLoading: boolean, childRef: React.MutableRefObject<HTMLDivElement | null>) => {
    const hasScrolled = useRef<boolean>(false);  // Track if the user has scrolled

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

    useEffect(() => {
        if (!isLoading) {
            hasScrolled.current = false;
        }
    }, [isLoading]);
}

export default useInfiniteScroll;