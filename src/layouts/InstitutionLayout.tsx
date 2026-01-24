import { ReactNode } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '@/context/AuthContext';
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
  ClipboardCheck,
  CalendarClock,
  Camera,
} from 'lucide-react';

export function InstitutionLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  const { user } = useAuth();
  const role = (user as any)?.user_metadata?.role || user?.role;

  const institutionNavItems = [
    { label: t.nav.dashboard, href: '/institution', icon: LayoutDashboard },
    { label: t.nav.departments, href: '/institution/departments', icon: Building2 },
    { label: t.nav.courses, href: '/institution/courses', icon: BookOpen },
    { label: 'Users', href: '/institution/users', icon: Users },
    { label: t.nav.calendar, href: '/institution/calendar', icon: Calendar },
    { label: 'Faculty Assigning', href: '/institution/faculty-assigning', icon: UserCheck },
    { label: 'Leave Approval', href: '/institution/leave-approval', icon: ClipboardCheck },
    { label: 'Timetable', href: '/institution/timetable', icon: CalendarClock },

    { label: t.nav.feeStructure, href: role === 'accountant' ? '/accountant/fees' : '/institution/fees', icon: DollarSign },
    { label: t.nav.analytics, href: '/institution/analytics', icon: BarChart3 },
    { label: t.nav.reports, href: '/institution/reports', icon: FileText },
    { label: t.nav.settings, href: '/institution/settings', icon: Settings },
  ];

  const filteredNavItems = role === 'accountant'
    ? institutionNavItems.filter(item => item.href === '/accountant/fees')
    : institutionNavItems;

  return (
    <DashboardLayout navItems={filteredNavItems} roleColor="text-institution">
      {children}
    </DashboardLayout>
  );
}
