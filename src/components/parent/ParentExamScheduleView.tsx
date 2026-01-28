import { useState, useEffect } from 'react';
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
import { ExamSchedulePreview } from '@/components/exam-schedule/ExamSchedulePreview';
import { Calendar, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import Loader from '@/components/common/Loader';
import { format } from 'date-fns';

interface ParentExamScheduleViewProps {
    institutionId: string;
    classId: string; // This is actually the class name (e.g., "10th") as per the schema usage
    section: string;
}

export function ParentExamScheduleView({ institutionId, classId, section }: ParentExamScheduleViewProps) {
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

    // Fetch exam schedules for the child's class
    const { data: examSchedules = [], isLoading, refetch } = useQuery({
        queryKey: ['parent-exam-schedules', institutionId, classId, section],
        queryFn: async () => {
            if (!institutionId || !classId || !section) {
                console.log('❌ Missing required data for fetching exam schedules:', {
                    institutionId,
                    classId,
                    section
                });
                return [];
            }

            console.log('🔍 PARENT EXAM SCHEDULE QUERY - Fetching with:', {
                institution_id: institutionId,
                class_id: classId,
                section: section
            });

            // Normalizing classId (e.g., "10th" -> "10")
            const normalizedClassId = classId.replace(/(st|nd|rd|th)$/i, '');
            console.log('📏 Normalized classId for search:', normalizedClassId);

            // Try exact match first
            let { data, error } = await supabase
                .from('exam_schedules')
                .select(`
                    *,
                    exam_schedule_entries (*)
                `)
                .eq('institution_id', institutionId)
                .or(`class_id.eq.${classId},class_id.eq.${normalizedClassId}`)
                .eq('section', section)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching exam schedules:', error);
            }

            // Fallback: If no results with section, check if there's a general class schedule (section-less or matches institution_id)
            if (!data || data.length === 0) {
                console.log('🔄 No specific group matches found. Trying wider search...');
                const widerSearch = await supabase
                    .from('exam_schedules')
                    .select(`
                        *,
                        exam_schedule_entries (*)
                    `)
                    .eq('institution_id', institutionId)
                    .or(`class_id.ilike.%${normalizedClassId}%`)
                    .order('created_at', { ascending: false });

                if (!widerSearch.error && widerSearch.data && widerSearch.data.length > 0) {
                    console.log('✅ Found schedules with wider search:', widerSearch.data.length);
                    data = widerSearch.data;
                }
            }

            if (data) {
                data.forEach((s: any) => {
                    console.log(`📊 Schedule ${s.exam_display_name}: ${s.exam_schedule_entries?.length || 0} entries found.`);
                });
            }

            return data || [];
        },
        enabled: !!institutionId && !!classId && !!section,
        staleTime: 30000,
    });

    // Realtime subscription not strictly necessary for parents viewing, 
    // but can be added if needed. For now, we'll rely on query refetch on mount/update.

    const handleDownloadPDF = (schedule: any) => {
        try {
            const printWindow = window.open('', '', 'height=600,width=800');
            if (!printWindow) {
                toast.error('Please allow popups to download PDF');
                return;
            }

            const entries = schedule.exam_schedule_entries.sort((a: any, b: any) =>
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
            // Wait for content to load slightly before print dialog? 
            // Usually valid html is enough.
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate PDF');
        }
    };

    const selectedSchedule = examSchedules.find((s: any) => s.id === selectedScheduleId);

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
                                No exam schedules have been published for {classId} - Section {section} yet.
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
                                Class: {classId} - Section {section}
                            </p>
                        </div>
                        {selectedSchedule && (
                            <Button
                                variant="outline"
                                onClick={() => handleDownloadPDF(selectedSchedule)}
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
            {selectedSchedule ? (
                <Card>
                    <CardContent className="p-6">
                        <ExamSchedulePreview
                            schedule={{
                                id: selectedSchedule.id,
                                exam_type: selectedSchedule.exam_type,
                                exam_display_name: selectedSchedule.exam_display_name,
                                class_id: classId,
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
            ) : (
                // If no schedule selected but we have a list, defaulting to nothing shown
                // or we could auto-select the first one. For now, prompt to select.
                <div className="flex justify-center p-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    Select an exam from the dropdown above to view details
                </div>
            )}
        </div>
    );
}
