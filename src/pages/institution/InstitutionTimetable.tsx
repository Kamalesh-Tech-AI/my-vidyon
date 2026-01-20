import { useState, useMemo } from 'react';
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
import { useMinimumLoadingTime } from '@/hooks/useMinimumLoadingTime';
import {
    User,
    Search,
    ArrowLeft,
    Save,
    X,
} from 'lucide-react';
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
    // For display
    subject_name?: string;
    class_name?: string;
}

interface EditingSlot {
    day: string;
    period: number;
    data: Partial<TimetableSlot>;
}

export function InstitutionTimetable() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // State
    const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Fetch all faculty members
    const { data: faculties = [], isLoading: isLoadingFaculty } = useQuery({
        queryKey: ['institution-faculty', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return [];

            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('institution_id', user.institutionId)
                .eq('role', 'faculty')
                .order('full_name');

            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.institutionId,
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

    // Fetch classes (unique class names only)
    const { data: classesData = [] } = useQuery({
        queryKey: ['institution-classes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .order('name');

            if (error) {
                console.error('Error fetching classes:', error);
                return [];
            }

            console.log('Raw classes data:', data);

            // Get unique classes by name
            const uniqueClasses = data?.reduce((acc: any[], curr: any) => {
                if (!acc.find(c => c.name === curr.name)) {
                    acc.push(curr);
                }
                return acc;
            }, []) || [];

            console.log('Unique classes:', uniqueClasses);
            return uniqueClasses;
        },
    });

    // Fetch timetable for selected faculty
    const {
        data: facultyTimetable = [],
        isLoading: isLoadingTimetable,
        isError,
        error: queryError
    } = useQuery({
        queryKey: ['faculty-timetable', selectedFaculty?.id],
        queryFn: async () => {
            if (!selectedFaculty?.id) {
                console.log('[INSTITUTION] No faculty selected');
                return [];
            }

            console.log('[INSTITUTION] Fetching timetable for faculty:', selectedFaculty.full_name, selectedFaculty.id);

            const { data, error } = await supabase
                .from('timetable_slots')
                .select(`
                    *,
                    subjects (name),
                    classes (name)
                `)
                .eq('faculty_id', selectedFaculty.id)
                .order('day_of_week')
                .order('period_index');

            if (error) {
                console.error('[INSTITUTION] Error fetching timetable:', error);
                throw error;
            }

            console.log('[INSTITUTION] Fetched timetable slots:', data);
            console.log('[INSTITUTION] Number of slots:', data?.length || 0);
            return data || [];
        },
        enabled: !!selectedFaculty?.id,
        retry: 1,
    });

    // Derived View Data
    const viewTimetableData = useMemo<{ [key: string]: TimetableSlot }>(() => {
        if (!selectedFaculty || !facultyTimetable) return {};
        const data: { [key: string]: TimetableSlot } = {};
        facultyTimetable.forEach((slot: any) => {
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
                subject_name: slot.subjects?.name,
                class_name: slot.classes?.name,
            };
        });
        return data;
    }, [facultyTimetable, selectedFaculty]);

    // Save slot mutation
    const saveSlotMutation = useMutation({
        mutationFn: async () => {
            if (!editingSlot || !selectedFaculty?.id || !user?.institutionId) {
                console.error('[INSTITUTION] Missing required data:', {
                    hasEditingSlot: !!editingSlot,
                    hasFaculty: !!selectedFaculty?.id,
                    hasInstitution: !!user?.institutionId
                });
                throw new Error('Missing required data');
            }

            console.log('[INSTITUTION] Saving slot:', {
                day: editingSlot.day,
                period: editingSlot.period,
                faculty: selectedFaculty.full_name,
                faculty_id: selectedFaculty.id,
                data: editingSlot.data
            });

            // Get or create config
            const { data: existingConfig } = await supabase
                .from('timetable_configs')
                .select('id')
                .eq('institution_id', user.institutionId)
                .limit(1)
                .single();

            let configId = existingConfig?.id;
            if (!configId) {
                console.log('[INSTITUTION] Creating new timetable config');
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
                console.log('[INSTITUTION] Created config:', configId);
            } else {
                console.log('[INSTITUTION] Using existing config:', configId);
            }

            // Delete existing slot for this day/period
            console.log('[INSTITUTION] Deleting existing slot...');
            const { error: deleteError } = await supabase
                .from('timetable_slots')
                .delete()
                .eq('faculty_id', selectedFaculty.id)
                .eq('day_of_week', editingSlot.day)
                .eq('period_index', editingSlot.period);

            if (deleteError) {
                console.error('[INSTITUTION] Delete error:', deleteError);
            } else {
                console.log('[INSTITUTION] Deleted existing slot (if any)');
            }

            // Insert new slot if subject is selected
            if (editingSlot.data.subject_id) {
                const slotData = {
                    config_id: configId,
                    faculty_id: selectedFaculty.id,
                    day_of_week: editingSlot.day,
                    period_index: editingSlot.period,
                    subject_id: editingSlot.data.subject_id,
                    class_id: editingSlot.data.class_id,
                    section: editingSlot.data.section,
                    start_time: editingSlot.data.start_time || '09:00',
                    end_time: editingSlot.data.end_time || '10:00',
                    room_number: editingSlot.data.room_number,
                    is_break: false,
                };

                console.log('[INSTITUTION] Inserting slot:', slotData);
                const { data: insertedData, error: insertError } = await supabase
                    .from('timetable_slots')
                    .insert(slotData)
                    .select();

                if (insertError) {
                    console.error('[INSTITUTION] Insert error:', insertError);
                    throw insertError;
                }

                console.log('[INSTITUTION] Inserted successfully:', insertedData);
            } else {
                console.log('[INSTITUTION] No subject selected, slot deleted only');
            }

            // Send notification to faculty
            try {
                await supabase.from('notifications').insert({
                    user_id: selectedFaculty.id,
                    title: 'Timetable Updated',
                    message: `Your timetable for ${editingSlot.day} Period ${editingSlot.period} has been updated.`,
                    type: 'timetable',
                    date: new Date().toISOString(),
                    read: false,
                });
            } catch (notifyError) {
                console.error('Failed to send notification:', notifyError);
                // Don't block the success of the timetable update if notification fails
            }
        },
        onSuccess: () => {
            console.log('Slot saved successfully, refetching timetable...');
            toast.success('Slot saved successfully');
            // Invalidate and refetch the specific faculty's timetable
            queryClient.invalidateQueries({ queryKey: ['faculty-timetable', selectedFaculty?.id] });
            queryClient.refetchQueries({ queryKey: ['faculty-timetable', selectedFaculty?.id] });
            // Also invalidate the faculty's "My Schedule" view
            queryClient.invalidateQueries({ queryKey: ['faculty-my-schedule', selectedFaculty?.id] });
            setIsEditDialogOpen(false);
            setEditingSlot(null);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to save slot');
        },
    });

    const handleSlotClick = (day: string, period: number) => {
        const key = `${day}-${period}`;
        const existingSlot = viewTimetableData[key];

        setEditingSlot({
            day,
            period,
            data: existingSlot || {
                day_of_week: day,
                period_index: period,
                start_time: '09:00',
                end_time: '10:00',
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

    const showLoader = useMinimumLoadingTime(isLoadingFaculty, 1000);

    const filteredFaculties = faculties.filter((f: any) =>
        f.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (showLoader) {
        return (
            <InstitutionLayout>
                <Loader fullScreen={false} />
            </InstitutionLayout>
        );
    }

    return (
        <InstitutionLayout>
            <PageHeader
                title="Faculty Timetable"
                subtitle="View and manage weekly schedules for faculty members"
            />

            {!selectedFaculty ? (
                // VIEW 1: Faculty List
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {filteredFaculties.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No faculty members found.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredFaculties.map((faculty: any) => (
                                <Card
                                    key={faculty.id}
                                    onClick={() => setSelectedFaculty(faculty)}
                                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                                >
                                    <CardContent className="p-5 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <h3 className="font-semibold truncate">{faculty.full_name}</h3>
                                            <p className="text-xs text-muted-foreground truncate">{faculty.email}</p>
                                            <p className="text-xs text-primary mt-1 font-medium group-hover:underline">View Timetable →</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // VIEW 2: Timetable with clickable cells
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => setSelectedFaculty(null)}>
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div>
                                <h2 className="text-xl font-bold">{selectedFaculty.full_name}</h2>
                                <p className="text-sm text-muted-foreground">{selectedFaculty.email}</p>
                            </div>
                        </div>
                    </div>

                    <Card>
                        <CardContent className="p-0 overflow-x-auto">
                            {isLoadingTimetable ? (
                                <div className="p-12 flex justify-center"><Loader fullScreen={false} /></div>
                            ) : isError ? (
                                <div className="p-12 text-center text-destructive">
                                    <p>Failed to load timetable data.</p>
                                    <p className="text-sm opacity-80 mt-1">{(queryError as Error)?.message || 'Database error'}</p>
                                    <Button variant="outline" className="mt-4" onClick={() => { queryClient.invalidateQueries({ queryKey: ['faculty-timetable'] }) }}>
                                        Retry
                                    </Button>
                                </div>
                            ) : (
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
                                                    const slot = viewTimetableData[key];
                                                    return (
                                                        <td
                                                            key={period}
                                                            className="border p-2 min-w-[140px] h-[100px] align-top hover:bg-primary/5 transition-colors cursor-pointer"
                                                            onClick={() => handleSlotClick(day, period)}
                                                        >
                                                            {slot?.subject_id ? (
                                                                <div className="space-y-1 p-1">
                                                                    <Badge variant="default" className="w-full justify-start line-clamp-1 bg-primary/10 text-primary border-0 mb-1">
                                                                        {slot.subject_name || 'Subject'}
                                                                    </Badge>
                                                                    <div className="text-xs font-medium pl-1">{slot.class_name || 'Class'}</div>
                                                                    {(slot.section || slot.room_number) && (
                                                                        <div className="text-[10px] text-muted-foreground pl-1">
                                                                            {slot.section && `Sec: ${slot.section}`}
                                                                            {slot.section && slot.room_number && ' • '}
                                                                            {slot.room_number && `Rm: ${slot.room_number}`}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-[10px] text-muted-foreground pl-1">
                                                                        {slot.start_time} - {slot.end_time}
                                                                    </div>
                                                                </div>
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
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Edit Slot Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            Edit Slot - {editingSlot?.day} Period {editingSlot?.period}
                        </DialogTitle>
                        <DialogDescription>
                            Configure the timing, subject, class and section for this slot.
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

                            {/* Class and Section */}
                            {editingSlot.data.subject_id && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Class</label>
                                            <Select
                                                value={editingSlot.data.class_id || 'none'}
                                                onValueChange={(v) => updateEditingSlot('class_id', v === 'none' ? null : v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select class" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Select a class</SelectItem>
                                                    {classesData.map((c: any) => (
                                                        <SelectItem key={c.id} value={String(c.id)}>
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Section</label>
                                            <Select
                                                value={editingSlot.data.section || 'none'}
                                                onValueChange={(v) => updateEditingSlot('section', v === 'none' ? '' : v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select section" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Select section</SelectItem>
                                                    <SelectItem value="A">A</SelectItem>
                                                    <SelectItem value="B">B</SelectItem>
                                                    <SelectItem value="C">C</SelectItem>
                                                    <SelectItem value="D">D</SelectItem>
                                                </SelectContent>
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
                            Save Slot
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </InstitutionLayout>
    );
}
