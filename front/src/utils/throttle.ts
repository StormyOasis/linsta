import { useRef } from 'react';

const useThrottle = (callback: Function, delay: number) => {
    const lastCall = useRef(0);

    return (...args: any[]) => {
        const now = new Date().getTime();
        if (now - lastCall.current >= delay) {
            lastCall.current = now;
            callback(...args);
        }
    };
};

export default useThrottle;