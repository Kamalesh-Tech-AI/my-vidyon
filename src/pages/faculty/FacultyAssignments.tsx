import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileText, Download, MoreVertical, Edit, XCircle, Eye } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function FacultyAssignments() {
    const navigate = useNavigate();
    const { user } = useAuth(); // Need auth
    const [assignments, setAssignments] = useState<any[]>([]);
    const [viewSubmissionsOpen, setViewSubmissionsOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

    // Fetch assignments
    useEffect(() => {
        if (!user?.id) return;

        const fetchAssignments = async () => {
            const { data, error } = await supabase
                .from('assignments')
                .select(`
                    *,
                    classes ( name, section )
                `)
                .eq('faculty_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(error);
                return;
            }

            // Transform data to match UI
            const formatted = data.map((a: any) => ({
                id: a.id,
                title: a.title,
                subject: 'Subject', // we need subject name
                class: a.classes ? `${a.classes.name} - ${a.classes.section}` : 'N/A',
                dueDate: new Date(a.due_date).toLocaleDateString(),
                submissions: '0/0', // We need a count or something
                status: new Date(a.due_date) < new Date() ? 'closed' : 'active'
            }));

            setAssignments(formatted);
        };

        fetchAssignments();
    }, [user?.id]);

    const handleCloseAssignment = async (id: string) => { // Changed id to string (uuid)
        // Check if we can "close" it? Maybe just update a status column if it exists?
        // Schema doesn't have status. We can assume overdue = closed.
        // For UI, we can visually close it or add status column.
        toast.info("Manually closing assignments is not yet persisted.");
    };

    const handleUpdateAssignment = (id: number) => {
        // Navigate to edit page
        navigate(`/faculty/assignments/edit/${id}`);
    };

    const handleViewSubmissions = async (assignment: any) => {
        setSelectedAssignment(assignment);
        setViewSubmissionsOpen(true);
        setIsLoadingSubmissions(true);
        setSubmissions([]);

        try {
            // Fetch submissions for this assignment (using title as ID for demo consistency)
            const { data, error } = await supabase
                .from('assignment_submissions')
                .select('*')
                .eq('assignment_id', assignment.id);

            if (error) throw error;
            setSubmissions(data || []);
        } catch (error) {
            console.error('Error fetching submissions:', error);
            toast.error('Failed to load submissions');
            // Mock data for demo if DB is empty/fails
            setSubmissions([
                { id: '1', student_name: 'John Doe', submitted_at: new Date().toISOString(), file_name: 'homework.pdf' },
                { id: '2', student_name: 'Jane Smith', submitted_at: new Date(Date.now() - 86400000).toISOString(), file_name: 'assignment.jpg' }
            ]);
        } finally {
            setIsLoadingSubmissions(false);
        }
    };

    const handleDownload = async (submission: any) => {
        try {
            if (!submission.file_path) {
                toast.error("File not found");
                return;
            }
            const { data } = supabase.storage.from('assignments').getPublicUrl(submission.file_path);
            if (data?.publicUrl) {
                window.open(data.publicUrl, '_blank');
            } else {
                toast.error("Could not generate download URL");
            }
        } catch (e) {
            console.error(e);
            toast.error("Download failed");
        }
    };

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
                    {item.status.toString().toUpperCase()}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (item: any) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleViewSubmissions(item)} title="View Submissions">
                        <Eye className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => handleUpdateAssignment(item.id)}
                                className="flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Update
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleCloseAssignment(item.id)}
                                disabled={item.status === 'closed'}
                                className="flex items-center gap-2"
                            >
                                <XCircle className="w-4 h-4" />
                                Close
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                        onClick={() => navigate('/faculty/assignments/create')}
                    >
                        <Plus className="w-4 h-4" />
                        Create Assignment
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Active', value: assignments.filter(a => a.status === 'active').length, icon: Plus, color: 'text-primary', bg: 'bg-primary/10' },
                    { label: 'Graded', value: '45', icon: FileText, color: 'text-success', bg: 'bg-success/10' },
                    { label: 'Pending Review', value: '8', icon: Download, color: 'text-warning', bg: 'bg-warning/10' },
                    { label: 'Due Today', value: '2', icon: Search, color: 'text-info', bg: 'bg-info/10' },
                ].map((stat, idx) => (
                    <div key={idx} className="dashboard-card">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <h4 className="font-medium">{stat.label}</h4>
                        </div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                ))}
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

            <Dialog open={viewSubmissionsOpen} onOpenChange={setViewSubmissionsOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Submissions for {selectedAssignment?.title}</DialogTitle>
                        <DialogDescription>
                            Review student submissions below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        {isLoadingSubmissions ? (
                            <div className="text-center py-4">Loading submissions...</div>
                        ) : submissions.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">No submissions found.</div>
                        ) : (
                            <div className="space-y-2">
                                {submissions.map((sub, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                        <div>
                                            <p className="font-medium">{sub.student_name || 'Unknown Student'}</p>
                                            <p className="text-sm text-muted-foreground">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{sub.file_name}</p>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => handleDownload(sub)}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </FacultyLayout>
    );
}
