import { SupabaseClient } from '@supabase/supabase-js';
import { useGlobalLoading } from '@/hooks/useGlobalLoading';

/**
 * HTTP Interceptor for Supabase Client
 * Wraps Supabase methods to track loading state and prevent UI blocking
 * 
 * This interceptor ensures that API calls don't freeze the UI during page reload
 * by integrating with the global loading indicator
 */

let loadingStore: ReturnType<typeof useGlobalLoading.getState>;

// Initialize the loading store
if (typeof window !== 'undefined') {
    loadingStore = useGlobalLoading.getState();
}

/**
 * Wraps a Supabase query to track loading state
 */
function wrapQuery<T>(queryPromise: Promise<T>, requestId?: string): Promise<T> {
    const id = requestId || `req_${Date.now()}_${Math.random()}`;

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
 * Wraps .from() method to track all database queries
 */
export function applySupabaseInterceptor(client: SupabaseClient) {
    // Store original from method
    const originalFrom = client.from.bind(client);

    // Override from method to wrap all queries
    client.from = function (table: string) {
        const queryBuilder = originalFrom(table);

        // Wrap common query methods
        const originalSelect = queryBuilder.select.bind(queryBuilder);
        const originalInsert = queryBuilder.insert.bind(queryBuilder);
        const originalUpdate = queryBuilder.update.bind(queryBuilder);
        const originalDelete = queryBuilder.delete.bind(queryBuilder);
        const originalUpsert = queryBuilder.upsert.bind(queryBuilder);

        // Override select
        queryBuilder.select = function (...args: any[]) {
            const query = originalSelect(...args);
            const originalThen = query.then?.bind(query);

            if (originalThen) {
                query.then = function (onfulfilled?: any, onrejected?: any) {
                    return wrapQuery(originalThen(onfulfilled, onrejected), `select_${table}`);
                };
            }

            return query;
        };

        // Override insert
        queryBuilder.insert = function (...args: any[]) {
            const query = originalInsert(...args);
            const originalThen = query.then?.bind(query);

            if (originalThen) {
                query.then = function (onfulfilled?: any, onrejected?: any) {
                    return wrapQuery(originalThen(onfulfilled, onrejected), `insert_${table}`);
                };
            }

            return query;
        };

        // Override update
        queryBuilder.update = function (...args: any[]) {
            const query = originalUpdate(...args);
            const originalThen = query.then?.bind(query);

            if (originalThen) {
                query.then = function (onfulfilled?: any, onrejected?: any) {
                    return wrapQuery(originalThen(onfulfilled, onrejected), `update_${table}`);
                };
            }

            return query;
        };

        // Override delete
        queryBuilder.delete = function (...args: any[]) {
            const query = originalDelete(...args);
            const originalThen = query.then?.bind(query);

            if (originalThen) {
                query.then = function (onfulfilled?: any, onrejected?: any) {
                    return wrapQuery(originalThen(onfulfilled, onrejected), `delete_${table}`);
                };
            }

            return query;
        };

        // Override upsert
        queryBuilder.upsert = function (...args: any[]) {
            const query = originalUpsert(...args);
            const originalThen = query.then?.bind(query);

            if (originalThen) {
                query.then = function (onfulfilled?: any, onrejected?: any) {
                    return wrapQuery(originalThen(onfulfilled, onrejected), `upsert_${table}`);
                };
            }

            return query;
        };

        return queryBuilder;
    };

    return client;
}
