import { useState } from 'react';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/ui/button';
import { Search, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const students = [
    { id: 1, rollNo: '101', name: 'John Smith', class: 'Grade 10-A', parent: 'Robert Smith', contact: '+91 98765 43210', attendance: '95%', house: 'Blue', email: 'john.smith@student.edu' },
    { id: 2, rollNo: '102', name: 'Emily Johnson', class: 'Grade 10-A', parent: 'Sarah Johnson', contact: '+91 98765 43211', attendance: '88%', house: 'Red', email: 'emily.johnson@student.edu' },
    { id: 3, rollNo: '103', name: 'Michael Brown', class: 'Grade 10-A', parent: 'David Brown', contact: '+91 98765 43212', attendance: '92%', house: 'Green', email: 'michael.brown@student.edu' },
    { id: 4, rollNo: '104', name: 'Sarah Davis', class: 'Grade 10-A', parent: 'Linda Davis', contact: '+91 98765 43213', attendance: '75%', house: 'Yellow', email: 'sarah.davis@student.edu' },
    { id: 5, rollNo: '105', name: 'James Wilson', class: 'Grade 10-A', parent: 'Mary Wilson', contact: '+91 98765 43214', attendance: '98%', house: 'Blue', email: 'james.wilson@student.edu' },
];

export function FacultyStudents() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter students based on search query
    const filteredStudents = students.filter(student => {
        const query = searchQuery.toLowerCase();
        return (
            student.name.toLowerCase().includes(query) ||
            student.rollNo.toLowerCase().includes(query) ||
            student.house.toLowerCase().includes(query)
        );
    });

    const columns = [
        { key: 'rollNo', header: 'Roll No.' },
        { key: 'name', header: 'Full Name' },
        { key: 'class', header: 'Class' },
        { key: 'attendance', header: 'Attendance' },
        {
            key: 'house',
            header: 'House',
            render: (item: typeof students[0]) => {
                const colors: Record<string, string> = {
                    Blue: 'bg-blue-500',
                    Red: 'bg-red-500',
                    Green: 'bg-green-500',
                    Yellow: 'bg-yellow-500',
                };
                return (
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${colors[item.house]}`} />
                        <span>{item.house}</span>
                    </div>
                );
            }
        },
        {
            key: 'actions',
            header: 'Communication',
            render: (item: typeof students[0]) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.location.href = `mailto:${item.email}`}
                        title="Send Email"
                    >
                        <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/faculty/students/${item.rollNo}`)}
                    >
                        View Profile
                    </Button>
                </div>
            )
        }
    ];

    return (
        <FacultyLayout>
            <PageHeader
                title="Student Directory"
                subtitle="View and manage students enrolled in your subjects"
            />

            <div className="dashboard-card mb-6">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search students by name, roll no or house..."
                            className="input-field pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select className="px-4 py-2 border rounded-lg bg-background">
                        <option>All Classes</option>
                        <option>Grade 10-A</option>
                        <option>Grade 9-B</option>
                    </select>
                    <select className="px-4 py-2 border rounded-lg bg-background">
                        <option>All Houses</option>
                        <option>Blue House</option>
                        <option>Red House</option>
                        <option>Green House</option>
                        <option>Yellow House</option>
                    </select>
                </div>

                <DataTable columns={columns} data={filteredStudents} />
            </div>
        </FacultyLayout>
    );
}
