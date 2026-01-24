
import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User as UserIcon, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RealtimeNotificationBell } from '@/components/RealtimeNotificationBell';
import { RealtimeStatusIndicator } from '@/components/RealtimeStatusIndicator';

export function CanteenLayout({ children }: { children: ReactNode }) {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background">
            {/* Top Bar */}
            <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border fixed top-0 left-0 right-0 z-50 px-4 md:px-8 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                    <img src="/my-vidyon-logo.png" alt="Vidyon Logo" className="h-8 md:h-10 w-auto" />
                    <div className="hidden xs:block">
                        <span className="text-[10px] text-muted-foreground block leading-none font-bold uppercase tracking-wider">Canteen Portal</span>
                        <span className="font-bold text-sm hidden sm:block">Vidyon Management</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden xs:flex items-center gap-2">
                        <RealtimeStatusIndicator />
                    </div>
                    <RealtimeNotificationBell />

                    <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-border">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold leading-none">{user.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Canteen Manager</p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs md:text-base">
                            {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <button
                            onClick={() => logout()}
                            className="p-1.5 md:p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-16 min-h-screen">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
