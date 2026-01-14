import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Loader2, Save, X } from 'lucide-react';

const initialAssignments = [
    { id: 1, title: 'Algebra Homework', subject: 'Mathematics', class: 'Grade 10-A', dueDate: '2025-12-22', submissions: '42/45', status: 'active', description: 'Complete exercises 1-20 from chapter 5', points: '100' },
    { id: 2, title: 'Physics Lab Report', subject: 'Science', class: 'Grade 9-B', dueDate: '2025-12-25', submissions: '12/52', status: 'active', description: 'Write a detailed lab report on the pendulum experiment', points: '100' },
    { id: 3, title: 'Shakespeare Essay', subject: 'English', class: 'Grade 10-C', dueDate: '2025-12-18', submissions: '28/28', status: 'closed', description: 'Write a 500-word essay on Hamlet', points: '100' },
    { id: 4, title: 'Geometry Practice', subject: 'Mathematics', class: 'Grade 9-A', dueDate: '2025-12-20', submissions: '35/40', status: 'active', description: 'Solve geometry problems from worksheet', points: '100' },
];

export function UpdateAssignment() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        class: '',
        dueDate: '',
        description: '',
        points: '100'
    });

    useEffect(() => {
        // Load assignment data
        const assignmentId = parseInt(id || '0');

        // Try to find in initial assignments first
        let assignment = initialAssignments.find(a => a.id === assignmentId);

        // If not found, check localStorage
        if (!assignment) {
            const storedAssignments = localStorage.getItem('faculty_assignments');
            if (storedAssignments) {
                const parsed = JSON.parse(storedAssignments);
                assignment = parsed.find((a: any) => a.id === assignmentId);
            }
        }

        if (assignment) {
            setFormData({
                title: assignment.title,
                subject: assignment.subject,
                class: assignment.class,
                dueDate: assignment.dueDate,
                description: assignment.description || '',
                points: assignment.points || '100'
            });
        } else {
            toast.error('Assignment not found');
            navigate('/faculty/assignments');
        }
    }, [id, navigate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call and update localStorage
        setTimeout(() => {
            const assignmentId = parseInt(id || '0');

            // Update in localStorage
            const storedAssignments = JSON.parse(localStorage.getItem('faculty_assignments') || '[]');
            const updatedStored = storedAssignments.map((a: any) =>
                a.id === assignmentId ? { ...a, ...formData } : a
            );
            localStorage.setItem('faculty_assignments', JSON.stringify(updatedStored));

            toast.success('Assignment updated successfully');
            navigate('/faculty/assignments');
        }, 1000);
    };

    return (
        <FacultyLayout>
            <PageHeader
                title="Update Assignment"
                subtitle="Edit assignment details and instructions"
                actions={
                    <Button variant="outline" onClick={() => navigate('/faculty/assignments')}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                }
            />

            <div className="max-w-3xl mx-auto">
                <div className="dashboard-card">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Assignment Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Shakespeare Essay"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Select
                                    value={formData.subject}
                                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                                        <SelectItem value="Science">Science</SelectItem>
                                        <SelectItem value="English">English</SelectItem>
                                        <SelectItem value="History">History</SelectItem>
                                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="class">Class</Label>
                                <Select
                                    value={formData.class}
                                    onValueChange={(value) => setFormData({ ...formData, class: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Grade 9-A">Grade 9-A</SelectItem>
                                        <SelectItem value="Grade 9-B">Grade 9-B</SelectItem>
                                        <SelectItem value="Grade 10-A">Grade 10-A</SelectItem>
                                        <SelectItem value="Grade 10-B">Grade 10-B</SelectItem>
                                        <SelectItem value="Grade 11-A">Grade 11-A</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="points">Total Points</Label>
                                <Input
                                    id="points"
                                    type="number"
                                    placeholder="100"
                                    value={formData.points}
                                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description & Instructions</Label>
                            <Textarea
                                id="description"
                                placeholder="Enter detailed instructions for the assignment..."
                                className="min-h-[150px]"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-4 border-t">
                            <Button type="button" variant="ghost" onClick={() => navigate('/faculty/assignments')}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!formData.title || !formData.subject || !formData.class || isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Update Assignment
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </FacultyLayout>
    );
}
