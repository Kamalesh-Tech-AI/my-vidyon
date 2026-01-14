import { useState } from 'react';
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
import { useMinimumLoadingTime } from '@/hooks/useMinimumLoadingTime';
import { Calendar, Clock, BookOpen, Save, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/common/Badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

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

    // Fetch faculty's class assignment (optional - not required for timetable to work)
    const { data: staffDetails } = useQuery({
        queryKey: ['faculty-assignment', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            const { data, error } = await supabase
                .from('staff_details')
                .select('*')
                .eq('profile_id', user.id)
                .maybeSingle();

            if (error) {
                console.log('Staff details not found (optional):', error);
                return null;
            }
            return data;
        },
        enabled: !!user?.id,
        retry: false,
    });

    // Fetch class details (optional)
    const { data: classDetails } = useQuery({
        queryKey: ['class-details', staffDetails?.class_assigned],
        queryFn: async () => {
            if (!staffDetails?.class_assigned) return null;

            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .eq('name', staffDetails.class_assigned)
                .maybeSingle();

            if (error) {
                console.log('Class details not found (optional):', error);
                return null;
            }
            return data;
        },
        enabled: !!staffDetails?.class_assigned,
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

    // Fetch class timetable (for editing) - Shows all slots for 10th A
    const { data: classTimetable = [], isLoading: isLoadingClassTimetable } = useQuery({
        queryKey: ['class-timetable-10th-a'],
        queryFn: async () => {
            console.log('Fetching class timetable for 10th A...');
            // Get the class_id for "10th"
            const { data: tenthClass } = await supabase
                .from('classes')
                .select('id')
                .eq('name', '10th')
                .limit(1)
                .single();

            if (!tenthClass) {
                console.error('10th class not found');
                return [];
            }

            console.log('10th class ID:', tenthClass.id);

            // Get all slots for 10th A (regardless of which faculty created them)
            const { data, error } = await supabase
                .from('timetable_slots')
                .select(`
                    *,
                    subjects:subject_id (name),
                    profiles:faculty_id (full_name)
                `)
                .eq('class_id', tenthClass.id)
                .eq('section', 'A')
                .order('day_of_week')
                .order('period_index');

            if (error) {
                console.error('Error fetching class timetable:', error);
                return [];
            }

            console.log('Fetched class timetable slots:', data);
            return data || [];
        },
    });

    // Convert array to object for easier lookup
    const classTimetableData: { [key: string]: any } = {};
    classTimetable.forEach((slot: any) => {
        const key = `${slot.day_of_week}-${slot.period_index}`;
        classTimetableData[key] = slot;
    });

    const myScheduleData: { [key: string]: any } = {};
    mySchedule.forEach((slot: any) => {
        const key = `${slot.day_of_week}-${slot.period_index}`;
        myScheduleData[key] = slot;
    });

    // Save class timetable slot
    const saveSlotMutation = useMutation({
        mutationFn: async () => {
            if (!editingSlot || !user?.id) {
                throw new Error('Missing required data');
            }

            console.log('Saving slot:', editingSlot);

            // Get the class_id for "10th"
            const { data: tenthClass } = await supabase
                .from('classes')
                .select('id')
                .eq('name', '10th')
                .limit(1)
                .single();

            if (!tenthClass) {
                throw new Error('10th class not found in database');
            }

            console.log('Using class ID:', tenthClass.id);

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
                        period_duration_minutes: 45,
                        start_time: '09:00',
                    })
                    .select('id')
                    .single();
                configId = newConfig?.id;
            }

            console.log('Using config ID:', configId);

            // Delete existing slot for 10th A
            const { error: deleteError } = await supabase
                .from('timetable_slots')
                .delete()
                .eq('class_id', tenthClass.id)
                .eq('section', 'A')
                .eq('day_of_week', editingSlot.day)
                .eq('period_index', editingSlot.period);

            if (deleteError) {
                console.error('Delete error:', deleteError);
                // Continue anyway - might not exist
            } else {
                console.log('Deleted existing slot successfully');
            }

            // Small delay to ensure delete completes
            await new Promise(resolve => setTimeout(resolve, 100));

            // Insert new slot if subject is selected
            if (editingSlot.data.subject_id) {
                const slotData = {
                    config_id: configId,
                    faculty_id: editingSlot.data.assigned_faculty_id || user.id,
                    class_id: tenthClass.id,
                    section: 'A',
                    day_of_week: editingSlot.day,
                    period_index: editingSlot.period,
                    subject_id: parseInt(editingSlot.data.subject_id),
                    start_time: editingSlot.data.start_time || '09:00',
                    end_time: editingSlot.data.end_time || '10:00',
                    room_number: editingSlot.data.room_number || null,
                    is_break: false,
                };

                console.log('Inserting slot data:', slotData);

                const { data: insertedData, error: insertError } = await supabase
                    .from('timetable_slots')
                    .insert(slotData)
                    .select();

                if (insertError) {
                    console.error('Insert error:', insertError);
                    throw insertError;
                }

                console.log('Inserted successfully:', insertedData);
            } else {
                console.log('No subject selected, slot deleted only');
            }
        },
        onSuccess: () => {
            console.log('Timetable saved successfully, refetching data...');
            toast.success('Timetable updated successfully');
            queryClient.invalidateQueries({ queryKey: ['class-timetable-10th-a'] });
            queryClient.refetchQueries({ queryKey: ['class-timetable-10th-a'] });
            setIsEditDialogOpen(false);
            setEditingSlot(null);
        },
        onError: (error: any) => {
            console.error('Save error:', error);
            toast.error(error.message || 'Failed to update timetable');
        },
    });

    // Delete timetable slot
    const deleteSlotMutation = useMutation({
        mutationFn: async ({ day, period }: { day: string; period: number }) => {
            if (!user?.id) {
                throw new Error('User not found');
            }

            // Get the class_id for "10th"
            const { data: tenthClass } = await supabase
                .from('classes')
                .select('id')
                .eq('name', '10th')
                .limit(1)
                .single();

            if (!tenthClass) {
                throw new Error('10th class not found in database');
            }

            // Delete the slot
            const { error } = await supabase
                .from('timetable_slots')
                .delete()
                .eq('class_id', tenthClass.id)
                .eq('section', 'A')
                .eq('day_of_week', day)
                .eq('period_index', period);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Slot deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['class-timetable-10th-a'] });
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
        const key = `${day}-${period}`;
        const existingSlot = classTimetableData[key];

        setEditingSlot({
            day,
            period,
            data: existingSlot ? {
                ...existingSlot,
                assigned_faculty_id: existingSlot.faculty_id,
            } : {
                day_of_week: day,
                period_index: period,
                start_time: '09:00',
                end_time: '10:00',
                assigned_faculty_id: user?.id,
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

    const showLoader = useMinimumLoadingTime(isLoadingSchedule || isLoadingClassTimetable, 1000);

    if (showLoader) {
        return (
            <FacultyLayout>
                <Loader fullScreen={false} />
            </FacultyLayout>
        );
    }

    return (
        <FacultyLayout>
            <div className="space-y-6">
                <PageHeader
                    title="My Timetable"
                    subtitle="View your teaching schedule and manage class timetable"
                />

                <Tabs defaultValue="my-schedule">
                    <TabsList>
                        <TabsTrigger value="my-schedule">My Schedule</TabsTrigger>
                        <TabsTrigger value="class-timetable">
                            Class Timetable
                            {staffDetails?.class_assigned && ` (${staffDetails.class_assigned} - ${staffDetails.section_assigned})`}
                        </TabsTrigger>
                    </TabsList>

                    {/* My Personal Schedule (Read-only, created by institution) */}
                    <TabsContent value="my-schedule">
                        <Card>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr>
                                            <th className="border p-4 bg-muted/50 w-32 font-bold text-left sticky left-0">Day</th>
                                            {PERIODS.map((p) => (
                                                <th key={p} className="border p-3 bg-muted/50 text-sm font-medium text-left">
                                                    Period {p}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DAYS.map((day) => (
                                            <tr key={day}>
                                                <td className="border p-4 font-semibold bg-muted/10 sticky left-0">{day}</td>
                                                {PERIODS.map((period) => {
                                                    const key = `${day}-${period}`;
                                                    const slot = myScheduleData[key];
                                                    return (
                                                        <td key={period} className="border p-2 min-w-[140px] h-[100px] align-top">
                                                            {slot?.subject_id ? (
                                                                <div className="space-y-1 p-1">
                                                                    <Badge variant="default" className="w-full justify-start line-clamp-1 bg-primary/10 text-primary border-0 mb-1">
                                                                        {slot.subjects?.name || 'Subject'}
                                                                    </Badge>
                                                                    <div className="text-xs font-medium pl-1">{slot.classes?.name || 'Class'}</div>
                                                                    {slot.section && (
                                                                        <div className="text-[10px] text-muted-foreground pl-1">
                                                                            Sec: {slot.section}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-[10px] text-muted-foreground pl-1">
                                                                        {slot.start_time} - {slot.end_time}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 text-xs">
                                                                    -
                                                                </div>
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

                        {/* Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <BookOpen className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{mySchedule.length}</p>
                                            <p className="text-xs text-muted-foreground">Total Periods/Week</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-success/10 rounded-lg">
                                            <Calendar className="w-5 h-5 text-success" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">
                                                {DAYS.filter((day) => mySchedule.some(s => s.day_of_week === day)).length}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Active Days</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-warning/10 rounded-lg">
                                            <Clock className="w-5 h-5 text-warning" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{staffDetails?.class_assigned || 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground">Class Teacher</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Class Timetable (Editable by faculty) */}
                    <TabsContent value="class-timetable">
                        <Card>
                            <CardContent className="p-0 overflow-x-auto">
                                <div className="p-4 bg-muted/30 border-b">
                                    <p className="text-sm text-muted-foreground">
                                        {staffDetails?.class_assigned ? (
                                            <>Click on any cell to create or edit the timetable for <strong>{staffDetails.class_assigned} - Section {staffDetails.section_assigned}</strong></>
                                        ) : (
                                            <>Click on any cell to create or edit your class timetable</>
                                        )}
                                    </p>
                                </div>
                                <table className="w-full border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr>
                                            <th className="border p-4 bg-muted/50 w-32 font-bold text-left sticky left-0">Day</th>
                                            {PERIODS.map((p) => (
                                                <th key={p} className="border p-3 bg-muted/50 text-sm font-medium text-left">
                                                    Period {p}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DAYS.map((day) => (
                                            <tr key={day}>
                                                <td className="border p-4 font-semibold bg-muted/10 sticky left-0">{day}</td>
                                                {PERIODS.map((period) => {
                                                    const key = `${day}-${period}`;
                                                    const slot = classTimetableData[key];
                                                    return (
                                                        <td
                                                            key={period}
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
                                                                        <div className="text-[10px] text-muted-foreground pl-1">
                                                                            {slot.start_time} - {slot.end_time}
                                                                        </div>
                                                                    </div>
                                                                    {/* Delete Icon */}
                                                                    <button
                                                                        onClick={(e) => handleDeleteSlot(e, day, period)}
                                                                        className="absolute top-1 right-1 p-1 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                                                                        title="Delete slot"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 text-xs hover:text-muted-foreground/40">
                                                                    Click to add
                                                                </div>
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
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            Edit Slot - {editingSlot?.day} Period {editingSlot?.period}
                        </DialogTitle>
                        <DialogDescription>
                            Configure the timing, subject, class and section for this period.
                        </DialogDescription>
                    </DialogHeader>

                    {editingSlot && (
                        <div className="space-y-4 py-4">
                            {/* Timing with AM/PM */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Time</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Select
                                            value={editingSlot.data.start_time?.split(':')[0] || '09'}
                                            onValueChange={(hour) => {
                                                const [_, minute] = (editingSlot.data.start_time || '09:00').split(':');
                                                updateEditingSlot('start_time', `${hour}:${minute}`);
                                            }}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Hour" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 12 }, (_, i) => {
                                                    const hour = String(i + 1).padStart(2, '0');
                                                    return <SelectItem key={hour} value={hour}>{hour}</SelectItem>;
                                                })}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={editingSlot.data.start_time?.split(':')[1] || '00'}
                                            onValueChange={(minute) => {
                                                const [hour, _] = (editingSlot.data.start_time || '09:00').split(':');
                                                updateEditingSlot('start_time', `${hour}:${minute}`);
                                            }}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Min" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['00', '15', '30', '45'].map((min) => (
                                                    <SelectItem key={min} value={min}>{min}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={
                                                parseInt(editingSlot.data.start_time?.split(':')[0] || '09') >= 12 ? 'PM' : 'AM'
                                            }
                                            onValueChange={(period) => {
                                                const [hour, minute] = (editingSlot.data.start_time || '09:00').split(':');
                                                let newHour = parseInt(hour);
                                                if (period === 'PM' && newHour < 12) {
                                                    newHour += 12;
                                                } else if (period === 'AM' && newHour >= 12) {
                                                    newHour -= 12;
                                                }
                                                updateEditingSlot('start_time', `${String(newHour).padStart(2, '0')}:${minute}`);
                                            }}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="AM">AM</SelectItem>
                                                <SelectItem value="PM">PM</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Time</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Select
                                            value={editingSlot.data.end_time?.split(':')[0] || '10'}
                                            onValueChange={(hour) => {
                                                const [_, minute] = (editingSlot.data.end_time || '10:00').split(':');
                                                updateEditingSlot('end_time', `${hour}:${minute}`);
                                            }}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Hour" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 12 }, (_, i) => {
                                                    const hour = String(i + 1).padStart(2, '0');
                                                    return <SelectItem key={hour} value={hour}>{hour}</SelectItem>;
                                                })}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={editingSlot.data.end_time?.split(':')[1] || '00'}
                                            onValueChange={(minute) => {
                                                const [hour, _] = (editingSlot.data.end_time || '10:00').split(':');
                                                updateEditingSlot('end_time', `${hour}:${minute}`);
                                            }}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Min" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['00', '15', '30', '45'].map((min) => (
                                                    <SelectItem key={min} value={min}>{min}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={
                                                parseInt(editingSlot.data.end_time?.split(':')[0] || '10') >= 12 ? 'PM' : 'AM'
                                            }
                                            onValueChange={(period) => {
                                                const [hour, minute] = (editingSlot.data.end_time || '10:00').split(':');
                                                let newHour = parseInt(hour);
                                                if (period === 'PM' && newHour < 12) {
                                                    newHour += 12;
                                                } else if (period === 'AM' && newHour >= 12) {
                                                    newHour -= 12;
                                                }
                                                updateEditingSlot('end_time', `${String(newHour).padStart(2, '0')}:${minute}`);
                                            }}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="AM">AM</SelectItem>
                                                <SelectItem value="PM">PM</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Subject */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subject</label>
                                <Select
                                    value={editingSlot.data.subject_id || 'none'}
                                    onValueChange={(v) => updateEditingSlot('subject_id', v === 'none' ? null : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Subject (Free Period)</SelectItem>
                                        {subjects.map((s: any) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Faculty/Staff Selector */}
                            {editingSlot.data.subject_id && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Assign Faculty</label>
                                    <Select
                                        value={editingSlot.data.assigned_faculty_id || user?.id || 'none'}
                                        onValueChange={(v) => updateEditingSlot('assigned_faculty_id', v === 'none' ? user?.id : v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select faculty" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allFaculty.map((f: any) => (
                                                <SelectItem key={f.id} value={String(f.id)}>
                                                    {f.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Class and Section */}
                            {editingSlot.data.subject_id && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Class</label>
                                            <Select value="10th" disabled>
                                                <SelectTrigger>
                                                    <SelectValue>10th</SelectValue>
                                                </SelectTrigger>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Section</label>
                                            <Select value="A" disabled>
                                                <SelectTrigger>
                                                    <SelectValue>A</SelectValue>
                                                </SelectTrigger>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Room Number */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Room Number</label>
                                        <Input
                                            placeholder="e.g., 101"
                                            value={editingSlot.data.room_number || ''}
                                            onChange={(e) => updateEditingSlot('room_number', e.target.value)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => saveSlotMutation.mutate()}
                            disabled={saveSlotMutation.isPending}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Delete Slot</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this timetable slot? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteSlotMutation.isPending}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </FacultyLayout>
    );
}
