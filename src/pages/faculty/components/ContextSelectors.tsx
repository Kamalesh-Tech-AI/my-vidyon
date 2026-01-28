import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Search, ClipboardList } from 'lucide-react';
import { EXAM_TYPES } from '@/components/exam-schedule/ExamTypeSelector';

interface ContextSelectorsProps {
    viewMode: 'ENTRY' | 'REVIEW' | 'CLASS_TEACHER';
    selectedExam: string;
    setSelectedExam: (value: string) => void;
    selectedSubject: string;
    setSelectedSubject: (value: string) => void;
    selectedClass: string;
    setSelectedClass: (value: string) => void;
    selectedSection: string;
    setSelectedSection: (value: string) => void;
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    exams: any[];
    facultySubjects: string[];
    classSections: any[];
    targetClass?: string;
    targetSection?: string;
}

export function ContextSelectors({
    viewMode,
    selectedExam,
    setSelectedExam,
    selectedSubject,
    setSelectedSubject,
    selectedClass,
    setSelectedClass,
    selectedSection,
    setSelectedSection,
    searchTerm,
    setSearchTerm,
    exams,
    facultySubjects,
    classSections,
    targetClass,
    targetSection
}: ContextSelectorsProps) {
    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    {viewMode === 'CLASS_TEACHER' ? 'Class Context' : 'Assessment Configuration'}
                </CardTitle>
                <CardDescription>
                    {viewMode === 'CLASS_TEACHER'
                        ? "Overview of your assigned class performance"
                        : "Select the exam, subject, and class to enter marks for"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Examination</Label>
                        <Select value={selectedExam} onValueChange={setSelectedExam}>
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select Exam" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Standard Exams</SelectLabel>
                                    {EXAM_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                                {exams.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Dynamic Exams</SelectLabel>
                                        {exams.map((e: any) => (
                                            <SelectItem key={e.id} value={e.id}>
                                                {e.exam_display_name || e.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {viewMode !== 'CLASS_TEACHER' && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</Label>
                                <Select
                                    value={selectedSubject}
                                    onValueChange={setSelectedSubject}
                                    disabled={!selectedExam}
                                >
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {facultySubjects.map((s: string) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class & Section</Label>
                                <Select
                                    value={selectedClass && selectedSection ? `${selectedClass}|${selectedSection}` : ''}
                                    onValueChange={(val) => {
                                        const [c, s] = val.split('|');
                                        setSelectedClass(c);
                                        setSelectedSection(s);
                                    }}
                                    disabled={!selectedSubject}
                                >
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classSections.map((cs: any) => (
                                            <SelectItem key={`${cs.class_name}|${cs.section}`} value={`${cs.class_name}|${cs.section}`}>
                                                {cs.class_name} - {cs.section}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {viewMode === 'CLASS_TEACHER' && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Class</Label>
                            <div className="h-10 px-3 py-2 bg-primary/10 border border-primary/20 rounded-md text-sm font-medium text-primary flex items-center">
                                {targetClass ? `${targetClass} - ${targetSection || 'A'}` : 'No Class Assigned'}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search Student</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter by name..."
                                className="pl-10 bg-background"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
