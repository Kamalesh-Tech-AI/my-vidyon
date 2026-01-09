import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UserCheck, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/common/Badge';

interface StaffAssignment {
    id: string;
    staffName: string;
    staffId: string;
}

export function InstitutionFacultyAssigning() {
    const [assignmentType, setAssignmentType] = useState<string>('class');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedClassTeacher, setSelectedClassTeacher] = useState<string>('');
    const [subjectStaff, setSubjectStaff] = useState<StaffAssignment[]>([]);

    // Mock data
    const classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    const sections = ['A', 'B', 'C', 'D'];
    const subjects = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physical Education'];
    const staffMembers = [
        { id: 'staff1', name: 'Dr. Robert Brown' },
        { id: 'staff2', name: 'Dr. James Smith' },
        { id: 'staff3', name: 'Dr. Sarah Davis' },
        { id: 'staff4', name: 'Mrs. Jennifer Lee' },
        { id: 'staff5', name: 'Mr. David Kumar' },
        { id: 'staff6', name: 'Dr. Priya Sharma' },
        { id: 'staff7', name: 'Mrs. Emily Wilson' },
        { id: 'staff8', name: 'Mr. Michael Brown' },
        { id: 'staff9', name: 'Dr. Deepak Verma' },
        { id: 'staff10', name: 'Mrs. Anjali Singh' },
    ];

    const handleAddStaff = () => {
        if (assignmentType === 'subject' && selectedSubject) {
            const newStaff: StaffAssignment = {
                id: Date.now().toString(),
                staffName: '',
                staffId: ''
            };
            setSubjectStaff([...subjectStaff, newStaff]);
        }
    };

    const handleRemoveStaff = (id: string) => {
        setSubjectStaff(subjectStaff.filter(s => s.id !== id));
    };

    const handleStaffChange = (id: string, staffId: string) => {
        const selectedStaff = staffMembers.find(s => s.id === staffId);
        if (selectedStaff) {
            setSubjectStaff(subjectStaff.map(s =>
                s.id === id
                    ? { ...s, staffId: selectedStaff.id, staffName: selectedStaff.name }
                    : s
            ));
        }
    };

    const handleSubmit = () => {
        if (assignmentType === 'class' && selectedClassTeacher && selectedClass && selectedSection) {
            toast.success(`Class Teacher assigned successfully!`);
            console.log('Class Teacher Assignment:', { selectedClass, selectedSection, selectedClassTeacher });
        } else if (assignmentType === 'subject' && selectedSubject && subjectStaff.length > 0) {
            toast.success(`Subject staff assigned successfully!`);
            console.log('Subject Staff Assignment:', { selectedSubject, subjectStaff });
        } else {
            toast.error('Please complete all required fields');
        }
    };

    return (
        <InstitutionLayout>
            <PageHeader
                title="Faculty Assigning"
                subtitle="Assign teachers to classes, sections, and subjects"
            />

            <div className="dashboard-card p-6">
                {/* Assignment Type Toggle */}
                <div className="mb-6">
                    <Label className="mb-2 block">Assignment Type</Label>
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant={assignmentType === 'class' ? 'default' : 'outline'}
                            onClick={() => setAssignmentType('class')}
                        >
                            Class Teacher Assignment
                        </Button>
                        <Button
                            type="button"
                            variant={assignmentType === 'subject' ? 'default' : 'outline'}
                            onClick={() => setAssignmentType('subject')}
                        >
                            Subject Staff Assignment
                        </Button>
                    </div>
                </div>

                {/* Class Teacher Assignment Form */}
                {assignmentType === 'class' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-primary" />
                            Assign Class Teacher
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="class">Select Class *</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((cls) => (
                                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="section">Select Section *</Label>
                                <Select value={selectedSection} onValueChange={setSelectedSection}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sections.map((sec) => (
                                            <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="classTeacher">Select Class Teacher *</Label>
                                <Select value={selectedClassTeacher} onValueChange={setSelectedClassTeacher}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose teacher" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffMembers.map((staff) => (
                                            <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selectedClass && selectedSection && selectedClassTeacher && (
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium mb-2">Assignment Preview:</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="default">
                                        {selectedClass} - Section {selectedSection}
                                    </Badge>
                                    <span className="text-sm">→</span>
                                    <Badge variant="success">
                                        {staffMembers.find(s => s.id === selectedClassTeacher)?.name}
                                    </Badge>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Subject Staff Assignment Form */}
                {assignmentType === 'subject' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-primary" />
                            Assign Subject Teachers
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="class">Select Class *</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((cls) => (
                                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="section">Select Section *</Label>
                                <Select value={selectedSection} onValueChange={setSelectedSection}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sections.map((sec) => (
                                            <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="subject">Select Subject *</Label>
                                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((sub) => (
                                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selectedSubject && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Assign Staff to {selectedSubject}</Label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleAddStaff}
                                        className="flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Staff
                                    </Button>
                                </div>

                                {subjectStaff.length === 0 ? (
                                    <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                                        <p>No staff assigned yet. Click "Add Staff" to begin.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {subjectStaff.map((staff) => (
                                            <div key={staff.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                                <div className="flex-1">
                                                    <Select
                                                        value={staff.staffId}
                                                        onValueChange={(value) => handleStaffChange(staff.id, value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a teacher" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {staffMembers.map((member) => (
                                                                <SelectItem key={member.id} value={member.id}>
                                                                    {member.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveStaff(staff.id)}
                                                >
                                                    <X className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {subjectStaff.length > 0 && subjectStaff.every(s => s.staffId) && (
                                    <div className="p-4 bg-muted/50 rounded-lg">
                                        <p className="text-sm font-medium mb-2">Assignment Preview:</p>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="default">
                                                    {selectedClass} - Section {selectedSection} - {selectedSubject}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {subjectStaff.map((staff) => (
                                                    <Badge key={staff.id} variant="success">
                                                        {staff.staffName}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit}>
                        Save Assignment
                    </Button>
                </div>
            </div>
        </InstitutionLayout>
    );
}
