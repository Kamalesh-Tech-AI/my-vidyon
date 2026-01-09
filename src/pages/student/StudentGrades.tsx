import { useState } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/common/Badge';
import { useTranslation } from '@/i18n/TranslationContext';
import { TrendingUp, Award, FileSpreadsheet } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

// Mock Data Structure for multiple exams
const examResults = {
    'term1': {
        title: 'Term 1 Final Examination',
        results: [
            { course: 'Mathematics', marks: 88, total: 100, grade: 'A2', remarks: 'Excellent performance' },
            { course: 'Science', marks: 82, total: 100, grade: 'A2', remarks: 'Good understanding of concepts' },
            { course: 'English', marks: 90, total: 100, grade: 'A1', remarks: 'Outstanding' },
            { course: 'Social Studies', marks: 78, total: 100, grade: 'B1', remarks: 'Can do better' },
            { course: 'Hindi', marks: 86, total: 100, grade: 'A2', remarks: 'Very Good' },
        ],
        percentage: '84.8%'
    },
    'ut1': {
        title: 'Unit Test - I',
        results: [
            { course: 'Mathematics', marks: 22, total: 25, grade: 'A1', remarks: 'Great job' },
            { course: 'Science', marks: 20, total: 25, grade: 'A2', remarks: 'Good' },
            { course: 'English', marks: 24, total: 25, grade: 'A1', remarks: 'Excellent' },
        ],
        percentage: '88.0%'
    },
    'ut2': {
        title: 'Unit Test - II',
        results: [
            { course: 'Mathematics', marks: 24, total: 25, grade: 'A1', remarks: 'Improved' },
            { course: 'Science', marks: 23, total: 25, grade: 'A1', remarks: 'Very Good' },
            { course: 'English', marks: 23, total: 25, grade: 'A1', remarks: 'Consistent' },
        ],
        percentage: '93.3%'
    }
};

export function StudentGrades() {
    const { t } = useTranslation();
    const [selectedExam, setSelectedExam] = useState<string>('term1');

    const currentExamData = examResults[selectedExam as keyof typeof examResults];

    return (
        <StudentLayout>
            <PageHeader
                title="Exam Results"
                subtitle="View your performance across different assessments"
            />

            {/* Exam Selector */}
            <div className="dashboard-card mb-6 p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                        <Label className="mb-2 block">Select Examination</Label>
                        <Select value={selectedExam} onValueChange={setSelectedExam}>
                            <SelectTrigger className="w-full md:w-[300px]">
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue placeholder="Select Exam" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="term1">Term 1 Final Exam</SelectItem>
                                <SelectItem value="ut1">Unit Test - I</SelectItem>
                                <SelectItem value="ut2">Unit Test - II</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {currentExamData && (
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Award className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Overall Percentage</p>
                                <p className="text-2xl font-bold text-primary">{currentExamData.percentage}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Table */}
            {currentExamData && (
                <div className="dashboard-card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-lg">{currentExamData.title} Result</h3>
                        <Badge variant="outline">
                            {currentExamData.results.length} Subjects
                        </Badge>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="table-header text-left">Subject</th>
                                    <th className="table-header text-center">Marks Obtained</th>
                                    <th className="table-header text-center">Total Marks</th>
                                    <th className="table-header text-center">Grade</th>
                                    <th className="table-header text-left">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentExamData.results.map((result, index) => (
                                    <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                                        <td className="table-cell font-medium">{result.course}</td>
                                        <td className="table-cell text-center font-semibold">{result.marks}</td>
                                        <td className="table-cell text-center text-muted-foreground">{result.total}</td>
                                        <td className="table-cell text-center">
                                            <Badge variant={result.grade.startsWith('A') ? 'success' : result.grade.startsWith('B') ? 'info' : 'warning'}>
                                                {result.grade}
                                            </Badge>
                                        </td>
                                        <td className="table-cell text-muted-foreground text-sm">{result.remarks}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </StudentLayout>
    );
}
