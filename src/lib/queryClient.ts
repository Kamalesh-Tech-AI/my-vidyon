import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized QueryClient configuration
 * Extracted from App.tsx for reusability and interceptor integration
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh longer, reduces refetches
            gcTime: 1000 * 60 * 10, // 10 minutes - keep unused data in cache
            refetchOnWindowFocus: false, // Disable automatic refetch on window focus (enable per-query if needed)
            refetchOnReconnect: true, // Refetch when internet connection is restored
            retry: (failureCount, error) => {
                // Exponential backoff retry logic
                if (failureCount > 3) return false;
                // Don't retry on 4xx errors (client errors)
                if (error && typeof error === 'object' && 'status' in error) {
                    const status = (error as any).status;
                    if (status >= 400 && status < 500) return false;
                }
                return true;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        },
        mutations: {
            retry: 1, // Retry mutations once on failure
        },
    },
});
