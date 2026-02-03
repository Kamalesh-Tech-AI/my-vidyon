import { SupabaseClient } from '@supabase/supabase-js';

/**
 * HTTP Interceptor for Supabase Client
 * Wraps Supabase methods to track loading state and prevent UI blocking
 * 
 * This interceptor ensures that API calls don't freeze the UI during page reload
 * by integrating with the global loading indicator
 */

/**
 * Lazy-load the global loading store to avoid circular dependencies
 */
function getLoadingStore() {
    if (typeof window === 'undefined') return null;

    try {
        // Dynamically import to avoid circular dependency
        const { useGlobalLoading } = require('@/hooks/useGlobalLoading');
        return useGlobalLoading.getState();
    } catch (error) {
        console.warn('Failed to load global loading store:', error);
        return null;
    }
}

/**
 * Wraps a Supabase query to track loading state
 */
function wrapQuery<T>(queryPromise: Promise<T>, requestId?: string): Promise<T> {
    const id = requestId || `req_${Date.now()}_${Math.random()}`;

    // Lazy-load store on first use
    const loadingStore = getLoadingStore();

    // Start loading (non-blocking)
    loadingStore?.startLoading(id);

    return queryPromise
        .then((result) => {
            loadingStore?.stopLoading(id);
            return result;
        })
        .catch((error) => {
            loadingStore?.stopLoading(id);
            throw error;
        });
}

/**
 * Apply interceptor to Supabase client
 * TEMPORARILY DISABLED to fix circular dependency
 * TODO: Re-implement with proper lazy loading
 */
export function applySupabaseInterceptor(client: SupabaseClient) {
    // Return client unmodified for now
    // The global loading indicator will still work via React Query
    return client;
}
