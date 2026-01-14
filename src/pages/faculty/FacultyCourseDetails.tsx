import { useState } from 'react';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Download, Save, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initialSubmissions = [
    { id: 1, student: 'John Smith', rollNo: '101', assignment: 'Algebra Problem Set', submittedOn: 'Dec 21, 2025', status: 'submitted', file: 'algebra_pset.pdf', grade: '' },
    { id: 2, student: 'Emily Johnson', rollNo: '102', assignment: 'Algebra Problem Set', submittedOn: 'Dec 22, 2025', status: 'submitted', file: 'emily_alg.jpg', grade: '95' },
    { id: 3, student: 'Michael Brown', rollNo: '103', assignment: 'Algebra Problem Set', submittedOn: '-', status: 'pending', file: '', grade: '' },
    { id: 4, student: 'Sarah Davis', rollNo: '104', assignment: 'Algebra Problem Set', submittedOn: 'Dec 20, 2025', status: 'submitted', file: 'sarah_math.pdf', grade: '88' },
    { id: 5, student: 'James Wilson', rollNo: '105', assignment: 'Algebra Problem Set', submittedOn: '-', status: 'late', file: '', grade: '' },
];

export function FacultyCourseDetails() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState(initialSubmissions);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'submitted' | 'late'>('all');

    const handleGradeChange = (id: number, value: string) => {
        setSubmissions(submissions.map(s => s.id === id ? { ...s, grade: value } : s));
    };

    const handleSaveGrades = () => {
        toast.success("Grades saved successfully");
    };

    // Filter submissions based on selected status
    const filteredSubmissions = filterStatus === 'all'
        ? submissions
        : submissions.filter(s => s.status === filterStatus);

    const columns = [
        { key: 'student', header: 'Student Name' },
        { key: 'rollNo', header: 'Roll No.' },
        { key: 'assignment', header: 'Assignment' },
        {
            key: 'status',
            header: 'Status',
            render: (item: typeof initialSubmissions[0]) => (
                <Badge variant={
                    item.status === 'submitted' ? 'success' :
                        item.status === 'pending' ? 'warning' : 'destructive'
                }>
                    {item.status}
                </Badge>
            )
        },
        {
            key: 'file',
            header: 'Submission',
            render: (item: typeof initialSubmissions[0]) => item.file ? (
                <Button variant="ghost" size="sm" className="h-8 text-primary">
                    <FileText className="w-4 h-4 mr-2" />
                    View
                </Button>
            ) : <span className="text-muted-foreground text-sm">-</span>
        },
        {
            key: 'grade',
            header: 'Grade (Max 100)',
            render: (item: typeof initialSubmissions[0]) => (
                <Input
                    type="number"
                    placeholder="Enter Grade"
                    value={item.grade}
                    onChange={(e) => handleGradeChange(item.id, e.target.value)}
                    className="w-32 h-8"
                    disabled={item.status === 'pending'}
                />
            )
        }
    ];

    return (
        <FacultyLayout>
            <PageHeader
                title={`Course Details: ${courseId}`}
                subtitle="Manage student submissions and grades"
                actions={
                    <Button variant="outline" onClick={() => navigate('/faculty/courses')}>
                        Back to Courses
                    </Button>
                }
            />

            <div className="dashboard-card">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search students..."
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    Filter: {filterStatus === 'all' ? 'All' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                                    All Submissions
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('pending')}>
                                    Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('submitted')}>
                                    Submitted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('late')}>
                                    Late
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button className="btn-primary flex items-center gap-2" onClick={handleSaveGrades}>
                            <Save className="w-4 h-4" />
                            Save Grades
                        </Button>
                    </div>
                </div>

                <DataTable columns={columns} data={filteredSubmissions} />
            </div>
        </FacultyLayout>
    );
}
