import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useERPRealtime } from './useERPRealtime';

/**
 * OPTIMIZED WITH PROGRESSIVE LOADING
 * Institution dashboard with critical statistics first, detailed data second
 */
export function useInstitutionDashboard(institutionId?: string) {
    useERPRealtime(institutionId);

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

    // CRITICAL DATA: Key metrics for instant display
    const { data: criticalData, isLoading: criticalLoading } = useQuery({
        queryKey: ['institution-dashboard-critical', instUuid],
        queryFn: async () => {
            if (!instUuid) return null;

            const [
                totalStudents,
                totalFaculty,
                totalClasses,
                activeAnnouncementsCount
            ] = await Promise.all([
                // Student count
                supabase.from('students')
                    .select('id', { count: 'exact', head: true })
                    .eq('institution_id', instUuid)
                    .then(r => r.count || 0),

                // Faculty count
                supabase.from('teachers')
                    .select('id', { count: 'exact', head: true })
                    .eq('institution_id', instUuid)
                    .then(r => r.count || 0),

                // Classes count
                supabase.from('classes')
                    .select('id', { count: 'exact', head: true })
                    .eq('institution_id', instUuid)
                    .then(r => r.count || 0),

                // Active announcements count
                supabase.from('announcements')
                    .select('id', { count: 'exact', head: true })
                    .eq('institution_id', institutionId!)
                    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                    .then(r => r.count || 0),
            ]);

            return {
                totalStudents,
                totalFaculty,
                totalClasses,
                activeAnnouncementsCount,
            };
        },
        enabled: !!instUuid,
        staleTime: 1000 * 60,
    });

    // NON-CRITICAL DATA: Detailed lists loaded progressively
    const { data: nonCriticalData, isLoading: nonCriticalLoading } = useQuery({
        queryKey: ['institution-dashboard-noncritical', instUuid],
        queryFn: async () => {
            if (!instUuid) return null;

            const [
                recentStudents,
                recentTeachers,
                upcomingEvents,
                feeCollections
            ] = await Promise.all([
                // Recent students (last 10)
                supabase.from('students')
                    .select('id, name, class_name, section, created_at')
                    .eq('institution_id', instUuid)
                    .order('created_at', { ascending: false })
                    .limit(10)
                    .then(r => r.data || []),

                // Recent teachers (last 10)
                supabase.from('teachers')
                    .select('id, name, subject, created_at')
                    .eq('institution_id', instUuid)
                    .order('created_at', { ascending: false })
                    .limit(10)
                    .then(r => r.data || []),

                // Upcoming events
                supabase.from('academic_events')
                    .select('id, title, event_date, event_type')
                    .eq('institution_id', institutionId!)
                    .gte('event_date', new Date().toISOString().split('T')[0])
                    .order('event_date', { ascending: true })
                    .limit(10)
                    .then(r => r.data || []),

                // Fee collections summary
                supabase.from('fee_payments')
                    .select('amount, status')
                    .eq('institution_id', instUuid)
                    .then(r => {
                        const total = r.data?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
                        const paid = r.data?.filter(f => f.status === 'paid').reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
                        return { total, paid, pending: total - paid };
                    }),
            ]);

            return {
                recentStudents,
                recentTeachers,
                upcomingEvents,
                feeCollections,
            };
        },
        enabled: !!instUuid && !!criticalData,
        staleTime: 1000 * 60 * 2,
    });

    const stats = {
        totalStudents: criticalData?.totalStudents || 0,
        totalFaculty: criticalData?.totalFaculty || 0,
        totalClasses: criticalData?.totalClasses || 0,
        activeAnnouncements: criticalData?.activeAnnouncementsCount || 0,
        totalFees: nonCriticalData?.feeCollections?.total || 0,
        collectedFees: nonCriticalData?.feeCollections?.paid || 0,
        pendingFees: nonCriticalData?.feeCollections?.pending || 0,
    };

    return {
        stats,
        recentStudents: nonCriticalData?.recentStudents || [],
        recentTeachers: nonCriticalData?.recentTeachers || [],
        upcomingEvents: nonCriticalData?.upcomingEvents || [],
        isLoadingCritical: criticalLoading,
        isLoadingNonCritical: nonCriticalLoading,
        isLoading: criticalLoading || nonCriticalLoading,
        statsReady: !!criticalData && !criticalLoading,
        detailsReady: !!nonCriticalData && !nonCriticalLoading,
    };
}
