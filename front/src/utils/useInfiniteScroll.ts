import React, { useEffect } from 'react';
import useThrottle from './useThrottle';

const useInfiniteScroll = (loadMore: () => void, isLoading: boolean, childRef:React.MutableRefObject<HTMLDivElement|null>, hasScrolled: React.MutableRefObject<boolean>) => {
    const throttledHandleScroll = useThrottle(() => {
        if (typeof window !== 'undefined' && childRef.current) {
            const element = childRef.current as HTMLElement;
            const currentScroll = window.innerHeight + element.scrollTop;

            if (currentScroll + 256 >= element.scrollHeight && !isLoading && !hasScrolled.current) {
                hasScrolled.current = true;  // Mark as scrolled at least once
                loadMore();
            }
        }
    }, 200);

    useEffect(() => {
        if(childRef != null && childRef.current != null) {
            childRef.current.addEventListener('scroll', throttledHandleScroll);
        }
        return () => {
            if(childRef != null && childRef.current != null) {
                childRef.current.removeEventListener('scroll', throttledHandleScroll);
            }
        };        
    }, [throttledHandleScroll]);
}

export default useInfiniteScroll;