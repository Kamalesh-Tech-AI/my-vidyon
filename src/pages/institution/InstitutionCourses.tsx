import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import { BookOpen, Plus, Search, Filter, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const initialCourses = [
    { id: '1', name: 'Mathematics', code: 'MATH10', department: 'Mathematics', instructor: 'Mr. R. Sharma', students: 45 },
    { id: '2', name: 'Physics', code: 'PHY12', department: 'Science', instructor: 'Mrs. S. Verma', students: 38 },
    { id: '3', name: 'English Literature', code: 'ENG09', department: 'English', instructor: 'Ms. A. Davis', students: 52 },
    { id: '4', name: 'Social Studies', code: 'SOC10', department: 'Social Studies', instructor: 'Mr. K. Singh', students: 40 },
    { id: '5', name: 'Chemistry', code: 'CHEM12', department: 'Science', instructor: 'Dr. M. Gupta', students: 30 },
];

export function InstitutionCourses() {
    const [courses, setCourses] = useState(initialCourses);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newCourse, setNewCourse] = useState({
        name: '',
        code: '',
        department: '',
        instructor: ''
    });

    const handleAddCourse = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            const course = {
                id: (courses.length + 1).toString(),
                name: newCourse.name,
                code: newCourse.code,
                department: newCourse.department,
                instructor: newCourse.instructor,
                students: 0
            };
            setCourses([...courses, course]);
            setIsSubmitting(false);
            setIsAddDialogOpen(false);
            setNewCourse({ name: '', code: '', department: '', instructor: '' });
            toast.success("Course added successfully");
        }, 1000);
    };

    const columns = [
        { key: 'name', header: 'Course Name' },
        { key: 'department', header: 'Subject Group' },
        { key: 'instructor', header: 'Lead Instructor' },
        { key: 'students', header: 'Enrolled' },
        {
            key: 'actions',
            header: 'Actions',
            render: () => (
                <Button variant="ghost" size="sm">Manage</Button>
            ),
        },
    ];

    return (
        <InstitutionLayout>
            <PageHeader
                title="Courses"
                subtitle="Complete catalog of courses offered by the institution"
                actions={
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search courses..."
                                className="input-field pl-10 w-64"
                            />
                        </div>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filter
                        </Button>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Course
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[550px]">
                                <DialogHeader>
                                    <DialogTitle>Add New Course</DialogTitle>
                                    <DialogDescription>
                                        Create a new course in the catalog. All fields are required.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="code" className="text-right">Code</Label>
                                        <Input
                                            id="code"
                                            value={newCourse.code}
                                            onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                                            className="col-span-3"
                                            placeholder="e.g. CS101"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Name</Label>
                                        <Input
                                            id="name"
                                            value={newCourse.name}
                                            onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                                            className="col-span-3"
                                            placeholder="e.g. Intro to Computer Science"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="department" className="text-right">Department</Label>
                                        <div className="col-span-3">
                                            <Select
                                                value={newCourse.department}
                                                onValueChange={(value) => setNewCourse({ ...newCourse, department: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Department" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                                                    <SelectItem value="Science">Science (Phy/Chem/Bio)</SelectItem>
                                                    <SelectItem value="English">English</SelectItem>
                                                    <SelectItem value="Hindi">Hindi</SelectItem>
                                                    <SelectItem value="Social Studies">Social Studies</SelectItem>
                                                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="instructor" className="text-right">Instructor</Label>
                                        <Input
                                            id="instructor"
                                            value={newCourse.instructor}
                                            onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })}
                                            className="col-span-3"
                                            placeholder="e.g. Dr. Smith"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" onClick={handleAddCourse} disabled={!newCourse.code || !newCourse.name || isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Course
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                }
            />

            <div className="dashboard-card">
                <DataTable columns={columns} data={courses} />
            </div>
        </InstitutionLayout>
    );
}
