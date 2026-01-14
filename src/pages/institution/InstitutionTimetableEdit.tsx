import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
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
import { Save, ArrowLeft } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

interface TimetableSlot {
    day_of_week: string;
    period_index: number;
    subject_id?: string;
    class_id?: string;
    section?: string;
    start_time: string;
    end_time: string;
    room_number?: string;
    is_break?: boolean;
    break_name?: string;
}

export function InstitutionTimetableEdit() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { facultyId } = useParams();
    const queryClient = useQueryClient();

    const [timetableData, setTimetableData] = useState<{ [key: string]: TimetableSlot }>({});
    const [configForm, setConfigForm] = useState({
        startTime: '09:00',
        periodDuration: 45,
    });

    // Fetch faculty details
    const { data: faculty, isLoading: isLoadingFaculty } = useQuery({
        queryKey: ['faculty-detail', facultyId],
        queryFn: async () => {
            if (!facultyId) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('id', facultyId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!facultyId,
    });

    // Fetch subjects
    const { data: subjects = [] } = useQuery({
        queryKey: ['institution-subjects', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return [];
            const { data, error } = await supabase
                .from('subjects')
                .select('id, name, class_name')
                .eq('institution_id', user.institutionId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.institutionId,
    });

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ['institution-classes', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return [];
            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .eq('institution_id', user.institutionId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.institutionId,
    });

    // Fetch existing timetable
    const { data: existingTimetable = [], isLoading: isLoadingTimetable } = useQuery({
        queryKey: ['faculty-timetable-edit', facultyId],
        queryFn: async () => {
            if (!facultyId) return [];
            const { data, error } = await supabase
                .from('timetable_slots')
                .select('*')
                .eq('faculty_id', facultyId)
                .order('day_of_week')
                .order('period_index');
            if (error) throw error;
            return data || [];
        },
        enabled: !!facultyId,
    });

    // Initialize timetable data from existing slots
    useEffect(() => {
        if (existingTimetable.length > 0) {
            const data: { [key: string]: TimetableSlot } = {};
            existingTimetable.forEach((slot: any) => {
                const key = `${slot.day_of_week}-${slot.period_index}`;
                data[key] = {
                    day_of_week: slot.day_of_week,
                    period_index: slot.period_index,
                    subject_id: slot.subject_id,
                    class_id: slot.class_id,
                    section: slot.section,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    room_number: slot.room_number,
                    is_break: slot.is_break,
                    break_name: slot.break_name,
                };
            });
            setTimetableData(data);
        }
    }, [existingTimetable]);

    // Save mutation
    const saveTimetableMutation = useMutation({
        mutationFn: async () => {
            if (!facultyId || !user?.institutionId) throw new Error('Missing required data');

            // Get or create config
            const { data: existingConfig } = await supabase
                .from('timetable_configs')
                .select('id')
                .eq('institution_id', user.institutionId)
                .limit(1)
                .single();

            let configId = existingConfig?.id;
            if (!configId) {
                const { data: newConfig } = await supabase
                    .from('timetable_configs')
                    .insert({
                        institution_id: user.institutionId,
                        periods_per_day: 8,
                        period_duration_minutes: configForm.periodDuration,
                        start_time: configForm.startTime,
                    })
                    .select('id')
                    .single();
                configId = newConfig?.id;
            }

            // Delete existing slots
            await supabase.from('timetable_slots').delete().eq('faculty_id', facultyId);

            // Insert new slots
            const slotsToInsert = Object.values(timetableData)
                .filter((slot) => slot.subject_id || slot.is_break)
                .map((slot) => ({
                    config_id: configId,
                    faculty_id: facultyId,
                    day_of_week: slot.day_of_week,
                    period_index: slot.period_index,
                    subject_id: slot.subject_id,
                    class_id: slot.class_id,
                    section: slot.section,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    room_number: slot.room_number,
                    is_break: slot.is_break || false,
                    break_name: slot.break_name,
                }));

            if (slotsToInsert.length > 0) {
                await supabase.from('timetable_slots').insert(slotsToInsert);
            }
        },
        onSuccess: () => {
            toast.success('Timetable saved successfully');
            queryClient.invalidateQueries({ queryKey: ['faculty-timetable'] });
            queryClient.invalidateQueries({ queryKey: ['faculty-timetable-edit'] });
            navigate('/institution/timetable');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to save timetable');
        },
    });

    const calculateTime = (periodIndex: number, isEnd: boolean = false) => {
        if (!configForm.startTime) return '00:00';
        const parts = configForm.startTime.split(':');
        if (parts.length !== 2) return '00:00';

        const [hours, minutes] = parts.map(Number);
        if (isNaN(hours) || isNaN(minutes)) return '00:00';

        const totalMinutes = hours * 60 + minutes + (periodIndex - (isEnd ? 0 : 1)) * configForm.periodDuration;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const updateSlot = (day: string, period: number, field: string, value: any) => {
        const key = `${day}-${period}`;
        const currentSlot = timetableData[key] || {
            day_of_week: day,
            period_index: period,
            start_time: calculateTime(period),
            end_time: calculateTime(period, true),
        };
        setTimetableData((prev) => ({ ...prev, [key]: { ...currentSlot, [field]: value } }));
    };

    if (isLoadingFaculty || isLoadingTimetable) {
        return (
            <InstitutionLayout>
                <Loader fullScreen={false} />
            </InstitutionLayout>
        );
    }

    if (!faculty) {
        return (
            <InstitutionLayout>
                <div className="text-center py-12">
                    <p className="text-destructive">Faculty not found</p>
                    <Button onClick={() => navigate('/institution/timetable')} className="mt-4">
                        Back to Timetable
                    </Button>
                </div>
            </InstitutionLayout>
        );
    }

    return (
        <InstitutionLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate('/institution/timetable')}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <PageHeader
                                title={`Edit Timetable - ${faculty.full_name}`}
                                subtitle="Assign subjects and classes to periods"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/institution/timetable')}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => saveTimetableMutation.mutate()}
                            disabled={saveTimetableMutation.isPending}
                            className="gap-2"
                        >
                            <Save className="w-4 h-4" /> Save Changes
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-6">
                        {/* Config Inputs */}
                        <div className="flex gap-4 mb-6 bg-muted/30 p-4 rounded-lg border">
                            <div className="grid gap-1.5">
                                <label className="text-xs font-medium">Start Time</label>
                                <Input
                                    type="time"
                                    className="h-8 w-32"
                                    value={configForm.startTime}
                                    onChange={(e) => setConfigForm({ ...configForm, startTime: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <label className="text-xs font-medium">Period Duration (min)</label>
                                <Input
                                    type="number"
                                    className="h-8 w-32"
                                    value={configForm.periodDuration}
                                    onChange={(e) => setConfigForm({ ...configForm, periodDuration: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        {/* Timetable Grid */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="border p-3 bg-muted/50 w-28 sticky left-0 z-10 font-bold text-left">
                                            Day
                                        </th>
                                        {PERIODS.map((period) => (
                                            <th
                                                key={period}
                                                className="border p-2 bg-muted/50 text-xs font-medium text-left min-w-[160px]"
                                            >
                                                <div className="font-bold">Period {period}</div>
                                                <div className="text-[10px] text-muted-foreground font-normal">
                                                    {calculateTime(period)} - {calculateTime(period, true)}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {DAYS.map((day) => (
                                        <tr key={day}>
                                            <td className="border p-3 font-semibold bg-muted/10 sticky left-0 z-10">
                                                {day}
                                            </td>
                                            {PERIODS.map((period) => {
                                                const key = `${day}-${period}`;
                                                const slot = timetableData[key];
                                                return (
                                                    <td key={period} className="border p-2 bg-background align-top">
                                                        <div className="space-y-2">
                                                            <Select
                                                                value={slot?.subject_id || ''}
                                                                onValueChange={(v) => updateSlot(day, period, 'subject_id', v)}
                                                            >
                                                                <SelectTrigger className="h-7 text-xs">
                                                                    <SelectValue placeholder="Subject" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="">Free</SelectItem>
                                                                    {subjects.map((s: any) => (
                                                                        <SelectItem key={s.id} value={String(s.id)}>
                                                                            {s.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                            {slot?.subject_id && (
                                                                <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                                                                    <Select
                                                                        value={slot?.class_id || ''}
                                                                        onValueChange={(v) => updateSlot(day, period, 'class_id', v)}
                                                                    >
                                                                        <SelectTrigger className="h-7 text-xs">
                                                                            <SelectValue placeholder="Class" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {classes.map((c: any) => (
                                                                                <SelectItem key={c.id} value={String(c.id)}>
                                                                                    {c.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <div className="grid grid-cols-2 gap-1.5">
                                                                        <Input
                                                                            placeholder="Sec"
                                                                            className="h-7 text-xs px-2"
                                                                            value={slot?.section || ''}
                                                                            onChange={(e) =>
                                                                                updateSlot(day, period, 'section', e.target.value)
                                                                            }
                                                                        />
                                                                        <Input
                                                                            placeholder="Rm"
                                                                            className="h-7 text-xs px-2"
                                                                            value={slot?.room_number || ''}
                                                                            onChange={(e) =>
                                                                                updateSlot(day, period, 'room_number', e.target.value)
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </InstitutionLayout>
    );
}
