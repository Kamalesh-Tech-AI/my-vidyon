import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Clock, User } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Badge } from '@/components/common/Badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentExamScheduleView } from '@/components/exam-schedule/StudentExamScheduleView';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

interface TimetableSlot {
    id: string;
    day_of_week: string;
    period_index: number;
    start_time: string;
    end_time: string;
    subject_id?: string;
    faculty_id?: string;
    class_id?: string;
    section?: string;
    room_number?: string;
    is_break?: boolean;
    break_name?: string;
    subjects?: { name: string };
    profiles?: { full_name: string };
}


export function StudentTimetable() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [studentInfo, setStudentInfo] = useState<{ class_name: string; section: string; class_id: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
        extra_breaks: [] as { name: string; start_time: string; duration: number }[],
    });

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
                ...(currentConfig?.extra_breaks || []).map((b: any) => {
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

    // Fetch student's class and section info
    useEffect(() => {
        const fetchStudentInfo = async () => {
            if (!user?.email || !user?.institutionId) {
                console.log('[STUDENT] Missing user details:', { email: user?.email, institutionId: user?.institutionId });
                return;
            }

            console.log('[STUDENT] Fetching student info case-insensitively for:', user.email, 'with institutionId:', user.institutionId);
            setError(null);

            try {
                // Try to get student's class and section from students table
                // Using ilike for case-insensitivity and adding institution_id filter
                const { data: studentData, error: studentError, status } = await supabase
                    .from('students')
                    .select('class_name, section, institution_id')
                    .ilike('email', user.email)
                    .eq('institution_id', user.institutionId)
                    .maybeSingle();

                console.log('[STUDENT] Query status:', status);
                if (studentError) {
                    console.error('[STUDENT] Error fetching student data:', studentError);
                    setError(`Database error: ${studentError.message} (Code: ${studentError.code})`);
                    return;
                }

                if (!studentData) {
                    console.log(`[STUDENT] Query returned NO data for email: ${user.email} and inst: ${user.institutionId}`);
                    // Fallback check: try without institution_id just to see if it's the culprit
                    const { data: fallbackData } = await supabase
                        .from('students')
                        .select('institution_id')
                        .ilike('email', user.email)
                        .maybeSingle();

                    if (fallbackData) {
                        console.log('[STUDENT] FALLBACK: Found student but institution_id mismatch. Auth ID:', user.institutionId, 'DB ID:', fallbackData.institution_id);
                        setError(`Institution ID mismatch. Please contact admin. (Auth: ${user.institutionId}, DB: ${fallbackData.institution_id})`);
                    } else {
                        setError('Your student profile is not set up yet. Please contact your institution admin.');
                    }
                    return;
                }

                console.log('[STUDENT] Student profile found:', studentData);

                // Validate data
                if (!studentData.class_name || !studentData.section) {
                    console.error('[STUDENT] Incomplete student data:', studentData);
                    setError('Your class or section is not set. Please contact your institution admin.');
                    return;
                }


                // Get class ID - filtering by name and institution_id through groups table
                // Using limit(1) to handle multiple classes with same name in different groups
                const { data: classDataArray, error: classError } = await supabase
                    .from('classes')
                    .select('id, groups!inner(institution_id)')
                    .eq('name', studentData.class_name)
                    .eq('groups.institution_id', user.institutionId)
                    .limit(1);

                if (classError) {
                    console.error('[STUDENT] Error fetching class data:', classError);
                    setError(`Error looking up class: ${classError.message}`);
                    return;
                }

                const classData = classDataArray?.[0];

                if (!classData) {
                    console.log('[STUDENT] No class found for name:', studentData.class_name, 'in institution:', user.institutionId);
                    setError(`Class "${studentData.class_name}" not found in the system.`);
                    return;
                }

                console.log('[STUDENT] Resolved Class ID:', classData.id);

                setStudentInfo({
                    class_name: studentData.class_name,
                    section: studentData.section,
                    class_id: classData.id
                });
            } catch (err) {
                console.error('[STUDENT] Unexpected error during profile lookup:', err);
                setError('An unexpected error occurred. Please try again later.');
            }
        };

        fetchStudentInfo();
    }, [user?.email, user?.institutionId]);

    // Store config ID for real-time subscriptions
    const [configId, setConfigId] = useState<string | null>(null);

    // Fetch timetable slots for student's class and section
    const { data: timetableSlots = [], isLoading, refetch } = useQuery({
        queryKey: ['student-timetable', studentInfo?.class_id, studentInfo?.section],
        queryFn: async () => {
            if (!studentInfo?.class_id || !studentInfo?.section) {
                console.log('[STUDENT] No student info available yet');
                return [];
            }

            console.log('[STUDENT] Fetching timetable for class:', studentInfo.class_name, 'Section:', studentInfo.section);

            // Optimized single query with join through timetable_configs
            const { data: slotsData, error: slotsError } = await supabase
                .from('timetable_slots')
                .select(`
                    *,
                    subjects:subject_id (name),
                    profiles:faculty_id (full_name),
                    timetable_configs!inner (
                        id,
                        class_id,
                        section
                    )
                `)
                .eq('timetable_configs.class_id', studentInfo.class_id)
                .eq('timetable_configs.section', studentInfo.section)
                .order('day_of_week')
                .order('period_index');

            if (slotsError) {
                console.error('[STUDENT] Error fetching timetable slots:', slotsError);
                throw slotsError;
            }

            // Store config_id for real-time subscriptions
            if (slotsData && slotsData.length > 0) {
                const firstSlot = slotsData[0] as any;
                if (firstSlot.timetable_configs?.id) {
                    setConfigId(firstSlot.timetable_configs.id);
                    console.log('[STUDENT] Config ID for subscriptions:', firstSlot.timetable_configs.id);
                }
            }

            console.log('[STUDENT] Fetched timetable slots:', slotsData?.length || 0, 'slots');

            return slotsData || [];
        },
        enabled: !!studentInfo?.class_id && !!studentInfo?.section,
        staleTime: 30 * 1000, // Consider data stale after 30 seconds
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    });

    // Fetch special slots
    const { data: specialSlots = [], isLoading: isLoadingSpecial } = useQuery({
        queryKey: ['student-special-slots', studentInfo?.class_id, studentInfo?.section],
        queryFn: async () => {
            if (!studentInfo?.class_id || !studentInfo?.section) return [];

            const { data, error } = await supabase
                .from('special_timetable_slots')
                .select(`
                    *,
                    subjects:subject_id (name),
                    profiles:faculty_id (full_name)
                `)
                .eq('class_id', studentInfo.class_id)
                .eq('section', studentInfo.section)
                .gte('event_date', new Date().toISOString().split('T')[0])
                .order('event_date')
                .order('start_time');

            if (error) throw error;
            return data || [];
        },
        enabled: !!studentInfo?.class_id && !!studentInfo?.section,
    });

    // Real-time subscriptions using Supabase Realtime
    useEffect(() => {
        if (!configId) {
            console.log('[STUDENT] No config ID yet, skipping real-time setup');
            return;
        }

        console.log('[STUDENT] Setting up real-time subscriptions for config:', configId);

        const channel = supabase
            .channel(`student-timetable-${configId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'timetable_slots',
                    filter: `config_id=eq.${configId}`,
                },
                (payload) => {
                    console.log('[STUDENT] Real-time: Timetable slot changed:', payload);
                    queryClient.invalidateQueries({ queryKey: ['student-timetable'] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'timetable_configs',
                    filter: `id=eq.${configId}`,
                },
                (payload) => {
                    console.log('[STUDENT] Real-time: Timetable config changed:', payload);
                    queryClient.invalidateQueries({ queryKey: ['student-timetable'] });
                }
            )
            .subscribe((status) => {
                console.log('[STUDENT] Subscription status:', status);
            });

        return () => {
            console.log('[STUDENT] Cleaning up real-time subscriptions');
            supabase.removeChannel(channel);
        };
    }, [configId, queryClient]);

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
    const timetableData: { [key: string]: TimetableSlot } = {};

    // 1. Add Regular Slots
    timetableSlots.forEach((slot: any) => {
        const normalizedDay = normalizeDay(slot.day_of_week);
        const key = `${normalizedDay}-${slot.period_index}`;
        timetableData[key] = { ...slot, day_of_week: normalizedDay };
    });

    // 2. Merge Special Slots for Selected Date
    if (selectedDate && specialSlots.length > 0) {
        const dateObj = new Date(selectedDate);
        const dayIndex = dateObj.getDay();
        const dayMapIdx = dayIndex === 0 ? 6 : dayIndex - 1; // 0=Sun -> 6, 1=Mon -> 0
        const selectedDayName = DAYS[dayMapIdx]; // e.g., "Monday"

        // Deduplicate special slots just in case
        const uniqueSpecialSlots = Array.from(new Map(specialSlots.map((s: any) => [`${s.event_date}-${s.start_time}`, s])).values());

        uniqueSpecialSlots.forEach((slot: any) => {
            // Only merge if slot is for the selected date
            if (slot.event_date === selectedDate) {
                // Match period based on time
                let matchedPeriod = -1;
                for (let p = 1; p <= configData.periods_per_day; p++) {
                    const timings = calculatePeriodTimings(p);
                    const [h, m] = slot.start_time.split(':').map(Number);
                    const hh = h % 12 || 12;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const formattedStartTime = `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;

                    if (timings.start === formattedStartTime) {
                        matchedPeriod = p;
                        break;
                    }
                }

                if (matchedPeriod !== -1) {
                    const key = `${selectedDayName}-${matchedPeriod}`;
                    timetableData[key] = {
                        ...slot,
                        day_of_week: selectedDayName,
                        period_index: matchedPeriod,
                        is_special: true // Mark as special
                    };
                }
            }
        });
    }

    // Show error state
    if (error) {
        return (
            <StudentLayout>
                <PageHeader title="My Timetable" subtitle="View your weekly class schedule" />
                <Card className="m-4">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <Calendar className="w-12 h-12 mb-4 text-destructive" />
                        <h2 className="text-xl font-semibold mb-2 text-destructive">Error Loading Timetable</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <p className="text-sm text-muted-foreground mt-4">
                            If this problem persists, please contact your institution administrator.
                        </p>
                    </CardContent>
                </Card>
            </StudentLayout>
        );
    }

    if (isLoading || !studentInfo) {
        return (
            <StudentLayout>
                <PageHeader title="My Timetable" subtitle="View your weekly class schedule" />
                <div className="flex justify-center p-10">
                    <Loader2 className="animate-spin w-8 h-8" />
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            <PageHeader
                title="My Timetable"
                subtitle={`${studentInfo.class_name} - Section ${studentInfo.section}`}
                actions={
                    <div className="flex items-center gap-2 bg-white rounded-lg border shadow-sm px-3 py-1.5">
                        <Calendar className="w-4 h-4 text-primary" />
                        <input
                            type="date"
                            className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                }
            />

            <Tabs defaultValue="timetable" className="m-4">
                <TabsList>
                    <TabsTrigger value="timetable">My Timetable</TabsTrigger>
                    <TabsTrigger value="special-classes">
                        Special Classes
                        {specialSlots.length > 0 && <span className="ml-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                    </TabsTrigger>
                    <TabsTrigger value="exam-schedule">Exam Schedule</TabsTrigger>
                </TabsList>

                <TabsContent value="timetable">
                    <Card>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="border p-3 bg-muted/50 w-24 text-left font-bold lowercase">Day</th>
                                        {Array.from({ length: configData.periods_per_day }, (_, i) => i + 1).map((p) => {
                                            const timings = calculatePeriodTimings(p);
                                            return (
                                                <Fragment key={p}>
                                                    <th className="border p-3 bg-muted/50 text-xs font-semibold text-left">
                                                        <div className="font-bold">Period {p}</div>
                                                        <div className="text-[10px] font-normal text-muted-foreground mt-0.5 whitespace-nowrap">
                                                            {timings.start}
                                                        </div>
                                                    </th>
                                                    {calculateAllTimings()
                                                        .filter((s, idx, arr) => s.type !== 'period' && idx > 0 && arr[idx - 1].type === 'period' && arr[idx - 1].index === p)
                                                        .map((b, bi) => (
                                                            <th key={bi} className={`border p-3 ${b.type === 'lunch' ? 'bg-orange-50/50 text-orange-600' : 'bg-blue-50/50 text-blue-600'} text-[10px] font-bold text-center uppercase tracking-widest w-16`}>
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
                                        <tr key={day} className="hover:bg-muted/5 transition-colors">
                                            <td className="border p-3 font-semibold text-sm bg-muted/10">{day}</td>
                                            {Array.from({ length: configData.periods_per_day }, (_, i) => i + 1).map((period) => {
                                                const slot = timetableSlots.find(
                                                    (s: any) => s.day_of_week === day && s.period_index === period
                                                );

                                                return (
                                                    <Fragment key={period}>
                                                        <td className="border p-2 min-w-[120px] h-20 align-top">
                                                            {slot ? (
                                                                <div className={`space-y-1 p-1 rounded-md h-full ${slot.is_special ? 'bg-orange-50 ring-1 ring-orange-200' : ''}`}>
                                                                    <Badge variant="default" className={`w-full justify-start text-[10px] font-bold truncate border-0 ${slot.is_special ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-primary/10 text-primary'}`}>
                                                                        {slot.subjects?.name}
                                                                    </Badge>
                                                                    <div className="text-[10px] pl-1 font-medium flex items-center gap-1">
                                                                        <User className="w-2.5 h-2.5 opacity-50" />
                                                                        <span className="truncate">{slot.profiles?.full_name}</span>
                                                                    </div>
                                                                    {slot.room_number && (
                                                                        <div className="text-[9px] text-muted-foreground pl-1">
                                                                            Rm: {slot.room_number}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/10 text-[10px]">
                                                                    Free
                                                                </div>
                                                            )}
                                                        </td>
                                                        {calculateAllTimings()
                                                            .filter((s, idx, arr) => s.type !== 'period' && idx > 0 && arr[idx - 1].type === 'period' && arr[idx - 1].index === period)
                                                            .map((b, bi) => (
                                                                <td key={bi} className={`border p-2 ${b.type === 'lunch' ? 'bg-orange-50/20' : 'bg-blue-50/20'} align-middle text-center`}>
                                                                    <div className={`[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold ${b.type === 'lunch' ? 'text-orange-400' : 'text-blue-400'} tracking-[0.2em] uppercase mx-auto`}>
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

                    {timetableSlots.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                <Calendar className="w-12 h-12 mb-4" />
                                <h2 className="text-xl font-semibold mb-2">No Timetable Published</h2>
                                <p>Your class teacher hasn't published the timetable yet.</p>
                                <p className="text-sm mt-2">Class: {studentInfo.class_name} - Section {studentInfo.section}</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="special-classes">
                    <Card>
                        <CardContent className="p-0 overflow-x-auto">
                            {isLoadingSpecial ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                            ) : (() => {
                                // Filter special slots for selected date
                                const selectedDateSlots = specialSlots.filter((s: any) => s.event_date === selectedDate);

                                if (selectedDateSlots.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p>No special classes scheduled for {new Date(selectedDate).toLocaleDateString()}.</p>
                                        </div>
                                    );
                                }

                                // Get day name for selected date
                                const dateObj = new Date(selectedDate);
                                const dayIndex = dateObj.getDay();
                                const dayMapping = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                const dayName = dayMapping[dayIndex];

                                return (
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="border p-3 bg-muted/50 w-24 text-left font-bold">Day</th>
                                                {Array.from({ length: configData.periods_per_day }, (_, i) => i + 1).map((p) => {
                                                    const timings = calculatePeriodTimings(p);
                                                    return (
                                                        <Fragment key={p}>
                                                            <th className="border p-3 bg-muted/50 text-xs font-semibold text-left">
                                                                <div className="font-bold">Period {p}</div>
                                                                <div className="text-[10px] font-normal text-muted-foreground mt-0.5 whitespace-nowrap">
                                                                    {timings.start}
                                                                </div>
                                                            </th>
                                                            {calculateAllTimings()
                                                                .filter((s, idx, arr) => s.type !== 'period' && idx > 0 && arr[idx - 1].type === 'period' && arr[idx - 1].index === p)
                                                                .map((b, bi) => (
                                                                    <th key={bi} className={`border p-3 ${b.type === 'lunch' ? 'bg-orange-50/50 text-orange-600' : 'bg-blue-50/50 text-blue-600'} text-[10px] font-bold text-center uppercase tracking-widest w-16`}>
                                                                        {b.name}
                                                                    </th>
                                                                ))}
                                                        </Fragment>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="hover:bg-muted/5 transition-colors">
                                                <td className="border p-3 font-semibold text-sm bg-muted/10">{dayName}</td>
                                                {Array.from({ length: configData.periods_per_day }, (_, i) => i + 1).map((period) => {
                                                    // Find special slot for this period by matching time
                                                    const timings = calculatePeriodTimings(period);
                                                    const slot = selectedDateSlots.find((s: any) => {
                                                        const [h, m] = s.start_time.split(':').map(Number);
                                                        const hh = h % 12 || 12;
                                                        const ampm = h >= 12 ? 'PM' : 'AM';
                                                        const formatted = `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
                                                        return formatted === timings.start;
                                                    });

                                                    return (
                                                        <Fragment key={period}>
                                                            <td className="border p-2 min-w-[120px] h-20 align-top">
                                                                {slot ? (
                                                                    <div className="space-y-1 p-1 rounded-md h-full bg-orange-50 ring-1 ring-orange-200">
                                                                        <Badge variant="default" className="w-full justify-start text-[10px] font-bold truncate border-0 bg-orange-100 text-orange-700 hover:bg-orange-200">
                                                                            {slot.subjects?.name}
                                                                        </Badge>
                                                                        <div className="text-[10px] pl-1 font-medium flex items-center gap-1">
                                                                            <User className="w-2.5 h-2.5 opacity-50" />
                                                                            <span className="truncate">{slot.profiles?.full_name}</span>
                                                                        </div>
                                                                        {slot.room_number && (
                                                                            <div className="text-[9px] text-muted-foreground pl-1">
                                                                                Rm: {slot.room_number}
                                                                            </div>
                                                                        )}
                                                                        {slot.title && (
                                                                            <div className="text-[9px] text-orange-600 pl-1 font-semibold">
                                                                                {slot.title}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/10 text-[10px]">
                                                                        -
                                                                    </div>
                                                                )}
                                                            </td>
                                                            {calculateAllTimings()
                                                                .filter((s, idx, arr) => s.type !== 'period' && idx > 0 && arr[idx - 1].type === 'period' && arr[idx - 1].index === period)
                                                                .map((b, bi) => (
                                                                    <td key={bi} className={`border p-2 ${b.type === 'lunch' ? 'bg-orange-50/20' : 'bg-blue-50/20'} align-middle text-center`}>
                                                                        <div className={`[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold ${b.type === 'lunch' ? 'text-orange-400' : 'text-blue-400'} tracking-[0.2em] uppercase mx-auto`}>
                                                                            {b.name}
                                                                        </div>
                                                                    </td>
                                                                ))}
                                                        </Fragment>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="exam-schedule">
                    <StudentExamScheduleView />
                </TabsContent>
            </Tabs >
        </StudentLayout >
    );
}
