import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileText, Download, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

const assignments = [
    { id: 1, title: 'Algebra Homework', subject: 'Mathematics', class: 'Grade 10-A', dueDate: 'Dec 22, 2025', submissions: '42/45', status: 'active' },
    { id: 2, title: 'Physics Lab Report', subject: 'Science', class: 'Grade 9-B', dueDate: 'Dec 25, 2025', submissions: '12/52', status: 'active' },
    { id: 3, title: 'Shakespeare Essay', subject: 'English', class: 'Grade 10-C', dueDate: 'Dec 18, 2025', submissions: '28/28', status: 'closed' },
    { id: 4, title: 'Geometry Practice', subject: 'Mathematics', class: 'Grade 9-A', dueDate: 'Dec 20, 2025', submissions: '35/40', status: 'active' },
];

export function FacultyAssignments() {
    const columns = [
        { key: 'title', header: 'Assignment Title' },
        { key: 'subject', header: 'Subject' },
        { key: 'class', header: 'Class' },
        { key: 'dueDate', header: 'Due Date' },
        { key: 'submissions', header: 'Submissions' },
        {
            key: 'status',
            header: 'Status',
            render: (item: typeof assignments[0]) => (
                <Badge variant={item.status === 'active' ? 'success' : 'outline'}>
                    {item.status.toUpperCase()}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: () => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <FacultyLayout>
            <PageHeader
                title="Assignments"
                subtitle="Create and manage assignments for your students"
                actions={
                    <Button
                        className="btn-primary flex items-center gap-2"
                        onClick={() => toast.success('Redirecting to Assignment Creator...')}
                    >
                        <Plus className="w-4 h-4" />
                        Create Assignment
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="dashboard-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Plus className="w-5 h-5 text-primary" />
                        </div>
                        <h4 className="font-medium">Total Active</h4>
                    </div>
                    <p className="text-2xl font-bold">12</p>
                </div>
                <div className="dashboard-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-success/10 rounded-lg">
                            <FileText className="w-5 h-5 text-success" />
                        </div>
                        <h4 className="font-medium">Graded</h4>
                    </div>
                    <p className="text-2xl font-bold">45</p>
                </div>
                <div className="dashboard-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-warning/10 rounded-lg">
                            <Download className="w-5 h-5 text-warning" />
                        </div>
                        <h4 className="font-medium">Pending Review</h4>
                    </div>
                    <p className="text-2xl font-bold">8</p>
                </div>
                <div className="dashboard-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-info/10 rounded-lg">
                            <Search className="w-5 h-5 text-info" />
                        </div>
                        <h4 className="font-medium">Due Today</h4>
                    </div>
                    <p className="text-2xl font-bold">2</p>
                </div>
            </div>

            <div className="dashboard-card">
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search assignments..."
                            className="input-field pl-10"
                        />
                    </div>
                </div>

                <DataTable columns={columns} data={assignments} />
            </div>
        </FacultyLayout>
    );
}
