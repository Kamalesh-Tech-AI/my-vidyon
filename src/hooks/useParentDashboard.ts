import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useERPRealtime } from './useERPRealtime';
import { calculateWorkingDays, calculateAttendancePercentage } from '@/utils/attendanceUtils';

interface Child {
    id: string;
    name: string;
    class: string;
    section: string;
    rollNumber: string;
    classId: string;
}

interface ParentDashboardStats {
    totalChildren: number;
    pendingLeaveRequests: number;
    upcomingEvents: number;
    totalPendingFees: number;
}

interface ChildAttendance {
    childId: string;
    childName: string;
    presentDays: number;
    totalDays: number;
    percentage: string;
}

interface LeaveRequest {
    id: string;
    childName: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

/**
 * Custom hook for parent dashboard data with real-time updates
 * Fetches:
 * - Children's data
 * - Attendance for all children
 * - Grades for all children
 * - Leave requests
 * - Fee payment status
 * - Real-time updates for all metrics
 */
export function useParentDashboard(parentId?: string, institutionId?: string) {
    const queryClient = useQueryClient();

    // 0. Resolve institution UUID from TEXT code if needed
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

    // 0.1 Fetch Institution Settings (Academic Year)
    const { data: institutionSettings } = useQuery({
        queryKey: ['institution-settings-full', instUuid],
        queryFn: async () => {
            if (!instUuid) return null;
            const { data } = await supabase
                .from('institutions')
                .select('*')
                .eq('id', instUuid)
                .single();
            return data;
        },
        enabled: !!instUuid,
        staleTime: 60 * 60 * 1000,
    });

    // 0.2 Fetch Holidays for attendance calculation
    const { data: holidays = [] } = useQuery({
        queryKey: ['institution-holidays', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const { data } = await supabase
                .from('academic_events')
                .select('start_date, end_date')
                .eq('institution_id', institutionId)
                .eq('event_type', 'holiday');

            const dates: string[] = [];
            data?.forEach(h => {
                const start = new Date(h.start_date);
                const end = new Date(h.end_date);
                const current = new Date(start);
                while (current <= end) {
                    dates.push(current.toISOString().split('T')[0]);
                    current.setDate(current.getDate() + 1);
                }
            });
            return Array.from(new Set(dates));
        },
        enabled: !!instUuid,
        staleTime: 60 * 60 * 1000,
    });

    // 0.5 Fetch Announcements (Holiday Keywords)
    const { data: announcementHolidays = [] } = useQuery({
        queryKey: ['announcement-holidays', instUuid],
        queryFn: async () => {
            if (!instUuid) return [];

            const { data } = await supabase
                .from('announcements')
                .select('title, content, published_at')
                .eq('institution_id', instUuid)
                .or('title.ilike.%holiday%,title.ilike.%leave%,title.ilike.%closed%,title.ilike.%rain%,content.ilike.%holiday%');

            return (data || []).map(a => a.published_at.split('T')[0]);
        },
        enabled: !!instUuid,
        staleTime: 5 * 60 * 1000,
    });

    // 1. Fetch Children (Robust Lookup)
    const { data: children = [] } = useQuery({
        queryKey: ['parent-children', parentId],
        queryFn: async () => {
            if (!parentId) return [];

            // A. Get Parent ID from profile mapping
            const { data: parentRecord } = await supabase
                .from('parents')
                .select('id')
                .eq('profile_id', parentId)
                .single();

            // B. Fetch via Join Table (student_parents)
            let studentIds: string[] = [];
            if (parentRecord) {
                const { data: links } = await supabase
                    .from('student_parents')
                    .select('student_id')
                    .eq('parent_id', parentRecord.id);
                if (links) studentIds = links.map(l => l.student_id);
            }

            // C. Fetch via Direct Column (students.parent_id)
            const { data: directStudents } = await supabase
                .from('students')
                .select('id')
                .eq('parent_id', parentId);

            if (directStudents) {
                const directIds = directStudents.map(s => s.id);
                studentIds = Array.from(new Set([...studentIds, ...directIds]));
            }

            if (studentIds.length === 0) return [];

            // D. Get final details
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .in('id', studentIds);

            if (error) throw error;

            return (data || []).map((child: any) => ({
                id: child.id,
                name: child.full_name || child.name || 'Unknown Student',
                class: child.class_name || 'N/A',
                section: child.section || 'A',
                rollNumber: child.register_number || child.roll_number || 'N/A',
                classId: child.class_id,
            })) as Child[];
        },
        enabled: !!parentId,
        staleTime: 5 * 60 * 1000,
    });

    const childIds = children.map(c => c.id);
    const uniqueClassIds = Array.from(new Set(children.map(c => c.classId).filter(id => !!id)));

    // 5. Fetch Special Classes (Pre-fetch for attendance calc)
    // Moved up to be available for attendance calculation
    const { data: specialClasses = [] } = useQuery({
        queryKey: ['parent-special-classes', uniqueClassIds],
        queryFn: async () => {
            if (uniqueClassIds.length === 0) return [];

            const { data, error } = await supabase
                .from('special_timetable_slots')
                .select(`
                    *,
                    subjects:subject_id (name),
                    profiles:faculty_id (full_name),
                    classes (name)
                `)
                .in('class_id', uniqueClassIds)
                .gte('event_date', new Date().toISOString().split('T')[0])
                .order('event_date');

            if (error) throw error;
            return data || [];
        },
        enabled: uniqueClassIds.length > 0,
    });

    // Also fetch ALL special dates for these classes (past included) for attendance calc
    const { data: allSpecialDates = [] } = useQuery({
        queryKey: ['parent-all-special-dates', uniqueClassIds],
        queryFn: async () => {
            if (uniqueClassIds.length === 0) return [];
            const { data } = await supabase
                .from('special_timetable_slots')
                .select('class_id, event_date') // Need class_id to map to student
                .in('class_id', uniqueClassIds);
            return data || [];
        },
        enabled: uniqueClassIds.length > 0
    });

    // 2. Fetch Attendance for all children
    const { data: childrenAttendance = [] } = useQuery({
        queryKey: ['parent-children-attendance', childIds, institutionSettings?.academic_year_start, allSpecialDates.length, announcementHolidays.length],
        queryFn: async () => {
            if (childIds.length === 0 || !institutionSettings?.academic_year_start) return [];

            const attendancePromises = children.map(async (child) => {
                // Determine Child's Specific Working Days
                const childSpecialDates = allSpecialDates
                    .filter(sd => sd.class_id === child.classId)
                    .map(sd => sd.event_date);

                const workingDays = calculateWorkingDays(
                    new Date(institutionSettings.academic_year_start),
                    new Date(),
                    holidays,
                    true,
                    childSpecialDates,
                    announcementHolidays
                );

                const { count, error } = await supabase
                    .from('student_attendance')
                    .select('*', { count: 'exact', head: true })
                    .eq('student_id', child.id)
                    .eq('status', 'present')
                    .gte('attendance_date', institutionSettings.academic_year_start);

                if (error) {
                    console.error(`Error fetching attendance for ${child.id}:`, error);
                    return { childId: child.id, childName: child.name, presentDays: 0, totalDays: workingDays, percentage: '0%' };
                }

                const presentDays = count || 0;

                return {
                    childId: child.id,
                    childName: child.name,
                    presentDays,
                    totalDays: workingDays,
                    percentage: calculateAttendancePercentage(presentDays, workingDays),
                };
            });

            return Promise.all(attendancePromises) as Promise<ChildAttendance[]>;
        },
        enabled: childIds.length > 0 && !!institutionSettings?.academic_year_start,
        staleTime: 2 * 60 * 1000,
    });

    // 3. Fetch Leave Requests (Unified Lookup)
    const { data: leaveRequests = [] } = useQuery({
        queryKey: ['parent-leave-requests', childIds],
        queryFn: async () => {
            if (childIds.length === 0) return [];

            // Try student_leave_requests first (new table)
            const { data, error } = await supabase
                .from('student_leave_requests')
                .select(`
                    *,
                    students:student_id (full_name, name)
                `)
                .in('student_id', childIds)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.warn('Error fetching from student_leave_requests, trying leave_requests fallback:', error);

                // Fallback to old table if needed
                const { data: oldData, error: oldError } = await supabase
                    .from('leave_requests')
                    .select(`*, students:student_id (full_name, name)`)
                    .in('student_id', childIds)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (oldError) throw oldError;

                return (oldData || []).map((request: any) => ({
                    id: request.id,
                    childName: request.students?.full_name || request.students?.name || 'Unknown',
                    startDate: request.start_date || request.from_date,
                    endDate: request.end_date || request.to_date,
                    reason: request.reason,
                    status: (request.status || 'pending').toLowerCase(),
                })) as LeaveRequest[];
            }

            return (data || []).map((request: any) => ({
                id: request.id,
                childName: request.students?.full_name || request.students?.name || 'Unknown',
                startDate: request.start_date,
                endDate: request.end_date,
                reason: request.reason,
                status: (request.status || 'pending').toLowerCase(),
            })) as LeaveRequest[];
        },
        enabled: childIds.length > 0,
        staleTime: 2 * 60 * 1000,
    });

