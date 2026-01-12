import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { BookOpen, Users, GraduationCap, LayoutGrid, List } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInstitution } from '@/context/InstitutionContext';
import { Card } from "@/components/ui/card";

export function InstitutionDepartments() {
    const { subjects, classTeachers, allStaffMembers } = useInstitution();
    const [viewMode, setViewMode] = useState<string>('subjects'); // 'subjects' | 'classes'
    const [selectedSubject, setSelectedSubject] = useState<string>('1');

    const currentSubjectData = subjects.find(s => s.id === selectedSubject);

    // Derived list of class teachers
    const classTeacherList = [];
    if (viewMode === 'classes') {
        Object.entries(classTeachers).forEach(([classId, sections]) => {
            Object.entries(sections).forEach(([sectionId, teacherId]) => {
                const teacher = allStaffMembers.find(s => s.id === teacherId);
                if (teacher) {
                    classTeacherList.push({
                        classSection: `${classId} - ${sectionId}`,
                        teacherName: teacher.name,
                        teacherId: teacher.id
                    });
                }
            });
        });
        // Sort by class name naturally if possible
        classTeacherList.sort((a, b) => a.classSection.localeCompare(b.classSection, undefined, { numeric: true, sensitivity: 'base' }));
    }

    return (
        <InstitutionLayout>
            <PageHeader
                title="Faculty Assignments"
                subtitle="View assigned staff members by subject or class"
            />

            {/* Toggle View Mode */}
            <div className="mb-6">
                <Tabs value={viewMode} onValueChange={setViewMode} className="w-[400px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="subjects" className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            By Subject
                        </TabsTrigger>
                        <TabsTrigger value="classes" className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            Class Teachers
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* SUBJECT VIEW */}
            {viewMode === 'subjects' && (
                <>
                    {/* Subject Selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Select Subject</label>
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                            <SelectTrigger className="w-full max-w-md">
                                <SelectValue placeholder="Choose a subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {subjects.map((subject) => (
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
                </>
            )}

            {/* CLASS TEACHERS VIEW */}
            {viewMode === 'classes' && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Assigned Class Teachers</h2>
                        <span className="text-sm text-muted-foreground ml-2">
                            ({classTeacherList.length} classes assigned)
                        </span>
                    </div>

                    {classTeacherList.length === 0 ? (
                        <div className="p-8 border-2 border-dashed rounded-lg text-center bg-muted/20">
                            <p className="text-muted-foreground">No class teachers have been assigned yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classTeacherList.map((item, idx) => (
                                <Card key={idx} className="p-5 hover:shadow-md transition-all border-l-4 border-l-primary/50">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">{item.classSection}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">Class Teacher</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <GraduationCap className="w-5 h-5 text-primary" />
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-gray-600" />
                                        </div>
                                        <span className="font-medium text-gray-700">{item.teacherName}</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </InstitutionLayout>
    );
}
