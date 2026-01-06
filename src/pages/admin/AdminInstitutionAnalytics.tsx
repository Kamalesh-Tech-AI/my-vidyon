import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { AreaChart } from '@/components/charts/AreaChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { BarChart } from '@/components/charts/BarChart';
import { Button } from '@/components/ui/button';
import { Download, Calendar, Filter, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function AdminInstitutionAnalytics() {
    const { institutionId } = useParams();
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [studentGrowth, setStudentGrowth] = useState<any[]>([]);
    const [deptDistribution, setDeptDistribution] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalyticsData();

        const channel = supabase
            .channel('analytics_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchAnalyticsData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, () => fetchAnalyticsData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [institutionId]);

    const fetchAnalyticsData = async () => {
        try {
            // In a real app, these would be complex aggregation queries
            // For now, let's fetch counts to make it dynamic
            const { count: studentCount } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true });

            const { count: staffCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'faculty');

            // Generating semi-dynamic mock data based on real counts
            setRevenueData([
                { name: 'Jan', value: 2.1 },
                { name: 'Feb', value: 2.3 },
                { name: 'Mar', value: 2.5 },
                { name: 'Apr', value: 2.8 },
                { name: 'May', value: 3.2 },
                { name: 'Jun', value: 3.5 },
            ]);

            setStudentGrowth([
                { name: '2022', value: Math.floor((studentCount || 0) * 0.7) },
                { name: '2023', value: Math.floor((studentCount || 0) * 0.8) },
                { name: '2024', value: Math.floor((studentCount || 0) * 0.9) },
                { name: '2025', value: studentCount || 0 },
            ]);

            setDeptDistribution([
                { name: 'Engineering', value: Math.floor((studentCount || 0) * 0.5) },
                { name: 'Management', value: Math.floor((studentCount || 0) * 0.3) },
                { name: 'Science', value: Math.floor((studentCount || 0) * 0.2) },
            ]);

            setKpis([
                { label: 'Total Students', value: studentCount?.toString() || '0', trend: '+12%', status: 'success' },
                { label: 'Faculty Count', value: staffCount?.toString() || '0', trend: 'Stable', status: 'primary' },
                { label: 'Retention Rate', value: '96.2%', trend: '+0.5%', status: 'success' },
                { label: 'Active Sessions', value: '42', trend: '+5', status: 'success' },
            ]);

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <PageHeader
                title="Institutional Analytics"
                subtitle={`Detailed insights for institution ${institutionId || 'Overview'}`}
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            This Year
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filter
                        </Button>
                        <Button className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Export Report
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="dashboard-card">
                    <h3 className="font-semibold mb-6 text-lg">Platform Revenue Forecast</h3>
                    <AreaChart data={revenueData} color="hsl(var(--success))" height={300} />
                </div>
                <div className="dashboard-card">
                    <h3 className="font-semibold mb-6 text-lg">User Growth Trajectory</h3>
                    <BarChart data={studentGrowth} color="hsl(var(--primary))" height={300} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="dashboard-card pt-6">
                    <h3 className="font-semibold mb-6">Enrollment Distribution</h3>
                    <div className="h-[300px]">
                        < DonutChart data={deptDistribution} />
                    </div>
                </div>
                <div className="lg:col-span-2 dashboard-card">
                    <h3 className="font-semibold mb-6">Global Performance Indicators</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {kpis.map((kpi, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border">
                                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{kpi.label}</span>
                                <div className="flex items-end justify-between mt-2">
                                    <span className="text-2xl font-bold">{kpi.value}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${kpi.status === 'success' ? 'bg-success/10 text-success' :
                                        kpi.status === 'warning' ? 'bg-warning/10 text-warning' :
                                            'bg-primary/10 text-primary'
                                        }`}>
                                        {kpi.trend}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
