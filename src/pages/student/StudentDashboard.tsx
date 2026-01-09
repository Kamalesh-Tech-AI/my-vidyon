import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StudentLayout } from '@/layouts/StudentLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { CourseCard } from '@/components/cards/CourseCard';
import { AssignmentCard } from '@/components/cards/AssignmentCard';
import { NotificationCard } from '@/components/cards/NotificationCard';
import { AreaChart } from '@/components/charts/AreaChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n/TranslationContext';
import { supabase } from '@/lib/supabase';
import {
  BookOpen,
  Clock,
  TrendingUp,
  Calendar,
  CheckCircle,
} from 'lucide-react';

// Mock Data preserved for non-implemented tables
const attendanceData = [
  { name: 'Mon', value: 95 },
  { name: 'Tue', value: 88 },
  { name: 'Wed', value: 92 },
  { name: 'Thu', value: 100 },
  { name: 'Fri', value: 85 },
  { name: 'Sat', value: 0 },
];

const gradeDistribution = [
  { name: 'A Grade', value: 4 },
  { name: 'B Grade', value: 2 },
  { name: 'C Grade', value: 1 },
];

const mockNotifications = [
  { title: 'Assignment Graded', message: 'Your Shakespeare Essay has been graded. You scored 95/100.', type: 'success' as const, time: '2 hours ago' },
  { title: 'New Material Uploaded', message: 'New study material for Mathematics have been uploaded.', type: 'info' as const, time: '5 hours ago' },
  { title: 'Exam Reminder', message: 'Your Unit Test - II for Mathematics is scheduled for next Monday.', type: 'warning' as const, time: '1 day ago' },
];

const mockAssignments = [
  { title: 'Algebra Homework', course: 'Mathematics', dueDate: 'Dec 22, 2025', status: 'pending' as const },
  { title: 'Periodic Table Project', course: 'Chemistry', dueDate: 'Dec 20, 2025', status: 'submitted' as const },
  { title: 'Poetry Analysis', course: 'English', dueDate: 'Dec 18, 2025', status: 'graded' as const, grade: '95', maxGrade: '100' },
];

export function StudentDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // 1. Fetch Student Details (Class Info) -> Then Fetch Subjects
  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*').eq('email', user?.email).single();
      return data;
    },
    enabled: !!user?.email,
    staleTime: 1000 * 60, // 1 minute
  });

  // 2. Fetch Subjects (Real)
  const { data: subjects = [] } = useQuery({
    queryKey: ['student-subjects', studentProfile?.class_name],
    queryFn: async () => {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('class_name', studentProfile?.class_name);

      // Transform to CourseCard props - only showing subject and instructor
      return (data || []).map((sub: any) => ({
        title: sub.name,
        code: sub.code || sub.class_name,
        instructor: sub.instructor_name || 'Not Assigned',
        // Removed progress, students count - these are faculty data
      }));
    },
    enabled: !!studentProfile?.class_name,
    staleTime: 1000 * 60,
  });

  // 3. Mock Queries (Wrapped in useQuery for caching consistency)
  const { data: assignments = mockAssignments } = useQuery({
    queryKey: ['student-assignments'],
    queryFn: () => Promise.resolve(mockAssignments),
    staleTime: 1000 * 60 * 5, // 5 minutes for mocks
  });

  const { data: notifications = mockNotifications } = useQuery({
    queryKey: ['student-notifications'],
    queryFn: () => Promise.resolve(mockNotifications),
    staleTime: 1000 * 60 * 5,
  });

  // 4. Realtime Subscription
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel('student-dashboard-realtime')
      // Listen for profile/class changes
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `email=eq.${user.email}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      })
      // Listen for subject changes (if added to class)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => {
        queryClient.invalidateQueries({ queryKey: ['student-subjects'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, queryClient]);


  return (
    <StudentLayout>
      <PageHeader
        title={`${t.common.welcome}, ${user?.name.split(' ')[0]}!`}
        subtitle={t.dashboard.overview}
      />

      {/* Stats Grid - 2 columns on mobile, 4 on desktop */}
      <div className="stats-grid mb-6 sm:mb-8">
        <StatCard
          title="Subjects"
          value={subjects.length}
          icon={BookOpen}
          iconColor="text-student"
          change="Enrolled Courses"
        />
        <StatCard
          title="Attendance Rate"
          value="92%"
          icon={CheckCircle}
          iconColor="text-success"
          change="+3% this month"
          changeType="positive"
        />
        <StatCard
          title="Overall Percentage"
          value="85%"
          icon={TrendingUp}
          iconColor="text-primary"
          change="+2% from last term"
          changeType="positive"
        />
        <StatCard
          title="Pending Tasks"
          value={assignments.filter(a => a.status === 'pending').length}
          icon={Clock}
          iconColor="text-warning"
          change="Due soon"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2 dashboard-card p-4 sm:p-6">
          <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Weekly Attendance</h3>
          <div className="chart-container-responsive">
            <AreaChart data={attendanceData} color="hsl(var(--student))" height={220} />
          </div>
        </div>
        <div className="dashboard-card p-4 sm:p-6">
          <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Grade Distribution</h3>
          <div className="chart-container-responsive">
            <DonutChart data={gradeDistribution} height={220} />
          </div>
        </div>
      </div>

      {/* Content Grid - Stack on mobile */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Courses */}
        <div className="mb-6 sm:mb-8 xl:col-span-2 xl:mb-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-semibold text-sm sm:text-base">My Subjects</h3>
            <a href="/student/courses" className="text-xs sm:text-sm text-primary hover:underline">View All</a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
            {subjects.length > 0 ? subjects.map((course: any) => (
              <CourseCard key={course.code} {...course} />
            )) : (
              <p className="text-muted-foreground text-sm col-span-full">No subjects assigned yet.</p>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Upcoming Events */}
          <div className="dashboard-card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base">Upcoming Events</h3>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                <div className="text-center flex-shrink-0">
                  <div className="text-base sm:text-lg font-bold text-primary">22</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Dec</div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">Unit Test: Mathematics</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Class 10-A • 10:00 AM</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                <div className="text-center flex-shrink-0">
                  <div className="text-base sm:text-lg font-bold text-primary">25</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Dec</div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">Science Fair</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Auditorium • 2:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assignments */}
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-semibold text-sm sm:text-base">Assignments</h3>
              <a href="/student/assignments" className="text-xs sm:text-sm text-primary hover:underline">View All</a>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {assignments.map((assignment: any, index: number) => (
                <AssignmentCard key={index} {...assignment} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="mt-6 sm:mt-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-semibold text-sm sm:text-base">Recent Notifications</h3>
          <a href="/student/notifications" className="text-xs sm:text-sm text-primary hover:underline">View All</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {notifications.map((notification: any, index: number) => (
            <NotificationCard key={index} {...notification} />
          ))}
        </div>
      </div>
    </StudentLayout>
  );
}
