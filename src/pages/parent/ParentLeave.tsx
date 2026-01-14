import { useState } from 'react';
import { ParentLayout } from '@/layouts/ParentLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Send, History } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/common/Badge';
import { useTranslation } from '@/i18n/TranslationContext';

import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function ParentLeave() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [selectedChild, setSelectedChild] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    const { data: myChildren, isLoading } = useQuery({
        queryKey: ['parent-children', user?.id],
        queryFn: async () => {
            const { data: parentData, error: parentError } = await supabase
                .from('parents')
                .select('id')
                .eq('profile_id', user?.id)
                .single();

            if (parentError) throw parentError;

            const { data: links, error: linkError } = await supabase
                .from('student_parents')
                .select('student_id')
                .eq('parent_id', parentData.id);

            if (linkError) throw linkError;

            if (!links || links.length === 0) return [];

            const studentIds = links.map(l => l.student_id);

            const { data: students, error: studentError } = await supabase
                .from('students')
                .select('id, name, class_name, class_id, section')
                .in('id', studentIds);

            if (studentError) throw studentError;

            return students.map(s => ({
                id: s.id,
                name: s.name,
                grade: s.class_name || 'N/A',
                classId: s.class_id,
                section: s.section
            }));
        },
        enabled: !!user?.id
    });

    const students = myChildren || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChild || !startDate || !endDate || !reason) {
            toast.error(t.parent.leave.fillAllFields);
            return;
        }

        const selectedStudent = students.find(s => s.id === selectedChild);
        if (!selectedStudent) return;

        try {
            // 1. Get Parent ID
            const { data: parentData } = await supabase
                .from('parents')
                .select('id')
                .eq('profile_id', user?.id)
                .single();

            if (!parentData) throw new Error('Parent record not found');

            // 2. Insert Leave Request
            const { error: leaveError } = await supabase
                .from('leave_requests')
                .insert({
                    student_id: selectedStudent.id,
                    parent_id: parentData.id,
                    from_date: startDate,
                    to_date: endDate,
                    reason: reason,
                    status: 'Pending'
                });

            if (leaveError) throw leaveError;

            // 3. Find Class Teacher to Notify
            // We need class_id and section from the student.
            // If class_id is missing on student, we try to rely on class_name (less reliable) or skip.
            // Assuming student has class_id as per types.

            if (selectedStudent.classId && selectedStudent.section) {
                const { data: classTeacherData } = await supabase
                    .from('faculty_subjects')
                    .select('faculty_profile_id')
                    .eq('class_id', selectedStudent.classId)
                    .eq('section', selectedStudent.section)
                    .eq('assignment_type', 'class_teacher')
                    .single();

                if (classTeacherData?.faculty_profile_id) {
                    // 4. Send Notification
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: classTeacherData.faculty_profile_id,
                            title: 'New Leave Request',
                            message: `Parent of ${selectedStudent.name} (${selectedStudent.grade}) has requested leave from ${startDate} to ${endDate}.`,
                            type: 'leave',
                            read: false
                        });
                }
            }

            toast.success(`${t.parent.leave.submittedSuccess} ${selectedStudent.name}`);

            // Reset form
            setSelectedChild('');
            setStartDate('');
            setEndDate('');
            setReason('');

        } catch (error: any) {
            console.error('Error submitting leave:', error);
            toast.error(error.message || 'Failed to submit leave request');
        }
    };

    return (
        <ParentLayout>
            <PageHeader
                title={t.parent.leave.title}
                subtitle={t.parent.leave.subtitle}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Application Form */}
                <div className="space-y-6">
                    <div className="dashboard-card">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <Calendar className="w-5 h-5" />
                            <h3 className="font-semibold text-lg">{t.parent.leave.newRequest}</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t.parent.leave.selectStudent}</Label>
                                <Select value={selectedChild} onValueChange={setSelectedChild}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t.parent.leave.selectChildPlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isLoading ? (
                                            <div className="p-2 flex items-center justify-center">
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : (
                                            students.map(child => (
                                                <SelectItem key={child.id} value={child.id}>
                                                    {child.name} ({child.grade})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t.parent.leave.fromDate}</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t.parent.leave.toDate}</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t.parent.leave.reason}</Label>
                                <Textarea
                                    placeholder={t.parent.leave.reasonPlaceholder}
                                    className="min-h-[120px]"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full">
                                <Send className="w-4 h-4 mr-2" />
                                {t.parent.leave.submitRequest}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* History */}
                <div className="space-y-6">
                    <div className="dashboard-card">
                        <div className="flex items-center gap-2 mb-6 text-muted-foreground">
                            <History className="w-5 h-5" />
                            <h3 className="font-semibold text-lg">{t.parent.leave.history}</h3>
                        </div>

                        <div className="space-y-4">
                            {/* Mock History Items */}
                            <div className="p-4 rounded-lg bg-muted/30 border border-border">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-medium">Alex Johnson</h4>
                                        <span className="text-sm text-muted-foreground">Sick Leave</span>
                                    </div>
                                    <Badge variant="success">{t.parent.leave.approved}</Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Nov 12, 2025 - Nov 13, 2025 (2 days)
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-muted/30 border border-border">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-medium">Emily Johnson</h4>
                                        <span className="text-sm text-muted-foreground">Family Function</span>
                                    </div>
                                    <Badge variant="warning">{t.parent.leave.pending}</Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Dec 24, 2025 - Dec 25, 2025 (2 days)
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                        <strong>{t.parent.leave.note}:</strong> {t.parent.leave.noteContent}
                    </div>
                </div>
            </div>
        </ParentLayout>
    );
}
