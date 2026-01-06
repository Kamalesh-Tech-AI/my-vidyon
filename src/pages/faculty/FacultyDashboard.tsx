import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { CourseCard } from '@/components/cards/CourseCard';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { BarChart } from '@/components/charts/BarChart';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import {
  Users,
  BookOpen,
  ClipboardCheck,
  FileText,
  Plus,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Mock Data preserved for non-implemented tables
const classPerformance = [
  { name: 'Mathematics', value: 78 },
  { name: 'Science', value: 82 },
  { name: 'English', value: 85 },
  { name: 'History', value: 72 },
];

const mockAssignedSubjects = [
  { title: 'Mathematics', code: 'Grade 10', instructor: 'You', students: 45, schedule: 'Mon, Wed 10:00 AM', status: 'active' as const },
  { title: 'General Science', code: 'Grade 9', instructor: 'You', students: 52, schedule: 'Tue, Thu 2:00 PM', status: 'active' as const },
  { title: 'English Literature', code: 'Grade 10', instructor: 'You', students: 28, schedule: 'Wed, Fri 3:00 PM', status: 'active' as const },
];

const mockPendingSubmissions = [
  { id: 1, student: 'John Smith', assignment: 'Algebra Homework', course: 'Mathematics', submitted: '2 hours ago', status: 'pending' },
  { id: 2, student: 'Emily Johnson', assignment: 'Physics Lab Report', course: 'Science', submitted: '5 hours ago', status: 'pending' },
  { id: 3, student: 'Michael Brown', assignment: 'Shakespeare Essay', course: 'English', submitted: '1 day ago', status: 'pending' },
  { id: 4, student: 'Sarah Davis', assignment: 'Geometry Practice', course: 'Mathematics', submitted: '1 day ago', status: 'pending' },
];

const todaySchedule = [
  { time: '10:00 AM', course: 'Mathematics', topic: 'Quadratic Equations', room: 'Class 10-A' },
  { time: '2:00 PM', course: 'Science', topic: 'Light Reflection', room: 'Physics Lab' },
  { time: '4:00 PM', course: 'Extra Class', topic: 'Exam Preparation', room: 'Class 9-B' },
];

export function FacultyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetch Total Students in Institution (Real)
  const { data: studentCount } = useQuery({
    queryKey: ['faculty-total-students', user?.institutionId],
    queryFn: async () => {
      if (!user?.institutionId) return 0;
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', user.institutionId);
      return count || 0;
    },
    enabled: !!user?.institutionId,
    staleTime: Infinity,
  });

  // 2. Mock Queries for Caching Architecture
  const { data: assignedSubjects = mockAssignedSubjects } = useQuery({
    queryKey: ['faculty-courses'],
    queryFn: () => Promise.resolve(mockAssignedSubjects),
    staleTime: Infinity,
  });

  const { data: pendingSubmissions = mockPendingSubmissions } = useQuery({
    queryKey: ['faculty-submissions'],
    queryFn: () => Promise.resolve(mockPendingSubmissions),
    staleTime: Infinity,
  });

  // 3. Realtime Subscription
  useEffect(() => {
    if (!user?.institutionId) return;

    const channel = supabase
      .channel('faculty-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `institution_id=eq.${user.institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['faculty-total-students'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.institutionId, queryClient]);


  const handleCreateAssignment = () => {
    toast.success('Assignment creation form opened');
    navigate('/faculty/assignments');
  };

  const submissionColumns = [
    { key: 'student', header: 'Student' },
    { key: 'assignment', header: 'Assignment' },
    { key: 'course', header: 'Subject' },
    { key: 'submitted', header: 'Submitted' },
    {
      key: 'status',
      header: 'Status',
      render: () => <Badge variant="warning">Pending Review</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <Button variant="outline" size="sm">
          Review
        </Button>
      ),
    },
  ];

  return (
    <FacultyLayout>
      <PageHeader
        title={`Good morning, ${user?.name.split(' ')[0]}!`}
        subtitle="Manage your courses and track student progress"
        actions={
          <Button className="btn-primary flex items-center gap-2" onClick={handleCreateAssignment}>
            <Plus className="w-4 h-4" />
            Create Assignment
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="stats-grid mb-6 sm:mb-8">
        <StatCard
          title="Total Students"
          value={studentCount || 0}
          icon={Users}
          iconColor="text-faculty"
          change="Whole Institution"
        />
        <StatCard
          title="Active Courses"
          value={assignedSubjects.length}
          icon={BookOpen}
          iconColor="text-primary"
          change="Fall Semester 2025"
        />
        <StatCard
          title="Pending Reviews"
          value={pendingSubmissions.length}
          icon={FileText}
          iconColor="text-warning"
          change="4 due today"
        />
        <StatCard
          title="Avg. Attendance"
          value="87%"
          icon={ClipboardCheck}
          iconColor="text-success"
          change="+2% this week"
          changeType="positive"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Performance Chart */}
        <div className="xl:col-span-2 dashboard-card p-4 sm:p-6">
          <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Class Performance Overview</h3>
          <div className="chart-container-responsive">
            <BarChart data={classPerformance} color="hsl(var(--faculty))" height={250} />
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="dashboard-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h3 className="font-semibold text-sm sm:text-base">Today's Schedule</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {todaySchedule.map((item, index) => (
              <div key={index} className="flex gap-3 sm:gap-4 p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                <div className="text-xs sm:text-sm font-medium text-primary w-16 sm:w-20 flex-shrink-0">
                  {item.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">{item.course}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{item.topic}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{item.room}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* My Courses */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-semibold text-sm sm:text-base">My Courses</h3>
          <a href="/faculty/courses" className="text-xs sm:text-sm text-primary hover:underline">Manage Courses</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {assignedSubjects.map((course) => (
            <CourseCard key={course.code} {...course} />
          ))}
        </div>
      </div>

      {/* Pending Submissions */}
      <div className="dashboard-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-semibold text-sm sm:text-base">Pending Submissions</h3>
          <a href="/faculty/assignments" className="text-xs sm:text-sm text-primary hover:underline">View All</a>
        </div>
        <DataTable columns={submissionColumns} data={pendingSubmissions} mobileCardView />
      </div>
    </FacultyLayout>
  );
}

