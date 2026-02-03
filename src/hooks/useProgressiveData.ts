import { useState, useEffect } from 'react';
import { UseQueryResult } from '@tanstack/react-query';

interface ProgressiveDataOptions<TCritical, TDetailed> {
    criticalQuery: UseQueryResult<TCritical>;
    detailedQuery: UseQueryResult<TDetailed>;
    delay?: number; // Delay before fetching detailed data (ms)
}

/**
 * Hook for progressive data loading
 * Loads critical data first (for skeleton/placeholder), then fetches detailed data
 * 
 * @example
 * const { data, isLoadingCritical, isLoadingDetailed } = useProgressiveData({
 *   criticalQuery: useQuery(['students-count'], fetchStudentCount),
 *   detailedQuery: useQuery(['students-details'], fetchStudentDetails, { enabled: false }),
 *   delay: 100,
 * });
 */
export function useProgressiveData<TCritical, TDetailed>({
    criticalQuery,
    detailedQuery,
    delay = 0,
}: ProgressiveDataOptions<TCritical, TDetailed>) {
    const [shouldLoadDetailed, setShouldLoadDetailed] = useState(false);

    useEffect(() => {
        // Once critical data is loaded, schedule detailed data fetch
        if (criticalQuery.isSuccess && !shouldLoadDetailed) {
            const timer = setTimeout(() => {
                setShouldLoadDetailed(true);
            }, delay);

            return () => clearTimeout(timer);
        }
    }, [criticalQuery.isSuccess, shouldLoadDetailed, delay]);

    return {
        criticalData: criticalQuery.data,
        detailedData: detailedQuery.data,
        isLoadingCritical: criticalQuery.isLoading,
        isLoadingDetailed: detailedQuery.isLoading && shouldLoadDetailed,
        isSuccess: criticalQuery.isSuccess && (detailedQuery.isSuccess || !shouldLoadDetailed),
        error: criticalQuery.error || detailedQuery.error,
    };
}

/**
 * Hook for prefetching data on hover or focus
 * Improves perceived performance by loading data before user clicks
 */
export function usePrefetch<TData>(
    queryKey: string[],
    queryFn: () => Promise<TData>,
    options?: {
        enabled?: boolean;
        staleTime?: number;
    }
) {
    const [shouldPrefetch, setShouldPrefetch] = useState(false);

    const handleMouseEnter = () => {
        if (options?.enabled !== false) {
            setShouldPrefetch(true);
        }
    };

    const handleFocus = () => {
        if (options?.enabled !== false) {
            setShouldPrefetch(true);
        }
    };

    return {
        prefetchProps: {
            onMouseEnter: handleMouseEnter,
            onFocus: handleFocus,
        },
        shouldPrefetch,
    };
}

/**
 * Hook for lazy loading data in chunks
 * Useful for large lists or tables
 */
export function useLazyLoadData<TData>(
    fetchFn: (offset: number, limit: number) => Promise<TData[]>,
    options?: {
        initialLimit?: number;
        incrementSize?: number;
    }
) {
    const [limit, setLimit] = useState(options?.initialLimit || 20);
    const [allData, setAllData] = useState<TData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadMore = async () => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        try {
            const newData = await fetchFn(allData.length, options?.incrementSize || 20);

            if (newData.length === 0) {
                setHasMore(false);
            } else {
                setAllData((prev) => [...prev, ...newData]);
            }
        } catch (error) {
            console.error('Error loading more data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setAllData([]);
        setLimit(options?.initialLimit || 20);
        setHasMore(true);
    };

    return {
        data: allData,
        isLoading,
        hasMore,
        loadMore,
        reset,
    };
}

/**
 * Hook for implementing skeleton loading states
 * Returns loading state and placeholder data
 */
export function useSkeletonData<TData>(
    query: UseQueryResult<TData>,
    placeholderCount: number = 5
) {
    const getPlaceholder = (): TData => {
        // Return array of placeholder items if data is expected to be an array
        if (Array.isArray(query.data)) {
            return Array(placeholderCount).fill(null) as TData;
        }
        return null as TData;
    };

    return {
        data: query.data || getPlaceholder(),
        isLoading: query.isLoading,
        isPlaceholder: query.isLoading || !query.data,
        error: query.error,
    };
}
