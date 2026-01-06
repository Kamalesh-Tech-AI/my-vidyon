import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    Users,
    GraduationCap,
    BookOpen,
    Calendar,
    TrendingUp,
    DollarSign,
    Bell,
    MapPin,
    Mail,
    Phone,
    Edit,
    Power,
    RotateCcw,
    Download,
    Activity,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    Layers
} from 'lucide-react';

export function InstitutionDetail() {
    const { institutionId } = useParams<{ institutionId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('overview');

    // 1. Fetch Institution Details
    const { data: institution, isLoading: isInstLoading } = useQuery({
        queryKey: ['institution', institutionId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('institutions')
                .select('*')
                .eq('institution_id', institutionId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!institutionId
    });

    // 2. Fetch Students and Staff
    const { data: peopleData = { students: [], staff: [] }, isLoading: isPeopleLoading } = useQuery({
        queryKey: ['institution-people', institutionId],
        queryFn: async () => {
            const [studentsRes, staffRes] = await Promise.all([
                supabase.from('students').select('*').eq('institution_id', institutionId),
                supabase.from('staff_details').select('*, profile:profiles(*)').eq('institution_id', institutionId)
            ]);
            return {
                students: studentsRes.data || [],
                staff: staffRes.data || []
            };
        },
        enabled: !!institutionId
    });

    // 3. Fetch Classes
    const { data: classData = { classes: [], sectionCount: 0 }, isLoading: isClassLoading } = useQuery({
        queryKey: ['institution-classes', institutionId],
        queryFn: async () => {
            const { data: groups } = await supabase
                .from('groups')
                .select('*, classes(*)')
                .eq('institution_id', institutionId);

            const allClasses: any[] = [];
            let sections = 0;

            groups?.forEach(g => {
                g.classes?.forEach((c: any) => {
                    allClasses.push({ ...c, group_name: g.name });
                    sections += (c.sections?.length || 0);
                });
            });

            return { classes: allClasses, sectionCount: sections };
        },
        enabled: !!institutionId
    });

    const loading = isInstLoading || isPeopleLoading || isClassLoading;
    const students = peopleData.students;
    const staff = peopleData.staff;
    const classes = classData.classes;

    const stats = {
        students: students.length,
        staff: staff.length,
        attendance: 0,
        performance: 0,
        classesCount: classes.length,
        sectionsCount: classData.sectionCount
    };

    useEffect(() => {
        if (!institutionId) return;

        const channel = supabase
            .channel(`inst_detail_${institutionId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `institution_id=eq.${institutionId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['institution-people', institutionId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions', filter: `institution_id=eq.${institutionId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['institution', institutionId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: `institution_id=eq.${institutionId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['institution-classes', institutionId] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [institutionId, queryClient]);

    const studentColumns = [
        { key: 'name', header: 'Name' },
        { key: 'register_number', header: 'Register No.' },
        { key: 'class_name', header: 'Class' },
        { key: 'section', header: 'Section' },
        {
            key: 'status',
            header: 'Status',
            render: (item: any) => <Badge variant="success">Active</Badge>
        }
    ];

    const staffColumns = [
        {
            key: 'profile',
            header: 'Name',
            render: (item: any) => item.profile?.full_name || 'N/A'
        },
        { key: 'staff_id', header: 'Staff ID' },
        { key: 'role', header: 'Role' },
        { key: 'subject_assigned', header: 'Subject' },
        { key: 'class_assigned', header: 'Class' },
        {
            key: 'email',
            header: 'Email',
            render: (item: any) => item.profile?.email || 'N/A'
        },
    ];

    const classColumns = [
        { key: 'name', header: 'Class' },
        { key: 'group_name', header: 'Group' },
        {
            key: 'sections',
            header: 'Sections',
            render: (item: any) => item.sections?.join(', ') || 'None'
        }
    ];

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Syncing institution data...</p>
                </div>
            </AdminLayout>
        );
    }

    const handleToggleStatus = async () => {
        const newStatus = institution.status === 'active' ? 'inactive' : 'active';
        const { error } = await supabase
            .from('institutions')
            .update({ status: newStatus })
            .eq('id', institution.id);

        if (error) toast.error("Update failed: " + error.message);
        else toast.success(`Institution ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
    };

    return (
        <AdminLayout>
            <PageHeader
                title={institution?.name || 'Loading...'}
                subtitle={`${institution?.institution_id} • ${institution?.type || 'Institution'}`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/add-institution?mode=edit&id=${institution.institution_id}`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Details
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleToggleStatus}>
                            <Power className="w-4 h-4 mr-2" />
                            {institution?.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                }
            />

            <Card className="p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground mt-1 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">Location</p>
                            <p className="font-medium">{institution?.city}, {institution?.state}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground mt-1 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{institution?.email || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-muted-foreground mt-1 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{institution?.phone || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Students" value={stats.students.toString()} icon={GraduationCap} iconColor="text-info" change="Total enrolled" />
                <StatCard title="Staff" value={stats.staff.toString()} icon={Users} iconColor="text-success" change="Total faculty" />
                <StatCard title="Classes" value={stats.classesCount.toString()} icon={BookOpen} iconColor="text-primary" change="Across all groups" />
                <StatCard title="Sections" value={stats.sectionsCount.toString()} icon={Layers} iconColor="text-warning" change="Active sections" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 flex-wrap h-auto bg-muted/50 p-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="staff">Staff</TabsTrigger>
                    <TabsTrigger value="classes">Classes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="p-6">
                            <h3 className="font-semibold mb-4 text-lg">Institution Profile</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between py-2 border-b border-border">
                                    <span className="text-muted-foreground">Academic Year</span>
                                    <span className="font-semibold">{institution?.academic_year || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-border">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant={institution?.status === 'active' ? 'success' : 'destructive'}>{institution?.status}</Badge>
                                </div>
                                <div className="flex justify-between py-2 border-b border-border">
                                    <span className="text-muted-foreground">School Code</span>
                                    <span className="font-semibold">{institution?.institution_id}</span>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-6 bg-primary/5 border-primary/20">
                            <h3 className="font-semibold mb-4 text-lg text-primary flex items-center gap-2">
                                <Activity className="w-5 h-5" /> Recent Activity
                            </h3>
                            <p className="text-muted-foreground text-sm italic">Coming soon: Real-time audit logs for this specific institution.</p>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="students">
                    <Card className="p-6">
                        <DataTable columns={studentColumns} data={students} mobileCardView />
                    </Card>
                </TabsContent>

                <TabsContent value="staff">
                    <Card className="p-6">
                        <DataTable columns={staffColumns} data={staff} mobileCardView />
                    </Card>
                </TabsContent>

                <TabsContent value="classes">
                    <Card className="p-6">
                        <DataTable columns={classColumns} data={classes} mobileCardView />
                    </Card>
                </TabsContent>
            </Tabs>
        </AdminLayout>
    );
}
