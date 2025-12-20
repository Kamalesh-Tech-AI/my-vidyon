import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Megaphone, Plus, Calendar, Bell, Users, MoreVertical } from 'lucide-react';

const announcements = [
    { id: 1, title: 'Unit Test Syllabus Updated', content: 'The syllabus for Mathematics Unit Test - II has been updated. Please check the subjects section for details.', date: 'Dec 18, 2025', target: 'Class 10-A', type: 'important' },
    { id: 2, title: 'Extra Class for Science', content: 'There will be an extra class for Science tomorrow at 4:00 PM for project discussion.', date: 'Dec 19, 2025', target: 'Class 9-B', type: 'info' },
    { id: 3, title: 'Term 2 Fee Deadline', content: 'A reminder that the deadline for Term 2 school fee submission is Dec 25.', date: 'Dec 15, 2025', target: 'All Students', type: 'warning' },
];

export function FacultyAnnouncements() {
    return (
        <FacultyLayout>
            <PageHeader
                title="Announcements"
                subtitle="Broadcast important updates and information to your students"
                actions={
                    <Button className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Announcement
                    </Button>
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
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
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
                                <input type="text" className="input-field" placeholder="Brief title..." />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Recipient Group</label>
                                <select className="input-field">
                                    <option>All my classes</option>
                                    <option>Class 10-A</option>
                                    <option>Class 9-B</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Message</label>
                                <textarea className="input-field min-h-[100px]" placeholder="Type your message..."></textarea>
                            </div>
                            <Button className="w-full btn-primary">Publish Announcement</Button>
                        </div>
                    </div>
                </div>
            </div>
        </FacultyLayout>
    );
}