    // 4. Fetch Total Pending Fees
    const { data: feeData } = useQuery({
        queryKey: ['parent-fees', childIds],
        queryFn: async () => {
            if (childIds.length === 0) return { total: 0, paid: 0, pending: 0 };

            const { data, error } = await supabase
                .from('student_fees') // Correct table
                .select('*')
                .in('student_id', childIds);

            if (error) throw error;

            const total = data?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
            const paid = data?.filter(f => f.status === 'paid').reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0; // Or define logic for 'paid' amount column usage. 
            // The schema has paid_amount column. Better to use that if partial payments supported.
            // But for now, let's assume status 'paid' implies full amount or sum up paid_amount.
            // Let's use paid_amount if available.
            const paidReal = data?.reduce((sum, fee) => sum + (fee.paid_amount || 0), 0) || 0;

            return {
                total,
                paid: paidReal,
                pending: total - paidReal,
            };
        },
        enabled: childIds.length > 0,
        staleTime: 5 * 60 * 1000,
    });


    // 6. Fetch Upcoming Events
    const { data: upcomingEventsCount = 0 } = useQuery({
        queryKey: ['parent-events', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;

            const today = new Date().toISOString().split('T')[0];

            const { count, error } = await supabase
                .from('academic_events')
                .select('id', { count: 'exact', head: true })
                .eq('institution_id', institutionId)
                .gte('event_date', today);

            if (error) throw error;
            return count || 0;
        },
        enabled: !!instUuid,
        staleTime: 5 * 60 * 1000,
    });

    // 6. Calculate Dashboard Stats
    const stats: ParentDashboardStats = {
        totalChildren: children.length,
        pendingLeaveRequests: leaveRequests.filter(r => r.status === 'pending').length,
        upcomingEvents: upcomingEventsCount,
        totalPendingFees: feeData?.pending || 0,
    };

    // 7. Real-time Subscriptions (Migrated to SSE)
    useERPRealtime(institutionId);

    return {
        stats,
        children,
        childrenAttendance,
        leaveRequests,
        specialClasses,
        feeData,
        isLoading: false,
    };
}
