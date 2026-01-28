import { ReactNode } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useTranslation } from '@/i18n/TranslationContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  GraduationCap,
  Megaphone,
  BarChart3,
  Settings,
} from 'lucide-react';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  const adminNavItems = [
    { label: t.nav.dashboard, href: '/admin', icon: LayoutDashboard },
    { label: t.nav.institutions, href: '/admin/institutions', icon: Building2 },
    { label: 'Notifications', href: '/admin/notifications', icon: Megaphone },
    { label: t.nav.analytics, href: '/admin/reports', icon: BarChart3 },
    { label: t.nav.settings, href: '/admin/settings', icon: Settings },
  ];

  return (
    <DashboardLayout navItems={adminNavItems} roleColor="text-admin">
      {children}
    </DashboardLayout>
  );
}
