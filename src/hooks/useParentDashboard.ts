import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * OPTIMIZED WITH PROGRESSIVE LOADING
 * Parent dashboard with child stats first, detailed academic data second
 */
export function useParentDashboard(parentId?: string, institutionId?: string) {
    // Resolve institution UUID (cached for 24h)
    const { data: instUuid } = useQuery({
        queryKey: ['institution-uuid', institutionId],
        queryFn: async () => {
            if (!institutionId) return null;
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(institutionId)) {
                return institutionId;
            }
            const { data } = await supabase
                .from('institutions')
                .select('id')
                .eq('institution_id', institutionId)
                .maybeSingle();
            return data?.id || null;
        },
        enabled: !!institutionId,
        staleTime: 24 * 60 * 60 * 1000,
    });

    // CRITICAL DATA: Children and basic stats
    const { data: criticalData, isLoading: criticalLoading } = useQuery({
        queryKey: ['parent-dashboard-critical', parentId, instUuid],
        queryFn: async () => {
            if (!parentId || !instUuid) return null;

            // Get children first
            const { data: children } = await supabase
                .from('students')
                .select('id, name, class_name, section')
                .eq('parent_id', parentId)
                .eq('institution_id', instUuid);

            if (!children || children.length === 0) {
                return { children: [], stats: [] };
            }

            // Get quick stats for each child in parallel
            const statsPromises = children.map(async (child) => {
                const [attendanceCount, pendingAssignments, feeStatus] = await Promise.all([
                    // Attendance count
                    supabase.from('student_attendance')
                        .select('*', { count: 'exact', head: true })
                        .eq('student_id', child.id)
                        .eq('status', 'present')
                        .then(async (r) => {
                            const present = r.count || 0;
                            const total = await supabase.from('student_attendance')
                                .select('*', { count: 'exact', head: true })
                                .eq('student_id', child.id);
                            return ((present / (total.count || 1)) * 100).toFixed(1);
                        }),

                    // Pending assignments count
                    supabase.from('assignment_submissions')
                        .select('id', { count: 'exact', head: true })
                        .eq('student_id', child.id)
                        .eq('status', 'pending')
                        .then(r => r.count || 0),

                    // Fee status
                    supabase.from('fee_payments')
                        .select('amount, status')
                        .eq('student_id', child.id)
                        .then(r => {
                            const total = r.data?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
                            const paid = r.data?.filter(f => f.status === 'paid').reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
                            return { total, paid, pending: total - paid };
                        }),
                ]);

                return {
                    childId: child.id,
                    childName: child.name,
                    attendance: attendanceCount,
                    pendingAssignments,
                    feeStatus,
                };
            });

            const stats = await Promise.all(statsPromises);

            return { children, stats };
        },
        enabled: !!parentId && !!instUuid,
        staleTime: 1000 * 60,
    });

    // NON-CRITICAL DATA: Detailed academic records
    const { data: nonCriticalData, isLoading: nonCriticalLoading } = useQuery({
        queryKey: ['parent-dashboard-noncritical', parentId, criticalData?.children],
        queryFn: async () => {
            if (!criticalData?.children || criticalData.children.length === 0) return null;

            const childIds = criticalData.children.map(c => c.id);

            const [grades, upcomingEvents, recentNotifications] = await Promise.all([
                // Recent grades for all children
                supabase.from('grades')
                    .select('student_id, subject, marks, total_marks, date')
                    .in('student_id', childIds)
                    .order('date', { ascending: false })
                    .limit(20)
                    .then(r => r.data || []),

                // Upcoming events
                supabase.from('academic_events')
                    .select('id, title, event_date, event_type')
                    .eq('institution_id', institutionId!)
                    .gte('event_date', new Date().toISOString().split('T')[0])
                    .order('event_date', { ascending: true })
                    .limit(10)
                    .then(r => r.data || []),

                // Recent notifications
                supabase.from('notifications')
                    .select('id, title, message, created_at')
                    .in('user_id', childIds)
                    .order('created_at', { ascending: false })
                    .limit(10)
                    .then(r => r.data || []),
            ]);

            return { grades, upcomingEvents, recentNotifications };
        },
        enabled: !!criticalData?.children && criticalData.children.length > 0,
        staleTime: 1000 * 60 * 2,
    });

    return {
        children: criticalData?.children || [],
        childrenStats: criticalData?.stats || [],
        grades: nonCriticalData?.grades || [],
        upcomingEvents: nonCriticalData?.upcomingEvents || [],
        recentNotifications: nonCriticalData?.recentNotifications || [],
        isLoadingCritical: criticalLoading,
        isLoadingNonCritical: nonCriticalLoading,
        isLoading: criticalLoading || nonCriticalLoading,
        statsReady: !!criticalData && !criticalLoading,
        detailsReady: !!nonCriticalData && !nonCriticalLoading,
    };
}
