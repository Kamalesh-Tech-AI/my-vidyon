import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useERPRealtime } from './useERPRealtime';

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

    // 2. Fetch Attendance for all children
    const { data: childrenAttendance = [] } = useQuery({
        queryKey: ['parent-children-attendance', childIds],
        queryFn: async () => {
            if (childIds.length === 0) return [];

            const attendancePromises = children.map(async (child) => {
                const { data, error } = await supabase
                    .from('student_attendance')
                    .select('*')
                    .eq('student_id', child.id)
                    .order('attendance_date', { ascending: false })
                    .limit(30);

                if (error) {
                    console.error(`Error fetching attendance for ${child.id}:`, error);
                    return { childId: child.id, childName: child.name, presentDays: 0, totalDays: 0, percentage: '0%' };
                }

                const presentDays = data?.filter(r => r.status === 'present').length || 0;
                const totalDays = data?.length || 0;

                return {
                    childId: child.id,
                    childName: child.name,
                    presentDays,
                    totalDays,
                    percentage: totalDays > 0 ? `${Math.round((presentDays / totalDays) * 100)}%` : '0%',
                };
            });

            return Promise.all(attendancePromises) as Promise<ChildAttendance[]>;
        },
        enabled: childIds.length > 0,
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

    // 5. Fetch Special Classes for linked children
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
        enabled: !!institutionId,
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
