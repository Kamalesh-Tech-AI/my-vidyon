import { useState, useEffect } from 'react';
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
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Check, X, Eye, Calendar, User, Building, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useInstitution } from '@/context/InstitutionContext';

// Type definition
interface LeaveRequest {
    id: string;
    staffName: string;
    staffId: string; // role/id display
    staff_profile_id: string; // actual UUID
    dept: string;
    reason: string;
    startDate: string; // ISO or YYYY-MM-DD
    endDate: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    description: string;
}

export function InstitutionLeaveApproval() {
    const { user } = useAuth();
    const { allStaffMembers } = useInstitution();
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Fetch Leave Requests
    useEffect(() => {
        if (!user?.institutionId) return;

        const fetchLeaves = async () => {
            try {
                // Fetch leaves with staff profile details
                const { data, error } = await supabase
                    .from('staff_leaves')
                    .select(`
                        id,
                        staff_id,
                        leave_type,
                        start_date,
                        end_date,
                        reason,
                        status,
                        created_at,
                        profiles:staff_id (
                            full_name,
                            role
                        )
                    `)
                    .eq('institution_id', user.institutionId)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    const formattedLeaves: LeaveRequest[] = data.map((item: any) => {
                        const profile = item.profiles;
                        const sDate = format(new Date(item.start_date), 'MMM dd, yyyy');
                        const eDate = format(new Date(item.end_date), 'MMM dd, yyyy');

                        return {
                            id: item.id,
                            staffName: profile?.full_name || 'Unknown Staff',
                            staffId: profile?.role?.toUpperCase() || 'STAFF',
                            staff_profile_id: item.staff_id,
                            dept: 'General', // No dept in staff_leaves, maybe infer from context context?
                            reason: item.leave_type, // Mapping leave_type to reason (or reason column?)
                            // Wait, UI has 'reason' and 'description'.
                            // DB has 'leave_type' and 'reason' (which matches UI description).
                            // UI 'reason' column usually maps to leave_type (Medical, Personal)

                            startDate: sDate,
                            endDate: eDate,
                            status: item.status.charAt(0).toUpperCase() + item.status.slice(1) as any,
                            description: item.reason || 'No description provided.'
                        };
                    });
                    setRequests(formattedLeaves);
                }
            } catch (err: any) {
                console.error("Error fetching leaves:", err);
                toast.error("Failed to load leave requests");
            } finally {
                setLoading(false);
            }
        };

        fetchLeaves();

        // Real-time subscription with auto-refresh
        const channel = supabase
            .channel('staff_leaves_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'staff_leaves', filter: `institution_id=eq.${user.institutionId}` },
                (payload) => {
                    console.log('📡 Real-time update received:', payload);

                    // Show toast notification for different events
                    if (payload.eventType === 'INSERT') {
                        toast.info('New Leave Request', {
                            description: 'A new leave request has been submitted',
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        toast.success('Leave Request Updated', {
                            description: 'A leave request has been updated',
                        });
                    } else if (payload.eventType === 'DELETE') {
                        toast.info('Leave Request Deleted', {
                            description: 'A leave request has been removed',
                        });
                    }

                    // Auto-refresh data immediately
                    fetchLeaves();
                }
            )
            .subscribe((status) => {
                console.log('📡 Subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.institutionId]);


    const handleAction = async (id: string, status: 'Approved' | 'Rejected') => {
        if (!user?.institutionId) return;
        setProcessingId(id);

        try {
            const { error } = await supabase
                .from('staff_leaves')
                .update({
                    status: status.toLowerCase(),
                    approved_by: user.id // Assuming user.id is the approver (admin)
                })
                .eq('id', id);

            if (error) throw error;

            toast.success(`Leave request ${status.toLowerCase()}`);

            // Optimistic update (though subscription will catch it)
            setRequests(prev => prev.map(req =>
                req.id === id ? { ...req, status } : req
            ));

            setIsDetailsOpen(false);
        } catch (err: any) {
            console.error("Error updating leave:", err);
            toast.error("Failed to update leave request");
        } finally {
            setProcessingId(null);
        }
    };

    const openDetails = (request: LeaveRequest) => {
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
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : requests.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">No leave requests found.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Leave Dates</TableHead>
                                <TableHead>Type</TableHead>
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
                                        </div>
                                    </TableCell>
                                    <TableCell>{request.staffId}</TableCell>
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
                )}
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
                                    <span className="text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Type</span>
                                    <p className="font-medium">{selectedRequest.reason}</p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Duration</span>
                                    <p className="font-medium">{selectedRequest.startDate} — {selectedRequest.endDate}</p>
                                </div>
                                <div className="col-span-2 space-y-1 bg-muted/20 p-3 rounded-md">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Description / Reason</span>
                                    <p className="text-sm mt-1">{selectedRequest.description}</p>
                                </div>
                            </div>

                            {selectedRequest.status === 'Pending' && (
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        className="flex-1 bg-success hover:bg-success/90 text-white"
                                        onClick={() => handleAction(selectedRequest.id, 'Approved')}
                                        disabled={!!processingId}
                                    >
                                        {processingId === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                        Approve
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={() => handleAction(selectedRequest.id, 'Rejected')}
                                        disabled={!!processingId}
                                    >
                                        {processingId === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                                        Deny
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
