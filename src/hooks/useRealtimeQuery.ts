import { useEffect, useRef } from 'react';
import { useQueryClient, UseQueryOptions, UseQueryResult, useQuery } from '@tanstack/react-query';
import { realtimeService } from '@/services/realtime.service';

interface UseRealtimeQueryOptions<TData> extends Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'> {
    queryKey: string[];
    queryFn: () => Promise<TData>;
    tableName?: string;
    realtimeFilter?: {
        event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
        schema?: string;
        filter?: string;
    };
    enableRealtime?: boolean;
}

/**
 * Custom hook that combines React Query with Supabase Realtime subscriptions
 * Automatically invalidates and refetches data when real-time updates occur
 * 
 * @example
 * const { data, isLoading } = useRealtimeQuery({
 *   queryKey: ['students', institutionId],
 *   queryFn: () => fetchStudents(institutionId),
 *   tableName: 'students',
 *   enableRealtime: true,
 * });
 */
export function useRealtimeQuery<TData = unknown>({
    queryKey,
    queryFn,
    tableName,
    realtimeFilter,
    enableRealtime = true,
    ...queryOptions
}: UseRealtimeQueryOptions<TData>): UseQueryResult<TData> {
    const queryClient = useQueryClient();
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Use React Query for data fetching and caching
    const query = useQuery({
        queryKey,
        queryFn,
        ...queryOptions,
    });

    // Set up real-time subscription
    useEffect(() => {
        if (!enableRealtime || !tableName) {
            return;
        }

        console.log(`🔄 Setting up real-time subscription for ${tableName}`);

        // Subscribe to table changes
        const unsubscribe = realtimeService.subscribeToTable(
            tableName,
            (payload) => {
                console.log(`📡 Real-time update received for ${tableName}:`, payload);

                // Invalidate the query to trigger a refetch
                queryClient.invalidateQueries({ queryKey });

                // Optional: Optimistic update based on event type
                if (payload.eventType === 'INSERT' && payload.new) {
                    // You can implement optimistic updates here
                    queryClient.setQueryData<TData>(queryKey, (oldData) => {
                        // Handle array data
                        if (Array.isArray(oldData)) {
                            return [...oldData, payload.new] as TData;
                        }
                        return oldData;
                    });
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    queryClient.setQueryData<TData>(queryKey, (oldData) => {
                        // Handle array data
                        if (Array.isArray(oldData)) {
                            return oldData.filter((item: any) => item.id !== payload.old.id) as TData;
                        }
                        return oldData;
                    });
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    queryClient.setQueryData<TData>(queryKey, (oldData) => {
                        // Handle array data
                        if (Array.isArray(oldData)) {
                            return oldData.map((item: any) =>
                                item.id === payload.new.id ? payload.new : item
                            ) as TData;
                        }
                        return oldData;
                    });
                }
            },
            realtimeFilter
        );

        unsubscribeRef.current = unsubscribe;

        // Cleanup subscription on unmount
        return () => {
            if (unsubscribeRef.current) {
                console.log(`🔌 Cleaning up real-time subscription for ${tableName}`);
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [enableRealtime, tableName, queryKey, queryClient, realtimeFilter]);

    return query;
}

/**
 * Hook for multiple real-time subscriptions
 * Useful when you need to listen to multiple tables
 */
export function useMultipleRealtimeSubscriptions(
    subscriptions: Array<{
        tableName: string;
        queryKey: string[];
        filter?: {
            event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
            schema?: string;
            filter?: string;
        };
    }>
) {
    const queryClient = useQueryClient();
    const unsubscribesRef = useRef<Array<() => void>>([]);

    useEffect(() => {
        // Subscribe to all tables
        unsubscribesRef.current = subscriptions.map(({ tableName, queryKey, filter }) => {
            return realtimeService.subscribeToTable(
                tableName,
                (payload) => {
                    console.log(`📡 Real-time update for ${tableName}:`, payload);
                    queryClient.invalidateQueries({ queryKey });
                },
                filter
            );
        });

        // Cleanup all subscriptions
        return () => {
            unsubscribesRef.current.forEach((unsubscribe) => unsubscribe());
            unsubscribesRef.current = [];
        };
    }, [subscriptions, queryClient]);
}
