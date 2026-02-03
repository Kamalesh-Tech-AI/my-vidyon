import { supabase } from '@/lib/supabase';
import { useGlobalLoading } from '@/hooks/useGlobalLoading';

/**
 * Centralized API service with request deduplication and error handling
 */
class ApiService {
    private pendingRequests = new Map<string, Promise<any>>();
    private retryCount = new Map<string, number>();
    private maxRetries = 3;

    /**
     * Generate cache key for request deduplication
     */
    private getCacheKey(table: string, query: any): string {
        return `${table}:${JSON.stringify(query)}`;
    }

    /**
     * Execute query with deduplication
     * If same query is in-flight, return the existing promise
     */
    async executeQuery<T>(
        queryFn: () => Promise<{ data: T | null; error: any }>,
        cacheKey: string,
        options: { skipDedup?: boolean; retryOnError?: boolean } = {}
    ): Promise<T | null> {
        const { skipDedup = false, retryOnError = true } = options;

        // Check for in-flight request (deduplication)
        if (!skipDedup && this.pendingRequests.has(cacheKey)) {
            console.log(`🔄 [API] Deduplicating request: ${cacheKey}`);
            return this.pendingRequests.get(cacheKey);
        }

        // Start loading
        const { startLoading, stopLoading } = useGlobalLoading.getState();
        startLoading(cacheKey);

        // Execute query
        const promise = (async () => {
            try {
                const result = await queryFn();

                if (result.error) {
                    console.error(`❌ [API] Query error for ${cacheKey}:`, result.error);

                    // Retry logic
                    if (retryOnError && this.shouldRetry(cacheKey, result.error)) {
                        const retryDelay = this.getRetryDelay(cacheKey);
                        console.log(`🔄 [API] Retrying ${cacheKey} in ${retryDelay}ms...`);

                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        this.incrementRetry(cacheKey);

                        // Remove from pending and retry
                        this.pendingRequests.delete(cacheKey);
                        return this.executeQuery(queryFn, cacheKey, options);
                    }

                    throw result.error;
                }

                // Reset retry count on success
                this.retryCount.delete(cacheKey);
                return result.data;
            } catch (error) {
                console.error(`❌ [API] Exception for ${cacheKey}:`, error);
                throw error;
            } finally {
                stopLoading(cacheKey);
                this.pendingRequests.delete(cacheKey);
            }
        })();

        // Store pending request
        if (!skipDedup) {
            this.pendingRequests.set(cacheKey, promise);
        }

        return promise;
    }

    /**
     * Check if error should trigger retry
     */
    private shouldRetry(cacheKey: string, error: any): boolean {
        const retries = this.retryCount.get(cacheKey) || 0;
        if (retries >= this.maxRetries) return false;

        // Don't retry on 4xx errors (client errors)
        if (error?.code && error.code >= 400 && error.code < 500) {
            return false;
        }

        // Retry on network errors, timeouts, 5xx errors
        return true;
    }

    /**
     * Get retry delay with exponential backoff
     */
    private getRetryDelay(cacheKey: string): number {
        const retries = this.retryCount.get(cacheKey) || 0;
        return Math.min(1000 * Math.pow(2, retries), 10000); // Max 10s
    }

    /**
     * Increment retry count
     */
    private incrementRetry(cacheKey: string) {
        const current = this.retryCount.get(cacheKey) || 0;
        this.retryCount.set(cacheKey, current + 1);
    }

    /**
     * Clear all pending requests (use on logout)
     */
    clearPending() {
        this.pendingRequests.clear();
        this.retryCount.clear();
    }

    /**
     * Helper: Batch multiple queries in parallel
     */
    async batchQueries<T extends any[]>(
        queries: (() => Promise<any>)[]
    ): Promise<T> {
        const results = await Promise.allSettled(queries.map(q => q()));

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`❌ [API] Batch query ${index} failed:`, result.reason);
                return null;
            }
        }) as T;
    }
}

export const apiService = new ApiService();

/**
 * React Query integration wrapper
 * Automatically handles deduplication and error handling
 */
export function createQueryFn<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    cacheKey: string
) {
    return async (): Promise<T | null> => {
        return apiService.executeQuery(queryFn, cacheKey);
    };
}
