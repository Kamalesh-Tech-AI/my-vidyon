import { StudentLayout } from '@/layouts/StudentLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { CourseCard } from '@/components/cards/CourseCard';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/TranslationContext';
import { Search } from 'lucide-react';

const courses = [
  { title: 'Mathematics', code: 'MATH10', instructor: 'Mr. Sharma', progress: 75, students: 45, schedule: 'Mon, Wed 10:00 AM', status: 'active' as const },
  { title: 'Physics', code: 'PHY10', instructor: 'Mrs. Verma', progress: 60, students: 52, schedule: 'Tue, Thu 11:00 AM', status: 'active' as const },
  { title: 'Chemistry', code: 'CHEM10', instructor: 'Mr. Gupta', progress: 85, students: 38, schedule: 'Mon, Fri 12:00 PM', status: 'active' as const },
  { title: 'Biology', code: 'BIO10', instructor: 'Dr. Reddy', progress: 45, students: 40, schedule: 'Wed, Fri 02:00 PM', status: 'active' as const },
  { title: 'Hindi', code: 'HIN10', instructor: 'Mrs. Singh', progress: 30, students: 48, schedule: 'Tue, Thu 09:00 AM', status: 'active' as const },
  { title: 'History & Civics', code: 'HIST10', instructor: 'Mr. Das', progress: 0, students: 35, schedule: 'Mon, Wed 01:00 PM', status: 'upcoming' as const },
  { title: 'Geography', code: 'GEO10', instructor: 'Ms. Iyer', progress: 100, students: 42, schedule: 'Completed', status: 'completed' as const },
];

export function StudentCourses() {
  const { t } = useTranslation();

  return (
    <StudentLayout>
      <PageHeader
        title={t.nav.courses}
        subtitle={t.dashboard.overview}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map((course) => (
          <CourseCard key={course.code} {...course} />
        ))}
      </div>
    </StudentLayout>
  );
}
