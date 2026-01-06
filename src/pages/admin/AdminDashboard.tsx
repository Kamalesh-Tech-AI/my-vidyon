import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Users,
  CreditCard,
  Activity,
  Shield,
  BarChart3,
  Loader2
} from 'lucide-react';

export function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const { data: stats = { institutions: 0, users: '0', revenue: '0', health: '99.9%' }, isLoading: isStatsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { count: instCount } = await supabase.from('institutions').select('*', { count: 'exact', head: true });
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { data: subData } = await supabase.from('subscriptions').select('amount').eq('status', 'active');
      const totalRevenue = subData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      return {
        institutions: instCount || 0,
        users: userCount ? (userCount > 1000 ? `${(userCount / 1000).toFixed(1)}k` : userCount.toString()) : '0',
        revenue: `₹${(totalRevenue / 100000).toFixed(1)}L`,
        health: '99.9%'
      };
    }
  });

  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['admin-activities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  const { data: pendingRequests = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: async () => {
      const { data } = await supabase
        .from('institutions')
        .select('institution_id, name, status')
        .eq('status', 'pending')
        .limit(3);
      return data || [];
    }
  });

  const isLoading = isStatsLoading || isActivitiesLoading || isPendingLoading;

  useEffect(() => {
    // Subscribe to platform activities for real-time feed
    const activityChannel = supabase
      .channel('platform_activities_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'platform_activities'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-activities'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    // Subscribe to critical table changes for stats
    const tablesChannel = supabase
      .channel('dashboard_stats_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin-pending'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(tablesChannel);
    };
  }, [queryClient]);


  const activityColumns = [
    {
      key: 'action',
      header: 'Activity',
      render: (item: any) => <span className="font-medium text-foreground">{item.action}</span>
    },
    { key: 'target', header: 'Entity' },
    {
      key: 'created_at',
      header: 'Time',
      render: (item: any) => {
        const date = new Date(item.created_at);
        return <span className="text-muted-foreground">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
      }
    },
    {
      key: 'type',
      header: 'Status',
      render: (item: any) => {
        const variantMap: any = {
          success: 'success',
          info: 'info',
          warning: 'warning',
          destructive: 'destructive'
        };
        return <Badge variant={variantMap[item.type] || 'default'}>{item.type.toUpperCase()}</Badge>;
      },
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="Overview of all institutions and platform metrics"
        actions={
          <Button className="btn-primary flex items-center gap-2" onClick={() => navigate('/admin/institutions')}>
            <Building2 className="w-4 h-4" />
            <span>Manage Institutions</span>
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Syncing real-time dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid mb-6 sm:mb-8">
            <StatCard
              title="Total Institutions"
              value={stats.institutions.toString()}
              icon={Building2}
              iconColor="text-primary"
              change="Live Updates"
              changeType="positive"
            />
            <StatCard
              title="Active Users"
              value={stats.users}
              icon={Users}
              iconColor="text-success"
              change="Total provisioned"
              changeType="positive"
            />
            <StatCard
              title="Platform Revenue"
              value={stats.revenue}
              icon={CreditCard}
              iconColor="text-warning"
              change="Projected monthly"
              changeType="positive"
            />
            <StatCard
              title="System Health"
              value={stats.health}
              icon={Activity}
              iconColor="text-info"
              change="All systems operational"
              changeType="positive"
            />
          </div>

          {/* Quick Actions Grid */}
          <h3 className="font-semibold text-lg mb-4 text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all text-foreground" onClick={() => navigate('/admin/add-institution')}>
              <Building2 className="w-8 h-8 text-primary" />
              <span>Add Institution</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all text-foreground" onClick={() => navigate('/admin/users')}>
              <Users className="w-8 h-8 text-success" />
              <span>User Management</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all text-foreground" onClick={() => navigate('/admin/reports')}>
              <BarChart3 className="w-8 h-8 text-info" />
              <span>View Analytics</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all text-foreground" onClick={() => navigate('/admin/settings')}>
              <Shield className="w-8 h-8 text-warning" />
              <span>Platform Settings</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 dashboard-card p-4 sm:p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base text-foreground">Recent Platform Activity</h3>
                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5">View All Logs</Button>
              </div>
              <DataTable columns={activityColumns} data={activities} mobileCardView />
              {activities.length === 0 && (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg mt-4">
                  No activity recorded yet.
                </div>
              )}
            </div>

            {/* System Alerts / Pending Approvals */}
            <div className="space-y-6">
              <div className="dashboard-card p-4 sm:p-6">
                <h3 className="font-semibold text-base mb-4 text-foreground">Pending Requests</h3>
                <div className="space-y-4">
                  {pendingRequests.map(req => (
                    <div key={req.institution_id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="font-medium text-sm text-foreground truncate">New Institution Request</p>
                        <p className="text-xs text-muted-foreground truncate">{req.name}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/institutions/${req.institution_id}`)}>Review</Button>
                    </div>
                  ))}
                  {pendingRequests.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 italic">No pending requests</p>
                  )}
                </div>
              </div>

              <div className="dashboard-card p-4 sm:p-6 bg-primary/5 border-primary/20">
                <h3 className="font-semibold text-base mb-2 text-primary">System Note</h3>
                <p className="text-sm text-muted-foreground">
                  Scheduled maintenance on Saturday 12:00 AM - 02:00 AM IST. Please notify all institution admins.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
