import { ReactNode } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useTranslation } from '@/i18n/TranslationContext';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  FileQuestion,
  BarChart3,
  Users,
  Megaphone,
  Calendar,
  Settings,
} from 'lucide-react';

export function FacultyLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  const facultyNavItems = [
    { label: t.nav.dashboard, href: '/faculty', icon: LayoutDashboard },
    { label: t.nav.courses, href: '/faculty/courses', icon: BookOpen },
    { label: t.nav.attendance, href: '/faculty/attendance', icon: ClipboardCheck },
    { label: t.nav.assignments, href: '/faculty/assignments', icon: FileText },
    { label: t.nav.marks, href: '/faculty/marks', icon: GraduationCap },
    { label: 'Materials', href: '/faculty/exams', icon: FileQuestion },

    { label: t.nav.students, href: '/faculty/students', icon: Users },
    { label: 'Timetable', href: '/faculty/timetable', icon: Calendar },
    { label: t.nav.announcements, href: '/faculty/announcements', icon: Megaphone },
    { label: 'Upload Certificate', href: '/faculty/upload-certificate', icon: FileText },
    { label: t.nav.leave, href: '/faculty/leave', icon: Calendar },
    { label: t.nav.settings, href: '/faculty/settings', icon: Settings },
  ];

  return (
    <DashboardLayout navItems={facultyNavItems} roleColor="text-faculty">
      {children}
    </DashboardLayout>
  );
}
