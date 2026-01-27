import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ExamTypeSelector, EXAM_TYPES, type ExamType } from './ExamTypeSelector';
import { ManualEntryForm, type ExamEntry } from './ManualEntryForm';
import { ExamSchedulePreview } from './ExamSchedulePreview';
import { Plus, History, X, Info, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Loader from '@/components/common/Loader';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExamScheduleManagerProps {
    classId?: string;
    className?: string;
    section?: string;
}

export function ExamScheduleManager({ classId, className, section }: ExamScheduleManagerProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [selectedClassName, setSelectedClassName] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [selectedExamType, setSelectedExamType] = useState<ExamType | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyExamType, setHistoryExamType] = useState<string>('');
    const [historyClass, setHistoryClass] = useState<string>('');
    const [historySchedule, setHistorySchedule] = useState<any>(null);

    // Fetch all classes from the institution
    const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
        queryKey: ['classes', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return [];

            const { data, error } = await supabase
                .from('classes')
                .select('id, name, sections')
                .order('name');

            if (error) {
                console.error('Error fetching classes:', error);
                return [];
            }

            return data || [];
        },
        enabled: !!user?.institutionId,
    });

    // Initialize from props and keep fixed
    useEffect(() => {
        if (className) setSelectedClassName(className);
        if (section) setSelectedSection(section);
        if (classId) setSelectedClass(classId);
    }, [className, section, classId]);

    // Auto-select class ID based on name and section if classId not provided
    useEffect(() => {
        if (selectedClassName && selectedSection && !selectedClass) {
            const cls = classes.find(c =>
                c.name === selectedClassName &&
                Array.isArray(c.sections) &&
                c.sections.includes(selectedSection)
            );
            if (cls) {
                setSelectedClass(cls.id);
            }
        }
    }, [selectedClassName, selectedSection, classes, selectedClass]);

    // Get the selected class details (primarily for validation)
    const selectedClassData = classes.find(c => c.id === selectedClass);

    // Fetch existing exam schedules with refetch interval for realtime
    const { data: examSchedules = [], isLoading: isLoadingSchedules } = useQuery({
        queryKey: ['exam-schedules', user?.institutionId, selectedClass, selectedSection],
        queryFn: async () => {
            if (!user?.institutionId || !selectedClass || !selectedSection) return [];

            // Get class name from selectedClass UUID
            const classData = classes.find(c => c.id === selectedClass);
            if (!classData) {
                console.error('Class not found for ID:', selectedClass);
                return [];
            }

            const { data, error } = await supabase
                .from('exam_schedules')
                .select(`
    *,
    exam_schedule_entries(*)
        `)
                .eq('institution_id', user.institutionId)
                .eq('class_id', classData.name) // Use class name to match schema
                .eq('section', selectedSection)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching exam schedules:', error);
                return [];
            }

            return data || [];
        },
        enabled: !!user?.institutionId && !!selectedClass && !!selectedSection && classes.length > 0,
        refetchInterval: 3000, // Refetch every 3 seconds for realtime effect
    });

    // Fetch all exam schedules for history (all classes)
    const { data: allExamSchedules = [] } = useQuery({
        queryKey: ['all-exam-schedules', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return [];

            const { data, error } = await supabase
                .from('exam_schedules')
                .select(`
    *,
    exam_schedule_entries(*)
        `)
                .eq('institution_id', user.institutionId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching all exam schedules:', error);
                return [];
            }

            return data || [];
        },
        enabled: !!user?.institutionId && showHistory,
    });

    // Realtime subscription for exam schedules
    useEffect(() => {
        if (!user?.institutionId || !selectedClass || !selectedSection) return;

        console.log('Setting up realtime subscription for exam schedules');

        const channel = supabase
            .channel('exam-schedules-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'exam_schedules',
                    filter: `institution_id = eq.${user.institutionId} `
                },
                (payload) => {
                    console.log('Exam schedule changed:', payload);
                    toast.info('Exam schedules updated', { duration: 2000 });
                    queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
                    queryClient.invalidateQueries({ queryKey: ['all-exam-schedules'] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'exam_schedule_entries'
                },
                (payload) => {
                    console.log('Exam schedule entries changed:', payload);
                    queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
                    queryClient.invalidateQueries({ queryKey: ['all-exam-schedules'] });
                }
            )
            .subscribe();

        return () => {
            console.log('Cleaning up realtime subscription');
            supabase.removeChannel(channel);
        };
    }, [user?.institutionId, selectedClass, selectedSection, queryClient]);

    // Create exam schedule mutation
    const createScheduleMutation = useMutation({
        mutationFn: async (entries: ExamEntry[]) => {
            if (!user?.id || !user?.institutionId || !selectedClass || !selectedSection || !selectedExamType) {
                throw new Error('Missing required data');
            }

            // Get the class name for display
            const classData = classes.find(c => c.id === selectedClass);
            if (!classData) throw new Error('Class not found');

            // 1. Create exam schedule
            const { data: schedule, error: scheduleError } = await supabase
                .from('exam_schedules')
                .insert({
                    institution_id: user.institutionId,
                    class_id: classData.name,
                    section: selectedSection,
                    exam_type: selectedExamType.value,
                    exam_display_name: selectedExamType.label,
                    academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
                    created_by: user.id,
                })
                .select()
                .single();

            if (scheduleError) {
                console.error('Schedule Insertion Error:', scheduleError);
                if (scheduleError.code === '23505') {
                    throw new Error("A " + selectedExamType?.label + " schedule already exists for this class and section. Please delete the existing schedule before creating a new one.");
                }
                throw scheduleError;
            }

            if (!schedule?.id) {
                throw new Error('Failed to retrieve the schedule ID.');
            }

            // 2. Insert new exam entries
            const entriesToInsert = entries.map(entry => {
                const ensureSeconds = (timeStr: string) => {
                    if (!timeStr) return "00:00:00";
                    if (timeStr.split(':').length === 2) return `${timeStr}:00`;
                    return timeStr;
                };

                return {
                    exam_schedule_id: schedule.id,
                    exam_date: format(entry.exam_date, 'yyyy-MM-dd'),
                    day_of_week: entry.day_of_week,
                    start_time: ensureSeconds(entry.start_time),
                    end_time: ensureSeconds(entry.end_time),
                    subject: entry.subject,
                    syllabus_notes: entry.syllabus_notes || '',
                };
            });

            console.log('Inserting entries:', entriesToInsert);

            const { error: entriesError } = await supabase
                .from('exam_schedule_entries')
                .insert(entriesToInsert);

            if (entriesError) {
                console.error('Entries Insertion Error:', entriesError);
                throw entriesError;
            }

            // 3. Notify Students and Parents
            try {
                console.log('--- STARTING EXAM NOTIFICATIONS ---');
                console.log(`Target: Class ${classData.name}, Section ${selectedSection} `);

                // Get students - removed 'profile_id' which was causing the 400 error
                // In this schema, student.id is the profile/user identifier
                const { data: students, error: studentError } = await supabase
                    .from('students')
                    .select('id, email, parent_id')
                    .ilike('class_name', classData.name)
                    .eq('section', selectedSection)
                    .eq('institution_id', user.institutionId);

                if (studentError) {
                    console.error('Error fetching students for notification:', studentError);
                }

                if (students && students.length > 0) {
                    console.log(`Found ${students.length} students to notify: `, students);

                    const notificationsToInsert: any[] = [];
                    const timestamp = new Date().toISOString();

                    // Resolve profile IDs for students (s.id is usually the profile ID, but we check profiles for consistency)
                    const studentsNeedsProfile = students.filter(s => s.email);
                    let profileMap = new Map<string, string>();

                    if (studentsNeedsProfile.length > 0) {
                        const emails = studentsNeedsProfile.map(s => s.email?.toLowerCase()).filter(Boolean);
                        console.log('Resolving profiles for emails:', emails);
                        const { data: profiles } = await supabase
                            .from('profiles')
                            .select('id, email')
                            .in('email', emails);

                        if (profiles) {
                            profiles.forEach(p => {
                                if (p.email) profileMap.set(p.email.toLowerCase(), p.id);
                            });
                        }
                    }

                    // Get parents through student_parents link table (CRITICAL: added student_id to select)
                    const studentIds = students.map(s => s.id);
                    const { data: parentLinks, error: parentError } = await supabase
                        .from('student_parents')
                        .select(`
student_id,
    parent_id,
    parents!inner(
        profile_id
    )
                        `)
                        .in('student_id', studentIds);

                    if (parentError) {
                        console.error('Error fetching parent links:', parentError);
                    }

                    const parentProfileIdsByStudentId = new Map<string, string[]>();
                    if (parentLinks) {
                        console.log(`Found ${parentLinks.length} parent links via student_parents`);
                        parentLinks.forEach((link: any) => {
                            if (link.parents?.profile_id && link.student_id) {
                                const list = parentProfileIdsByStudentId.get(link.student_id) || [];
                                list.push(link.parents.profile_id);
                                parentProfileIdsByStudentId.set(link.student_id, list);
                            }
                        });
                    }

                    students.forEach(s => {
                        // Determine target student profile ID - use s.id as primary, lookup as fallback
                        const studentEmail = s.email?.toLowerCase();
                        const targetStudentProfileId = (studentEmail && profileMap.get(studentEmail)) || s.id;

                        console.log(`Processing student ${s.email}: targetUserId = ${targetStudentProfileId} `);

                        if (targetStudentProfileId) {
                            notificationsToInsert.push({
                                user_id: targetStudentProfileId,
                                title: `${selectedExamType.label} Schedule Posted`,
                                message: `The ${selectedExamType.label} timetable for Class ${classData.name} - ${selectedSection} has been published.`,
                                type: 'exam',
                                read: false,
                                created_at: timestamp,
                                action_url: '/student/timetable'
                            });
                        }

                        // Collect all parent profile IDs for this student
                        const parentProfileIds = new Set<string>();

                        // 1. Direct parent_id from students table (usually points to profiles.id)
                        if (s.parent_id) {
                            parentProfileIds.add(s.parent_id);
                            console.log(`Found direct parent_id for ${s.email}: ${s.parent_id} `);
                        }

                        // 2. Via student_parents link table
                        const links = parentProfileIdsByStudentId.get(s.id);
                        if (links) {
                            links.forEach(id => {
                                parentProfileIds.add(id);
                                console.log(`Found linked parent via student_parents for ${s.email}: ${id} `);
                            });
                        }

                        parentProfileIds.forEach(pProfileId => {
                            notificationsToInsert.push({
                                user_id: pProfileId,
                                title: `${selectedExamType.label} for your child`,
                                message: `The ${selectedExamType.label} timetable for your child in ${classData.name} - ${selectedSection} has been published.`,
                                type: 'exam',
                                read: false,
                                created_at: timestamp,
                                action_url: '/parent'
                            });
                        });
                    });

                    if (notificationsToInsert.length > 0) {
                        const validNotifications = notificationsToInsert.filter(n => n.user_id);
                        console.log(`Inserting ${validNotifications.length} notifications into database...`);

                        const { error: insertError } = await supabase
                            .from('notifications')
                            .insert(validNotifications);

                        if (insertError) {
                            console.error('Error inserting notifications:', insertError);
                        } else {
                            console.log('Successfully inserted notifications!');
                            toast.success(`Notifications sent to ${validNotifications.length} users`);
                        }
                    } else {
                        console.warn('No notifications were prepared (zero recipients).');
                    }
                } else {
                    console.warn(`No students found for Class: ${classData.name}, Section: ${selectedSection} `);
                }
            } catch (notifyErr: any) {
                console.error('Exception in exam notifications logic:', notifyErr);
            }
            console.log('--- END EXAM NOTIFICATIONS ---');

            return schedule;
        },
        onSuccess: () => {
            toast.success('Exam schedule created successfully');
            queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
            queryClient.invalidateQueries({ queryKey: ['all-exam-schedules'] });
            setIsCreating(false);
            setSelectedExamType(null);
        },
        onError: (error: any) => {
            console.error('Detailed Error creating exam schedule:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            toast.error(error.message || 'Failed to create exam schedule');
        },
    });

    // Delete exam schedule mutation with realtime update
    const deleteScheduleMutation = useMutation({
        mutationFn: async (scheduleId: string) => {
            const { error } = await supabase
                .from('exam_schedules')
                .delete()
                .eq('id', scheduleId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Exam schedule deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
            queryClient.invalidateQueries({ queryKey: ['all-exam-schedules'] });
        },
        onError: (error: any) => {
            console.error('Error deleting exam schedule:', error);
            toast.error(error.message || 'Failed to delete exam schedule');
        },
    });

    // PDF Download Handler
    const handleDownloadPDF = (schedule: any) => {
        try {
            const printWindow = window.open('', '', 'height=600,width=800');
            if (!printWindow) {
                toast.error('Please allow popups to download PDF');
                return;
            }

            const entries = schedule.entries.sort((a: any, b: any) =>
                new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
            );

            const htmlContent = `
    < !DOCTYPE html >
        <html>
            <head>
                <title>${schedule.exam_display_name} - Examination Schedule</title>
                <style>
                    body {font - family: Arial, sans-serif; padding: 40px; color: #333; }
                    .header {text - align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .header h1 {margin: 0; font-size: 24px; color: #000; }
                    .header p {margin: 5px 0; color: #666; }
                    table {width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td {border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th {background - color: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 12px; }
                    td {font - size: 14px; }
                    .subject {font - weight: bold; color: #2563eb; }
                    .footer {margin - top: 40px; text-align: center; font-size: 12px; color: #666; }
                    @media print {body {padding: 20px; } .no-print {display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${schedule.exam_display_name} Examination Schedule</h1>
                    <p>Class ${schedule.class_id} • Section ${schedule.section}</p>
                    <p>Academic Year ${schedule.academic_year}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Date & Day</th>
                            <th>Time</th>
                            <th>Subject</th>
                            <th>Syllabus / Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entries.map((entry: any) => `
                                <tr>
                                    <td><strong>${format(new Date(entry.exam_date), 'dd MMM yyyy')}</strong><br><span style="color: #666;">${entry.day_of_week}</span></td>
                                    <td>${entry.start_time} - ${entry.end_time}</td>
                                    <td class="subject">${entry.subject}</td>
                                    <td>${entry.syllabus_notes || 'No notes provided'}</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <p>Total Exams: ${entries.length}</p>
                    <p>Generated on ${format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
                </div>
                <div class="no-print" style="margin-top: 20px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Print / Save as PDF</button>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-left: 10px;">Close</button>
                </div>
            </body>
        </html>
`;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
            toast.success('PDF preview opened! Click "Print" to save as PDF');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate PDF');
        }
    };

    const handleExamTypeSelect = (examType: ExamType) => {
        setSelectedExamType(examType);
        setIsCreating(true);
    };

    const handleManualSubmit = async (entries: ExamEntry[]) => {
        try {
            setIsSubmitting(true);
            await createScheduleMutation.mutateAsync(entries);
        } catch (error) {
            console.error('Mutation failed in handleManualSubmit:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setIsCreating(false);
        setSelectedExamType(null);
    };

    const handleDelete = (scheduleId: string) => {
        if (confirm('Are you sure you want to delete this exam schedule?')) {
            deleteScheduleMutation.mutate(scheduleId);
        }
    };

    const handleViewHistory = (schedule: any) => {
        setHistorySchedule(schedule);
    };

    if (isLoadingClasses) {
        return <Loader fullScreen={false} />;
    }

    // Show creation interface (Manual Entry Only)
    if (isCreating && selectedClass && selectedSection) {
        const classData = classes.find(c => c.id === selectedClass);

        if (!selectedExamType) {
            return (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Select Exam Type</CardTitle>
                            <CardDescription>Choose the type of exam you want to schedule for {classData?.name} - {selectedSection}</CardDescription>
                        </div>
                        <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ExamTypeSelector onSelect={handleExamTypeSelect} />
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card>
                <CardContent className="p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-1">
                            Create {selectedExamType.label} Schedule
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            For {classData?.name} - Section {selectedSection}
                        </p>
                    </div>

                    <ManualEntryForm
                        onSubmit={handleManualSubmit}
                        onCancel={handleCancel}
                        isSubmitting={isSubmitting}
                    />
                </CardContent>
            </Card>
        );
    }

    // Show class and section selector
    return (
        <div className="space-y-6">
            {/* Fixed Class and Section Information */}
            <Card className="bg-white shadow-sm border-border">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                Exam Management
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Create, manage and track examination schedules for your assigned class and section.
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <button
                                onClick={() => setShowHistory(true)}
                                className="flex items-center gap-3 bg-primary/5 text-primary px-6 py-3 rounded-2xl border border-primary/10 shadow-sm hover:bg-primary/10 hover:shadow-md transition-all group cursor-pointer"
                            >
                                <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                                    <History className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-[10px] uppercase tracking-wider font-black opacity-60 leading-tight">Exam Records</span>
                                    <span className="text-sm font-extrabold leading-none">See History</span>
                                </div>
                            </button>

                            {!selectedClassName || !selectedSection ? (
                                <div className="flex items-center gap-3 bg-destructive/10 text-destructive px-5 py-2.5 rounded-xl border border-destructive/20 shadow-sm animate-pulse">
                                    <Info className="h-5 w-5" />
                                    <span className="text-sm font-bold">No class assigned to you</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 bg-primary/10 text-primary px-6 py-3 rounded-2xl border border-primary/20 shadow-sm hover:shadow-md transition-all group">
                                    <div className="p-2 bg-primary/20 rounded-full group-hover:bg-primary/30 transition-colors">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-wider font-black opacity-60 leading-tight">Your Assigned Class</span>
                                        <span className="text-sm font-extrabold leading-none">
                                            {selectedClassName} <span className="mx-1 text-primary/40">•</span> Section {selectedSection}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Existing Schedules or Create New */}
            {selectedClass && selectedSection && (
                <>
                    {isLoadingSchedules ? (
                        <Loader fullScreen={false} />
                    ) : examSchedules.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Exam Schedules</h3>
                                <Button onClick={() => { setSelectedExamType(null); setIsCreating(true); }} size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create New
                                </Button>
                            </div>

                            <div className="grid gap-4">
                                {examSchedules.map((schedule: any) => (
                                    <Card key={schedule.id}>
                                        <CardContent className="p-6">
                                            <ExamSchedulePreview
                                                schedule={{
                                                    id: schedule.id,
                                                    exam_type: schedule.exam_type,
                                                    exam_display_name: schedule.exam_display_name,
                                                    class_id: selectedClassData?.name || '',
                                                    section: schedule.section,
                                                    academic_year: schedule.academic_year,
                                                    entries: schedule.exam_schedule_entries.map((e: any) => ({
                                                        id: e.id,
                                                        exam_date: new Date(e.exam_date),
                                                        day_of_week: e.day_of_week,
                                                        start_time: e.start_time,
                                                        end_time: e.end_time,
                                                        subject: e.subject,
                                                        syllabus_notes: e.syllabus_notes,
                                                    })),
                                                }}
                                                onDelete={() => handleDelete(schedule.id)}
                                                onDownload={() => handleDownloadPDF({
                                                    id: schedule.id,
                                                    exam_type: schedule.exam_type,
                                                    exam_display_name: schedule.exam_display_name,
                                                    class_id: selectedClassData?.name || '',
                                                    section: schedule.section,
                                                    academic_year: schedule.academic_year,
                                                    entries: schedule.exam_schedule_entries.map((e: any) => ({
                                                        id: e.id,
                                                        exam_date: new Date(e.exam_date),
                                                        day_of_week: e.day_of_week,
                                                        start_time: e.start_time,
                                                        end_time: e.end_time,
                                                        subject: e.subject,
                                                        syllabus_notes: e.syllabus_notes,
                                                    })),
                                                })}
                                                showActions={true}
                                            />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-6">
                                <ExamTypeSelector onSelect={handleExamTypeSelect} />
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* History Dialog */}
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Exam Schedule History</DialogTitle>
                    </DialogHeader>

                    {!historyExamType ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">Select an exam type to view history for {selectedClassName}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {EXAM_TYPES.map((examType) => {
                                    const schedule = allExamSchedules.find(
                                        (s: any) => s.exam_type === examType.value && s.class_id === selectedClassName && s.section === selectedSection
                                    );
                                    return (
                                        <Button
                                            key={examType.value}
                                            variant={schedule ? "default" : "outline"}
                                            onClick={() => {
                                                if (schedule) {
                                                    setHistoryExamType(examType.value);
                                                    setHistoryClass(selectedClass);
                                                    handleViewHistory(schedule);
                                                } else {
                                                    toast.info("No " + examType.label + " schedule found for your class");
                                                }
                                            }}
                                            className="justify-start h-auto p-4"
                                        >
                                            <div className="text-left">
                                                <div className="font-semibold">{examType.label}</div>
                                                <div className="text-xs opacity-80">{examType.description}</div>
                                                {schedule && <div className="text-[10px] mt-1 font-bold">Available - Click to view</div>}
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : historySchedule ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Button variant="ghost" onClick={() => { setHistoryExamType(''); setHistoryClass(''); setHistorySchedule(null); }}>
                                    ← Back to Exam Types
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                        if (confirm('Are you sure you want to delete this exam schedule? This action cannot be undone.')) {
                                            handleDelete(historySchedule.id);
                                            setShowHistory(false);
                                            setHistoryExamType('');
                                            setHistorySchedule(null);
                                        }
                                    }}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Schedule
                                </Button>
                            </div>
                            <ExamSchedulePreview
                                schedule={{
                                    id: historySchedule.id,
                                    exam_type: historySchedule.exam_type,
                                    exam_display_name: historySchedule.exam_display_name,
                                    class_id: historySchedule.class_id,
                                    section: historySchedule.section,
                                    academic_year: historySchedule.academic_year,
                                    entries: historySchedule.exam_schedule_entries.map((e: any) => ({
                                        id: e.id,
                                        exam_date: new Date(e.exam_date),
                                        day_of_week: e.day_of_week,
                                        start_time: e.start_time,
                                        end_time: e.end_time,
                                        subject: e.subject,
                                        syllabus_notes: e.syllabus_notes,
                                    })),
                                }}
                                showActions={false}
                            />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
