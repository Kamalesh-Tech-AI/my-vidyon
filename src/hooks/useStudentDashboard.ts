import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useERPRealtime } from './useERPRealtime';
import { calculateWorkingDays, calculateAttendancePercentage } from '@/utils/attendanceUtils';

interface StudentDashboardStats {
    totalAssignments: number;
    pendingAssignments: number;
    attendancePercentage: string;
    averageGrade: string;
    upcomingEvents: number;
    pendingFees: number;
}

interface Assignment {
    id: string;
    title: string;
    subject: string;
    dueDate: string;
    status: 'pending' | 'submitted' | 'graded';
}

interface AttendanceRecord {
    date: string;
    status: 'present' | 'absent' | 'late';
}

interface Grade {
    id: string;
    subject: string;
    marks: number;
    totalMarks: number;
    examType: string;
    date: string;
}

/**
 * OPTIMIZED WITH PROGRESSIVE LOADING
 * Separates critical data (stats, profile) from non-critical data (assignments, grades)
 * Critical data loads first for instant UI, non-critical loads in background
 */
export function useStudentDashboard(studentId?: string, institutionId?: string) {
    // Real-time subscriptions
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

    // CRITICAL DATA: Load first for instant stats display
    const { data: criticalData, isLoading: criticalLoading } = useQuery({
        queryKey: ['student-dashboard-critical', studentId, instUuid],
        queryFn: async () => {
            if (!studentId || !instUuid) return null;

            const [attendanceStats, feeStatus, upcomingEventsCount, classDetails] = await Promise.all([
                // Attendance percentage (count only, fast)
                supabase.from('student_attendance')
                    .select('*', { count: 'exact', head: true })
                    .eq('student_id', studentId)
                    .eq('status', 'present')
                    .then(async (r) => {
                        const presentCount = r.count || 0;
                        const totalRes = await supabase.from('student_attendance')
                            .select('*', { count: 'exact', head: true })
                            .eq('student_id', studentId);
                        const totalDays = totalRes.count || 1;
                        return {
                            presentCount,
                            totalDays,
                            percentage: ((presentCount / totalDays) * 100).toFixed(1)
                        };
                    }),

                // Fee status (quick summary)
                supabase.from('fee_payments')
                    .select('amount, status')
                    .eq('student_id', studentId)
                    .then(r => {
                        const total = r.data?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
                        const paid = r.data?.filter(f => f.status === 'paid').reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
                        return { total, paid, pending: total - paid };
                    }),

                // Upcoming events count (fast)
                supabase.from('academic_events')
                    .select('id', { count: 'exact', head: true })
                    .eq('institution_id', institutionId!)
                    .gte('event_date', new Date().toISOString().split('T')[0])
                    .then(r => r.count || 0),

                // Class details (needed for subjects)
                supabase.from('students')
                    .select('class_name, section')
                    .eq('id', studentId)
                    .single()
                    .then(async (studentRes) => {
                        if (!studentRes.data) return null;
                        const classRes = await supabase.from('classes')
                            .select('id, name')
                            .eq('name', studentRes.data.class_name)
                            .eq('institution_id', instUuid)
                            .contains('sections', [studentRes.data.section])
                            .maybeSingle();
                        return classRes.data ? {
                            classId: classRes.data.id,
                            className: studentRes.data.class_name,
                            section: studentRes.data.section
                        } : null;
                    }),
            ]);

            return {
                attendanceStats,
                feeStatus,
                upcomingEventsCount,
                classDetails,
            };
        },
        enabled: !!studentId && !!instUuid,
        staleTime: 1000 * 60, // Cache for 1 minute
    });

    // NON-CRITICAL DATA: Load after critical data for progressive experience
    const { data: nonCriticalData, isLoading: nonCriticalLoading } = useQuery({
        queryKey: ['student-dashboard-noncritical', studentId, instUuid],
        queryFn: async () => {
            if (!studentId || !instUuid) return null;

            const [assignments, grades, attendanceRecords, subjects] = await Promise.all([
                // Assignments
                supabase.from('assignments')
                    .select('id, title, subject, due_date, assignment_submissions(id, status)')
                    .eq('institution_id', instUuid)
                    .order('due_date', { ascending: true })
                    .limit(10) // Limit for performance
                    .then(r => (r.data || []).map((a: any) => ({
                        id: a.id,
                        title: a.title,
                        subject: a.subject,
                        dueDate: a.due_date,
                        status: a.assignment_submissions?.[0]?.status || 'pending',
                    }))),

                // Grades
                supabase.from('grades')
                    .select('id, subject, marks, total_marks, exam_type, date')
                    .eq('student_id', studentId)
                    .eq('institution_id', instUuid)
                    .order('date', { ascending: false })
                    .limit(20) // Limit for performance
                    .then(r => (r.data || []).map((g: any) => ({
                        id: g.id,
                        subject: g.subject,
                        marks: g.marks,
                        totalMarks: g.total_marks,
                        examType: g.exam_type,
                        date: g.date,
                    }))),

                // Recent attendance records (last 30 days)
                supabase.from('student_attendance')
                    .select('attendance_date, status')
                    .eq('student_id', studentId)
                    .order('attendance_date', { ascending: false })
                    .limit(30)
                    .then(r => (r.data || []).map((rec: any) => ({
                        date: rec.attendance_date,
                        status: rec.status,
                    }))),

                // Subjects
                criticalData?.classDetails
                    ? supabase.from('class_subjects')
                        .select('subject_name, teacher_name')
                        .eq('class_id', criticalData.classDetails.classId)
                        .then(r => r.data || [])
                    : Promise.resolve([]),
            ]);

            return {
                assignments,
                grades,
                attendanceRecords,
                subjects,
            };
        },
        enabled: !!studentId && !!instUuid && !!criticalData, // Wait for critical data
        staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    });

    // Calculate comprehensive stats
    const stats: StudentDashboardStats = {
        attendancePercentage: criticalData?.attendanceStats?.percentage || '0',
        totalAssignments: nonCriticalData?.assignments?.length || 0,
        pendingAssignments: nonCriticalData?.assignments?.filter(a => a.status === 'pending').length || 0,
        averageGrade: nonCriticalData?.grades?.length
            ? ((nonCriticalData.grades.reduce((sum, g) => sum + (g.marks / g.totalMarks) * 100, 0) / nonCriticalData.grades.length)).toFixed(1)
            : '0',
        upcomingEvents: criticalData?.upcomingEventsCount || 0,
        pendingFees: criticalData?.feeStatus?.pending || 0,
    };

    return {
        // Critical data available immediately
        stats,
        classDetails: criticalData?.classDetails || null,

        // Non-critical data loads progressively
        assignments: nonCriticalData?.assignments || [],
        grades: nonCriticalData?.grades || [],
        attendanceRecords: nonCriticalData?.attendanceRecords || [],
        subjects: nonCriticalData?.subjects || [],

        // Loading states
        isLoadingCritical: criticalLoading,
        isLoadingNonCritical: nonCriticalLoading,
        isLoading: criticalLoading || nonCriticalLoading,

        // Granular ready states
        statsReady: !!criticalData && !criticalLoading,
        detailsReady: !!nonCriticalData && !nonCriticalLoading,
    };
}
