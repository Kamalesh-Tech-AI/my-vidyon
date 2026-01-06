import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ParentLayout } from '@/layouts/ParentLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n/TranslationContext';
import { ChildCard } from '@/components/cards/ChildCard';
import { Phone, Shield, School, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Helper to deduce performance mock based on nothing (random/demo)
const getPerformance = () => ['Excellent', 'Good', 'Average'][Math.floor(Math.random() * 3)] as 'Excellent' | 'Good' | 'Average';

export function ParentDashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    // 1. Fetch Children (Real)
    const { data: myChildren = [] } = useQuery({
        queryKey: ['parent-children', user?.email],
        queryFn: async () => {
            const { data } = await supabase
                .from('students')
                .select('*')
                .eq('email', user?.email) // Fallback if parent_email not set, usually lookup by parent_email
                .or(`parent_email.eq.${user?.email},email.eq.${user?.email}`);

            return (data || []).map((child: any) => ({
                id: child.id,
                name: child.name,
                grade: child.class_name || 'Not Assigned',
                rollNo: child.register_number || 'N/A',
                attendance: 85 + Math.floor(Math.random() * 10), // Mock attendance
                performance: getPerformance(),
                teacherName: 'Class Teacher', // Need relation
                teacherPhone: '+91 90000 00000'
            }));
        },
        enabled: !!user?.email,
        staleTime: Infinity,
    });

    // 2. Realtime Subscription
    useEffect(() => {
        if (!user?.email) return;

        const channel = supabase
            .channel('parent-dashboard-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'students',
                filter: `parent_email=eq.${user.email}`
            }, () => {
                queryClient.invalidateQueries({ queryKey: ['parent-children'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.email, queryClient]);

    return (
        <ParentLayout>
            <PageHeader
                title={`${t.common.welcome}, ${user?.name}!`}
                subtitle={t.parent.dashboard.subtitle}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6 mb-8">
                {myChildren.length > 0 ? myChildren.map((child: any) => (
                    <ChildCard key={child.id} {...child} />
                )) : (
                    <p className="col-span-full text-center text-muted-foreground py-8">
                        No students linked to this account yet.
                    </p>
                )}
            </div>

            {/* Emergency Contacts Section */}
            <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-destructive" />
                    Emergency Contacts
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* School Office */}
                    <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400">
                            <School className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">School Office</p>
                            <a href="tel:+914412345678" className="font-semibold text-foreground hover:text-primary transition-colors block">
                                044-1234 5678
                            </a>
                        </div>
                    </div>

                    {/* Main Guard */}
                    <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-2.5 bg-red-100 dark:bg-red-900/20 rounded-full text-red-600 dark:text-red-400">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Main Guard (Security)</p>
                            <a href="tel:+919876500000" className="font-semibold text-foreground hover:text-primary transition-colors block">
                                +91 98765 00000
                            </a>
                        </div>
                    </div>

                    {/* Class Teachers */}
                    {myChildren.map((child: any) => (
                        <div key={child.id} className="bg-card rounded-lg border border-border p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-2.5 bg-green-100 dark:bg-green-900/20 rounded-full text-green-600 dark:text-green-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">{child.name}'s Teacher</p>
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-foreground">{child.teacherName}</span>
                                    <a href={`tel:${child.teacherPhone}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                                        {child.teacherPhone}
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ParentLayout>
    );
}
