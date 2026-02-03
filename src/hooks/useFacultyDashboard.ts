import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useERPRealtime } from './useERPRealtime';

/**
 * OPTIMIZED WITH PROGRESSIVE LOADING
 * Separates critical data (stats, basic info) from non-critical data (detailed lists)
 */
export function useFacultyDashboard(facultyId?: string, institutionId?: string) {
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

    // CRITICAL DATA: Load first for instant stats
    const { data: criticalData, isLoading: criticalLoading } = useQuery({
        queryKey: ['faculty-dashboard-critical', facultyId, instUuid],
        queryFn: async () => {
            if (!facultyId || !instUuid) return null;

            const [classCounts, studentCounts, upcomingClassesCount] = await Promise.all([
                // Class count
                supabase.from('classes')
                    .select('id', { count: 'exact', head: true })
                    .eq('class_teacher_id', facultyId)
                    .then(r => r.count || 0),

                // Total students count
                supabase.from('students')
                    .select('id', { count: 'exact', head: true })
                    .eq('institution_id', instUuid)
                    .then(r => r.count || 0),

                // Upcoming classes today
                supabase.from('timetable')
                    .select('id', { count: 'exact', head: true })
                    .eq('teacher_id', facultyId)
                    .eq('day', new Date().toLocaleDateString('en-US', { weekday: 'long' }))
                    .then(r => r.count || 0),
            ]);

            return {
                classCounts,
                studentCounts,
                upcomingClassesCount,
            };
        },
        enabled: !!facultyId && !!instUuid,
        staleTime: 1000 * 60,
    });

    // NON-CRITICAL DATA: Load progressively
    const { data: nonCriticalData, isLoading: nonCriticalLoading } = useQuery({
        queryKey: ['faculty-dashboard-noncritical', facultyId, instUuid],
        queryFn: async () => {
            if (!facultyId || !instUuid) return null;

            const [classes, assignments, recentAttendance, assignedSubjects] = await Promise.all([
                // Classes taught
                supabase.from('classes')
                    .select('id, name, sections')
                    .eq('class_teacher_id', facultyId)
                    .limit(10)
                    .then(r => r.data || []),

                // Recent assignments
                supabase.from('assignments')
                    .select('id, title, due_date, subject')
                    .eq('created_by', facultyId)
                    .order('created_at', { ascending: false })
                    .limit(10)
                    .then(r => r.data || []),

                // Recent attendance records
                supabase.from('teacher_attendance')
                    .select('attendance_date, status')
                    .eq('teacher_id', facultyId)
                    .order('attendance_date', { ascending: false })
                    .limit(30)
                    .then(r => r.data || []),

                // Assigned subjects with proper structure
                supabase.from('faculty_subjects')
                    .select(`
                        id, subject_id, class_id, section,
                        subjects:subject_id(id, name),
                        classes:class_id(id, name)
                    `)
                    .eq('faculty_profile_id', facultyId)
                    .eq('assignment_type', 'subject_staff')
                    .then(r => (r.data || []).map((item: any) => ({
                        id: item.id,
                        subjectId: item.subject_id,
                        subjectName: item.subjects?.name || 'Unknown',
                        classId: item.class_id,
                        className: item.classes?.name || 'Unknown',
                        section: item.section || 'A',
                    }))),
            ]);

            return { classes, assignments, recentAttendance, assignedSubjects };
        },
        enabled: !!facultyId && !!instUuid && !!criticalData,
        staleTime: 1000 * 60 * 2,
    });

    const stats = {
        totalClasses: criticalData?.classCounts || 0,
        totalStudents: criticalData?.studentCounts || 0,
        upcomingClasses: criticalData?.upcomingClassesCount || 0,
        totalAssignments: nonCriticalData?.assignments?.length || 0,
        // Additional properties expected by FacultyDashboard
        myStudents: 0, // TODO: Implement based on assigned classes
        activeSubjects: nonCriticalData?.classes?.length || 0,
        todayClasses: criticalData?.upcomingClassesCount || 0,
        avgAttendance: '0%', // TODO: Calculate from attendance data
        pendingReviews: 0, // TODO: Implement leave request count
    };

    return {
        stats,
        classes: nonCriticalData?.classes || [],
        assignments: nonCriticalData?.assignments || [],
        recentAttendance: nonCriticalData?.recentAttendance || [],
        // Properly structured assigned subjects
        assignedSubjects: nonCriticalData?.assignedSubjects || [],
        todaySchedule: [], // TODO: Implement schedule data
        isLoadingCritical: criticalLoading,
        isLoadingNonCritical: nonCriticalLoading,
        isLoading: criticalLoading || nonCriticalLoading,
        statsReady: !!criticalData && !criticalLoading,
        detailsReady: !!nonCriticalData && !nonCriticalLoading,
    };
}
