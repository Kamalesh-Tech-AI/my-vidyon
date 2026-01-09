import { ReactNode } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useTranslation } from '@/i18n/TranslationContext';
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Users,
  Calendar,
  UserPlus,
  DollarSign,
  BarChart3,
  FileText,
  Settings,
  UserCheck,
} from 'lucide-react';

export function InstitutionLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  const institutionNavItems = [
    { label: t.nav.dashboard, href: '/institution', icon: LayoutDashboard },
    { label: t.nav.departments, href: '/institution/departments', icon: Building2 },
    { label: t.nav.courses, href: '/institution/courses', icon: BookOpen },
    { label: t.nav.calendar, href: '/institution/calendar', icon: Calendar },
    { label: t.nav.admissions, href: '/institution/admissions', icon: UserPlus },
    { label: 'Add Student', href: '/institution/add-student', icon: Users },
    { label: 'Faculty Assigning', href: '/institution/faculty-assigning', icon: UserCheck },
    { label: t.nav.feeStructure, href: '/institution/fees', icon: DollarSign },
    { label: t.nav.analytics, href: '/institution/analytics', icon: BarChart3 },
    { label: t.nav.reports, href: '/institution/reports', icon: FileText },
    { label: t.nav.settings, href: '/institution/settings', icon: Settings },
  ];

  return (
    <DashboardLayout navItems={institutionNavItems} roleColor="text-institution">
      {children}
    </DashboardLayout>
  );
}
