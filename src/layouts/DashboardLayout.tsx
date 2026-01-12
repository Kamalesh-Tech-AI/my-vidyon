import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import { UserRole, ROLE_LABELS } from '@/types/auth';
import {
  Menu,
  X,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  GraduationCap,
  Building2,
  Shield,
  Users,
  User as UserIcon,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  roleColor?: string;
}

const roleIcons: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  student: GraduationCap,
  faculty: Users,
  institution: Building2,
  admin: Shield,
  parent: Users,
};

export function DashboardLayout({ children, navItems, roleColor = 'text-primary' }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const getSettingsPath = () => {
    switch (user.role) {
      case 'admin': return '/admin/settings';
      case 'institution': return '/institution/settings';
      case 'parent': return '/parent/settings';
      case 'faculty': return '/faculty/settings';
      case 'student': return '/student/settings';
      default: return `/${user.role}`;
    }
  };

  const settingsPath = getSettingsPath();

  const RoleIcon = roleIcons[user.role];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <div className="flex items-center gap-2">
          <img src="/my-vidyon-logo.png" alt="Vidyon Logo" className="h-14 w-auto" />
          <span className="font-semibold text-sm hidden sm:block">{ROLE_LABELS[user.role]} Portal</span>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </button>
            </SheetTrigger>
            <SheetContent className="w-[320px] p-0">
              <NotificationPanel />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full bg-sidebar-gradient z-40 transition-all duration-300 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-20',
        'hidden lg:flex'
      )}>
        <div className="h-32 flex items-center gap-3 px-4 border-b border-sidebar-border bg-sidebar-gradient overflow-hidden flex-shrink-0">
          <img src="/my-vidyon-logo.png" alt="Vidyon Logo" className={cn("h-24 w-auto transition-all", !sidebarOpen && "mx-auto")} />
          {sidebarOpen && (
            <div className="animate-fade-in truncate">
              <span className="text-[10px] text-black font-bold uppercase tracking-wider block opacity-70 leading-none">
                {ROLE_LABELS[user.role]} Portal
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <nav className="px-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'nav-link flex-shrink-0',
                    isActive && 'nav-link-active',
                    !sidebarOpen && 'justify-center px-2'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="animate-fade-in">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>


        {/* User Profile */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-gradient flex-shrink-0">
          <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
            <Link
              to={settingsPath}
              className={cn(
                'flex items-center gap-3 flex-1 min-w-0 p-2 rounded-lg hover:bg-sidebar-accent transition-colors group',
                !sidebarOpen && 'justify-center p-0'
              )}
            >
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <span className="text-sm font-medium text-sidebar-foreground transition-colors">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 animate-fade-in text-left">
                  <p className="text-sm font-bold text-sidebar-foreground truncate transition-colors">{user.name}</p>
                  <p className="text-xs text-sidebar-muted truncate transition-colors">{user.email}</p>
                </div>
              )}
            </Link>
            <button
              onClick={logout}
              title="Logout"
              className={cn(
                'p-2 rounded-lg text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-colors',
                !sidebarOpen && 'hidden'
              )}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-36 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', sidebarOpen ? 'rotate-90' : '-rotate-90')} />
        </button>
      </aside>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-sidebar-gradient" onClick={e => e.stopPropagation()}>
            <div className="pt-20 p-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn('nav-link', isActive && 'nav-link-active')}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="pt-4 border-t border-sidebar-border mt-4">
                <Link
                  to={settingsPath}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'nav-link mb-2',
                    location.pathname === settingsPath && 'nav-link-active'
                  )}
                >
                  <UserIcon className="w-5 h-5" />
                  <span>View Profile</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="nav-link text-destructive hover:bg-destructive/10 w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        'min-h-screen transition-all duration-300 pt-16 lg:pt-0',
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      )}>
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 bg-card border-b border-border items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="input-field pl-10 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSelector />

            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors relative">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                </button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] p-0">
                <NotificationPanel />
              </SheetContent>
            </Sheet>

            <Link
              to={settingsPath}
              className="flex items-center gap-3 p-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-muted/50 transition-all bg-card shadow-sm pr-4"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-primary/20">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold leading-tight">{user.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{ROLE_LABELS[user.role]}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8 safe-area-inset">
          {children}
        </div>
      </main>
    </div>
  );
}
