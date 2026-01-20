import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { CourseCard } from '@/components/cards/CourseCard';
import { useAuth } from '@/context/AuthContext';
import { useFacultyDashboard } from '@/hooks/useFacultyDashboard';
import Loader from '@/components/common/Loader';
import { BookOpen } from 'lucide-react';

export function FacultyCourses() {
    const { user } = useAuth();
    const { assignedSubjects, isLoading } = useFacultyDashboard(user?.id, user?.institutionId);

    if (isLoading) {
        return (
            <FacultyLayout>
                <Loader fullScreen={false} />
            </FacultyLayout>
        );
    }

    return (
        <FacultyLayout>
            <PageHeader
                title="My Subjects"
                subtitle="Manage your assigned subjects and classes"
            />

            {assignedSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-muted/30 rounded-lg border-2 border-dashed border-border/50 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">No Subjects Assigned</h3>
                    <p className="text-muted-foreground mt-1 max-w-sm">
                        You haven't been assigned to any subjects yet. Please contact your institution administrator.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignedSubjects.map((subject) => (
                        <div key={subject.id} className="cursor-pointer transition-transform hover:scale-[1.01]"
                            onClick={() => {
                                // Navigate to subject details or some relevant page
                                // For now, maybe just log or nothing if detail page isn't ready
                                // user asked to "show here", not necessarily drill down yet, but assuming we keep the card.
                            }}
                        >
                            <CourseCard
                                title={subject.subjectName}
                                code={subject.className}
                                instructor="You"
                                students={0} // TODO: Fetch student count per class if needed
                                schedule={`Section ${subject.section}`}
                                status="active"
                            />
                        </div>
                    ))}
                </div>
            )}
        </FacultyLayout>
    );
}
