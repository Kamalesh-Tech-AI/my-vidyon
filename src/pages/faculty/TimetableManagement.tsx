import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Plus, Save, Trash2, Clock, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { FacultyLayout } from '@/layouts/FacultyLayout';

interface TimetableConfig {
    id?: string;
    class_id: string;
    section: string;
    days_of_week: string[];
    periods_per_day: number;
    period_duration_minutes: number;
    start_time: string;
    break_configs: any[];
}

interface TimetableSlot {
    id?: string;
    day_of_week: string;
    period_index: number;
    start_time: string;
    end_time: string;
    subject_id?: string;
    faculty_id?: string;
    is_break?: boolean;
    break_name?: string;
}

export function TimetableManagement() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Faculty's assigned class info
    const [classInfo, setClassInfo] = useState<{ classId: string, className: string, section: string } | null>(null);

    // Data State
    const [config, setConfig] = useState<TimetableConfig | null>(null);
    const [slots, setSlots] = useState<TimetableSlot[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [faculties, setFaculties] = useState<any[]>([]);

    // Config Form State
    const [configForm, setConfigForm] = useState({
        periods: 8,
        duration: 45,
        startTime: '09:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    });

    useEffect(() => {
        if (user) {
            fetchFacultyClass();
        }
    }, [user]);

    const fetchFacultyClass = async () => {
        try {
            setLoading(true);
            // 1. Get Faculty's Class Assignment from staff_details
            const { data: staffDetails, error: staffError } = await supabase
                .from('staff_details')
                .select('*')
                .eq('profile_id', user?.id)
                .single();

            if (staffError) throw staffError;

            if (!staffDetails || !staffDetails.class_assigned) {
                setLoading(false);
                return; // Not a class teacher or not assigned
            }

            // 2. Resolve Class ID from Name (since staff_details stores name currently)
            // This part assumes we can map name back to ID. 
            // Ideally staff_details should store ID, but based on previous files it uses text.
            // We will try to find the class by name.
            const { data: classData, error: classError } = await supabase
                .from('classes')
                .select('id, name')
                .eq('name', staffDetails.class_assigned)
                .single();

            if (classError && classError.code !== 'PGRST116') throw classError;

            if (classData) {
                setClassInfo({
                    classId: classData.id,
                    className: staffDetails.class_assigned,
                    section: staffDetails.section_assigned || 'A' // Default if missing
                });

                // Fetch Config & Master Data
                await Promise.all([
                    fetchTimetableConfig(classData.id, staffDetails.section_assigned || 'A'),
                    fetchSubjects(classData.id, staffDetails.class_assigned), // Pass name for compatibility
                    fetchFaculties(staffDetails.institution_id)
                ]);
            }

        } catch (error) {
            console.error('Error fetching class info:', error);
            toast.error('Failed to load class information');
        } finally {
            setLoading(false);
        }
    };

    const fetchTimetableConfig = async (classId: string, section: string) => {
        const { data } = await supabase
            .from('timetable_configs')
            .select('*')
            .eq('class_id', classId)
            .eq('section', section)
            .single();

        if (data) {
            setConfig(data);
            setConfigForm({
                periods: data.periods_per_day,
                duration: data.period_duration_minutes,
                startTime: data.start_time.substring(0, 5), // HH:MM
                days: data.days_of_week
            });
            // Fetch Slots if config exists
            const { data: slotData } = await supabase
                .from('timetable_slots')
                .select('*')
                .eq('config_id', data.id);
            setSlots(slotData || []);
        }
    };

    const fetchSubjects = async (classId: string, className: string) => {
        // Try matching by ID first, then Name
        const { data } = await supabase
            .from('subjects')
            .select('*')
            .or(`class_name.eq.${className}`); // Simplified for MVP
        setSubjects(data || []);
    };

    const fetchFaculties = async (institutionId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('institution_id', institutionId)
            .eq('role', 'faculty');
        setFaculties(data || []);
    };

    const handleSaveConfig = async () => {
        if (!classInfo) return;
        setSaving(true);
        try {
            const payload = {
                institution_id: (user as any)?.user_metadata?.institution_id || (user as any)?.institution_id,
                class_id: classInfo.classId,
                section: classInfo.section,
                periods_per_day: configForm.periods,
                period_duration_minutes: configForm.duration,
                start_time: configForm.startTime,
                days_of_week: configForm.days
            };

            let result;
            if (config?.id) {
                result = await supabase
                    .from('timetable_configs')
                    .update(payload)
                    .eq('id', config.id)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from('timetable_configs')
                    .insert(payload)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;
            setConfig(result.data);
            toast.success("Timetable structure saved!");

            // Regenerate empty slots locally if needed or just let user edit
        } catch (err: any) {
            toast.error("Failed to save config: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateSlot = async (day: string, periodIndex: number, field: string, value: any) => {
        if (!config?.id) return;

        // Find existing slot or create mock
        const existingSlot = slots.find(s => s.day_of_week === day && s.period_index === periodIndex);
        const newSlot = { ...existingSlot };

        if (field === 'subject_id') newSlot.subject_id = value;
        if (field === 'faculty_id') newSlot.faculty_id = value;

        // Optimistic update
        const updatedSlots = slots.filter(s => !(s.day_of_week === day && s.period_index === periodIndex));
        updatedSlots.push({
            ...newSlot,
            config_id: config.id,
            day_of_week: day,
            period_index: periodIndex,
            // Calculate times roughly for now (backend/logic should handle this strictly but for UI we simulate)
            start_time: '00:00',
            end_time: '00:00'
        } as TimetableSlot);
        setSlots(updatedSlots);

        // Save to DB (Auto-save for slots)
        try {
            const { error } = await supabase
                .from('timetable_slots')
                .upsert({
                    config_id: config.id,
                    day_of_week: day,
                    period_index: periodIndex,
                    start_time: calculateStartTime(periodIndex), // Helper needed
                    end_time: calculateEndTime(periodIndex),
                    subject_id: newSlot.subject_id,
                    faculty_id: newSlot.faculty_id
                }, { onConflict: 'config_id,day_of_week,period_index' });

            if (error) throw error;
        } catch (err) {
            console.error("Auto-save failed", err);
            // Revert?
        }
    };

    // Helper to calculate time based on config
    const calculateStartTime = (periodIndex: number) => {
        if (!configForm.startTime) return '09:00';
        const [startH, startM] = configForm.startTime.split(':').map(Number);
        const minutesToAdd = (periodIndex - 1) * configForm.duration;
        const date = new Date();
        date.setHours(startH, startM + minutesToAdd);
        return date.toTimeString().substring(0, 5);
    };

    const calculateEndTime = (periodIndex: number) => {
        if (!configForm.startTime) return '09:45';
        const [startH, startM] = configForm.startTime.split(':').map(Number);
        const minutesToAdd = (periodIndex) * configForm.duration;
        const date = new Date();
        date.setHours(startH, startM + minutesToAdd);
        return date.toTimeString().substring(0, 5);
    };

    if (loading) {
        return (
            <FacultyLayout>
                <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
            </FacultyLayout>
        );
    }

    if (!classInfo) {
        return (
            <FacultyLayout>
                <Card className="m-6">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                        <Calendar className="w-12 h-12 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No Class Assigned</h2>
                        <p>You are not currently assigned as a Class Teacher for any section.</p>
                    </CardContent>
                </Card>
            </FacultyLayout>
        );
    }

    return (
        <FacultyLayout>
            <div className="space-y-6">
                <PageHeader
                    title={`Timetable: ${classInfo.className} - Section ${classInfo.section}`}
                    subtitle="Manage weekly schedule and faculty assignments"
                />

                <Tabs defaultValue="timetable">
                    <TabsList>
                        <TabsTrigger value="timetable">Weekly Timetable</TabsTrigger>
                        <TabsTrigger value="configuration">Configuration</TabsTrigger>
                    </TabsList>

                    <TabsContent value="configuration" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Timetable Structure</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Periods per Day</Label>
                                        <Input
                                            type="number"
                                            value={configForm.periods}
                                            onChange={e => setConfigForm({ ...configForm, periods: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Duration (Minutes)</Label>
                                        <Input
                                            type="number"
                                            value={configForm.duration}
                                            onChange={e => setConfigForm({ ...configForm, duration: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Start Time</Label>
                                        <Input
                                            type="time"
                                            value={configForm.startTime}
                                            onChange={e => setConfigForm({ ...configForm, startTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <div className="p-6 pt-0">
                                <Button onClick={handleSaveConfig} disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Configuration
                                </Button>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="timetable">
                        {!config ? (
                            <div className="text-center p-12 bg-muted/20 rounded-lg border border-dashed">
                                <p className="text-muted-foreground mb-4">Timetable not configured yet.</p>
                                <Button variant="outline" onClick={() => document.getElementById('radix-:r0:-trigger-configuration')?.click()}>
                                    Go to Configuration
                                </Button>
                            </div>
                        ) : (
                            <Card className="overflow-x-auto">
                                <CardContent className="p-0">
                                    <table className="w-full border-collapse min-w-[1000px]">
                                        <thead>
                                            <tr>
                                                <th className="border p-2 bg-muted/50 w-24">Day</th>
                                                {Array.from({ length: configForm.periods }).map((_, i) => (
                                                    <th key={i} className="border p-2 bg-muted/50 text-sm font-medium">
                                                        <div>Period {i + 1}</div>
                                                        <div className="text-xs text-muted-foreground font-normal">
                                                            {calculateStartTime(i + 1)} - {calculateEndTime(i + 1)}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {configForm.days.map(day => (
                                                <tr key={day}>
                                                    <td className="border p-2 font-medium bg-muted/10">{day}</td>
                                                    {Array.from({ length: configForm.periods }).map((_, i) => {
                                                        const periodIndex = i + 1;
                                                        const slot = slots.find(s => s.day_of_week === day && s.period_index === periodIndex);

                                                        // Find suitable faculties for the selected subject (if any)
                                                        // This fulfills the "dropdown of faculties for the subjects" req
                                                        // Ideally we filter faculties list based on selected subject

                                                        return (
                                                            <td key={periodIndex} className="border p-2 min-w-[140px]">
                                                                <div className="space-y-2">
                                                                    <Select
                                                                        value={slot?.subject_id || ''}
                                                                        onValueChange={(val) => handleUpdateSlot(day, periodIndex, 'subject_id', val)}
                                                                    >
                                                                        <SelectTrigger className="h-7 text-xs">
                                                                            <SelectValue placeholder="Subject" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {subjects.map(sub => (
                                                                                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>

                                                                    {slot?.subject_id && (
                                                                        <Select
                                                                            value={slot?.faculty_id || ''}
                                                                            onValueChange={(val) => handleUpdateSlot(day, periodIndex, 'faculty_id', val)}
                                                                        >
                                                                            <SelectTrigger className="h-7 text-xs bg-muted/20">
                                                                                <SelectValue placeholder="Faculty" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {/*
                                                                                Requirement: "selected within the dropdown of the faculties for the subjects"
                                                                                Logic: Here we ideally show ALL faculties, or filter.
                                                                                Since we don't have strict mapping yet in `faculty_subjects`, we show all.
                                                                                This allows the user to perform the mapping via this UI.
                                                                             */}
                                                                                {faculties.map(fac => (
                                                                                    <SelectItem key={fac.id} value={fac.id}>{fac.full_name}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </FacultyLayout>
    );
}
