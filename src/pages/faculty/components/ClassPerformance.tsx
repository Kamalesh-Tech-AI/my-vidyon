import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Eye } from 'lucide-react';

interface ClassPerformanceProps {
    targetClass: string;
    targetSection: string;
    students: any[];
    examResults: any[];
    onViewPublish: (student: any) => void;
}

export function ClassPerformance({
    targetClass,
    targetSection,
    students,
    examResults,
    onViewPublish
}: ClassPerformanceProps) {

    // Helper to get status summary for a student
    const getStudentStatus = (studentId: string) => {
        const results = examResults.filter((r: any) => r.student_id === studentId);
        if (results.length === 0) return { status: 'PENDING', label: 'No Data', color: 'secondary' };

        const allPublished = results.every((r: any) => r.status === 'PUBLISHED');
        if (allPublished) return { status: 'PUBLISHED', label: 'Published', color: 'success' };

        const anySubmitted = results.some((r: any) => r.status === 'SUBMITTED');
        const anyDraft = results.some((r: any) => r.status === 'DRAFT');

        if (anySubmitted) return { status: 'SUBMITTED', label: 'Ready to Review', color: 'warning' };
        if (anyDraft) return { status: 'DRAFT', label: 'Drafts in Progress', color: 'secondary' };

        return { status: 'UNKNOWN', label: 'Unknown', color: 'secondary' };
    };

    return (
        <div className="p-0">
            <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Class Performance Overview
                </h3>
                <div className="text-sm text-muted-foreground">
                    Showing all students in {targetClass} - {targetSection}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border">
                            <th className="py-3 px-4 text-left font-medium text-sm">Roll No</th>
                            <th className="py-3 px-4 text-left font-medium text-sm">Student Name</th>
                            <th className="py-3 px-4 text-center font-medium text-sm">Submitted Subjects</th>
                            <th className="py-3 px-4 text-center font-medium text-sm">Status</th>
                            <th className="py-3 px-4 text-right font-medium text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.length === 0 ? (
                            <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No students found in your class</td></tr>
                        ) : (
                            students.map((student: any) => {
                                const studentResults = examResults.filter((r: any) => r.student_id === student.id);
                                const statusInfo = getStudentStatus(student.id);

                                return (
                                    <tr key={student.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                        <td className="py-3 px-4 text-sm font-medium">{student.roll_no}</td>
                                        <td className="py-3 px-4 font-medium">{student.name}</td>
                                        <td className="py-3 px-4 text-center">
                                            <Badge variant="outline">{studentResults.length} Subjects</Badge>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <Badge variant={statusInfo.color as any}>
                                                {statusInfo.label}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-primary hover:text-primary/80"
                                                onClick={() => onViewPublish(student)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                View & Publish
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
