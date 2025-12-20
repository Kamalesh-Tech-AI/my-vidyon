import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import { DataTable } from '@/components/common/DataTable';
import { Calendar, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

const leaveRequests = [
    { id: 1, type: 'Sick Leave', startDate: 'Dec 10, 2025', endDate: 'Dec 11, 2025', reason: 'Fever and flu', status: 'approved' },
    { id: 2, type: 'Casual Leave', startDate: 'Dec 24, 2025', endDate: 'Dec 24, 2025', reason: 'Personal work', status: 'pending' },
    { id: 3, type: 'Medical Leave', startDate: 'Oct 05, 2025', endDate: 'Oct 07, 2025', reason: 'Annual checkup', status: 'approved' },
];

export function FacultyLeave() {
    const columns = [
        { key: 'type', header: 'Leave Type' },
        { key: 'startDate', header: 'Start Date' },
        { key: 'endDate', header: 'End Date' },
        { key: 'reason', header: 'Reason' },
        {
            key: 'status',
            header: 'Status',
            render: (item: typeof leaveRequests[0]) => (
                <Badge variant={
                    item.status === 'approved' ? 'success' :
                        item.status === 'pending' ? 'warning' : 'destructive'
                }>
                    {item.status.toUpperCase()}
                </Badge>
            )
        }
    ];

    return (
        <FacultyLayout>
            <PageHeader
                title="Leave Requests"
                subtitle="Apply for and track your leave applications"
                actions={
                    <Button className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Apply for Leave
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="dashboard-card border-l-4 border-primary">
                    <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <h4 className="font-medium">Total Balance</h4>
                    </div>
                    <p className="text-2xl font-bold">12 Days</p>
                </div>
                <div className="dashboard-card border-l-4 border-success">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <h4 className="font-medium">Approved</h4>
                    </div>
                    <p className="text-2xl font-bold">4 Days</p>
                </div>
                <div className="dashboard-card border-l-4 border-warning">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-warning" />
                        <h4 className="font-medium">Pending</h4>
                    </div>
                    <p className="text-2xl font-bold">1 Day</p>
                </div>
            </div>

            <div className="dashboard-card">
                <h3 className="font-semibold mb-6">Leave History</h3>
                <DataTable columns={columns} data={leaveRequests} />
            </div>
        </FacultyLayout>
    );
}
