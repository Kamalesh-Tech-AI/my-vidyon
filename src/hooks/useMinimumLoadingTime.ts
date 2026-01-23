import { useState, useEffect } from 'react';

/**
 * Hook to ensure loader is displayed for a minimum duration
 * This provides a better UX by preventing flash of loading state
 * 
 * @param isActuallyLoading - The real loading state from queries
 * @param minDisplayTime - Minimum time to show loader in milliseconds (default: 1500ms)
 * @returns boolean - Whether to show the loader
 */
export function useMinimumLoadingTime(
    isActuallyLoading: boolean,
    minDisplayTime: number = 500
): boolean {
    const [showLoader, setShowLoader] = useState(true);
    const [startTime] = useState(Date.now());

    useEffect(() => {
        if (!isActuallyLoading) {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minDisplayTime - elapsed);

            if (remaining > 0) {
                const timer = setTimeout(() => {
                    setShowLoader(false);
                }, remaining);

                return () => clearTimeout(timer);
            } else {
                setShowLoader(false);
            }
        }
    }, [isActuallyLoading, minDisplayTime, startTime]);

    return showLoader;
}
