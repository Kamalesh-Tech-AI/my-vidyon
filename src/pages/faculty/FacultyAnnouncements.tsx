import { useState } from 'react';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Megaphone, Plus, Calendar, Bell, Users, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

const initialAnnouncements = [
    { id: 1, title: 'Unit Test Syllabus Updated', content: 'The syllabus for Mathematics Unit Test - II has been updated. Please check the subjects section for details.', date: 'Dec 18, 2025', target: 'Class 10-A', type: 'important' },
    { id: 2, title: 'Extra Class for Science', content: 'There will be an extra class for Science tomorrow at 4:00 PM for project discussion.', date: 'Dec 19, 2025', target: 'Class 9-B', type: 'info' },
    { id: 3, title: 'Term 2 Fee Deadline', content: 'A reminder that the deadline for Term 2 school fee submission is Dec 25.', date: 'Dec 15, 2025', target: 'All Students', type: 'warning' },
];

export function FacultyAnnouncements() {
    const [announcements, setAnnouncements] = useState(initialAnnouncements);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for Dialog Form
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        content: '',
        target: '',
        type: 'info'
    });

    // State for Quick Broadcast Form (Sidebar)
    const [quickBroadcast, setQuickBroadcast] = useState({
        title: '',
        content: '',
        target: 'All my classes'
    });

    const handleAddAnnouncement = (source: 'dialog' | 'quick') => {
        setIsSubmitting(true);
        const data = source === 'dialog' ? newAnnouncement : quickBroadcast;
        const type = source === 'dialog' ? newAnnouncement.type : 'info'; // Default type for quick broadcast

        setTimeout(() => {
            const announcement = {
                id: announcements.length + 1,
                title: data.title,
                content: data.content,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                target: data.target,
                type: type
            };

            setAnnouncements([announcement, ...announcements]);
            setIsSubmitting(false);

            if (source === 'dialog') {
                setIsDialogOpen(false);
                setNewAnnouncement({ title: '', content: '', target: '', type: 'info' });
            } else {
                setQuickBroadcast({ title: '', content: '', target: 'All my classes' });
            }

            toast.success("Announcement published successfully");
        }, 1000);
    };

    return (
        <FacultyLayout>
            <PageHeader
                title="Announcements"
                subtitle="Broadcast important updates and information to your students"
                actions={
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="btn-primary flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                New Announcement
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>New Announcement</DialogTitle>
                                <DialogDescription>
                                    Create a new announcement for your students or classes.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Exam Schedule Update"
                                        value={newAnnouncement.title}
                                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="target">Target Audience</Label>
                                        <Select
                                            value={newAnnouncement.target}
                                            onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, target: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select target" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="All Students">All Students</SelectItem>
                                                <SelectItem value="Class 10-A">Class 10-A</SelectItem>
                                                <SelectItem value="Class 9-B">Class 9-B</SelectItem>
                                                <SelectItem value="Faculty Only">Faculty Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Type</Label>
                                        <Select
                                            value={newAnnouncement.type}
                                            onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, type: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="info">Information</SelectItem>
                                                <SelectItem value="important">Important</SelectItem>
                                                <SelectItem value="warning">Warning</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="content">Message Content</Label>
                                    <Textarea
                                        id="content"
                                        placeholder="Type your detailed message here..."
                                        className="min-h-[100px]"
                                        value={newAnnouncement.content}
                                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    onClick={() => handleAddAnnouncement('dialog')}
                                    disabled={!newAnnouncement.title || !newAnnouncement.target || !newAnnouncement.content || isSubmitting}
                                >
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Publish
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {announcements.map((announcement) => (
                        <div key={announcement.id} className="dashboard-card relative">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${announcement.type === 'important' ? 'bg-destructive/10 text-destructive' :
                                        announcement.type === 'warning' ? 'bg-warning/10 text-warning' :
                                            'bg-info/10 text-info'
                                        }`}>
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-none mb-1">{announcement.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{announcement.date}</span>
                                            <span>•</span>
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{announcement.target}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{announcement.content}</p>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="dashboard-card">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-primary" />
                            Quick Broadcast
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium mb-1 block">Title</label>
                                <Input
                                    type="text"
                                    className="input-field"
                                    placeholder="Brief title..."
                                    value={quickBroadcast.title}
                                    onChange={(e) => setQuickBroadcast({ ...quickBroadcast, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Recipient Group</label>
                                <Select
                                    value={quickBroadcast.target}
                                    onValueChange={(value) => setQuickBroadcast({ ...quickBroadcast, target: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All my classes">All my classes</SelectItem>
                                        <SelectItem value="Class 10-A">Class 10-A</SelectItem>
                                        <SelectItem value="Class 9-B">Class 9-B</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Message</label>
                                <Textarea
                                    className="input-field min-h-[100px]"
                                    placeholder="Type your message..."
                                    value={quickBroadcast.content}
                                    onChange={(e) => setQuickBroadcast({ ...quickBroadcast, content: e.target.value })}
                                />
                            </div>
                            <Button
                                className="w-full btn-primary"
                                onClick={() => handleAddAnnouncement('quick')}
                                disabled={!quickBroadcast.title || !quickBroadcast.content || isSubmitting}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Publish Announcement
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </FacultyLayout>
    );
}
