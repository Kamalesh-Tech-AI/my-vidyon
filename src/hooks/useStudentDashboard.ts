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
 * OPTIMIZED: Custom hook for student dashboard data with parallel queries
 * Fetches all data in parallel for faster loading
 */
export function useStudentDashboard(studentId?: string, institutionId?: string) {
    // Real-time subscriptions
    useERPRealtime(institutionId);

    // Resolve institution UUID
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

    // OPTIMIZED: Fetch all dashboard data in parallel
    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['student-dashboard-all', studentId, instUuid],
        queryFn: async () => {
            if (!studentId || !instUuid) return null;

            // Execute all queries in parallel
            const [
                institutionSettings,
                holidays,
                classDetails,
                assignments,
                attendanceRecords,
                attendanceStats,
                grades,
                feeStatus,
                upcomingEvents,
                subjects
            ] = await Promise.all([
                // Institution settings
                supabase.from('institutions').select('*').eq('id', instUuid).single().then(r => r.data),

                // Holidays
                supabase.from('academic_events')
                    .select('start_date, end_date')
                    .eq('institution_id', institutionId!)
                    .eq('event_type', 'holiday')
                    .then(r => {
                        const dates: string[] = [];
                        r.data?.forEach(h => {
                            const start = new Date(h.start_date);
                            const end = new Date(h.end_date);
                            const current = new Date(start);
                            while (current <= end) {
                                dates.push(current.toISOString().split('T')[0]);
                                current.setDate(current.getDate() + 1);
                            }
                        });
                        return Array.from(new Set(dates));
                    }),

                // Class details
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

                // Assignments (select only needed fields)
                supabase.from('assignments')
                    .select('id, title, subject, due_date, assignment_submissions(id, status)')
                    .eq('institution_id', instUuid)
                    .order('due_date', { ascending: true })
                    .then(r => (r.data || []).map((a: any) => ({
                        id: a.id,
                        title: a.title,
                        subject: a.subject,
                        dueDate: a.due_date,
                        status: a.assignment_submissions?.[0]?.status || 'pending',
                    }))),

                // Attendance records (last 30 days only)
                supabase.from('student_attendance')
                    .select('attendance_date, status')
                    .eq('student_id', studentId)
                    .order('attendance_date', { ascending: false })
                    .limit(30)
                    .then(r => (r.data || []).map((rec: any) => ({
                        date: rec.attendance_date,
                        status: rec.status,
                    }))),

                // Attendance stats (count only)
                supabase.from('student_attendance')
                    .select('*', { count: 'exact', head: true })
                    .eq('student_id', studentId)
                    .eq('status', 'present')
                    .then(r => ({ presentCount: r.count || 0 })),

                // Grades (select only needed fields)
                supabase.from('grades')
                    .select('id, subject, marks, total_marks, exam_type, date')
                    .eq('student_id', studentId)
                    .eq('institution_id', instUuid)
                    .order('date', { ascending: false })
                    .then(r => (r.data || []).map((g: any) => ({
                        id: g.id,
                        subject: g.subject,
                        marks: g.marks,
                        totalMarks: g.total_marks,
                        examType: g.exam_type,
                        date: g.date,
                    }))),

                // Fee status
                supabase.from('fee_payments')
                    .select('amount, status')
                    .eq('student_id', studentId)
                    .then(r => {
                        const total = r.data?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
                        const paid = r.data?.filter(f => f.status === 'paid').reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
                        return { total, paid, pending: total - paid };
                    }),

                // Upcoming events (count only)
                supabase.from('academic_events')
                    .select('id', { count: 'exact', head: true })
                    .eq('institution_id', institutionId!)
                    .gte('event_date', new Date().toISOString().split('T')[0])
                    .then(r => r.count || 0),

                // Subjects
                supabase.from('students')
                    .select('class_name, section')
                    .eq('id', studentId)
                    .single()
                    .then(async (studentRes) => {
                        if (!studentRes.data) return { subjects: [], classTeacher: 'Not Assigned' };

                        const classRes = await supabase.from('classes')
                            .select('id, name, groups!inner(institution_id)')
                            .eq('name', studentRes.data.class_name)
                            .eq('groups.institution_id', institutionId!)
                            .contains('sections', [studentRes.data.section])
                            .maybeSingle();

                        if (!classRes.data) return { subjects: [], classTeacher: 'Not Assigned' };

                        const facultyRes = await supabase.from('faculty_subjects')
                            .select(`
                                subject_id, faculty_profile_id, assignment_type,
                                subjects:subject_id(id, name, code),
                                profiles:faculty_profile_id(id, full_name, phone)
                            `)
                            .eq('class_id', classRes.data.id)
                            .eq('institution_id', institutionId!)
                            .or(`section.ilike.${studentRes.data.section?.trim() || ''},section.is.null,section.eq.""`);

                        const subjects = (facultyRes.data || [])
                            .filter((a: any) => a.subjects && a.assignment_type === 'subject_staff')
                            .map((a: any) => {
                                const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
                                return {
                                    id: a.subjects.id,
                                    title: a.subjects.name,
                                    code: a.subjects.code || 'N/A',
                                    instructor: profile?.full_name || 'Not Assigned',
                                    instructorPhone: profile?.phone?.trim() || null,
                                    progress: 0,
                                    students: 0,
                                    status: 'active' as const
                                };
                            });

                        const teacherEntry = (facultyRes.data || []).find((a: any) => a.assignment_type === 'class_teacher');
                        const teacherProfile = teacherEntry ? (Array.isArray(teacherEntry.profiles) ? teacherEntry.profiles[0] : teacherEntry.profiles) : null;

                        return {
                            subjects,
                            classTeacher: teacherProfile?.full_name || 'Not Assigned'
                        };
                    })
            ]);

            // Calculate working days
            const workingDays = institutionSettings?.academic_year_start
                ? calculateWorkingDays(
                    new Date(institutionSettings.academic_year_start),
                    new Date(),
                    holidays,
                    true,
                    [],
                    []
                )
                : 0;

            // Calculate stats
            const stats: StudentDashboardStats = {
                totalAssignments: assignments.length,
                pendingAssignments: assignments.filter(a => a.status === 'pending').length,
                attendancePercentage: calculateAttendancePercentage(attendanceStats.presentCount, workingDays),
                averageGrade: grades.length > 0
                    ? `${Math.round(grades.reduce((sum, g) => sum + (g.marks / g.totalMarks) * 100, 0) / grades.length)}%`
                    : 'N/A',
                upcomingEvents,
                pendingFees: feeStatus.pending,
            };

            return {
                stats,
                assignments,
                attendanceRecords,
                grades,
                feeStatus,
                subjects: subjects.subjects,
                classTeacher: subjects.classTeacher,
            };
        },
        enabled: !!studentId && !!instUuid,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    return {
        stats: dashboardData?.stats || {
            totalAssignments: 0,
            pendingAssignments: 0,
            attendancePercentage: '0%',
            averageGrade: 'N/A',
            upcomingEvents: 0,
            pendingFees: 0,
        },
        assignments: dashboardData?.assignments || [],
        attendanceRecords: dashboardData?.attendanceRecords || [],
        grades: dashboardData?.grades || [],
        feeStatus: dashboardData?.feeStatus || { total: 0, paid: 0, pending: 0 },
        subjects: dashboardData?.subjects || [],
        classTeacher: dashboardData?.classTeacher || 'Not Assigned',
        isLoading,
    };
}
