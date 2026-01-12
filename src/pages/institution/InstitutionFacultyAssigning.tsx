import { useState, useEffect } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { useInstitution } from '@/context/InstitutionContext';
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
import { UserCheck, Plus, X, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/common/Badge';

interface StaffAssignment {
    id: string; // internal id for UI list key
    staffName: string;
    staffId: string;
}

export function InstitutionFacultyAssigning() {
    const {
        allSubjects,
        allStaffMembers,
        getAssignedStaff,
        assignStaff,
        getClassTeacher,
        assignClassTeacher
    } = useInstitution();

    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');

    // Class Teacher State
    const [selectedClassTeacher, setSelectedClassTeacher] = useState<string>('');

    // Subject Staff State
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [subjectStaff, setSubjectStaff] = useState<StaffAssignment[]>([]);

    // Mock data for dropdowns
    const classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    const sections = ['A', 'B', 'C', 'D'];

    // Load Class Teacher when Class/Section changes
    useEffect(() => {
        if (selectedClass && selectedSection) {
            const ctId = getClassTeacher(selectedClass, selectedSection);
            setSelectedClassTeacher(ctId || '');
        } else {
            setSelectedClassTeacher('');
        }
    }, [selectedClass, selectedSection, getClassTeacher]);

    // Load existing Subject assignments when Subject (or Class/Section) changes
    useEffect(() => {
        if (selectedClass && selectedSection && selectedSubject) {
            const assigned = getAssignedStaff(selectedClass, selectedSection, selectedSubject);

            // Map to UI format
            const uiStaff = assigned.map(s => ({
                id: Math.random().toString(36).substr(2, 9),
                staffId: s.id,
                staffName: s.name
            }));

            setSubjectStaff(uiStaff);
        } else {
            setSubjectStaff([]);
        }
    }, [selectedClass, selectedSection, selectedSubject, getAssignedStaff]);

    const handleAddStaff = () => {
        if (selectedSubject) {
            const newStaff: StaffAssignment = {
                id: Date.now().toString(),
                staffName: '',
                staffId: ''
            };
            setSubjectStaff([...subjectStaff, newStaff]);
        } else {
            toast.error("Please select a subject first.");
        }
    };

    const handleRemoveStaff = (id: string) => {
        setSubjectStaff(subjectStaff.filter(s => s.id !== id));
    };

    const handleStaffChange = (id: string, staffId: string) => {
        const selectedStaff = allStaffMembers.find(s => s.id === staffId);
        if (selectedStaff) {
            setSubjectStaff(subjectStaff.map(s =>
                s.id === id
                    ? { ...s, staffId: selectedStaff.id, staffName: selectedStaff.name }
                    : s
            ));
        }
    };

    const handleSubmit = () => {
        if (selectedClass && selectedSection) {
            let hasErrors = false;

            // validate Class Teacher (optional? usually required)
            // if required:
            if (!selectedClassTeacher) {
                toast.error("Please select a Class Teacher.");
                hasErrors = true;
            }

            // Save Class Teacher
            if (selectedClassTeacher) {
                assignClassTeacher(selectedClass, selectedSection, selectedClassTeacher);
            }

            // Save Subject Staff
            if (selectedSubject) {
                // Validate subject staff 
                if (subjectStaff.length > 0 && subjectStaff.some(s => !s.staffId)) {
                    toast.error("Please select a staff member for all subject assignment rows.");
                    hasErrors = true;
                }

                if (!hasErrors) {
                    const staffIds = subjectStaff.map(s => s.staffId).filter(Boolean);
                    assignStaff(selectedClass, selectedSection, selectedSubject, staffIds);
                }
            } else {
                // If no subject is selected, we only saved Class Teacher, which is valid.
                if (!hasErrors) toast.success("Class Teacher saved!");
            }

            if (!hasErrors && selectedSubject) {
                // The assignStaff function triggered a toast internally in previous step, so we might get partial double toast if we add one here.
                // let's rely on assignStaff toast or context toast. 
                // Actually I removed toast from assignClassTeacher to avoid spam.
                // Let's just toast "Assignments Saved" once if everything is good.
                // But assignStaff has toast inside it... I should probably remove it from context or just live with "Subject staff assigned" + "Class teacher saved"
                // Let's refine context later if needed.
            }

        } else {
            toast.error('Please select Class and Section');
        }
    };

    return (
        <InstitutionLayout>
            <PageHeader
                title="Faculty Assigning"
                subtitle="Assign teachers to classes, sections, and subjects"
            />

            <div className="dashboard-card p-6">

                {/* Unified Form */}
                <div className="space-y-8">

                    {/* 1. Class Selection Row */}
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <UserCheck className="w-5 h-5 text-primary" />
                            Class & Section Selection
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>
                    </div>

                    <div className="border-t pt-6"></div>

                    {/* 2. Class Teacher Assignment */}
                    {selectedClass && selectedSection && (
                        <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                            <h3 className="text-md font-semibold flex items-center gap-2 mb-3 text-primary">
                                <GraduationCap className="w-5 h-5" />
                                Class Teacher Assignment
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="classTeacher">Assign Class Teacher (One per class) *</Label>
                                    <Select value={selectedClassTeacher} onValueChange={setSelectedClassTeacher}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Choose Class Teacher" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allStaffMembers.map((staff) => (
                                                <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground mt-1">This teacher will be responsible for the entire class/section.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Subject Staff Assignment */}
                    {selectedClass && selectedSection && (
                        <div>
                            <h3 className="text-md font-semibold flex items-center gap-2 mb-3">
                                <UserCheck className="w-5 h-5 text-primary" />
                                Subject Staff Assignment
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <Label htmlFor="subject">Select Subject to Assign *</Label>
                                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose subject" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allSubjects.map((sub) => (
                                                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {selectedSubject && (
                                <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base">Teachers for {allSubjects.find(s => s.id === selectedSubject)?.name}</Label>
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
                                        <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground bg-background">
                                            <p>No staff assigned to {allSubjects.find(s => s.id === selectedSubject)?.name} yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {subjectStaff.map((staff) => (
                                                <div key={staff.id} className="flex items-center gap-3 p-3 bg-background border rounded-lg shadow-sm">
                                                    <div className="flex-1">
                                                        <Select
                                                            value={staff.staffId}
                                                            onValueChange={(value) => handleStaffChange(staff.id, value)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a teacher" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {allStaffMembers.map((member) => (
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
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview Section - Only show if we have data */}
                    {(selectedClassTeacher || subjectStaff.length > 0) && selectedClass && selectedSection && (
                        <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                            <p className="text-sm font-medium mb-2 text-blue-900">Current Session Preview:</p>
                            <div className="flex flex-col gap-2">
                                {selectedClassTeacher && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold uppercase text-muted-foreground w-24">Class Teacher:</span>
                                        <Badge variant="outline" className="bg-white">
                                            {allStaffMembers.find(s => s.id === selectedClassTeacher)?.name}
                                        </Badge>
                                    </div>
                                )}
                                {selectedSubject && subjectStaff.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold uppercase text-muted-foreground w-24">{allSubjects.find(s => s.id === selectedSubject)?.name}:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {subjectStaff.map(s => (
                                                <Badge key={s.id} variant="success">
                                                    {s.staffName}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit}>
                        Save All Assignments
                    </Button>
                </div>
            </div>
        </InstitutionLayout>
    );
}
