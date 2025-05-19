import { useRef, useCallback } from 'react';

const useThrottle = <T extends (...args: any[]) => void>(callback: T, delay: number) => {
    const lastCall = useRef(0);

    const throttledCallback = useCallback(
        (...args: Parameters<T>) => {
            const now = new Date().getTime();
            if (now - lastCall.current >= delay) {
                lastCall.current = now;
                callback(...args);
            }
        },
        [callback, delay]
    );

    return throttledCallback;
};

export default useThrottle;