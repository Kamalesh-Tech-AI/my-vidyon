import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
 * Custom hook for faculty dashboard data with real-time updates
 * Fetches:
 * - Student counts (total and in assigned classes)
 * - Assigned subjects
 * - Today's schedule
 * - Real-time updates for all metrics
 */
export function useFacultyDashboard(facultyId?: string, institutionId?: string) {
    const queryClient = useQueryClient();

    // 1. Total Students in Institution
    const { data: totalStudents = 0 } = useQuery({
        queryKey: ['faculty-total-students', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;

            const { count } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .eq('institution_id', institutionId);

            return count || 0;
        },
        enabled: !!institutionId,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    // 2. Students in Faculty's Assigned Classes
    const { data: myStudents = 0 } = useQuery({
        queryKey: ['faculty-my-students', facultyId],
        queryFn: async () => {
            if (!facultyId) return 0;

            // Get faculty's assigned class
            const { data: staffDetails } = await supabase
                .from('staff_details')
                .select('class_assigned, section_assigned')
                .eq('profile_id', facultyId)
                .single();

            if (!staffDetails?.class_assigned) return 0;

            // Count students in that class
            const { count } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .eq('class_name', staffDetails.class_assigned)
                .eq('section', staffDetails.section_assigned || 'A');

            return count || 0;
        },
        enabled: !!facultyId,
        staleTime: 2 * 60 * 1000,
    });

    // 3. Faculty's Assigned Subjects
    const { data: assignedSubjects = [] } = useQuery({
        queryKey: ['faculty-assigned-subjects', facultyId],
        queryFn: async () => {
            if (!facultyId) return [];

            const { data, error } = await supabase
                .from('faculty_subjects')
                .select(`
          *,
          subjects:subject_id (id, name),
          classes:class_id (id, name)
        `)
                .eq('faculty_profile_id', facultyId);

            if (error) throw error;

            return (data || []).map((item: any) => ({
                id: item.id,
                subjectId: item.subject_id,
                subjectName: item.subjects?.name || 'Unknown',
                classId: item.class_id,
                className: item.classes?.name || 'Unknown',
                section: item.section,
            }));
        },
        enabled: !!facultyId,
        staleTime: 2 * 60 * 1000,
    });

    // 4. Today's Schedule
    const { data: todaySchedule = [] } = useQuery({
        queryKey: ['faculty-today-schedule', facultyId],
        queryFn: async () => {
            if (!facultyId) return [];

            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

            const { data, error } = await supabase
                .from('timetable_slots')
                .select(`
          *,
          subjects:subject_id (name),
          timetable_configs:config_id (
            classes:class_id (name),
            section
          )
        `)
                .eq('faculty_id', facultyId)
                .eq('day_of_week', today)
                .eq('is_break', false)
                .order('period_index');

            if (error) throw error;

            return (data || []).map((slot: any) => ({
                time: `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`,
                subject: slot.subjects?.name || 'Unknown',
                class: slot.timetable_configs?.classes?.name || 'Unknown',
                section: slot.timetable_configs?.section || 'A',
                room: slot.room_number || 'TBA',
            })) as TodaySchedule[];
        },
        enabled: !!facultyId,
        staleTime: 30 * 1000, // 30 seconds for today's schedule
    });

    // 5. Today's Attendance Count
    const { data: todayAttendanceCount = 0 } = useQuery({
        queryKey: ['faculty-today-attendance', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const today = new Date().toISOString().split('T')[0];

            const { count } = await supabase
                .from('student_attendance')
                .select('id', { count: 'exact', head: true })
                .eq('institution_id', institutionId)
                .eq('attendance_date', today)
                .eq('status', 'present');

            return count || 0;
        },
        enabled: !!institutionId,
        staleTime: 30 * 1000,
    });

    // 6. Pending Leave Requests (For Faculty Assigned Classes)
    const { data: pendingReviews = 0 } = useQuery({
        queryKey: ['faculty-pending-leaves', facultyId],
        queryFn: async () => {
            if (!facultyId) return 0;

            // Get faculty's assigned class first
            const { data: staffDetails } = await supabase
                .from('staff_details')
                .select('class_assigned, section_assigned')
                .eq('profile_id', facultyId)
                .single();

            if (!staffDetails?.class_assigned) return 0;

            // Get students in this class
            const { data: students } = await supabase
                .from('students')
                .select('id')
                .eq('class_name', staffDetails.class_assigned)
                .eq('section', staffDetails.section_assigned || 'A');

            if (!students?.length) return 0;
            const studentIds = students.map(s => s.id);

            // Count pending leaves for these students
            const { count } = await supabase
                .from('leave_requests')
                .select('id', { count: 'exact', head: true })
                .in('student_id', studentIds)
                .eq('status', 'Pending');

            return count || 0;
        },
        enabled: !!facultyId,
        staleTime: 2 * 60 * 1000,
    });

    // 7. Aggregate Dashboard Stats
    const stats: DashboardStats = {
        totalStudents,
        myStudents,
        activeSubjects: assignedSubjects.length,
        todayClasses: todaySchedule.length,
        pendingReviews, // Now dynamic
        avgAttendance: totalStudents > 0
            ? `${Math.round((todayAttendanceCount / totalStudents) * 100)}%`
            : '0%',
    };

    // 8. Real-time Subscriptions
    useEffect(() => {
        if (!facultyId || !institutionId) return;

        const channel = supabase
            .channel('faculty-dashboard-realtime')
            // ... (previous student/subject/slots/staff subscriptions)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'students',
                    filter: `institution_id=eq.${institutionId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['faculty-total-students'] });
                    queryClient.invalidateQueries({ queryKey: ['faculty-my-students'] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'student_attendance',
                    filter: `institution_id=eq.${institutionId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['faculty-today-attendance'] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'staff_attendance',
                    filter: `institution_id=eq.${institutionId}`,
                },
                () => {
                    // Logic to refresh staff stats if needed
                }
            )
            // Subject assignments change
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'faculty_subjects',
                    filter: `faculty_profile_id=eq.${facultyId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['faculty-assigned-subjects'] });
                }
            )
            // Schedule changes
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'timetable_slots',
                    filter: `faculty_id=eq.${facultyId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['faculty-today-schedule'] });
                }
            )
            // Class assignment changes
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'staff_details',
                    filter: `profile_id=eq.${facultyId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['faculty-my-students'] });
                    // Also invalidate pending leaves as students might have changed
                    queryClient.invalidateQueries({ queryKey: ['faculty-pending-leaves'] });
                }
            )
            // New Leave Requests
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leave_requests',
                    // Note: Ideally we filter by student_id IN (...) but supabase realtime filters are simple.
                    // We can filter by institution if we had that column on leave_requests, or just listen to all and let invalidation handle it.
                    // Given leave_requests links to student -> institution, we can't easily filter by institution_id directly here unless we add it to the table.
                    // For now, we will listen to all leave_requests and invalidate. It's safe but slightly chatty.
                    // Improving: filter on UPDATE/INSERT where student_id is relevant? Hard to do in static filter string.
                    // We'll rely on global table events.
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['faculty-pending-leaves'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [facultyId, institutionId, queryClient]);

    return {
        stats,
        assignedSubjects,
        todaySchedule,
        isLoading: false, // All queries have defaults
    };
}
