import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ExamSchedulePreview } from './ExamSchedulePreview';
import { Calendar, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import Loader from '@/components/common/Loader';
import { format } from 'date-fns';

export function StudentExamScheduleView() {
    const { user } = useAuth();
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
    const [studentInfo, setStudentInfo] = useState<{ class_id: string; class_name: string; section: string } | null>(null);

    // Fetch student's class and section from students table
    useEffect(() => {
        const fetchStudentInfo = async () => {
            if (!user?.email) return;

            try {
                // Get student info from students table
                let { data: studentData, error: studentError } = await supabase
                    .from('students')
                    .select('class_name, section')
                    .eq('email', user.email)
                    .maybeSingle();

                if (studentError) {
                    console.error('Detailed Error fetching student data:', {
                        message: studentError.message,
                        details: studentError.details,
                        hint: studentError.hint,
                        code: studentError.code,
                        email: user.email
                    });
                    return;
                }

                if (!studentData) {
                    console.warn('No student data found for email:', user.email);
                    // Try case-insensitive fallback if exact match fails
                    const { data: fallbackData } = await supabase
                        .from('students')
                        .select('class_name, section')
                        .ilike('email', user.email)
                        .maybeSingle();

                    if (fallbackData) {
                        console.log('Found student data via case-insensitive email match');
                        studentData = fallbackData;
                    } else {
                        console.error('No student record found for this email');
                        return;
                    }
                }

                // Use class_name directly since exam_schedules.class_id stores the class name as TEXT
                setStudentInfo({
                    class_id: studentData.class_name, // exam_schedules.class_id expects the class name
                    class_name: studentData.class_name || 'Your Class',
                    section: studentData.section || '',
                });

                console.log('Student info loaded:', {
                    class_name: studentData.class_name,
                    section: studentData.section
                });
            } catch (err) {
                console.error('Error in fetchStudentInfo:', err);
            }
        };

        fetchStudentInfo();
    }, [user?.email]);

    // Fetch exam schedules for student's class
    const { data: examSchedules = [], isLoading, refetch } = useQuery({
        queryKey: ['student-exam-schedules', user?.institutionId, studentInfo?.class_id, studentInfo?.section],
        queryFn: async () => {
            if (!user?.institutionId || !studentInfo?.class_id || !studentInfo?.section) {
                console.log('❌ Missing required data for fetching exam schedules:', {
                    institutionId: user?.institutionId,
                    class_id: studentInfo?.class_id,
                    section: studentInfo?.section
                });
                return [];
            }

            console.log('🔍 STUDENT EXAM SCHEDULE QUERY - Starting fetch with:', {
                institution_id: user.institutionId,
                class_id: studentInfo.class_id,
                section: studentInfo.section,
                user_email: user.email
            });

            // First, check what exam schedules exist in the database for debugging
            const { data: allSchedules } = await supabase
                .from('exam_schedules')
                .select('id, class_id, section, exam_display_name, institution_id')
                .eq('institution_id', user.institutionId);

            console.log('📊 All exam schedules in database for this institution:', {
                count: allSchedules?.length || 0,
                schedules: allSchedules
            });

            // Try exact match first
            let { data, error } = await supabase
                .from('exam_schedules')
                .select(`
                    *,
                    exam_schedule_entries (*)
                `)
                .eq('institution_id', user.institutionId)
                .eq('class_id', studentInfo.class_id)
                .eq('section', studentInfo.section)
                .order('created_at', { ascending: false });

            console.log('🔍 Exact match query result:', {
                success: !error,
                count: data?.length || 0,
                error: error,
                data: data
            });

            if (error) {
                console.error('❌ Error fetching exam schedules (exact match):', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
            }

            // If no results, try case-insensitive matching
            if (!data || data.length === 0) {
                console.log('🔄 No exact matches found. Trying case-insensitive matching...');
                const fallbackQuery = await supabase
                    .from('exam_schedules')
                    .select(`
                        *,
                        exam_schedule_entries (*)
                    `)
                    .eq('institution_id', user.institutionId)
                    .ilike('class_id', studentInfo.class_id)
                    .ilike('section', studentInfo.section)
                    .order('created_at', { ascending: false });

                console.log('🔍 Case-insensitive query result:', {
                    success: !fallbackQuery.error,
                    count: fallbackQuery.data?.length || 0,
                    error: fallbackQuery.error,
                    data: fallbackQuery.data
                });

                if (fallbackQuery.error) {
                    console.error('❌ Error fetching exam schedules (case-insensitive):', fallbackQuery.error);
                    return [];
                }

                data = fallbackQuery.data;
            }

            console.log('✅ FINAL RESULT - Fetched exam schedules:', {
                count: data?.length || 0,
                has_entries: data?.some(s => s.exam_schedule_entries?.length > 0),
                schedules: data?.map(s => ({
                    id: s.id,
                    exam_name: s.exam_display_name,
                    class_id: s.class_id,
                    section: s.section,
                    entries_count: s.exam_schedule_entries?.length || 0
                })),
                filters_used: {
                    institution_id: user.institutionId,
                    class_id: studentInfo.class_id,
                    section: studentInfo.section
                }
            });

            return data || [];
        },
        enabled: !!user?.institutionId && !!studentInfo?.class_id && !!studentInfo?.section,
        staleTime: 5000, // Cache for 5 seconds
        refetchInterval: 10000, // Auto-refetch every 10 seconds for realtime effect
    });

    // Realtime subscription for exam schedules
    useEffect(() => {
        if (!user?.institutionId || !studentInfo?.class_id) return;

        console.log('Setting up realtime subscription for student exam schedules');

        const channel = supabase
            .channel('student-exam-schedules-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'exam_schedules',
                    filter: `institution_id=eq.${user.institutionId}`
                },
                (payload) => {
                    console.log('Exam schedule changed:', payload);
                    toast.info('Exam schedules updated', { duration: 2000 });
                    refetch(); // Trigger refetch when schedules change
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
                    refetch(); // Trigger refetch when entries change
                }
            )
            .subscribe();

        return () => {
            console.log('Cleaning up realtime subscription');
            supabase.removeChannel(channel);
        };
    }, [user?.institutionId, studentInfo?.class_id, refetch]);

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
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${schedule.exam_display_name} - Examination Schedule</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                        .header h1 { margin: 0; font-size: 24px; color: #000; }
                        .header p { margin: 5px 0; color: #666; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 12px; }
                        td { font-size: 14px; }
                        .subject { font-weight: bold; color: #2563eb; }
                        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
                        @media print { body { padding: 20px; } .no-print { display: none; } }
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

    const selectedSchedule = examSchedules.find((s: any) => s.id === selectedScheduleId);

    if (!studentInfo) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader fullScreen={false} />
                        <p className="text-sm text-muted-foreground">Loading your class information...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return <Loader fullScreen={false} />;
    }

    if (examSchedules.length === 0) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-2">No Exam Schedules Yet</h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Your class teacher hasn't created any exam schedules yet for {studentInfo.class_name} - Section {studentInfo.section}.
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Check back later for updates.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Exam Schedule Selector */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Select Exam</label>
                            <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choose an exam to view schedule" />
                                </SelectTrigger>
                                <SelectContent>
                                    {examSchedules.map((schedule: any) => (
                                        <SelectItem key={schedule.id} value={schedule.id}>
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                {schedule.exam_display_name} - {schedule.academic_year}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-2">
                                Class: {studentInfo.class_name} - Section {studentInfo.section}
                            </p>
                        </div>
                        {selectedSchedule && (
                            <Button
                                variant="outline"
                                onClick={() => handleDownloadPDF({
                                    id: selectedSchedule.id,
                                    exam_type: selectedSchedule.exam_type,
                                    exam_display_name: selectedSchedule.exam_display_name,
                                    class_id: studentInfo.class_name,
                                    section: selectedSchedule.section,
                                    academic_year: selectedSchedule.academic_year,
                                    entries: selectedSchedule.exam_schedule_entries.map((e: any) => ({
                                        id: e.id,
                                        exam_date: new Date(e.exam_date),
                                        day_of_week: e.day_of_week,
                                        start_time: e.start_time,
                                        end_time: e.end_time,
                                        subject: e.subject,
                                        syllabus_notes: e.syllabus_notes,
                                    })),
                                })}
                                className="mt-6"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download PDF
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Selected Schedule Preview */}
            {selectedSchedule && (
                <Card>
                    <CardContent className="p-6">
                        <ExamSchedulePreview
                            schedule={{
                                id: selectedSchedule.id,
                                exam_type: selectedSchedule.exam_type,
                                exam_display_name: selectedSchedule.exam_display_name,
                                class_id: studentInfo.class_name,
                                section: selectedSchedule.section,
                                academic_year: selectedSchedule.academic_year,
                                entries: selectedSchedule.exam_schedule_entries.map((e: any) => ({
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
                    </CardContent>
                </Card>
            )}

            {/* All Schedules List */}
            {!selectedScheduleId && examSchedules.length > 0 && (
                <div className="grid gap-4">
                    {examSchedules.map((schedule: any) => (
                        <Card key={schedule.id} className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedScheduleId(schedule.id)}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{schedule.exam_display_name}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {schedule.exam_schedule_entries.length} exams • {schedule.academic_year}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        View Schedule →
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
