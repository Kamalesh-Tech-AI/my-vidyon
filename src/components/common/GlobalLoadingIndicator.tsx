import { useEffect, useState } from 'react';
import { useGlobalLoading } from '@/hooks/useGlobalLoading';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Slim top progress bar - non-blocking loading indicator
 * Shows when API requests are active
 */
export function GlobalLoadingIndicator() {
    const { isLoading, activeRequests } = useGlobalLoading();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!isLoading) {
            setProgress(0);
            return;
        }

        // Start progress
        setProgress(10);

        // Simulate progress (not accurate, just visual feedback)
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev; // Cap at 90% until actual completion
                return prev + Math.random() * 10;
            });
        }, 500);

        return () => clearInterval(interval);
    }, [isLoading]);

    useEffect(() => {
        // Complete progress when loading stops
        if (!isLoading && progress > 0) {
            setProgress(100);
            const timeout = setTimeout(() => setProgress(0), 300);
            return () => clearTimeout(timeout);
        }
    }, [isLoading, progress]);

    return (
        <AnimatePresence>
            {progress > 0 && (
                <motion.div
                    className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gradient-to-r from-primary via-primary/80 to-primary"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: progress / 100, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ transformOrigin: 'left' }}
                >
                    {/* Animated shimmer effect */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Request count badge (optional dev tool)
 * Shows number of active requests in development
 */
export function RequestCountBadge() {
    const { activeRequests } = useGlobalLoading();

    if (process.env.NODE_ENV !== 'development' || activeRequests === 0) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-[9999] bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-mono shadow-lg">
            {activeRequests} active {activeRequests === 1 ? 'request' : 'requests'}
        </div>
    );
}
