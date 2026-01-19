import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
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
import { Scan, UserCheck, Clock } from 'lucide-react';
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
  const navigate = useNavigate();

  const today = format(new Date(), 'yyyy-MM-dd');

  // 1. Fetch Stats (Parallel)
  const { data: stats } = useQuery({
    queryKey: ['institution-stats', user?.institutionId, today],
    queryFn: async () => {
      if (!user?.institutionId) return { students: 0, teachers: 0, classes: 0, presence: 0 };

      const [studentsReq, teachersReq, classesReq, studentAttendanceReq, staffAttendanceReq] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('institution_id', user.institutionId),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('institution_id', user.institutionId).eq('role', 'faculty'),
        supabase.from('classes').select('id, groups!inner(institution_id)', { count: 'exact', head: true }).eq('groups.institution_id', user.institutionId),
        supabase.from('student_attendance').select('id', { count: 'exact', head: true }).eq('institution_id', user.institutionId).eq('attendance_date', today).in('status', ['present', 'late']),
        supabase.from('staff_attendance').select('id', { count: 'exact', head: true }).eq('institution_id', user.institutionId).eq('attendance_date', today).in('status', ['present', 'late'])
      ]);

      return {
        students: studentsReq.count || 0,
        teachers: teachersReq.count || 0,
        classes: classesReq.count || 0,
        presence: (studentAttendanceReq.count || 0) + (staffAttendanceReq.count || 0),
        totalPeople: (studentsReq.count || 0) + (teachersReq.count || 0)
      };
    },
    enabled: !!user?.institutionId,
    staleTime: 1000 * 30, // 30 seconds
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

  // 3. Fetch Recent Attendance (Real-time Feed)
  const { data: recentAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['recent-attendance', user?.institutionId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const [studentAtt, staffAtt] = await Promise.all([
        supabase
          .from('student_attendance')
          .select('id, created_at, status, student:students(name, class_name)')
          .eq('institution_id', user?.institutionId)
          .eq('attendance_date', today)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('staff_attendance')
          .select('id, created_at, status, staff:profiles(full_name)')
          .eq('institution_id', user?.institutionId)
          .eq('attendance_date', today)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const combined = [
        ...(studentAtt.data?.map((a: any) => ({
          id: a.id,
          created_at: a.created_at,
          name: a.student?.name,
          subtitle: a.student?.class_name,
          type: 'Student'
        })) || []),
        ...(staffAtt.data?.map((a: any) => ({
          id: a.id,
          created_at: a.created_at,
          name: a.staff?.full_name,
          subtitle: 'Staff',
          type: 'Faculty'
        })) || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

      return combined;
    },
    enabled: !!user?.institutionId,
  });

  // 3. Compute Class Distribution (Simple Grouping from admissions for demo, ideal is aggregate query)
  // For now using mock until we write the complex aggregation content
  // 4a. Fetch Recent Notifications / Leaves
  // Since we don't have a single notification feed for institution yet, we simulate it by fetching pending staff leaves 
  // or use the notifications table if it has institution-wide alerts. 
  // For now, let's fetch pending staff leaves as they are the most critical 'notification' here.
  const { data: recentLeaves = [], isLoading: recentLeavesLoading } = useQuery({
    queryKey: ['institution-pending-leaves-notifs', user?.institutionId],
    queryFn: async () => {
      if (!user?.institutionId) return [];

      // Fetch pending staff leaves
      const { data: leaves } = await supabase
        .from('staff_leaves')
        .select(`
                id,
                leave_type,
                from_date,
                created_at,
                staff_profile:profiles(full_name)
            `)
        .eq('institution_id', user.institutionId)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })
        .limit(5);

      // Map to notification structure
      return (leaves || []).map((leave: any) => {
        const staffName = Array.isArray(leave.staff_profile)
          ? leave.staff_profile[0]?.full_name
          : leave.staff_profile?.full_name;

        return {
          id: leave.id,
          type: 'leave',
          message: `${staffName || 'Staff Member'} requesting ${leave.leave_type}`,
          created_at: leave.created_at
        };
      });
    },
    enabled: !!user?.institutionId
  });

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance', filter: `institution_id=eq.${user.institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-stats'] });
        refetchAttendance();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_attendance', filter: `institution_id=eq.${user.institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-stats'] });
        refetchAttendance();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_leaves', filter: `institution_id=eq.${user.institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-pending-leaves-notifs'] });
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

  const attendanceRate = stats?.totalPeople ? Math.round((stats.presence / stats.totalPeople) * 100) : 0;

  return (
    <InstitutionLayout>
      <PageHeader
        title="Institution Overview"
        subtitle={`${user?.name} • Academic Year 2025-26`}
      />

      {/* Stats Grid */}
      <div className="stats-grid mb-6 sm:mb-8">
        <StatCard
          title="Daily Attendance"
          value={`${attendanceRate}%`}
          icon={TrendingUp}
          iconColor="text-success"
          change={`${stats?.presence || 0} Present today`}
          changeType="positive"
        />
        <StatCard
          title="Total Students"
          value={stats?.students || 0}
          icon={GraduationCap}
          iconColor="text-institution"
          change="Real-time count"
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
        </div>
      </div>

      {/* Live Attendance Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2 dashboard-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-institution animate-pulse" />
              <h3 className="font-semibold text-sm sm:text-base">Live Attendance Stream</h3>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-institution/5 border-institution/20 text-institution">
              Camera Bridge Active
            </Badge>
          </div>

          <div className="space-y-4">
            {recentAttendance && recentAttendance.length > 0 ? (
              recentAttendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-institution/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-institution/10 flex items-center justify-center text-institution font-bold">
                      {record.name?.[0] || '?'}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{record.name}</h4>
                      <p className="text-xs text-muted-foreground">{record.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-success font-medium text-xs mb-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      Present
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-medium">
                      <Clock className="w-3 h-3" />
                      {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Scan className="w-8 h-8 text-muted-foreground opacity-20" />
                </div>
                <p className="text-sm text-muted-foreground">Waiting for camera recognitions...</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1 italic">Real-time stream will appear here</p>
              </div>
            )}

            {recentAttendance && recentAttendance.length > 0 && (
              <button
                onClick={() => navigate('/institution/reports')}
                className="w-full py-2.5 text-xs font-medium text-muted-foreground hover:text-institution transition-colors border-t border-dashed border-border mt-2"
              >
                View Full Attendance Report
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-card p-4 sm:p-6 h-fit">
          <h3 className="font-semibold mb-4 text-sm sm:text-base flex items-center gap-2">
            <Building className="w-4 h-4 text-faculty" />
            Quick Shortcuts
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/institution/face-registration')}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-muted/5 hover:bg-institution/5 hover:border-institution/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-institution/10 flex items-center justify-center text-institution mb-2 group-hover:scale-110 transition-transform">
                <Scan className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter text-center">Register Face</span>
            </button>
            <button
              onClick={() => navigate('/institution/faculty')}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-muted/5 hover:bg-faculty/5 hover:border-faculty/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-faculty/10 flex items-center justify-center text-faculty mb-2 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter text-center">Manage Staff</span>
            </button>
            <button
              onClick={() => navigate('/institution/student-details')}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-muted/5 hover:bg-success/5 hover:border-success/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success mb-2 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter text-center">Students</span>
            </button>
            <button
              onClick={() => navigate('/institution/analytics')}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-muted/5 hover:bg-warning/5 hover:border-warning/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center text-warning mb-2 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter text-center">Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Section - Full Width */}
      <div className="dashboard-card p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
            <h3 className="font-semibold text-sm sm:text-base">Notifications (Recent Leave Requests)</h3>
          </div>
          <a href="/institution/notifications" className="text-xs sm:text-sm text-primary hover:underline">View All</a>
        </div>
        <div className="space-y-3">
          {recentLeavesLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">Loading notifications...</div>
          ) : recentLeaves.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">No recent notifications</div>
          ) : (
            recentLeaves.map((notif: any) => (
              <div key={notif.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${notif.type === 'leave' ? 'bg-warning' : 'bg-institution'}`} />
                <div>
                  <p className="text-sm font-medium">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString()}</p>
                  {notif.type === 'leave' && (
                    <div className="mt-2">
                      <button
                        onClick={() => navigate('/institution/leave-approval')}
                        className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded transition-colors font-medium border border-primary/20"
                      >
                        Show Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </InstitutionLayout>
  );
}
