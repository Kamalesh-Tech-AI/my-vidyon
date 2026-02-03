import { create } from 'zustand';

interface LoadingState {
    activeRequests: number;
    isLoading: boolean;
    requestIds: Set<string>;
    startLoading: (requestId?: string) => void;
    stopLoading: (requestId?: string) => void;
    reset: () => void;
}

/**
 * Global loading state management
 * Tracks active API requests without blocking UI
 */
export const useGlobalLoading = create<LoadingState>((set) => ({
    activeRequests: 0,
    isLoading: false,
    requestIds: new Set<string>(),

    startLoading: (requestId?: string) => {
        set((state) => {
            const newRequestIds = new Set(state.requestIds);
            if (requestId) {
                newRequestIds.add(requestId);
            }
            const newActiveRequests = state.activeRequests + 1;
            return {
                activeRequests: newActiveRequests,
                isLoading: newActiveRequests > 0,
                requestIds: newRequestIds,
            };
        });
    },

    stopLoading: (requestId?: string) => {
        set((state) => {
            const newRequestIds = new Set(state.requestIds);
            if (requestId) {
                newRequestIds.delete(requestId);
            }
            const newActiveRequests = Math.max(0, state.activeRequests - 1);
            return {
                activeRequests: newActiveRequests,
                isLoading: newActiveRequests > 0,
                requestIds: newRequestIds,
            };
        });
    },

    reset: () => {
        set({
            activeRequests: 0,
            isLoading: false,
            requestIds: new Set<string>(),
        });
    },
}));

/**
 * Hook to use loading state for specific request
 */
export function useRequestLoading(requestId: string) {
    const { requestIds } = useGlobalLoading();
    return requestIds.has(requestId);
}
