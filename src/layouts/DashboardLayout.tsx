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
  MoreHorizontal,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { RealtimeNotificationBell } from '@/components/RealtimeNotificationBell';
import { RealtimeStatusIndicator } from '@/components/RealtimeStatusIndicator';
import { useSearch } from '@/context/SearchContext';

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
  accountant: Users,
  canteen_manager: Users,
};

export function DashboardLayout({ children, navItems, roleColor = 'text-primary' }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();

  if (!user) return null;

  const isBottomNavRole = ['student', 'faculty', 'parent'].includes(user.role);

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

  // Logic for Bottom Nav Items (Max 4 + More)
  const bottomNavLimit = 4;
  const showMoreOption = navItems.length > bottomNavLimit;
  const primaryBottomNavItems = showMoreOption ? navItems.slice(0, bottomNavLimit) : navItems;
  const moreBottomNavItems = showMoreOption ? navItems.slice(bottomNavLimit) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4 safe-area-inset-top">
        {/* Only show Hamburger for Non-BottomNav roles */}
        {!isBottomNavRole && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        )}

        {/* For BottomNav roles, show simple branding or nothing on left */}
        {isBottomNavRole && (
          <div className="flex items-center gap-2">
            <img src="/my-vidyon-logo.png" alt="Vidyon Logo" className="h-10 w-auto" />
          </div>
        )}

        {!isBottomNavRole && (
          <div className="flex items-center gap-2">
            <img src="/my-vidyon-logo.png" alt="Vidyon Logo" className="h-14 w-auto" />
            <span className="font-semibold text-sm hidden sm:block">{ROLE_LABELS[user.role]} Portal</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <RealtimeStatusIndicator />
          {!isBottomNavRole && <LanguageSelector />}
          {/* Hide LanguageSelector on mobile header for bottom nav roles to save space? Or keep it? keeping for now */}
          {isBottomNavRole && <LanguageSelector />}
          <RealtimeNotificationBell />
        </div>
      </header>

      {/* Sidebar - Desktop Only for BottomNav Roles, Always for Admin/Inst */}
      <aside className={cn(
        'fixed top-0 left-0 h-full bg-sidebar-gradient z-40 transition-all duration-300 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-20',
        'hidden lg:flex' // Always hidden on mobile
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
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors border border-sidebar-border/30 whitespace-nowrap leading-none overflow-hidden">
                <span className="text-sm font-medium text-sidebar-foreground transition-colors uppercase">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Logout button clicked');
                logout();
              }}
              type="button"
              title="Logout"
              className={cn(
                'p-2 rounded-lg text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer',
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

      {/* Mobile Menu (Sidebar Overlay) - ONLY for Non-BottomNav Roles */}
      {!isBottomNavRole && mobileMenuOpen && (
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Mobile logout clicked');
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  type="button"
                  className="nav-link text-destructive hover:bg-destructive/10 w-full cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - ONLY for BottomNav Roles on Mobile */}
      {isBottomNavRole && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
          <nav className="flex items-center justify-around h-16">
            {primaryBottomNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full space-y-1",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </Link>
              );
            })}

            {/* More Button */}
            {showMoreOption && (
              <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-primary"
                    )}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                    <span className="text-[10px] font-medium leading-none">More</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
                  <SheetHeader className="text-left mb-4">
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="grid grid-cols-3 gap-4">
                    {moreBottomNavItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMoreMenuOpen(false)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors gap-2 text-center",
                          location.pathname === item.href && "bg-primary/10 text-primary border border-primary/20"
                        )}
                      >
                        <item.icon className="w-8 h-8" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </Link>
                    ))}

                    {/* Add Profile/Logout to More Menu for easy access */}
                    <Link
                      to={settingsPath}
                      onClick={() => setMoreMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors gap-2 text-center"
                    >
                      <UserIcon className="w-8 h-8" />
                      <span className="text-xs font-medium">Profile</span>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Bottom nav logout clicked');
                        setMoreMenuOpen(false);
                        logout();
                      }}
                      type="button"
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors gap-2 text-center cursor-pointer"
                    >
                      <LogOut className="w-8 h-8" />
                      <span className="text-xs font-medium">Logout</span>
                    </button>

                  </div>
                </SheetContent>
              </Sheet>
            )}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        'min-h-screen transition-all duration-300 pt-16 lg:pt-0',
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-20',
        // Responsive Padding Logic:
        // Mobile: Bottom Nav (h-16) + Buffer (h-8) + Safe Area.
        // Desktop (lg): No bottom padding required (Bottom Nav hidden).
        isBottomNavRole && 'pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-0'
      )}>
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 bg-card border-b border-border items-center justify-between px-8">
          <div className="flex items-center gap-4">
            {/* Hide search bar for admin users */}
            {user.role !== 'admin' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="input-field pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <RealtimeStatusIndicator />
            <LanguageSelector />
            <RealtimeNotificationBell />

            <Link
              to={settingsPath}
              className="flex items-center gap-3 p-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-muted/50 transition-all bg-card shadow-sm pr-4"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-primary/20 flex-shrink-0 whitespace-nowrap leading-none overflow-hidden">
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
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
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 safe-area-inset w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
