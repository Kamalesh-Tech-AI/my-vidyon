import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocketContext } from '@/context/WebSocketContext';

export type NotificationType =
    | 'assignment'
    | 'attendance'
    | 'leave'
    | 'announcement'
    | 'exam'
    | 'fees'
    | 'event'
    | 'timetable'
    | 'info'
    | 'warning'
    | 'success'
    | 'error';

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    date: string; // Display string (e.g., "2 hours ago")
    rawDate: string; // ISO string for sorting
    read: boolean;
    priority?: 'high' | 'normal' | 'low';
    actionUrl?: string;
    source: 'notification' | 'calendar' | 'system';
}

export function useNotifications() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { subscribeToTable } = useWebSocketContext();

    const { data: notifications = [], isLoading: loading } = useQuery({
        queryKey: ['aggregated-notifications', user?.id],
        queryFn: async () => {
            if (!user?.institutionId) return [];

            // 1. Fetch Personal Notifications
            const { data: userNotifs, error: notifError } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (notifError) throw notifError;

            // 2. Fetch Academic Events (Broadcast)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: events, error: eventError } = await supabase
                .from('academic_events')
                .select('*')
                .eq('institution_id', user.institutionId)
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: false });

            if (eventError) throw eventError;

            // Transform Personal Notifications
            const formattedUserNotifs: NotificationItem[] = (userNotifs || []).map(n => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: (n.type as NotificationType) || 'info',
                date: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }),
                rawDate: n.created_at,
                read: n.read,
                priority: 'normal',
                source: 'notification',
                actionUrl: n.action_url
            }));

            // Transform Academic Events
            const formattedEvents: NotificationItem[] = (events || []).map(e => ({
                id: `event-${e.id}`, // distinct ID prefix
                title: `New Event: ${e.title}`,
                message: `${e.description || e.title} on ${new Date(e.start_date).toLocaleDateString()}`,
                type: 'event',
                date: formatDistanceToNow(new Date(e.created_at || e.start_date), { addSuffix: true }),
                rawDate: e.created_at || e.start_date,
                read: false,
                priority: 'normal',
                source: 'calendar',
                actionUrl: `/${user.role}/calendar`
            }));

            // Merge and Sort
            return [...formattedUserNotifs, ...formattedEvents].sort((a, b) =>
                new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
            );
        },
        enabled: !!user?.institutionId && !!user?.id
    });

    // Real-time subscriptions
    useEffect(() => {
        if (!user?.institutionId || !user?.id) return;

        // Subscribe to Notifications table
        // We only care about INSERT/UPDATE for the current user
        // But RLS should handle the filtering if we subscribe to `notifications` but usually we need a filter in the channel if RLS isn't enhancing realtime stream automatically
        // supabase realtime respects RLS if configured with "broadcast" but typically we use filter.
        // User ID filter: `user_id=eq.${user.id}`
        const unsubNotifications = subscribeToTable(
            'notifications',
            (payload) => {
                // Invalidate query to refetch/re-merge
                console.log('Realtime notification update:', payload);
                queryClient.invalidateQueries({ queryKey: ['aggregated-notifications'] });
            },
            { filter: `user_id=eq.${user.id}` }
        );

        // Subscribe to Academic Events
        // Filter by institution_id
        const unsubEvents = subscribeToTable(
            'academic_events',
            (payload) => {
                console.log('Realtime event update:', payload);
                queryClient.invalidateQueries({ queryKey: ['aggregated-notifications'] });
            },
            { filter: `institution_id=eq.${user.institutionId}` }
        );

        return () => {
            unsubNotifications();
            unsubEvents();
        };
    }, [user?.institutionId, user?.id, subscribeToTable, queryClient]);

    return { notifications, loading };
}
