import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Search, Filter, Save } from 'lucide-react';

const students = [
    { id: 1, name: 'John Smith', rollNo: '101', internal: 18, external: 72, total: 90 },
    { id: 2, name: 'Emily Johnson', rollNo: '102', internal: 19, external: 68, total: 87 },
    { id: 3, name: 'Michael Brown', rollNo: '103', internal: 15, external: 60, total: 75 },
    { id: 4, name: 'Sarah Davis', rollNo: '104', internal: 17, external: 75, total: 92 },
    { id: 5, name: 'James Wilson', rollNo: '105', internal: 20, external: 78, total: 98 },
];

export function FacultyMarks() {
    const columns = [
        { key: 'rollNo', header: 'Roll No.' },
        { key: 'name', header: 'Student Name' },
        {
            key: 'internal',
            header: 'Internal Marks (20)',
            render: (item: any) => (
                <input
                    type="number"
                    defaultValue={item.internal}
                    className="w-20 px-2 py-1 border rounded focus:ring-1 focus:ring-primary outline-none"
                />
            )
        },
        {
            key: 'external',
            header: 'External Marks (80)',
            render: (item: any) => (
                <input
                    type="number"
                    defaultValue={item.external}
                    className="w-20 px-2 py-1 border rounded focus:ring-1 focus:ring-primary outline-none"
                />
            )
        },
        { key: 'total', header: 'Total (100)' },
    ];

    return (
        <FacultyLayout>
            <PageHeader
                title="Marks Entry"
                subtitle="Manage and enter student marks for assessments"
                actions={
                    <Button className="btn-primary flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Save Marks
                    </Button>
                }
            />

            <div className="dashboard-card mb-6">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="input-field pl-10"
                        />
                    </div>
                    <select className="px-4 py-2 border rounded-lg bg-background">
                        <option>Mathematics - Class 10-A</option>
                        <option>Mathematics - Class 10-B</option>
                        <option>Science - Class 9-A</option>
                    </select>
                    <select className="px-4 py-2 border rounded-lg bg-background">
                        <option>Term 2 Final Exam</option>
                        <option>Unit Test - II</option>
                        <option>Internal Assessment</option>
                    </select>
                </div>

                <DataTable columns={columns} data={students} />
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="outline">Discard Changes</Button>
                <Button className="btn-primary">Finalize & Submit</Button>
            </div>
        </FacultyLayout>
    );
}
