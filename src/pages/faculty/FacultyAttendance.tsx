import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CheckCircle, XCircle, Search, Filter } from 'lucide-react';

const students = [
    { id: 1, rollNo: '101', name: 'John Smith', class: 'Grade 10-A', lastAttendance: '92%', status: 'present' },
    { id: 2, rollNo: '102', name: 'Emily Johnson', class: 'Grade 10-A', lastAttendance: '88%', status: 'present' },
    { id: 3, rollNo: '103', name: 'Michael Brown', class: 'Grade 10-A', lastAttendance: '95%', status: 'absent' },
    { id: 4, rollNo: '104', name: 'Sarah Davis', class: 'Grade 10-A', lastAttendance: '72%', status: 'present' },
    { id: 5, rollNo: '105', name: 'James Wilson', class: 'Grade 10-A', lastAttendance: '98%', status: 'present' },
];

export function FacultyAttendance() {
    const [attendance, setAttendance] = useState(students);

    const toggleStatus = (id: number) => {
        setAttendance(prev => prev.map(s =>
            s.id === id ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s
        ));
    };

    const columns = [
        { key: 'rollNo', header: 'Roll No.' },
        { key: 'name', header: 'Student Name' },
        { key: 'class', header: 'Class' },
        { key: 'lastAttendance', header: 'Overall Attendance' },
        {
            key: 'status',
            header: 'Status',
            render: (item: typeof students[0]) => (
                <Badge variant={item.status === 'present' ? 'success' : 'destructive'}>
                    {item.status.toUpperCase()}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item: typeof students[0]) => (
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant={item.status === 'present' ? 'default' : 'outline'}
                        onClick={() => toggleStatus(item.id)}
                        className="h-8 w-8 p-0"
                    >
                        <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant={item.status === 'absent' ? 'destructive' : 'outline'}
                        onClick={() => toggleStatus(item.id)}
                        className="h-8 w-8 p-0"
                    >
                        <XCircle className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <FacultyLayout>
            <PageHeader
                title="Attendance Management"
                subtitle="Mark and manage student attendance for your subjects"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filter Class
                        </Button>
                        <Button className="btn-primary">
                            Save Attendance
                        </Button>
                    </div>
                }
            />

            <div className="dashboard-card mb-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="input-field pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Subject: <strong>Mathematics</strong></span>
                        <span>•</span>
                        <span>Date: <strong>Dec 20, 2025</strong></span>
                    </div>
                </div>

                <DataTable columns={columns} data={attendance} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="dashboard-card bg-success/5 border-success/20">
                    <h4 className="text-sm font-medium text-success mb-1">Present</h4>
                    <p className="text-2xl font-bold text-success">{attendance.filter(s => s.status === 'present').length}</p>
                </div>
                <div className="dashboard-card bg-destructive/5 border-destructive/20">
                    <h4 className="text-sm font-medium text-destructive mb-1">Absent</h4>
                    <p className="text-2xl font-bold text-destructive">{attendance.filter(s => s.status === 'absent').length}</p>
                </div>
                <div className="dashboard-card bg-info/5 border-info/20">
                    <h4 className="text-sm font-medium text-info mb-1">Total Strength</h4>
                    <p className="text-2xl font-bold text-info">{attendance.length}</p>
                </div>
            </div>
        </FacultyLayout>
    );
}
