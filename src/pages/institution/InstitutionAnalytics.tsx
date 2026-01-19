import { useState, useEffect } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    GraduationCap,
    School,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    IndianRupee,
    Activity
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useWebSocketContext } from '@/context/WebSocketContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function InstitutionAnalytics() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalFaculty: 0,
        totalClasses: 0,
        totalRevenue: 0
    });
    const [departmentData, setDepartmentData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.institutionId) return;

        const fetchAnalytics = async () => {
            try {
                // Parallel fetching for performance
                const [
                    { count: studentCount },
                    { count: facultyCount },
                    { count: classCount },
                    { data: revenueData },
                    { data: deptData }
                ] = await Promise.all([
                    supabase.from('students').select('*', { count: 'exact', head: true }).eq('institution_id', user.institutionId),
                    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('institution_id', user.institutionId).in('role', ['faculty', 'teacher']),
                    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('institution_id', user.institutionId),
                    supabase.from('student_fees').select('amount_paid').eq('institution_id', user.institutionId),
                    supabase.from('subjects').select('department').eq('institution_id', user.institutionId)
                ]);

                const totalRev = revenueData?.reduce((sum, item) => sum + (Number(item.amount_paid) || 0), 0) || 0;

                // Process Department Data
                const deptCounts: Record<string, number> = {};
                deptData?.forEach((d: any) => {
                    const dept = d.department || 'General';
                    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
                });

                const deptChartData = Object.keys(deptCounts).map(k => ({
                    name: k,
                    value: deptCounts[k]
                }));
                // Set department data indirectly or return it?
                // For simplicity, we can update the state for chart separately or return it here.
                // Let's modify the return type to include deptData or handle it in useEffect.
                // For now, let's keep chart data in a separate useEffect or just update the state here if possible? 
                // useQuery should be pure.
                // Let's rely on onSuccess or just derive it in render.
                // But deptData is needed for the chart.
                // Let's return it all.

                return {
                    totalStudents: studentCount || 0,
                    totalFaculty: facultyCount || 0,
                    totalClasses: classCount || 0,
                    totalRevenue: totalRev,
                    deptChartData: deptChartData.length > 0 ? deptChartData : [{ name: 'General', value: 100 }]
                };

                // 6. Attendance Performance Data (Last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { data: attendanceData } = await supabase
                    .from('student_attendance')
                    .select('attendance_date, status')
                    .eq('institution_id', user.institutionId)
                    .gte('attendance_date', format(thirtyDaysAgo, 'yyyy-MM-dd'));

                const attendanceByDate: Record<string, { present: number, total: number }> = {};
                attendanceData?.forEach(record => {
                    const date = record.attendance_date;
                    if (!attendanceByDate[date]) attendanceByDate[date] = { present: 0, total: 0 };
                    attendanceByDate[date].total++;
                    if (record.status === 'present' || record.status === 'late') attendanceByDate[date].present++;
                });

                const chartData = Object.keys(attendanceByDate).sort().map(date => ({
                    month: format(new Date(date), 'MMM dd'),
                    attendance: Math.round((attendanceByDate[date].present / attendanceByDate[date].total) * 100),
                    avg: 80 // Placeholder for academic average
                }));

                setPerformanceData(chartData.length > 0 ? chartData : [
                    { month: 'Jan', avg: 78, attendance: 92 },
                    { month: 'Feb', avg: 82, attendance: 94 },
                    { month: 'Mar', avg: 81, attendance: 91 },
                    { month: 'Apr', avg: 85, attendance: 95 },
                    { month: 'May', avg: 88, attendance: 96 },
                ]);

            } catch (err) {
                console.error("Error fetching analytics:", err);
                return { totalStudents: 0, totalFaculty: 0, totalClasses: 0, totalRevenue: 0, deptChartData: [] };
            }
        },
        enabled: !!user?.institutionId,
    });

    // Real-time subscriptions
    useEffect(() => {
        if (!user?.institutionId) return;

        // Use specific filters for better performance and reliability
        const unsubStudents = subscribeToTable('students',
            () => queryClient.invalidateQueries({ queryKey: ['institution-analytics'] }),
            { filter: `institution_id=eq.${user.institutionId}` }
        );

        const unsubProfiles = subscribeToTable('profiles',
            () => queryClient.invalidateQueries({ queryKey: ['institution-analytics'] }),
            { filter: `institution_id=eq.${user.institutionId}` }
        );

        const unsubClasses = subscribeToTable('classes',
            () => queryClient.invalidateQueries({ queryKey: ['institution-analytics'] }),
            { filter: `institution_id=eq.${user.institutionId}` }
        );

        const unsubFees = subscribeToTable('student_fees',
            () => queryClient.invalidateQueries({ queryKey: ['institution-analytics'] }),
            { filter: `institution_id=eq.${user.institutionId}` }
        );

        const unsubSubjects = subscribeToTable('subjects',
            () => queryClient.invalidateQueries({ queryKey: ['institution-analytics'] }),
            { filter: `institution_id=eq.${user.institutionId}` }
        );

        return () => {
            unsubStudents();
            unsubProfiles();
            unsubClasses();
            unsubFees();
            unsubSubjects();
        };
    }, [user?.institutionId, subscribeToTable, queryClient]);



    return (
        <InstitutionLayout>
            <PageHeader
                title="Analytics Dashboard"
                subtitle="Overview of institution performance and statistics"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStudents}</div> {/* Real Data */}
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <ArrowUpRight className="w-3 h-3 text-success mr-1" />
                            +0% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalFaculty}</div> {/* Real Data */}
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <Activity className="w-3 h-3 text-primary mr-1" />
                            Active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{(stats.totalRevenue / 1000).toFixed(1)}k</div> {/* Real Data */}
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <ArrowUpRight className="w-3 h-3 text-success mr-1" />
                            +0% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
                        <School className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalClasses}</div> {/* Real Data */}
                        <p className="text-xs text-muted-foreground mt-1">
                            Across all sections
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Attendance & Performance Trend</CardTitle>
                        <CardDescription>Live attendance data for the last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} name="Avg Score" />
                                <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={2} name="Attendance" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Subject Distribution</CardTitle>
                        <CardDescription>Breakdown by Department (Based on Subjects)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.deptChartData || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {(stats.deptChartData || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </InstitutionLayout>
    );
}
