import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { BookOpen, Users } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Mock data for subjects and their assigned staff
const subjectsData = [
    {
        id: '1',
        name: 'Mathematics',
        staff: [
            { id: 's1', name: 'Dr. Robert Brown', classes: ['Grade 10-A', 'Grade 10-B', 'Grade 9-A'] },
            { id: 's2', name: 'Mrs. Jennifer Lee', classes: ['Grade 8-A', 'Grade 8-B'] },
            { id: 's3', name: 'Mr. David Kumar', classes: ['Grade 7-A', 'Grade 7-B', 'Grade 7-C'] },
        ]
    },
    {
        id: '2',
        name: 'Science',
        staff: [
            { id: 's4', name: 'Dr. James Smith', classes: ['Grade 10-A', 'Grade 9-A'] },
            { id: 's5', name: 'Dr. Priya Sharma', classes: ['Grade 10-B', 'Grade 9-B'] },
            { id: 's6', name: 'Mr. Arun Patel', classes: ['Grade 8-A', 'Grade 8-B', 'Grade 7-A'] },
        ]
    },
    {
        id: '3',
        name: 'English',
        staff: [
            { id: 's7', name: 'Dr. Sarah Davis', classes: ['Grade 10-A', 'Grade 10-B'] },
            { id: 's8', name: 'Mrs. Emily Wilson', classes: ['Grade 9-A', 'Grade 9-B', 'Grade 8-A'] },
            { id: 's9', name: 'Mr. Michael Brown', classes: ['Grade 7-A', 'Grade 7-B'] },
        ]
    },
    {
        id: '4',
        name: 'Hindi',
        staff: [
            { id: 's10', name: 'Dr. Deepak Verma', classes: ['Grade 10-A', 'Grade 9-A', 'Grade 8-A'] },
            { id: 's11', name: 'Mrs. Anjali Singh', classes: ['Grade 10-B', 'Grade 9-B'] },
            { id: 's12', name: 'Mr. Rajesh Kumar', classes: ['Grade 7-A', 'Grade 7-B', 'Grade 8-B'] },
        ]
    },
    {
        id: '5',
        name: 'Social Studies',
        staff: [
            { id: 's13', name: 'Dr. Michael Wilson', classes: ['Grade 10-A', 'Grade 10-B'] },
            { id: 's14', name: 'Mrs. Kavita Reddy', classes: ['Grade 9-A', 'Grade 9-B'] },
            { id: 's15', name: 'Mr. Arjun Mehta', classes: ['Grade 8-A', 'Grade 8-B'] },
        ]
    },
    {
        id: '6',
        name: 'Physical Education',
        staff: [
            { id: 's16', name: 'Mr. Vikram Singh', classes: ['All Grades'] },
            { id: 's17', name: 'Mrs. Neha Kapoor', classes: ['All Grades'] },
        ]
    },
];

export function InstitutionDepartments() {
    const [selectedSubject, setSelectedSubject] = useState<string>('1');

    const currentSubjectData = subjectsData.find(s => s.id === selectedSubject);

    return (
        <InstitutionLayout>
            <PageHeader
                title="Subjects & Staff"
                subtitle="View staff members assigned to each subject"
            />

            {/* Subject Selector */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-full max-w-md">
                        <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                        {subjectsData.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                                {subject.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Staff Cards for Selected Subject */}
            {currentSubjectData && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpen className="w-5 h-5 text-institution" />
                        <h2 className="text-lg font-semibold">{currentSubjectData.name} Teachers</h2>
                        <span className="text-sm text-muted-foreground ml-2">
                            ({currentSubjectData.staff.length} staff members)
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentSubjectData.staff.map((staffMember) => (
                            <div
                                key={staffMember.id}
                                className="dashboard-card p-5 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-institution/10 flex items-center justify-center flex-shrink-0">
                                        <Users className="w-6 h-6 text-institution" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base truncate">
                                            {staffMember.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {currentSubjectData.name} Teacher
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Assigned Classes:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {staffMember.classes.map((className, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                                            >
                                                {className}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </InstitutionLayout>
    );
}
