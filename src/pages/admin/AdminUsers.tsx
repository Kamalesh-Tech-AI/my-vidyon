import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, GraduationCap, Building2, Shield, Plus, Search, MoreHorizontal, Loader2, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSearchParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  institution_id: string;
  status: string;
  last_login?: string;
  updated_at: string;
}

export function AdminUsers() {
  const [searchParams] = useSearchParams();
  const institutionFilter = searchParams.get('institution');
  const queryClient = useQueryClient();

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: '',
    institution: ''
  });

  const { data: users = [], isLoading: isUsersLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isSupabaseConfigured()
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['admin-institutions-min'],
    queryFn: async () => {
      const { data } = await supabase.from('institutions').select('institution_id, name');
      return data || [];
    },
    enabled: isSupabaseConfigured()
  });

  const isLoading = isUsersLoading;

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('public:profiles_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesInstitution = !institutionFilter || u.institution_id === institutionFilter || u.institution_id?.includes(institutionFilter);
    return matchesSearch && matchesInstitution;
  });

  const handleAddUser = async () => {
    setIsSubmitting(true);

    if (!isSupabaseConfigured()) {
      toast.error("Supabase not configured. This action is disabled in demo mode.");
      setIsSubmitting(false);
      return;
    }

    // IMPORTANT: To create a user in Supabase Auth from frontend, 
    // we need to use an Edge Function or a custom invitation flow.
    // For now, we'll suggest using a database trigger that allows admins 
    // to insert into a 'pending_invites' table or similar.

    toast.info("Implementation Note: User creation requires a Supabase Edge Function to securely call auth.admin.createUser().");

    // Simulate some logic for now
    setTimeout(() => {
      setIsSubmitting(false);
      setIsAddUserOpen(false);
      setNewUser({ name: '', email: '', role: '', institution: '' });
    }, 1000);
  };

  const columns = [
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (item: Profile) => {
        const variants: Record<string, 'info' | 'success' | 'warning' | 'default' | 'secondary'> = {
          student: 'info',
          faculty: 'success',
          institution: 'warning',
          admin: 'default',
          parent: 'secondary',
        };
        return <Badge variant={variants[item.role] as any || 'outline'}>{item.role}</Badge>;
      },
    },
    { key: 'institution_id', header: 'Institution ID' },
    {
      key: 'status',
      header: 'Status',
      render: (item: Profile) => (
        <Badge variant={item.status === 'active' ? 'success' : 'outline'}>
          {item.status || 'active'}
        </Badge>
      ),
    },
    {
      key: 'updated_at',
      header: 'Last Update',
      render: (item: Profile) => new Date(item.updated_at).toLocaleDateString()
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const stats = {
    students: users.filter(u => u.role === 'student').length,
    faculty: users.filter(u => u.role === 'faculty').length,
    institutions: users.filter(u => u.role === 'institution').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  return (
    <AdminLayout>
      <PageHeader
        title="User Management"
        subtitle="Manage users across all institutions"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account. This will send an invitation email.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="col-span-3"
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="col-span-3"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">Role</Label>
                    <div className="col-span-3">
                      <Select
                        value={newUser.role}
                        onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="faculty">Faculty</SelectItem>
                          <SelectItem value="institution">Institution Admin</SelectItem>
                          <SelectItem value="admin">Super Admin</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="institution" className="text-right">Institution</Label>
                    <div className="col-span-3">
                      <Select
                        value={newUser.institution}
                        onValueChange={(value) => setNewUser({ ...newUser, institution: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Institution" />
                        </SelectTrigger>
                        <SelectContent>
                          {institutions.map(inst => (
                            <SelectItem key={inst.institution_id} value={inst.institution_id}>
                              {inst.name} ({inst.institution_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddUser} disabled={!newUser.name || !newUser.email || !newUser.role || isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Students"
          value={isLoading ? "..." : stats.students.toString()}
          icon={GraduationCap}
          iconColor="text-info"
          change="Real-time count"
        />
        <StatCard
          title="Total Faculty"
          value={isLoading ? "..." : stats.faculty.toString()}
          icon={Users}
          iconColor="text-success"
          change="Real-time count"
        />
        <StatCard
          title="Institution Admins"
          value={isLoading ? "..." : stats.institutions.toString()}
          icon={Building2}
          iconColor="text-warning"
          change="Real-time count"
        />
        <StatCard
          title="Super Admins"
          value={isLoading ? "..." : stats.admins.toString()}
          icon={Shield}
          iconColor="text-admin"
          change="Full access"
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading users from Supabase...</p>
          </div>
        ) : (
          <>
            <TabsContent value="all">
              <div className="dashboard-card">
                <DataTable columns={columns as any} data={filteredUsers as any} />
              </div>
            </TabsContent>

            <TabsContent value="students">
              <div className="dashboard-card">
                <DataTable columns={columns as any} data={filteredUsers.filter(u => u.role === 'student') as any} />
              </div>
            </TabsContent>

            <TabsContent value="faculty">
              <div className="dashboard-card">
                <DataTable columns={columns as any} data={filteredUsers.filter(u => u.role === 'faculty') as any} />
              </div>
            </TabsContent>

            <TabsContent value="admins">
              <div className="dashboard-card">
                <DataTable columns={columns as any} data={filteredUsers.filter(u => u.role === 'institution' || u.role === 'admin') as any} />
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </AdminLayout>
  );
}
