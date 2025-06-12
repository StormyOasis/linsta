import { useRef, useCallback } from 'react';

/**
 * React hook for throttling a callback function.
 * The callback will only be invoked at most once every `delay` milliseconds.
 *
 * @param callback - The function to throttle.
 * @param delay - The minimum delay (ms) between calls.
 * @returns A throttled version of the callback.
 */
const useThrottle = <T extends (...args: any[]) => void>(callback: T, delay: number) => {
    const lastCall = useRef<number>(0);

    return useCallback(
        (...args: Parameters<T>) => {
            const now = performance.now();
            if (now - lastCall.current >= delay) {
                lastCall.current = now;
                callback(...args);
            }
        },
        [callback, delay]
    );
};

export default useThrottle;