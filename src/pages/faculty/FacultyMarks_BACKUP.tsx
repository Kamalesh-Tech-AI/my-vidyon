import { useState, useEffect } from 'react';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import {
    Save,
    CheckCircle,
    Eye,
    ArrowLeft,
    ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ContextSelectors } from './components/ContextSelectors';
import { MarksEntryTable } from './components/MarksEntryTable';
import { ClassPerformance } from './components/ClassPerformance';
import { StudentReviewModal } from './components/StudentReviewModal';

type ViewMode = 'ENTRY' | 'REVIEW' | 'CLASS_TEACHER';
type MarkStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PUBLISHED';

export function FacultyMarks() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Selection State
    const [selectedExam, setSelectedExam] = useState<string>('mid-term-1');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');

    // UI State
    const [viewMode, setViewMode] = useState<ViewMode>('ENTRY');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean, studentId?: string, comment: string }>({
        isOpen: false,
        comment: ''
    });

    // Marks State
    const [marksData, setMarksData] = useState<Record<string, { internal: number, external: number, id?: string, status?: string }>>({});
    const [validationErrors, setValidationErrors] = useState<Record<string, { internal?: boolean, external?: boolean }>>({});
    const [reviewStudent, setReviewStudent] = useState<any | null>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    // 1. Fetch Staff Details (to get subjects and class teacher role)


    // 2. Fetch Exams
    const { data: exams = [] } = useQuery({
        queryKey: ['exams-list', user?.institutionId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .eq('institution_id', user?.institutionId)
                .order('created_at', { ascending: false });
            if (error) return [];
            return data || [];
        },
        enabled: !!user?.institutionId
    });

    // 3. Fetch Faculty Assignments (Primary source: faculty_subjects table)
    const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
        queryKey: ['faculty-assignments', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('faculty_subjects')
                .select(`
                    subject_id,
                    class_id,
                    section,
                    assignment_type,
                    subjects:subject_id (name),
                    classes:class_id (class_name)
                `)
                .eq('faculty_profile_id', user?.id);

            if (error) {
                console.error("Error fetching assignments:", error);
                return [];
            }
            console.log("Faculty Assignments:", data);
            return data as any[];
        },
        enabled: !!user?.id
    });

    // 4. Fetch Staff Details (Fallback for subjects and class teacher role)
    const { data: staffDetails } = useQuery({
        queryKey: ['staff-details-marks', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('staff_details')
                .select('*')
                .eq('profile_id', user?.id)
                .single();
            if (error) {
                console.error('Staff Details Fetch Error:', error);
                return null;
            }
            console.log("Staff Details:", data);
            return data;
        },
        enabled: !!user?.id
    });

    // 5. Fetch ALL subjects as ultimate fallback
    const { data: allInstitutionSubjects = [] } = useQuery({
        queryKey: ['all-subjects', user?.institutionId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subjects')
                .select('name, class_name')
                .eq('institution_id', user?.institutionId);

            if (error) {
                console.error("Error fetching all subjects:", error);
                return [];
            }
            console.log("All Institution Subjects:", data);
            return data;
        },
        enabled: !!user?.institutionId
    });

    // Determine if user is a class teacher
    const isClassTeacher =
        assignments.some((a: any) => a.assignment_type === 'class_teacher') ||
        staffDetails?.role?.toLowerCase().includes('class teacher') ||
        staffDetails?.role?.toLowerCase().includes('class_teacher') ||
        staffDetails?.role?.toLowerCase().includes('admin');

    // Build comprehensive subject list with multiple fallbacks
    const facultySubjects = (() => {
        // Priority 1: From faculty_subjects table
        const assignmentSubjects = assignments
            .filter((a: any) => a.assignment_type === 'subject_staff' && a.subjects?.name)
            .map((a: any) => a.subjects.name);

        if (assignmentSubjects.length > 0) {
            console.log("Using subjects from faculty_subjects:", assignmentSubjects);
            return Array.from(new Set(assignmentSubjects));
        }

        // Priority 2: From staff_details
        let staffSubjects: string[] = [];
        if (staffDetails?.subjects && Array.isArray(staffDetails.subjects)) {
            staffSubjects = [...staffDetails.subjects];
        }
        if (staffDetails?.subject_assigned && !staffSubjects.includes(staffDetails.subject_assigned)) {
            staffSubjects.push(staffDetails.subject_assigned);
        }

        if (staffSubjects.length > 0) {
            console.log("Using subjects from staff_details:", staffSubjects);
            return staffSubjects.filter(Boolean);
        }

        // Priority 3: All institution subjects (fallback for testing/admin)
        const allSubjectNames = Array.from(new Set(
            allInstitutionSubjects.map((s: any) => s.name).filter(Boolean)
        ));

        console.log("Using all institution subjects as fallback:", allSubjectNames);
        return allSubjectNames;
    })();

    // Auto-select subject if only one exists
    useEffect(() => {
        if (facultySubjects.length === 1 && !selectedSubject) {
            setSelectedSubject(facultySubjects[0] as string);
        }
    }, [facultySubjects, selectedSubject]);

    // 5. Derive Classes/Sections for selected Subject from Assignments
    const classSections = assignments
        .filter((a: any) => {
            const className = Array.isArray(a.classes) ? a.classes[0]?.class_name : a.classes?.class_name;
            const subjectName = Array.isArray(a.subjects) ? a.subjects[0]?.name : a.subjects?.name;
            return (
                a.assignment_type === 'subject_staff' &&
                subjectName === selectedSubject &&
                className
            );
        })
        .map((a: any) => ({
            class_name: Array.isArray(a.classes) ? a.classes[0].class_name : a.classes.class_name,
            section: a.section
        }));

    // Add Class Teacher assigned class as fallback
    const classTeacherAssignment = assignments.find((a: any) => a.assignment_type === 'class_teacher');
    const teacherClass = classTeacherAssignment?.classes;
    const teacherClassName = Array.isArray(teacherClass) ? teacherClass[0]?.class_name : teacherClass?.class_name;

    // Auto-select class and section
    useEffect(() => {
        if (classSections.length > 0 && !selectedClass) {
            setSelectedClass(classSections[0].class_name);
            setSelectedSection(classSections[0].section);
        }
    }, [classSections, selectedClass]);



    // 5. Fetch Students and existing marks
    const { data: studentsData = [], isLoading: isLoadingStudents } = useQuery({
        queryKey: ['marks-entry-students', selectedExam, selectedSubject, selectedClass, selectedSection],
        queryFn: async () => {
            if (!selectedExam || !selectedClass) return [];

            // Fetch students in class
            const { data: students, error: studentError } = await supabase
                .from('students')
                .select('id, name, roll_no')
                .eq('class_name', selectedClass)
                .eq('section', selectedSection || 'A')
                .eq('institution_id', user?.institutionId)
                .order('roll_no', { ascending: true });

            if (studentError) throw studentError;

            // Fetch existing marks
            const { data: existingMarks } = await supabase
                .from('exam_results')
                .select('*')
                .or(`exam_id.eq.${selectedExam},exam_id.in.(select id from exams where exam_type = '${selectedExam}')`)
                .eq('subject_id', (await getSubjectId(selectedSubject)))
                .in('student_id', students.map(s => s.id));

            // Sync marks to local state
            const initialMarks: any = {};
            existingMarks?.forEach(m => {
                initialMarks[m.student_id] = {
                    id: m.id,
                    internal: Number(m.internal_marks || 0),
                    external: Number(m.external_marks || 0),
                    status: m.status
                };
            });
            setMarksData(initialMarks);

            return students;
        },
        enabled: !!selectedExam && !!selectedClass && (viewMode !== 'CLASS_TEACHER')
    });

    // Derived State for Progress (Moved here to access studentsData)
    const totalStudents = studentsData.length;
    const submittedCount = marksData ? Object.values(marksData).filter(m => m.status === 'SUBMITTED' || m.status === 'APPROVED' || m.status === 'PUBLISHED').length : 0;
    const progress = totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0;

    // Helper: Get Subject ID from Name
    const getSubjectId = async (name: string) => {
        const { data } = await supabase.from('subjects').select('id').eq('name', name).limit(1).single();
        return data?.id;
    };

    // --- Handlers ---

    const handleMarkChange = (studentId: string, field: 'internal' | 'external', value: string) => {
        if (viewMode === 'REVIEW') return;

        const numVal = parseFloat(value);
        const max = field === 'internal' ? 20 : 80;
        const isValid = !isNaN(numVal) && numVal >= 0 && numVal <= max;

        // Update validation state
        setValidationErrors(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: !isValid && value !== '' // Mark as error if invalid and not empty
            }
        }));

        if (!isValid && value !== '') {
            // Optional: Soft toast warning only on first error interaction to separate 'noise'
            // toast.error(`Max ${field} marks is ${max}`); 
        }

        const safeValue = isNaN(numVal) ? 0 : numVal;

        setMarksData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: safeValue
            }
        }));
    };

    const saveMarksMutation = useMutation({
        mutationFn: async (status: MarkStatus) => {
            setIsSubmitting(true);
            const subjectId = await getSubjectId(selectedSubject);

            const records = Object.entries(marksData).map(([studentId, data]) => ({
                id: data.id, // Supabase handles upsert with ID
                institution_id: user?.institutionId,
                exam_id: selectedExam,
                student_id: studentId,
                subject_id: subjectId,
                internal_marks: data.internal,
                external_marks: data.external,
                total_marks: data.internal + data.external,
                status: status,
                staff_id: user?.id,
                class_id: selectedClass,
                section: selectedSection || 'A'
            }));

            const { error } = await supabase
                .from('exam_results')
                .upsert(records, { onConflict: 'exam_id, student_id, subject_id' });

            if (error) throw error;
        },
        onSuccess: (_, status) => {
            toast.success(status === 'DRAFT' ? 'Draft saved successfully' : 'Marks submitted for review');
            queryClient.invalidateQueries({ queryKey: ['marks-entry-students'] });
            if (status === 'SUBMITTED') setViewMode('REVIEW');
            setIsSubmitting(false);
        },
        onError: (err: any) => {
            toast.error("Failed to save marks: " + err.message);
            setIsSubmitting(false);
        }
    });

    // --- Class Teacher Logic ---

    // Determine target class for Class View (Use Class Teacher assignment)
    const targetClass = teacherClassName || selectedClass;
    const targetSection = classTeacherAssignment?.section || selectedSection;

    // Fetch students for Class Teacher view
    const { data: classTeacherStudents = [] } = useQuery({
        queryKey: ['class-teacher-students', targetClass, targetSection],
        queryFn: async () => {
            if (!targetClass) return [];
            const { data } = await supabase
                .from('students')
                .select('*')
                .eq('class_name', targetClass)
                .eq('section', targetSection || 'A')
                .eq('institution_id', user?.institutionId)
                .order('roll_no');
            return data || [];
        },
        enabled: viewMode === 'CLASS_TEACHER' && !!targetClass
    });

    // Fetch all results for the class to aggregate status
    const { data: classExamResults = [], isLoading: isLoadingClassMarks } = useQuery({
        queryKey: ['class-marks-review', selectedExam, targetClass, targetSection],
        queryFn: async () => {
            if (!targetClass || !selectedExam) return [];

            const { data, error } = await supabase
                .from('exam_results')
                .select(`
                    *,
                    subjects!subject_id(name)
                `)
                .eq('exam_id', selectedExam)
                .eq('class_id', targetClass)
                .eq('section', targetSection || 'A');

            if (error) throw error;
            return data;
        },
        enabled: viewMode === 'CLASS_TEACHER' && !!selectedExam && !!targetClass
    });

    const approveMarksMutation = useMutation({
        mutationFn: async ({ studentId, status }: { studentId: string, status: MarkStatus }) => {
            // Update all results for this student and exam to the new status
            const { error } = await supabase
                .from('exam_results')
                .update({ status, rejection_comment: status === 'APPROVED' || status === 'PUBLISHED' ? null : rejectionModal.comment })
                .eq('student_id', studentId)
                .eq('exam_id', selectedExam);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Student marks updated successfully");
            queryClient.invalidateQueries({ queryKey: ['class-marks-review'] });
            setRejectionModal({ isOpen: false, comment: '' });
            setIsReviewOpen(false);
            setReviewStudent(null);
        }
    });

    // --- Render ---

    return (
        <FacultyLayout>
            <PageHeader
                title="Marks Entry"
                subtitle={viewMode === 'CLASS_TEACHER' ? "Review and approve class performance" : "Enter and manage subject marks"}
                actions={
                    <div className="flex gap-2">
                        <Button
                            variant={viewMode === 'CLASS_TEACHER' ? "default" : "outline"}
                            onClick={() => setViewMode(viewMode === 'CLASS_TEACHER' ? 'ENTRY' : 'CLASS_TEACHER')}
                            className="flex items-center gap-2"
                            disabled={!classTeacherAssignment && !selectedClass}
                        >
                            <ShieldCheck className="w-4 h-4" />
                            {viewMode === 'CLASS_TEACHER' ? "Back to Entry" : "Class Marks"}
                        </Button>
                        {viewMode === 'ENTRY' && selectedClass && (
                            <>
                                <Button variant="outline" onClick={() => saveMarksMutation.mutate('DRAFT')} disabled={isSubmitting}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Draft
                                </Button>
                                <Button variant="default" onClick={() => setViewMode('REVIEW')}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Review
                                </Button>
                            </>
                        )}
                        {viewMode === 'REVIEW' && (
                            <>
                                <Button variant="outline" onClick={() => setViewMode('ENTRY')}>
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                                <Button className="btn-primary" onClick={() => saveMarksMutation.mutate('SUBMITTED')} disabled={isSubmitting}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Final Submit
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            <div className="space-y-6">
                <ContextSelectors
                    viewMode={viewMode}
                    selectedExam={selectedExam}
                    setSelectedExam={setSelectedExam}
                    selectedSubject={selectedSubject}
                    setSelectedSubject={setSelectedSubject}
                    selectedClass={selectedClass}
                    setSelectedClass={setSelectedClass}
                    selectedSection={selectedSection}
                    setSelectedSection={setSelectedSection}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    exams={exams}
                    facultySubjects={facultySubjects}
                    classSections={classSections}
                    targetClass={targetClass}
                    targetSection={targetSection}
                />

                {/* Progress Bar (Only in Entry Mode) */}
                {viewMode === 'ENTRY' && studentsData.length > 0 && (
                    <div className="px-1">
                        <div className="flex justify-between text-xs mb-2 text-muted-foreground font-medium uppercase tracking-wider">
                            <span>Entry Progress</span>
                            <span>{Math.round(progress)}% Completed</span>
                        </div>
                        <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="dashboard-card overflow-hidden">
                    {viewMode === 'CLASS_TEACHER' ? (
                        <ClassPerformance
                            targetClass={targetClass}
                            targetSection={targetSection}
                            students={classTeacherStudents}
                            examResults={classExamResults}
                            onViewPublish={(student) => {
                                setReviewStudent(student);
                                setIsReviewOpen(true);
                            }}
                        />
                    ) : (
                        <MarksEntryTable
                            studentsData={studentsData}
                            marksData={marksData}
                            handleMarkChange={handleMarkChange}
                            viewMode={viewMode}
                            validationErrors={validationErrors}
                            isLoading={isLoadingStudents}
                            searchTerm={searchTerm}
                        />
                    )}
                </div>
            </div>

            <StudentReviewModal
                isOpen={isReviewOpen}
                onOpenChange={setIsReviewOpen}
                reviewStudent={reviewStudent}
                classExamResults={classExamResults}
                onReject={() => setRejectionModal({ isOpen: true, studentId: reviewStudent?.id, comment: '' })}
                onPublish={() => approveMarksMutation.mutate({ studentId: reviewStudent.id, status: 'PUBLISHED' })}
                isSubmitting={approveMarksMutation.isPending}
            />

            {/* Rejection Comment Modal (Kept local as it's small and tightly coupled) */}
            <Dialog open={rejectionModal.isOpen} onOpenChange={(open) => setRejectionModal(prev => ({ ...prev, isOpen: open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Submission</DialogTitle>
                        <DialogDescription>Please provide a reason for rejecting these marks. This will be sent to the faculty.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            placeholder="Reason for rejection..."
                            value={rejectionModal.comment}
                            onChange={(e) => setRejectionModal(prev => ({ ...prev, comment: e.target.value }))}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectionModal(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
                        <Button
                            variant="destructive"
                            disabled={!rejectionModal.comment}
                            onClick={() => {
                                if (rejectionModal.studentId) {
                                    approveMarksMutation.mutate({ studentId: rejectionModal.studentId, status: 'DRAFT' }); // Set back to draft
                                }
                            }}
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </FacultyLayout>
    );

}
