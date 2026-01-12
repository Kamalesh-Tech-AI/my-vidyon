import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, Clock } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StudentLayout } from '@/layouts/StudentLayout';

interface TimetableSlot {
    id: string;
    day_of_week: string;
    period_index: number;
    start_time: string;
    end_time: string;
    subject: { name: string; code: string } | null;
    faculty: { full_name: string } | null;
    is_break: boolean;
    break_name: string;
}

export function StudentTimetable() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [slots, setSlots] = useState<TimetableSlot[]>([]);
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchTimetable();
        }
    }, [user]);

    const fetchTimetable = async () => {
        try {
            setLoading(true);
            // 1. Get Student's Class from 'students' table
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('class_name, section, institution_id')
                .eq('email', user?.email)
                .single();

            if (studentError) throw studentError;
            if (!studentData) return;

            // 2. Resolve Class ID (Need ID for timetable config)
            const { data: classData, error: classError } = await supabase
                .from('classes')
                .select('id')
                .eq('name', studentData.class_name)
                // .eq('group_id', ...) // Ideally match institution group but simplified
                .limit(1)
                .single();

            if (classError && classError.code !== 'PGRST116') throw classError;
            if (!classData) return;

            // 3. Fetch Config
            const { data: configData, error: configError } = await supabase
                .from('timetable_configs')
                .select('*')
                .eq('class_id', classData.id)
                .eq('section', studentData.section)
                .single();

            if (configError && configError.code !== 'PGRST116') throw configError;

            if (configData) {
                setConfig(configData);

                // 4. Fetch Slots
                const { data: slotData, error: slotError } = await supabase
                    .from('timetable_slots')
                    .select(`
                        id, day_of_week, period_index, start_time, end_time, is_break, break_name,
                        subject:subjects(name, code),
                        faculty:profiles(full_name)
                    `)
                    .eq('config_id', configData.id)
                    .order('period_index');

                const transformedSlots = (slotData || []).map((slot: any) => ({
                    ...slot,
                    subject: Array.isArray(slot.subject) ? slot.subject[0] : slot.subject,
                    faculty: Array.isArray(slot.faculty) ? slot.faculty[0] : slot.faculty
                }));

                setSlots(transformedSlots);
            }

        } catch (error) {
            console.error('Error fetching timetable:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
            </StudentLayout>
        );
    }

    if (!config) {
        return (
            <StudentLayout>
                <PageHeader title="My Timetable" subtitle="Weekly Schedule" />
                <Card className="m-4">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                        <Calendar className="w-12 h-12 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No Timetable Published</h2>
                        <p>Your class teacher hasn't published the timetable yet.</p>
                    </CardContent>
                </Card>
            </StudentLayout>
        );
    }

    const days = config.days_of_week || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = Array.from({ length: config.periods_per_day }, (_, i) => i + 1);

    return (
        <StudentLayout>
            <PageHeader title="My Timetable" subtitle="Weekly Schedule" />

            <Card className="overflow-x-auto">
                <CardContent className="p-0">
                    <table className="w-full border-collapse min-w-[1000px]">
                        <thead>
                            <tr>
                                <th className="border p-3 bg-muted/50 w-32 text-left">Day</th>
                                {periods.map(p => (
                                    <th key={p} className="border p-3 bg-muted/50 text-center min-w-[120px]">
                                        <div className="font-semibold text-sm">Period {p}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((day: string) => (
                                <tr key={day}>
                                    <td className="border p-3 font-medium bg-muted/10">{day}</td>
                                    {periods.map(p => {
                                        const slot = slots.find(s => s.day_of_week === day && s.period_index === p);
                                        return (
                                            <td key={p} className="border p-2 text-center h-24 align-top">
                                                {slot ? (
                                                    <div className="flex flex-col h-full justify-between gap-1">
                                                        {slot.is_break ? (
                                                            <div className="bg-secondary/50 rounded p-1 flex items-center justify-center h-full text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                                {slot.break_name || 'Break'}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="font-semibold text-sm text-primary">
                                                                    {slot.subject?.name || 'Free'}
                                                                </div>
                                                                {slot.faculty && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {slot.faculty.full_name}
                                                                    </div>
                                                                )}
                                                                <div className="mt-auto flex items-center justify-center gap-1 text-[10px] text-muted-foreground bg-muted rounded-full py-0.5 px-2 w-fit mx-auto">
                                                                    <Clock className="w-3 h-3" />
                                                                    {slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">-</div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </StudentLayout>
    );
}
