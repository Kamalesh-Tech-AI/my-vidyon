import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Lock, User, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function AdminSettings() {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({ fullName: '' });

    const { data: profile, isLoading: loading } = useQuery({
        queryKey: ['admin-profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return data;
        }
    });

    useEffect(() => {
        if (profile) {
            setFormData({ fullName: profile.full_name });
        }
    }, [profile]);

    const updateProfileMutation = useMutation({
        mutationFn: async (newName: string) => {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: newName })
                .eq('id', profile.id);
            if (error) throw error;
            return newName;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
            toast.success("Profile updated successfully");
        },
        onError: (error: any) => {
            toast.error("Failed to update profile: " + error.message);
        }
    });

    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel('admin_profile_sync')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${profile.id}`
            }, () => {
                queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, queryClient]);

    const handleUpdateProfile = () => {
        updateProfileMutation.mutate(formData.fullName);
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
                title="Admin Settings"
                subtitle="Manage your admin account preferences"
            />

            <div className="max-w-3xl space-y-8">
                <div className="dashboard-card">
                    <div className="flex items-center gap-2 mb-6 text-primary">
                        <User className="w-5 h-5" />
                        <h3 className="font-semibold text-lg">Profile Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Full Name</Label>
                            <Input
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Email Address</Label>
                            <Input value={profile?.email} readOnly className="bg-muted" />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleUpdateProfile} disabled={updateProfileMutation.isPending}>
                            {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Update Profile
                        </Button>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="flex items-center gap-2 mb-6 text-primary">
                        <Lock className="w-5 h-5" />
                        <h3 className="font-semibold text-lg">Security</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Current Password</Label>
                            <Input type="password" placeholder="••••••••" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>New Password</Label>
                                <Input type="password" />
                            </div>
                            <div className="space-y-2">
                                <Label>Confirm Password</Label>
                                <Input type="password" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button variant="outline">Change Password</Button>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="flex items-center gap-2 mb-6 text-primary">
                        <Bell className="w-5 h-5" />
                        <h3 className="font-semibold text-lg">Notifications</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Email Alerts</Label>
                                <p className="text-sm text-muted-foreground">Receive daily summaries and critical alerts via email</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Security Notifications</Label>
                                <p className="text-sm text-muted-foreground">Get notified about new logins and suspicious activity</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>System Health Reports</Label>
                                <p className="text-sm text-muted-foreground">Weekly system performance reports</p>
                            </div>
                            <Switch />
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
