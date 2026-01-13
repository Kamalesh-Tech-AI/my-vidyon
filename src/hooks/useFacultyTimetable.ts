import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface TimetableSlot {
    id: string;
    day_of_week: string;
    period_index: number;
    start_time: string;
    end_time: string;
    subject_id?: string;
    subject_name?: string;
    faculty_id?: string;
    faculty_name?: string;
    class_name?: string;
    section?: string;
    room_number?: string;
    is_break?: boolean;
    break_name?: string;
}

interface FacultyAssignment {
    classId: string;
    className: string;
    section: string;
    institutionId: string;
}

/**
 * Custom hook for fetching faculty's timetable data with real-time updates
 * Fetches:
 * - Faculty's assigned classes
 * - Their personal teaching schedule
 * - Subjects they teach
 * - Real-time updates when admin makes changes
 */
export function useFacultyTimetable(facultyId?: string) {
    const queryClient = useQueryClient();
    const [assignment, setAssignment] = useState<FacultyAssignment | null>(null);

    // 1. Fetch Faculty's Class Assignment
    const { data: staffDetails, isLoading: isLoadingStaff } = useQuery({
        queryKey: ['faculty-assignment', facultyId],
        queryFn: async () => {
            if (!facultyId) return null;

            const { data, error } = await supabase
                .from('staff_details')
                .select('*')
                .eq('profile_id', facultyId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        enabled: !!facultyId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000,
    });

    // 2. Fetch Class Details
    const { data: classDetails } = useQuery({
        queryKey: ['class-details', staffDetails?.class_assigned],
        queryFn: async () => {
            if (!staffDetails?.class_assigned) return null;

            const { data, error } = await supabase
                .from('classes')
                .select('id, name, institution_id')
                .eq('name', staffDetails.class_assigned)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        enabled: !!staffDetails?.class_assigned,
    });

    // Update assignment when data changes
    useEffect(() => {
        if (classDetails && staffDetails) {
            setAssignment({
                classId: classDetails.id,
                className: staffDetails.class_assigned,
                section: staffDetails.section_assigned || 'A',
                institutionId: staffDetails.institution_id,
            });
        }
    }, [classDetails, staffDetails]);

    // 3. Fetch Faculty's Personal Timetable (all slots where they teach)
    const { data: mySchedule = [], isLoading: isLoadingSchedule } = useQuery({
        queryKey: ['faculty-my-schedule', facultyId],
        queryFn: async () => {
            if (!facultyId) return [];

            const { data, error } = await supabase
                .from('timetable_slots')
                .select(`
                    *,
                    subjects:subject_id (name),
                    classes:class_id (name)
                `)
                .eq('faculty_id', facultyId)
                .order('day_of_week')
                .order('period_index');

            if (error) throw error;

            // Transform data
            return (data || []).map((slot: any) => ({
                ...slot,
                subject_name: slot.subjects?.name,
                class_name: slot.classes?.name,
            })) as TimetableSlot[];
        },
        enabled: !!facultyId,
        staleTime: 1 * 60 * 1000, // 1 minute
    });

    // 4. Fetch Subjects Faculty Teaches
    const { data: mySubjects = [] } = useQuery({
        queryKey: ['faculty-subjects', facultyId],
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
            return data || [];
        },
        enabled: !!facultyId,
        staleTime: 2 * 60 * 1000,
    });

    // 5. Fetch Full Class Timetable (if faculty is class teacher)
    const { data: classTimetable = [], isLoading: isLoadingClassTimetable } = useQuery({
        queryKey: ['class-timetable', assignment?.classId, assignment?.section],
        queryFn: async () => {
            if (!assignment?.classId || !assignment?.section) return [];

            // Get all slots for this class and section
            const { data, error } = await supabase
                .from('timetable_slots')
                .select(`
                    *,
                    subjects:subject_id (name),
                    profiles:faculty_id (full_name)
                `)
                .eq('class_id', assignment.classId)
                .eq('section', assignment.section)
                .order('day_of_week')
                .order('period_index');

            if (error) {
                console.error('Error fetching class timetable:', error);
                return [];
            }

            return (data || []).map((slot: any) => ({
                ...slot,
                subject_name: slot.subjects?.name,
                faculty_name: slot.profiles?.full_name,
            })) as TimetableSlot[];
        },
        enabled: !!assignment?.classId && !!assignment?.section,
        staleTime: 1 * 60 * 1000,
    });

    // 6. Real-time Subscriptions
    useEffect(() => {
        if (!facultyId) return;

        const channel = supabase
            .channel('faculty-timetable-realtime')
            // When admin assigns faculty to a slot
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'timetable_slots',
                },
                (payload) => {
                    console.log('Timetable slot changed:', payload);
                    queryClient.invalidateQueries({ queryKey: ['faculty-my-schedule'] });
                    queryClient.invalidateQueries({ queryKey: ['class-timetable'] });
                    toast.success('Timetable updated!');
                }
            )
            // When admin assigns subject to faculty
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'faculty_subjects',
                    filter: `faculty_profile_id=eq.${facultyId}`,
                },
                (payload) => {
                    console.log('Faculty subject changed:', payload);
                    queryClient.invalidateQueries({ queryKey: ['faculty-subjects'] });
                    toast.success('Subject assignment updated!');
                }
            )
            // When admin changes class assignment
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'staff_details',
                    filter: `profile_id=eq.${facultyId}`,
                },
                (payload) => {
                    console.log('Staff details changed:', payload);
                    queryClient.invalidateQueries({ queryKey: ['faculty-assignment'] });
                    toast.success('Class assignment updated!');
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [facultyId, queryClient]);

    return {
        // Loading states
        isLoading: isLoadingStaff || isLoadingSchedule || isLoadingClassTimetable,
        isLoadingStaff,
        isLoadingSchedule,
        isLoadingClassTimetable,

        // Data
        assignment,
        mySchedule,
        mySubjects,
        classTimetable,
        staffDetails,

        // Helper functions
        getScheduleForDay: (day: string) => {
            return mySchedule.filter((slot) => slot.day_of_week === day);
        },
        getClassTimetableForDay: (day: string) => {
            return classTimetable.filter((slot) => slot.day_of_week === day);
        },
    };
}
