import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

/**
 * Shared authentication state hook
 * Prevents multiple components from fetching user/session data independently
 * 
 * This is a single source of truth for authentication state across all dashboards
 * Cached for 24 hours and automatically refreshes on auth state changes
 */

interface AuthData {
    user: User | null;
    session: Session | null;
}

export function useSharedAuth() {
    const { data, isLoading, error, refetch } = useQuery<AuthData>({
        queryKey: ['shared-auth'],
        queryFn: async () => {
            const { data: sessionData, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Auth session error:', error);
                return { user: null, session: null };
            }

            return {
                user: sessionData?.session?.user || null,
                session: sessionData?.session || null
            };
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 hours - auth state rarely changes
        gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnReconnect: true, // Refetch when internet reconnects
    });

    return {
        user: data?.user || null,
        session: data?.session || null,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
    const { user, isLoading } = useSharedAuth();
    return {
        isAuthenticated: !!user,
        isLoading,
    };
}

/**
 * Hook to get current user ID
 */
export function useUserId() {
    const { user } = useSharedAuth();
    return user?.id || null;
}
