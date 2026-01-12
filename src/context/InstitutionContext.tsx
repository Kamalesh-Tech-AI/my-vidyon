import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Type definitions
export interface StaffMember {
    id: string;
    name: string;
    classes: string[];
}

export interface Subject {
    id: string;
    name: string;
    staff: StaffMember[];
}

// Assignments structure: ClassID -> SectionID -> SubjectID -> List of Staff IDs
type AssignmentsMap = Record<string, Record<string, Record<string, string[]>>>;
// Class Teacher structure: ClassID -> SectionID -> TeacherID
type ClassTeacherMap = Record<string, Record<string, string>>;

export interface InstitutionContextType {
    subjects: Subject[];
    allSubjects: { id: string; name: string }[];
    allStaffMembers: { id: string; name: string }[];

    getAssignedStaff: (classId: string, sectionId: string, subjectId: string) => { id: string; name: string }[];
    assignStaff: (classId: string, sectionId: string, subjectId: string, staffIds: string[]) => void;

    getClassTeacher: (classId: string, sectionId: string) => string | undefined;
    assignClassTeacher: (classId: string, sectionId: string, teacherId: string) => void;
    classTeachers: ClassTeacherMap;

    addStaffToSubject: (subjectId: string, staff: StaffMember) => void;
    removeStaffFromSubject: (subjectId: string, staffId: string) => void;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

const allSubjectsList = [
    { id: '1', name: 'Mathematics' },
    { id: '2', name: 'Science' },
    { id: '3', name: 'English' },
    { id: '4', name: 'Hindi' },
    { id: '5', name: 'Social Studies' },
    { id: '6', name: 'Physical Education' },
];

const allStaffMembers = [
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
    { id: 'staff11', name: 'Mr. Arun Patel' },
    { id: 'staff12', name: 'Mr. Rajesh Kumar' },
    { id: 'staff13', name: 'Dr. Michael Wilson' },
    { id: 'staff14', name: 'Mrs. Kavita Reddy' },
    { id: 'staff15', name: 'Mr. Arjun Mehta' },
    { id: 'staff16', name: 'Mr. Vikram Singh' },
    { id: 'staff17', name: 'Mrs. Neha Kapoor' },
];

// Mock Data for "Grade 7 - C" to demonstrate independent assignments
const defaultAssignments: AssignmentsMap = {
    "Grade 7": {
        "C": {
            "1": ["staff1", "staff4"], // Maths
            "2": ["staff2"],           // Science
            "3": ["staff5", "staff6"]  // English
        }
    }
};

const defaultClassTeachers: ClassTeacherMap = {
    "Grade 7": {
        "C": "staff3" // Dr. Sarah Davis
    }
};

export function InstitutionProvider({ children }: { children: ReactNode }) {
    // Initialize state from LocalStorage or use Default Mock Data
    const [assignments, setAssignments] = useState<AssignmentsMap>(() => {
        try {
            const saved = localStorage.getItem('institution_assignments');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Schema Validation: Must be an object, not an array, and look like our map
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error("Failed to parse institution assignments", e);
        }
        return defaultAssignments;
    });

    const [classTeachers, setClassTeachers] = useState<ClassTeacherMap>(() => {
        try {
            const saved = localStorage.getItem('institution_class_teachers');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error("Failed to parse class teachers", e);
        }
        return defaultClassTeachers;
    });

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('institution_assignments', JSON.stringify(assignments));
    }, [assignments]);

    useEffect(() => {
        localStorage.setItem('institution_class_teachers', JSON.stringify(classTeachers));
    }, [classTeachers]);


    // Derived State: subjects
    const subjects: Subject[] = allSubjectsList.map(sub => {
        const staffMap: Record<string, { id: string; name: string; classes: string[] }> = {};

        Object.entries(assignments).forEach(([classId, sections]) => {
            Object.entries(sections).forEach(([sectionId, subjectAssignments]) => {
                const assignedStaffIds = subjectAssignments[sub.id];
                if (assignedStaffIds) {
                    assignedStaffIds.forEach(staffId => {
                        const staffInfo = allStaffMembers.find(s => s.id === staffId);
                        if (staffInfo) {
                            if (!staffMap[staffId]) {
                                staffMap[staffId] = { ...staffInfo, classes: [] };
                            }
                            staffMap[staffId].classes.push(`${classId} - ${sectionId}`);
                        }
                    });
                }
            });
        });

        const staffList = Object.values(staffMap);
        return {
            id: sub.id,
            name: sub.name,
            staff: staffList
        };
    });

    // Memoized Methods to prevent infinite re-renders in consumers
    const getAssignedStaff = useCallback((classId: string, sectionId: string, subjectId: string) => {
        if (!assignments[classId]?.[sectionId]?.[subjectId]) return [];
        const staffIds = assignments[classId][sectionId][subjectId];
        return staffIds.map(id => allStaffMembers.find(s => s.id === id)).filter(Boolean) as { id: string; name: string }[];
    }, [assignments]);

    const assignStaff = useCallback((classId: string, sectionId: string, subjectId: string, staffIds: string[]) => {
        setAssignments(prev => {
            const newAssignments = JSON.parse(JSON.stringify(prev));
            if (!newAssignments[classId]) newAssignments[classId] = {};
            if (!newAssignments[classId][sectionId]) newAssignments[classId][sectionId] = {};

            newAssignments[classId][sectionId][subjectId] = staffIds;
            return newAssignments;
        });
        toast.success("Subject staff assigned successfully!");
    }, []);

    const getClassTeacher = useCallback((classId: string, sectionId: string) => {
        return classTeachers[classId]?.[sectionId];
    }, [classTeachers]);

    const assignClassTeacher = useCallback((classId: string, sectionId: string, teacherId: string) => {
        setClassTeachers(prev => {
            const newMap = JSON.parse(JSON.stringify(prev));
            if (!newMap[classId]) newMap[classId] = {};
            newMap[classId][sectionId] = teacherId;
            return newMap;
        });
    }, []);

    // Deprecated
    const addStaffToSubject = useCallback((subjectId: string, staff: StaffMember) => {
        console.warn("addStaffToSubject is deprecated. Use assignStaff instead.");
    }, []);

    const removeStaffFromSubject = useCallback((subjectId: string, staffId: string) => {
        console.warn("removeStaffFromSubject is deprecated.");
    }, []);

    return (
        <InstitutionContext.Provider value={{
            subjects,
            allSubjects: allSubjectsList,
            allStaffMembers,
            getAssignedStaff,
            assignStaff,
            getClassTeacher,
            assignClassTeacher,
            classTeachers, // Expose for list view
            addStaffToSubject,
            removeStaffFromSubject
        }}>
            {children}
        </InstitutionContext.Provider>
    );
}

export function useInstitution() {
    const context = useContext(InstitutionContext);
    if (context === undefined) {
        throw new Error('useInstitution must be used within an InstitutionProvider');
    }
    return context;
}
