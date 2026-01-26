import { useState, useEffect } from 'react';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Loader from '@/components/common/Loader';
import { Badge } from '@/components/common/Badge';
import { Fragment } from 'react';
import {
    Plus,
    Trash2,
    Calendar,
    Clock,
    BookOpen,
    Save,
    MapPin,
    Users,
    ArrowLeft
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ExamScheduleManager } from '@/components/exam-schedule/ExamScheduleManager';


const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

interface EditingSlot {
    day: string;
    period: number;
    data: any;
}

export function TimetableManagement() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ day: string; period: number } | null>(null);

    // Configuration state
    const [configData, setConfigData] = useState({
        periods_per_day: 8,
        period_duration_minutes: 45,
        buffer_time_minutes: 5,
        start_time: '09:00',
        lunch_start_time: '12:30',
        lunch_duration_minutes: 45,
        days_per_week: 6,
        short_break_start_time: '11:00',
        short_break_duration_minutes: 15,
        short_break_name: 'Short Break',
        extra_breaks: [] as any[],
    });

    // Special class mode state
    const [isSpecialMode, setIsSpecialMode] = useState(false);
    const [specialClassDate, setSpecialClassDate] = useState(new Date().toISOString().split('T')[0]);

    // Real-time subscription for timetable updates
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`timetable-updates-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'timetable_slots',
                },
                (payload: any) => {
                    console.log('Real-time timetable update received:', payload);

                    // Specific logic to check if update is relevant to this user
                    // 1. If the slot belongs to this faculty (faculty_id matches)
                    // 2. Or if the slot belongs to the class this faculty manages (class_id matches 10th A)
                    // Since payload might not have all details, safest to invalidate if we are unsure, 
                    // but we can check payload.new or payload.old

                    const newData = payload.new;
                    const oldData = payload.old;

                    const relevantFacultyId = newData?.faculty_id || oldData?.faculty_id;

                    if (relevantFacultyId === user.id) {
                        queryClient.invalidateQueries({ queryKey: ['faculty-my-schedule', user.id] });
                        toast.info('Your schedule has been updated');
                    }

                    // Also invalidate class timetable if relevant
                    queryClient.invalidateQueries({ queryKey: ['class-timetable'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, queryClient]);

    // Fetch current config
    const { data: currentConfig } = useQuery({
        queryKey: ['timetable-config', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return null;
            const { data, error } = await supabase
                .from('timetable_configs')
                .select('*')
                .eq('institution_id', user.institutionId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!user?.institutionId,
    });

    // Sync config state with fetched data
    useEffect(() => {
        if (currentConfig) {
            setConfigData({
                periods_per_day: currentConfig.periods_per_day,
                period_duration_minutes: currentConfig.period_duration_minutes,
                buffer_time_minutes: currentConfig.buffer_time_minutes || 5,
                start_time: currentConfig.start_time.substring(0, 5),
                lunch_start_time: currentConfig.lunch_start_time?.substring(0, 5) || '12:30',
                lunch_duration_minutes: currentConfig.lunch_duration_minutes || 45,
                days_per_week: currentConfig.days_per_week || 6,
                short_break_start_time: currentConfig.short_break_start_time?.substring(0, 5) || '11:00',
                short_break_duration_minutes: currentConfig.short_break_duration_minutes || 15,
                short_break_name: currentConfig.short_break_name || 'Short Break',
                extra_breaks: currentConfig.extra_breaks || [],
            });
        }
    }, [currentConfig]);

    const calculatePeriodTimings = (periodIndex: number) => {
        const slots = calculateAllTimings();
        const slot = slots.find(s => s.type === 'period' && s.index === periodIndex);
        return slot ? { start: slot.start, end: slot.end } : { start: '--:--', end: '--:--' };
    };

    const getBreakAfterPeriod = (type: 'lunch' | 'short' | 'extra') => {
        const slots = calculateAllTimings();
        for (let i = 0; i < slots.length; i++) {
            if (slots[i].type === type && i > 0 && slots[i - 1].type === 'period') {
                return slots[i - 1].index || -1;
            }
        }
        return -1;
    };

    const calculateAllTimings = () => {
        const slots: { type: 'period' | 'lunch' | 'short' | 'extra'; index?: number; start: string; end: string; name?: string }[] = [];
        try {
            const [startH, startM] = configData.start_time.split(':').map(Number);
            let currentMinutes = startH * 60 + startM;

            const [lunchH, lunchM] = configData.lunch_start_time.split(':').map(Number);
            const lunchStart = lunchH * 60 + lunchM;
            const lunchDuration = configData.lunch_duration_minutes || 45;

            const [shortH, shortM] = configData.short_break_start_time.split(':').map(Number);
            const shortStart = shortH * 60 + shortM;
            const shortDuration = configData.short_break_duration_minutes || 15;

            const allBreaks = [
                { start: lunchStart, end: lunchStart + lunchDuration, type: 'lunch', name: 'Lunch Break' },
                { start: shortStart, end: shortStart + shortDuration, type: 'short', name: configData.short_break_name },
                ...(configData.extra_breaks || []).map((b: any) => {
                    const [h, m] = b.start_time.split(':').map(Number);
                    return { start: h * 60 + m, end: (h * 60 + m) + b.duration, type: 'extra', name: b.name };
                })
            ].sort((a, b) => a.start - b.start);

            const formatTime = (mins: number) => {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                const hh = h % 12 || 12;
                const period = h >= 12 ? 'PM' : 'AM';
                return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
            };

            const processedBreaks = new Set();

            for (let i = 1; i <= configData.periods_per_day; i++) {
                for (const b of allBreaks) {
                    if (!processedBreaks.has(b.name) && currentMinutes >= b.start) {
                        slots.push({ type: b.type as any, start: formatTime(b.start), end: formatTime(b.end), name: b.name });
                        currentMinutes = Math.max(currentMinutes, b.end);
                        processedBreaks.add(b.name);
                    }
                }

                const nextBreak = allBreaks.find(b => !processedBreaks.has(b.name) && b.start > currentMinutes);
                if (nextBreak && (currentMinutes + configData.period_duration_minutes) > nextBreak.start) {
                    slots.push({ type: nextBreak.type as any, start: formatTime(nextBreak.start), end: formatTime(nextBreak.end), name: nextBreak.name });
                    currentMinutes = nextBreak.end;
                    processedBreaks.add(nextBreak.name);
                }

                const periodStart = currentMinutes;
                const periodEnd = currentMinutes + configData.period_duration_minutes;
                slots.push({ type: 'period', index: i, start: formatTime(periodStart), end: formatTime(periodEnd) });

                currentMinutes = periodEnd;

                const imminentBreak = allBreaks.find(b => !processedBreaks.has(b.name));
                if (!imminentBreak || (currentMinutes + configData.buffer_time_minutes) <= imminentBreak.start) {
                    currentMinutes += configData.buffer_time_minutes;
                }
            }

            for (const b of allBreaks) {
                if (!processedBreaks.has(b.name)) {
                    slots.push({ type: b.type as any, start: formatTime(b.start), end: formatTime(b.end), name: b.name });
                }
            }
        } catch (e) { }
        return slots;
    };

    // Fetch special class slots
    const { data: specialSlots = [], isLoading: isLoadingSpecial } = useQuery({
        queryKey: ['special-timetable-slots', user?.institutionId, specialClassDate],
        queryFn: async () => {
            if (!user?.institutionId) return [];
            console.log('[FACULTY] Fetching special slots for:', specialClassDate);
            const { data, error } = await supabase
                .from('special_timetable_slots')
                .select(`
                    *,
                    subjects:subject_id (name),
                    profiles:faculty_id (full_name),
                    classes:class_id (name)
                `)
                .eq('institution_id', user.institutionId)
                .eq('event_date', specialClassDate);

            if (error) {
                console.error('[FACULTY] Error fetching special slots:', error);
                return [];
            }
            return data || [];
        },
        enabled: !!user?.institutionId,
    });

    // Fetch faculty's personal schedule (created by institution)
    const { data: mySchedule = [], isLoading: isLoadingSchedule } = useQuery({
        queryKey: ['faculty-my-schedule', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from('timetable_slots')
                .select(`
                    *,
                    subjects:subject_id (name),
                    classes:class_id (name)
                `)
                .eq('faculty_id', user.id)
                .order('day_of_week')
                .order('period_index');

            if (error) {
                console.error('Error fetching my schedule:', error);
                return [];
            }

            return data || [];
        },
        enabled: !!user?.id,
    });

    // Fetch faculty's class assignment (Using faculty_subjects with assignment_type = 'class_teacher')
    const { data: classTeacherAssignment, isLoading: isLoadingAssignment } = useQuery({
        queryKey: ['faculty-class-assignment', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            const { data, error } = await supabase
                .from('faculty_subjects')
                .select(`
                    id,
                    section,
                    classes:class_id (id, name)
                `)
                .eq('faculty_profile_id', user.id)
                .eq('assignment_type', 'class_teacher')
                .maybeSingle();

            if (error) {
                console.error('Error fetching class teacher assignment:', error);
                return null;
            }

            if (data) {
                return {
                    class_assigned: (data.classes as any)?.name,
                    section_assigned: data.section,
                    class_id: (data.classes as any)?.id
                };
            }
            return null;
        },
        enabled: !!user?.id,
    });

    const isClassTeacher = !!classTeacherAssignment;

    // Fetch class details (optional)
    const { data: classDetails } = useQuery({
        queryKey: ['class-details', classTeacherAssignment?.class_assigned],
        queryFn: async () => {
            if (!classTeacherAssignment?.class_assigned) return null;

            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .eq('name', classTeacherAssignment.class_assigned)
                .maybeSingle();

            if (error) {
                console.log('Class details not found (optional):', error);
                return null;
            }
            return data;
        },
        enabled: !!classTeacherAssignment?.class_assigned,
        retry: false,
    });

    // Fetch subjects
    const { data: subjects = [] } = useQuery({
        queryKey: ['faculty-subjects'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subjects')
                .select('id, name');
            if (error) {
                console.error('Error fetching subjects:', error);
                return [];
            }
            return data || [];
        },
    });

    // Fetch all faculty members for staff selection
    const { data: allFaculty = [] } = useQuery({
        queryKey: ['all-faculty', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return [];
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('institution_id', user.institutionId)
                .eq('role', 'faculty')
                .order('full_name');
            if (error) {
                console.error('Error fetching faculty:', error);
                return [];
            }
            return data || [];
        },
        enabled: !!user?.institutionId,
    });

    // Fetch class timetable (for editing) - only for class teachers
    const { data: classTimetable = [], isLoading: isLoadingClassTimetable } = useQuery({
        queryKey: ['class-timetable', classTeacherAssignment?.class_assigned, classTeacherAssignment?.section_assigned],
        queryFn: async () => {
            if (!classTeacherAssignment?.class_assigned || !classTeacherAssignment?.class_id || !user?.institutionId) return [];

            // Get all slots for this class and section
            const { data, error } = await supabase
                .from('timetable_slots')
                .select(`
                    *,
                    subjects:subject_id (name),
                    profiles:faculty_id (full_name)
                `)
                .eq('class_id', classTeacherAssignment.class_id)
                .eq('section', classTeacherAssignment.section_assigned)
                .order('day_of_week')
                .order('period_index');

            if (error) {
                console.error('Error fetching class timetable:', error);
                return [];
            }

            return data || [];
        },
        enabled: isClassTeacher && !!user?.institutionId,
    });

    const dayMap: { [key: string]: string } = {
        'Mon': 'Monday',
        'Tue': 'Tuesday',
        'Wed': 'Wednesday',
        'Thu': 'Thursday',
        'Fri': 'Friday',
        'Sat': 'Saturday',
        'Sun': 'Sunday'
    };

    const normalizeDay = (day: string) => dayMap[day] || day;

    // Convert array to object for easier lookup
    const classTimetableData: { [key: string]: any } = {};
    classTimetable.forEach((slot: any) => {
        const normalizedDay = normalizeDay(slot.day_of_week);
        const key = `${normalizedDay}-${slot.period_index}`;
        classTimetableData[key] = { ...slot, day_of_week: normalizedDay };
    });

    const myScheduleData: { [key: string]: any } = {};
    mySchedule.forEach((slot: any) => {
        const normalizedDay = normalizeDay(slot.day_of_week);
        const key = `${normalizedDay}-${slot.period_index}`;
        myScheduleData[key] = { ...slot, day_of_week: normalizedDay };
    });

    // Save class timetable slot
    const saveSlotMutation = useMutation({
        mutationFn: async () => {
            if (!editingSlot || !user?.id || !user?.institutionId) {
                throw new Error('Missing required data');
            }

            console.log('Saving slot:', editingSlot);

            // Get the class assigned to this faculty (Using faculty_subjects)
            const { data: assignment } = await supabase
                .from('faculty_subjects')
                .select(`
                    section,
                    classes:class_id (id, name)
                `)
                .eq('faculty_profile_id', user.id)
                .eq('assignment_type', 'class_teacher')
                .maybeSingle();

            if (!assignment || !(assignment.classes as any)?.id) {
                throw new Error('You are not assigned as a class teacher. Please contact admin.');
            }

            const targetClassId = (assignment.classes as any).id;
            const targetClassName = (assignment.classes as any).name;
            const section = assignment.section;

            // targetClassId and targetClassName already derived from assignment

            // Get or create config
            let configId = currentConfig?.id;
            if (!configId) {
                const { data: newConfig } = await supabase
                    .from('timetable_configs')
                    .insert({
                        institution_id: user.institutionId,
                        periods_per_day: configData.periods_per_day,
                        period_duration_minutes: configData.period_duration_minutes,
                        start_time: configData.start_time,
                    })
                    .select('id')
                    .single();
                configId = newConfig?.id;
            }

            // Delete existing slot for this class and section
            await supabase
                .from('timetable_slots')
                .delete()
                .eq('class_id', targetClassId)
                .eq('section', section)
                .eq('day_of_week', editingSlot.day)
                .eq('period_index', editingSlot.period);

            // Small delay to ensure delete completes
            await new Promise(resolve => setTimeout(resolve, 100));

            // Insert new slot if subject is selected
            if (editingSlot.data.subject_id) {
                const slotData = {
                    config_id: configId,
                    faculty_id: editingSlot.data.assigned_faculty_id || user.id,
                    class_id: targetClassId,
                    section: section,
                    day_of_week: editingSlot.day,
                    period_index: editingSlot.period,
                    subject_id: parseInt(editingSlot.data.subject_id),
                    start_time: editingSlot.data.start_time,
                    end_time: editingSlot.data.end_time,
                    room_number: editingSlot.data.room_number || null,
                    is_break: false,
                };

                const { error: insertError } = await supabase
                    .from('timetable_slots')
                    .insert(slotData);

                if (insertError) throw insertError;
            }
        },
        onSuccess: () => {
            toast.success('Timetable updated successfully');
            queryClient.invalidateQueries({ queryKey: ['class-timetable'] }); // Generalized key
            queryClient.invalidateQueries({ queryKey: ['faculty-my-schedule', user?.id] });
            setIsEditDialogOpen(false);
            setEditingSlot(null);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update timetable');
        },
    });

    // Save special slot mutation
    const saveSpecialSlotMutation = useMutation({
        mutationFn: async () => {
            if (!editingSlot || !user?.institutionId || !isSpecialMode) throw new Error('Missing data');

            // Get the class assigned to this faculty
            const { data: assignment } = await supabase
                .from('faculty_subjects')
                .select(`
                    section,
                    classes:class_id (id, name)
                `)
                .eq('faculty_profile_id', user.id)
                .eq('assignment_type', 'class_teacher')
                .maybeSingle();

            if (!assignment || !(assignment.classes as any)?.id) {
                throw new Error('You are not assigned as a class teacher.');
            }

            const targetClassId = (assignment.classes as any).id;
            const targetClassName = (assignment.classes as any).name;
            const section = assignment.section;

            const slotData = {
                institution_id: user.institutionId,
                class_id: targetClassId,
                section: section,
                event_date: specialClassDate,
                subject_id: editingSlot.data.subject_id,
                faculty_id: editingSlot.data.assigned_faculty_id || user.id,
                start_time: editingSlot.data.start_time,
                end_time: editingSlot.data.end_time,
                room_number: editingSlot.data.room_number,
            };

            const { error: insertError } = await supabase
                .from('special_timetable_slots')
                .insert(slotData);

            if (insertError) throw insertError;

            // Notify students and parents
            const { data: students } = await supabase
                .from('students')
                .select('id, parent_id')
                .eq('class_name', targetClassName)
                .eq('section', section)
                .eq('institution_id', user.institutionId);

            if (students && students.length > 0) {
                const subjectName = subjects.find(s => String(s.id) === String(editingSlot.data.subject_id))?.name || 'Subject';
                const notifications = students.flatMap(s => {
                    const msgs = [{
                        user_id: s.id,
                        title: 'Special Class Scheduled',
                        message: `A special class for ${subjectName} has been scheduled on ${specialClassDate} at ${slotData.start_time}.`,
                        type: 'timetable',
                        date: new Date().toISOString(),
                    }];
                    if (s.parent_id) {
                        msgs.push({
                            user_id: s.parent_id,
                            title: 'Special Class for your child',
                            message: `A special class for your child has been scheduled on ${specialClassDate} at ${slotData.start_time}.`,
                            type: 'timetable',
                            date: new Date().toISOString(),
                        });
                    }
                    return msgs;
                });
                await supabase.from('notifications').insert(notifications);
            }
        },
        onSuccess: () => {
            toast.success('Special class scheduled and notifications sent');
            queryClient.invalidateQueries({ queryKey: ['special-timetable-slots'] });
            setIsEditDialogOpen(false);
            setEditingSlot(null);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to schedule special class');
        }
    });

    // Delete timetable slot
    const deleteSlotMutation = useMutation({
        mutationFn: async ({ day, period }: { day: string; period: number }) => {
            if (!user?.id) throw new Error('User not found');

            const { data: assignment } = await supabase
                .from('faculty_subjects')
                .select(`
                    section,
                    classes:class_id (id)
                `)
                .eq('faculty_profile_id', user.id)
                .eq('assignment_type', 'class_teacher')
                .maybeSingle();

            if (!assignment || !(assignment.classes as any)?.id) throw new Error('Not class teacher');

            const { error } = await supabase
                .from('timetable_slots')
                .delete()
                .eq('class_id', (assignment.classes as any).id)
                .eq('section', assignment.section)
                .eq('day_of_week', day)
                .eq('period_index', period);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Slot deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['class-timetable'] });
            queryClient.invalidateQueries({ queryKey: ['faculty-my-schedule', user?.id] });
            setDeleteConfirm(null);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete slot');
            setDeleteConfirm(null);
        },
    });

    const handleDeleteSlot = (e: React.MouseEvent, day: string, period: number) => {
        e.stopPropagation(); // Prevent opening edit dialog
        setDeleteConfirm({ day, period });
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            deleteSlotMutation.mutate(deleteConfirm);
        }
    };

    const handleSlotClick = (day: string, period: number) => {
        if (isSpecialMode) return; // Special class slots managed differently
        const key = `${day}-${period}`;
        const existingSlot = classTimetableData[key];
        const timings = calculatePeriodTimings(period);

        setEditingSlot({
            day,
            period,
            data: {
                ...(existingSlot || {}),
                day_of_week: day,
                period_index: period,
                start_time: timings.start,
                end_time: timings.end,
                assigned_faculty_id: existingSlot?.faculty_id || user?.id,
            },
        });
        setIsEditDialogOpen(true);
    };

    const handleSpecialSlotClick = (period: number) => {
        const timings = calculatePeriodTimings(period);
        const existingSlot = specialSlots.find(s => s.period_index === period);

        setEditingSlot({
            day: specialClassDate,
            period,
            data: {
                ...(existingSlot || {}),
                day_of_week: specialClassDate,
                period_index: period,
                start_time: timings.start,
                end_time: timings.end,
                assigned_faculty_id: existingSlot?.faculty_id || user?.id,
            },
        });
        setIsEditDialogOpen(true);
    };

    const updateEditingSlot = (field: string, value: any) => {
        if (!editingSlot) return;
        setEditingSlot({
            ...editingSlot,
            data: { ...editingSlot.data, [field]: value },
        });
    };

    const isLoading = isLoadingSchedule || isLoadingClassTimetable || isLoadingAssignment;

    if (isLoading) {
        return (
            <FacultyLayout>
                <div className="flex h-[400px] items-center justify-center">
                    <Loader fullScreen={false} />
                </div>
            </FacultyLayout>
        );
    }

    if (!isClassTeacher) {
        return (
            <FacultyLayout>
                <PageHeader
                    title="Timetable Management"
                    subtitle="View your schedule and manage your assigned class timetable"
                />
                <Card className="mt-6">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="bg-destructive/10 p-4 rounded-full mb-4">
                            <Calendar className="w-12 h-12 text-destructive opacity-50" />
                        </div>
                        <h3 className="text-lg font-bold">Access Restricted</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">
                            Only faculty members assigned as <strong>Class Teachers</strong> can access the timetable management page.
                            Please contact your administrator if you believe this is an error.
                        </p>
                        <Button variant="outline" className="mt-6" onClick={() => window.history.back()}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </FacultyLayout>
        );
    }

    const timingsList = calculateAllTimings();

    return (
        <FacultyLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Timetable Management"
                    subtitle="View your schedule and manage your assigned class timetable"
                />

                <Tabs defaultValue="my-schedule" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-3">
                        <TabsTrigger value="my-schedule">My Schedule</TabsTrigger>
                        <TabsTrigger value="class-timetable">
                            {classTeacherAssignment?.class_assigned ? `${classTeacherAssignment.class_assigned}${classTeacherAssignment.section_assigned ? ` - ${classTeacherAssignment.section_assigned}` : ''}` : 'Class Timetable'}
                        </TabsTrigger>
                        <TabsTrigger value="exam-schedule">Exams</TabsTrigger>
                    </TabsList>

                    {/* My Personal Schedule */}
                    <TabsContent value="my-schedule" className="mt-4">
                        <Card>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr>
                                            <th className="border p-4 bg-muted/50 w-32 font-bold text-left sticky left-0 z-10">Day</th>
                                            {Array.from({ length: configData.periods_per_day }, (_, i) => i + 1).map((p) => {
                                                const timings = calculatePeriodTimings(p);
                                                return (
                                                    <Fragment key={p}>
                                                        <th className="border p-3 bg-muted/50 text-sm font-medium text-left">
                                                            <div className="font-bold">Period {p}</div>
                                                            <div className="text-[10px] font-normal text-muted-foreground mt-0.5 whitespace-nowrap">
                                                                {timings.start} - {timings.end}
                                                            </div>
                                                        </th>
                                                        {getBreakAfterPeriod('short') === p && (
                                                            <th className="border p-3 bg-blue-50/50 text-[10px] font-bold text-blue-600 text-center uppercase tracking-widest w-16">
                                                                {configData.short_break_name}
                                                            </th>
                                                        )}
                                                        {getBreakAfterPeriod('lunch') === p && (
                                                            <th className="border p-3 bg-orange-50/50 text-[10px] font-bold text-orange-600 text-center uppercase tracking-widest w-16">
                                                                Lunch
                                                            </th>
                                                        )}
                                                        {timingsList
                                                            .filter((s, idx, arr) => s.type === 'extra' && idx > 0 && arr[idx - 1].type === 'period' && arr[idx - 1].index === p)
                                                            .map((b, bi) => (
                                                                <th key={bi} className="border p-3 bg-blue-50/50 text-[10px] font-bold text-blue-600 text-center uppercase tracking-widest w-16">
                                                                    {b.name}
                                                                </th>
                                                            ))}
                                                    </Fragment>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DAYS.slice(0, configData.days_per_week).map((day) => (
                                            <tr key={day}>
                                                <td className="border p-4 font-semibold bg-muted/10 sticky left-0 z-10">{day}</td>
                                                {Array.from({ length: configData.periods_per_day }, (_, i) => i + 1).map((period) => {
                                                    const key = `${day}-${period}`;
                                                    const slot = myScheduleData[key];
                                                    return (
                                                        <Fragment key={period}>
                                                            <td className="border p-2 min-w-[140px] h-[100px] align-top">
                                                                {slot?.subject_id ? (
                                                                    <div className="space-y-1 p-1">
                                                                        <Badge variant="default" className="w-full justify-start line-clamp-1 bg-primary/10 text-primary border-0 mb-1">
                                                                            {slot.subjects?.name || 'Subject'}
                                                                        </Badge>
                                                                        <div className="text-xs font-medium pl-1">{slot.classes?.name || 'Class'} {slot.section}</div>
                                                                        <div className="text-[10px] text-muted-foreground pl-1 font-bold">
                                                                            {slot.start_time} - {slot.end_time}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 text-xs text-center px-2">
                                                                        Free Period
                                                                    </div>
                                                                )}
                                                            </td>
                                                            {period === getBreakAfterPeriod('short') && (
                                                                <td className="border p-2 bg-blue-50/20 align-middle text-center">
                                                                    <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase mx-auto">
                                                                        {configData.short_break_name}
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {period === getBreakAfterPeriod('lunch') && (
                                                                <td className="border p-2 bg-orange-50/20 align-middle text-center">
                                                                    <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold text-orange-400 tracking-[0.2em] uppercase mx-auto">
                                                                        Lunch
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {timingsList
                                                                .filter((s, idx, arr) => s.type === 'extra' && idx > 0 && arr[idx - 1].type === 'period' && arr[idx - 1].index === period)
                                                                .map((b, bi) => (
                                                                    <td key={bi} className="border p-2 bg-blue-50/20 align-middle text-center">
                                                                        <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase mx-auto">
                                                                            {b.name}
                                                                        </div>
                                                                    </td>
                                                                ))}
                                                        </Fragment>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Class Timetable Tab */}
                    <TabsContent value="class-timetable" className="mt-4">
                        <Card>
                            <CardContent className="p-0 overflow-hidden">
                                <div className="p-4 bg-muted/30 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-primary/10 text-primary border-primary/20">
                                            {classTeacherAssignment?.class_assigned || 'Class'} {classTeacherAssignment?.section_assigned || ''}
                                        </Badge>
                                        <p className="text-sm text-muted-foreground">
                                            Manage weekly schedule and schedule special classes
                                        </p>
                                    </div>
                                    <Button
                                        variant={isSpecialMode ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setIsSpecialMode(!isSpecialMode)}
                                        className={isSpecialMode ? "bg-orange-500 hover:bg-orange-600" : ""}
                                    >
                                        <Calendar className="w-4 h-4 mr-2" />
                                        {isSpecialMode ? "Exit Special Mode" : "Schedule Special Class"}
                                    </Button>
                                </div>

                                {isSpecialMode && (
                                    <div className="p-4 bg-orange-50/50 border-b flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm font-bold text-orange-700">Event Date:</label>
                                            <Input
                                                type="date"
                                                className="w-40 bg-white"
                                                value={specialClassDate}
                                                onChange={(e) => setSpecialClassDate(e.target.value)}
                                            />
                                        </div>
                                        <Badge variant="outline" className="bg-white text-orange-600 border-orange-200">
                                            Special Class Mode Active
                                        </Badge>
                                    </div>
                                )}

                                {!isSpecialMode ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse min-w-[1000px]">
                                            <thead>
                                                <tr>
                                                    <th className="border p-4 bg-muted/50 w-32 font-bold text-left sticky left-0 z-10">Day</th>
                                                    {Array.from({ length: configData.periods_per_day }, (_, i) => i + 1).map((p) => {
                                                        const timings = calculatePeriodTimings(p);
                                                        return (
                                                            <Fragment key={p}>
                                                                <th className="border p-3 bg-muted/50 text-sm font-medium text-left">
                                                                    <div className="font-bold">Period {p}</div>
                                                                    <div className="text-[10px] font-normal text-muted-foreground mt-0.5 whitespace-nowrap">
                                                                        {timings.start} - {timings.end}
                                                                    </div>
                                                                </th>
                                                                {getBreakAfterPeriod('short') === p && (
                                                                    <th className="border p-3 bg-blue-50/50 text-[10px] font-bold text-blue-600 text-center uppercase tracking-widest w-16">
                                                                        Short Break
                                                                    </th>
                                                                )}
                                                                {getBreakAfterPeriod('lunch') === p && (
                                                                    <th className="border p-3 bg-orange-50/50 text-[10px] font-bold text-orange-600 text-center uppercase tracking-widest w-16">
                                                                        Lunch
                                                                    </th>
                                                                )}
                                                            </Fragment>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {DAYS.slice(0, configData.days_per_week).map((day) => (
                                                    <tr key={day}>
                                                        <td className="border p-4 font-semibold bg-muted/10 sticky left-0 z-10">{day}</td>
                                                        {Array.from({ length: configData.periods_per_day }, (_, i) => i + 1).map((period) => {
                                                            const key = `${day}-${period}`;
                                                            const slot = classTimetableData[key];
                                                            return (
                                                                <Fragment key={period}>
                                                                    <td
                                                                        className="border p-2 min-w-[140px] h-[100px] align-top hover:bg-primary/5 transition-colors cursor-pointer relative group"
                                                                        onClick={() => handleSlotClick(day, period)}
                                                                    >
                                                                        {slot?.subject_id ? (
                                                                            <>
                                                                                <div className="space-y-1 p-1">
                                                                                    <Badge variant="default" className="w-full justify-start line-clamp-1 bg-primary/10 text-primary border-0 mb-1">
                                                                                        {slot.subjects?.name || 'Subject'}
                                                                                    </Badge>
                                                                                    <div className="text-xs font-medium pl-1">
                                                                                        {slot.profiles?.full_name || 'Faculty'}
                                                                                    </div>
                                                                                    <div className="text-[10px] text-muted-foreground pl-1 font-bold">
                                                                                        {slot.start_time} - {slot.end_time}
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    onClick={(e) => handleDeleteSlot(e, day, period)}
                                                                                    className="absolute top-1 right-1 p-1 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                                                                                >
                                                                                    <Trash2 className="w-3 h-3" />
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 text-xs text-center border border-dashed rounded border-muted-foreground/10">
                                                                                Assign
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    {period === getBreakAfterPeriod('short') && (
                                                                        <td className="border p-2 bg-blue-50/20 align-middle text-center">
                                                                            <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase mx-auto">
                                                                                {configData.short_break_name}
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                    {period === getBreakAfterPeriod('lunch') && (
                                                                        <td className="border p-2 bg-orange-50/20 align-middle text-center">
                                                                            <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold text-orange-400 tracking-[0.2em] uppercase mx-auto">
                                                                                Lunch
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                </Fragment>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {Array.from({ length: configData.periods_per_day }, (_, i) => i + 1).map((period) => {
                                                const slot = specialSlots.find(s => s.period_index === period);
                                                const timing = calculatePeriodTimings(period);
                                                return (
                                                    <Card
                                                        key={period}
                                                        className={`overflow-hidden border-2 transition-all cursor-pointer ${slot ? 'border-orange-200 bg-orange-50/30' : 'hover:border-primary/50'}`}
                                                        onClick={() => handleSpecialSlotClick(period)}
                                                    >
                                                        <CardContent className="p-4">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <Badge variant="outline" className="bg-white">Period {period}</Badge>
                                                                <span className="text-[10px] font-bold text-muted-foreground">{timing.start} - {timing.end}</span>
                                                            </div>
                                                            {slot ? (
                                                                <div className="space-y-1">
                                                                    <div className="font-bold text-orange-800 line-clamp-1">{slot.subjects?.name}</div>
                                                                    <div className="text-xs text-muted-foreground line-clamp-1">{slot.profiles?.full_name}</div>
                                                                    {slot.room_number && <div className="text-[10px] text-muted-foreground">Room: {slot.room_number}</div>}
                                                                </div>
                                                            ) : (
                                                                <div className="h-10 flex items-center justify-center text-muted-foreground/20">
                                                                    <Plus className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Exams Tab */}
                    <TabsContent value="exam-schedule" className="mt-4">
                        <ExamScheduleManager
                            classId={classDetails?.id}
                            className={classTeacherAssignment?.class_assigned}
                            section={classTeacherAssignment?.section_assigned}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Slot Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>
                            {isSpecialMode ? 'Schedule Special Class' : 'Edit Timetable Slot'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingSlot?.day} - Period {editingSlot?.period}
                        </DialogDescription>
                    </DialogHeader>

                    {editingSlot && (
                        <div className="space-y-4 py-4">
                            {/* Read-only Timings */}
                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Start
                                    </label>
                                    <div className="text-sm font-semibold">{editingSlot.data.start_time}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> End
                                    </label>
                                    <div className="text-sm font-semibold">{editingSlot.data.end_time}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subject</label>
                                <Select
                                    value={editingSlot.data.subject_id?.toString() || 'none'}
                                    onValueChange={(v) => updateEditingSlot('subject_id', v === 'none' ? null : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Subject</SelectItem>
                                        {subjects.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Assign Teacher</label>
                                <Select
                                    value={editingSlot.data.assigned_faculty_id || 'none'}
                                    onValueChange={(v) => updateEditingSlot('assigned_faculty_id', v === 'none' ? null : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Teacher" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select Teacher</SelectItem>
                                        {allFaculty.map((f: any) => (
                                            <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Room Number</label>
                                <Input
                                    value={editingSlot.data.room_number || ''}
                                    onChange={(e) => updateEditingSlot('room_number', e.target.value)}
                                    placeholder="e.g. 101"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => isSpecialMode ? saveSpecialSlotMutation.mutate() : saveSlotMutation.mutate()}
                            disabled={isSpecialMode ? saveSpecialSlotMutation.isPending : saveSlotMutation.isPending}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSpecialMode ? 'Schedule' : 'Save Slot'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Slot</DialogTitle>
                        <DialogDescription>Are you sure you want to remove this period?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteSlotMutation.isPending}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </FacultyLayout>
    );
}
