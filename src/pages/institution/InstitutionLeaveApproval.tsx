import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Check, X, Eye, Calendar, User, Building, FileText } from 'lucide-react';
import { toast } from 'sonner';

// Mock Data
const MOCK_LEAVE_REQUESTS = [
    {
        id: 1,
        staffName: "Dr. Robert Brown",
        staffId: "FAC-001",
        dept: "Science",
        reason: "Medical Emergency",
        startDate: "2025-01-12",
        endDate: "2025-01-14",
        status: "Pending",
        description: "I have a scheduled surgery and need to take leave for 3 days. I have assigned my classes to Ms. Sarah."
    },
    {
        id: 2,
        staffName: "Mrs. Jennifer Lee",
        staffId: "FAC-005",
        dept: "Mathematics",
        reason: "Casual Leave",
        startDate: "2025-01-15",
        endDate: "2025-01-16",
        status: "Pending",
        description: "Attending a family function out of town."
    },
    {
        id: 3,
        staffName: "Mr. David Miller",
        staffId: "FAC-012",
        dept: "Physical Education",
        reason: "Sick Leave",
        startDate: "2025-01-10",
        endDate: "2025-01-11",
        status: "Approved",
        description: "Suffering from high fever."
    },
    {
        id: 4,
        staffName: "Ms. Emily White",
        staffId: "FAC-008",
        dept: "English",
        reason: "Personal",
        startDate: "2025-01-20",
        endDate: "2025-01-20",
        status: "Rejected",
        description: "Personal errands."
    }
];

export function InstitutionLeaveApproval() {
    const [requests, setRequests] = useState(MOCK_LEAVE_REQUESTS);
    const [selectedRequest, setSelectedRequest] = useState<typeof MOCK_LEAVE_REQUESTS[0] | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const handleAction = (id: number, status: 'Approved' | 'Rejected') => {
        setRequests(prev => prev.map(req =>
            req.id === id ? { ...req, status } : req
        ));

        toast.success(`Leave request ${status.toLowerCase()} for ${selectedRequest?.staffName}`, {
            description: `Notification sent to faculty member.`
        });

        setIsDetailsOpen(false);
    };

    const openDetails = (request: typeof MOCK_LEAVE_REQUESTS[0]) => {
        setSelectedRequest(request);
        setIsDetailsOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Approved': return <Badge variant="success">Approved</Badge>;
            case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
            default: return <Badge variant="warning">Pending</Badge>;
        }
    };

    return (
        <InstitutionLayout>
            <PageHeader
                title="Leave Approval"
                subtitle="Manage and approve faculty leave requests"
            />

            <Card className="p-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Staff Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Leave Dates</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.map((request) => (
                            <TableRow key={request.id}>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{request.staffName}</span>
                                        <span className="text-xs text-muted-foreground">{request.staffId}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{request.dept}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-3 h-3 text-muted-foreground" />
                                        {request.startDate} <span className="text-muted-foreground">to</span> {request.endDate}
                                    </div>
                                </TableCell>
                                <TableCell>{request.reason}</TableCell>
                                <TableCell>{getStatusBadge(request.status)}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openDetails(request)}
                                        className="gap-2"
                                    >
                                        <Eye className="w-4 h-4" /> View Details
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Leave Request Details</DialogTitle>
                        <DialogDescription>Review full details before approving or denying.</DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold">{selectedRequest.staffName}</h4>
                                    <p className="text-sm text-muted-foreground">{selectedRequest.staffId}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <span className="text-muted-foreground flex items-center gap-1"><Building className="w-3 h-3" /> Department</span>
                                    <p className="font-medium">{selectedRequest.dept}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Reason</span>
                                    <p className="font-medium">{selectedRequest.reason}</p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Duration</span>
                                    <p className="font-medium">{selectedRequest.startDate} — {selectedRequest.endDate}</p>
                                </div>
                                <div className="col-span-2 space-y-1 bg-muted/20 p-3 rounded-md">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Description</span>
                                    <p className="text-sm mt-1">{selectedRequest.description}</p>
                                </div>
                            </div>

                            {selectedRequest.status === 'Pending' && (
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        className="flex-1 bg-success hover:bg-success/90 text-white"
                                        onClick={() => handleAction(selectedRequest.id, 'Approved')}
                                    >
                                        <Check className="w-4 h-4 mr-2" /> Approve
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={() => handleAction(selectedRequest.id, 'Rejected')}
                                    >
                                        <X className="w-4 h-4 mr-2" /> Deny
                                    </Button>
                                </div>
                            )}

                            {selectedRequest.status !== 'Pending' && (
                                <div className="p-3 text-center bg-muted rounded-md text-sm font-medium">
                                    This request has already been {selectedRequest.status.toLowerCase()}.
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </InstitutionLayout>
    );
}
