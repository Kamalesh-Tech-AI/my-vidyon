import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { AreaChart } from '@/components/charts/AreaChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { BarChart } from '@/components/charts/BarChart';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  GraduationCap,
  Users,
  Building,
  TrendingUp,
  IndianRupee,
  UserPlus,
  Bell,
} from 'lucide-react';

// --- MOCK DATA FOR CHARTS (Until we have historical tracking tables) ---
const enrollmentTrend = [
  { name: 'Jan', value: 850 },
  { name: 'Feb', value: 920 },
  { name: 'Mar', value: 1050 },
  { name: 'Apr', value: 1180 },
  { name: 'May', value: 1250 },
  { name: 'Jun', value: 1320 },
];

const feeCollection = [
  { name: 'Jan', value: 1.2 },
  { name: 'Feb', value: 1.5 },
  { name: 'Mar', value: 1.8 },
  { name: 'Apr', value: 2.1 },
];

export function InstitutionDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch Stats (Parallel)
  const { data: stats } = useQuery({
    queryKey: ['institution-stats', user?.institutionId],
    queryFn: async () => {
      if (!user?.institutionId) return { students: 0, teachers: 0, classes: 0 };

      const [studentsReq, teachersReq, classesReq] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('institution_id', user.institutionId),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('institution_id', user.institutionId).eq('role', 'faculty'),
        // Classes join via groups
        supabase.from('classes').select('id, groups!inner(institution_id)', { count: 'exact', head: true }).eq('groups.institution_id', user.institutionId)
      ]);

      return {
        students: studentsReq.count || 0,
        teachers: teachersReq.count || 0,
        classes: classesReq.count || 0,
      };
    },
    enabled: !!user?.institutionId,
    staleTime: 1000 * 60, // 1 minute
  });

  // 2. Fetch Recent Admissions
  const { data: recentAdmissions } = useQuery({
    queryKey: ['recent-admissions', user?.institutionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('institution_id', user?.institutionId)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.institutionId,
    staleTime: 1000 * 60,
  });

  // 3. Compute Class Distribution (Simple Grouping from admissions for demo, ideal is aggregate query)
  // For now using mock until we write the complex aggregation content
  const classDistribution = [
    { name: 'Grade 10', value: 25 },
    { name: 'Grade 9', value: 28 },
    { name: 'Grade 8', value: 22 },
  ];

  // 4. Realtime Subscription to auto-reload
  useEffect(() => {
    if (!user?.institutionId) return;

    const channel = supabase
      .channel('institution-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `institution_id=eq.${user.institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-stats'] });
        queryClient.invalidateQueries({ queryKey: ['recent-admissions'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `institution_id=eq.${user.institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.institutionId, queryClient]);


  // Columns Config
  const admissionColumns = [
    { key: 'name', header: 'Student Name' },
    { key: 'class_name', header: 'Class' },
    {
      key: 'created_at',
      header: 'Date',
      render: (item: any) => new Date(item.created_at).toLocaleDateString()
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <Badge variant="success">Enrolled</Badge>, // Defaulting for now
    },
  ];

  return (
    <InstitutionLayout>
      <PageHeader
        title="Institution Overview"
        subtitle={`${user?.name} • Academic Year 2025-26`}
      />

      {/* Stats Grid */}
      <div className="stats-grid mb-6 sm:mb-8">
        <StatCard
          title="Total Students"
          value={stats?.students || 0}
          icon={GraduationCap}
          iconColor="text-institution"
          change="Real-time count"
          changeType="neutral"
        />
        <StatCard
          title="Total Teachers"
          value={stats?.teachers || 0}
          icon={Users}
          iconColor="text-faculty"
          change="Active faculty"
        />
        <StatCard
          title="Total Classes"
          value={stats?.classes || 0}
          icon={Building}
          iconColor="text-institution"
          change="Across all groups"
        />
        <StatCard
          title="Revenue (YTD)"
          value="₹12.5M"
          icon={IndianRupee}
          iconColor="text-success"
          change="+15% vs last year"
          changeType="positive"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2 dashboard-card p-4 sm:p-6">
          <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Enrollment Trend</h3>
          <div className="chart-container-responsive">
            <AreaChart data={enrollmentTrend} color="hsl(var(--institution))" height={250} />
          </div>
        </div>
        <div className="dashboard-card p-4 sm:p-6">
          <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Class Enrollment Distribution</h3>
          <div className="h-[250px]">
            <DonutChart data={classDistribution} height={250} />
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6 sm:mb-8">
        {/* Recent Admissions */}
        <div className="dashboard-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base">Recent Admissions</h3>
            </div>
            <a href="/institution/students" className="text-xs sm:text-sm text-primary hover:underline">View All</a>
          </div>
          <DataTable columns={admissionColumns} data={recentAdmissions || []} mobileCardView />
        </div>

        {/* Notifications / Leave Requests */}
        <div className="dashboard-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
              <h3 className="font-semibold text-sm sm:text-base">Notifications (Leave Requests)</h3>
            </div>
            <a href="/institution/notifications" className="text-xs sm:text-sm text-primary hover:underline">View All</a>
          </div>
          <div className="space-y-3">
            {/* Mock Leave Request Notifications */}
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="w-2 h-2 mt-2 rounded-full bg-warning flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Dr. Robert Brown requested medical leave.</p>
                <p className="text-xs text-muted-foreground mt-1">Today • 10:30 AM</p>
                <div className="flex gap-2 mt-2">
                  <button className="text-xs bg-success/10 text-success hover:bg-success/20 px-2 py-1 rounded transition-colors">Approve</button>
                  <button className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 px-2 py-1 rounded transition-colors">Reject</button>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="w-2 h-2 mt-2 rounded-full bg-warning flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Mrs. Jennifer Lee requested casual leave for tomorrow.</p>
                <p className="text-xs text-muted-foreground mt-1">Yesterday • 4:15 PM</p>
                <div className="flex gap-2 mt-2">
                  <button className="text-xs bg-success/10 text-success hover:bg-success/20 px-2 py-1 rounded transition-colors">Approve</button>
                  <button className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 px-2 py-1 rounded transition-colors">Reject</button>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="w-2 h-2 mt-2 rounded-full bg-institution flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">New fee structure approved by board.</p>
                <p className="text-xs text-muted-foreground mt-1">2 days ago • General</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </InstitutionLayout>
  );
}
