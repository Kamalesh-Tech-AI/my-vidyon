import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useERPRealtime } from './useERPRealtime';

interface DashboardStats {
    totalStudents: number;
    myStudents: number;
    activeSubjects: number;
    todayClasses: number;
    pendingReviews: number;
    avgAttendance: string;
}

interface TodaySchedule {
    time: string;
    subject: string;
    class: string;
    section: string;
    room: string;
}

/**
 * OPTIMIZED: Custom hook for faculty dashboard data with parallel queries
 * Fetches all data in parallel for faster loading
 */
export function useFacultyDashboard(facultyId?: string, institutionId?: string) {
    // Real-time subscriptions
    useERPRealtime(institutionId);

    // OPTIMIZED: Fetch all dashboard data in parallel
    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['faculty-dashboard-all', facultyId, institutionId],
        queryFn: async () => {
            if (!facultyId || !institutionId) return null;

            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const todayDate = new Date().toISOString().split('T')[0];

            // Execute all queries in parallel
            const [
                totalStudentsRes,
                facultyAssignment,
                assignedSubjects,
                todaySchedule,
                todayAttendance
            ] = await Promise.all([
                // Total students count
                supabase.from('students')
                    .select('id', { count: 'exact', head: true })
                    .eq('institution_id', institutionId),

                // Faculty's class assignment
                supabase.from('faculty_subjects')
                    .select('section, classes:class_id(name)')
                    .eq('faculty_profile_id', facultyId)
                    .eq('assignment_type', 'class_teacher')
                    .maybeSingle(),

                // Assigned subjects
                supabase.from('faculty_subjects')
                    .select(`
                        id, subject_id, class_id, section,
                        subjects:subject_id(id, name),
                        classes:class_id(id, name)
                    `)
                    .eq('faculty_profile_id', facultyId)
                    .eq('assignment_type', 'subject_staff'),

                // Today's schedule
                supabase.from('timetable_slots')
                    .select(`
                        start_time, end_time, room_number,
                        subjects:subject_id(name),
                        timetable_configs:config_id(
                            classes:class_id(name),
                            section
                        )
                    `)
                    .eq('faculty_id', facultyId)
                    .eq('day_of_week', today)
                    .eq('is_break', false)
                    .order('period_index'),

                // Today's attendance count
                supabase.from('student_attendance')
                    .select('id', { count: 'exact', head: true })
                    .eq('institution_id', institutionId)
                    .eq('attendance_date', todayDate)
                    .eq('status', 'present')
            ]);

            // Get my students count and pending reviews
            let myStudents = 0;
            let pendingReviews = 0;

            if (facultyAssignment.data?.classes) {
                const className = (facultyAssignment.data.classes as any)?.name;
                const section = facultyAssignment.data.section || 'A';

                if (className) {
                    // Get students in faculty's class
                    const [studentsRes, leaveRequestsRes] = await Promise.all([
                        supabase.from('students')
                            .select('id', { count: 'exact', head: true })
                            .eq('class_name', className)
                            .eq('section', section),

                        // Get students for leave requests
                        supabase.from('students')
                            .select('id')
                            .eq('class_name', className)
                            .eq('section', section)
                    ]);

                    myStudents = studentsRes.count || 0;

                    // Count pending leaves for these students
                    if (leaveRequestsRes.data?.length) {
                        const studentIds = leaveRequestsRes.data.map(s => s.id);
                        const leavesRes = await supabase.from('leave_requests')
                            .select('id', { count: 'exact', head: true })
                            .in('student_id', studentIds)
                            .eq('status', 'Pending');

                        pendingReviews = leavesRes.count || 0;
                    }
                }
            }

            // Process assigned subjects
            const subjects = (assignedSubjects.data || []).map((item: any) => ({
                id: item.id,
                subjectId: item.subject_id,
                subjectName: item.subjects?.name || 'Unknown',
                classId: item.class_id,
                className: item.classes?.name || 'Unknown',
                section: item.section,
            }));

            // Process today's schedule
            const schedule = (todaySchedule.data || []).map((slot: any) => ({
                time: `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`,
                subject: slot.subjects?.name || 'Unknown',
                class: slot.timetable_configs?.classes?.name || 'Unknown',
                section: slot.timetable_configs?.section || 'A',
                room: slot.room_number || 'TBA',
            })) as TodaySchedule[];

            // Calculate stats
            const totalStudents = totalStudentsRes.count || 0;
            const todayAttendanceCount = todayAttendance.count || 0;

            const stats: DashboardStats = {
                totalStudents,
                myStudents,
                activeSubjects: subjects.length,
                todayClasses: schedule.length,
                pendingReviews,
                avgAttendance: totalStudents > 0
                    ? `${Math.round((todayAttendanceCount / totalStudents) * 100)}%`
                    : '0%',
            };

            return {
                stats,
                assignedSubjects: subjects,
                todaySchedule: schedule,
            };
        },
        enabled: !!facultyId && !!institutionId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    return {
        stats: dashboardData?.stats || {
            totalStudents: 0,
            myStudents: 0,
            activeSubjects: 0,
            todayClasses: 0,
            pendingReviews: 0,
            avgAttendance: '0%',
        },
        assignedSubjects: dashboardData?.assignedSubjects || [],
        todaySchedule: dashboardData?.todaySchedule || [],
        isLoading,
    };
}
