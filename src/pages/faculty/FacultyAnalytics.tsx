import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { BarChart } from '@/components/charts/BarChart';
import { AreaChart } from '@/components/charts/AreaChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';

const gradeDistribution = [
    { name: 'A+', value: 15 },
    { name: 'A', value: 25 },
    { name: 'B', value: 30 },
    { name: 'C', value: 20 },
    { name: 'D/F', value: 10 },
];

const performanceTrend = [
    { name: 'Unit 1', value: 72 },
    { name: 'Midterm', value: 78 },
    { name: 'Unit 2', value: 75 },
    { name: 'Final', value: 85 },
];

const attendanceBySubject = [
    { name: 'Math', value: 94 },
    { name: 'Science', value: 88 },
    { name: 'English', value: 92 },
];

export function FacultyAnalytics() {
    return (
        <FacultyLayout>
            <PageHeader
                title="Performance Analytics"
                subtitle="In-depth analysis of student performance and attendance"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Avg. Class Score"
                    value="78.5%"
                    icon={GraduationCap}
                    iconColor="text-primary"
                    change="+4.2% from last term"
                    changeType="positive"
                />
                <StatCard
                    title="Avg. Attendance"
                    value="92.4%"
                    icon={Users}
                    iconColor="text-success"
                    change="+1.5% this month"
                    changeType="positive"
                />
                <StatCard
                    title="Pass Percentage"
                    value="98%"
                    icon={TrendingUp}
                    iconColor="text-info"
                    change="Highest in school"
                />
                <StatCard
                    title="Active Students"
                    value="125"
                    icon={BookOpen}
                    iconColor="text-warning"
                    change="Across 3 subjects"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="dashboard-card">
                    <h3 className="font-semibold mb-6">Grade Distribution (Class 10)</h3>
                    <DonutChart data={gradeDistribution} height={300} />
                </div>
                <div className="dashboard-card">
                    <h3 className="font-semibold mb-6">Subject Performance Trend</h3>
                    <AreaChart data={performanceTrend} color="hsl(var(--primary))" height={300} />
                </div>
            </div>

            <div className="dashboard-card">
                <h3 className="font-semibold mb-6">Attendance Comparison by Subject</h3>
                <BarChart data={attendanceBySubject} color="hsl(var(--success))" height={300} />
            </div>
        </FacultyLayout>
    );
}
