import { useState, useEffect } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings as SettingsIcon, Building, Bell, Shield, Globe, Save, Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function InstitutionSettings() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('general');

    // Form states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [academicYear, setAcademicYear] = useState('');
    const [academicYearStart, setAcademicYearStart] = useState('');
    const [academicYearEnd, setAcademicYearEnd] = useState('');

    // Fetch institution data
    const { data: institution, isLoading } = useQuery({
        queryKey: ['institution-settings', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return null;
            const { data, error } = await supabase
                .from('institutions')
                .select('*')
                .eq('institution_id', user.institutionId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!user?.institutionId
    });

    // Sync form with fetched data
    useEffect(() => {
        if (institution) {
            setName(institution.name || '');
            setEmail(institution.email || '');
            setPhone(institution.phone || '');
            setAddress(institution.address || '');
            setAcademicYear(institution.current_academic_year || '');
            setAcademicYearStart(institution.academic_year_start || '');
            setAcademicYearEnd(institution.academic_year_end || '');
        }
    }, [institution]);

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (updatedData: any) => {
            if (!user?.institutionId) throw new Error("No institution ID");
            const { error } = await supabase
                .from('institutions')
                .update(updatedData)
                .eq('institution_id', user.institutionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['institution-settings'] });
            toast.success("Settings saved successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to save settings");
        }
    });

    const handleSave = () => {
        updateMutation.mutate({
            name,
            email,
            phone,
            address,
            current_academic_year: academicYear,
            academic_year_start: academicYearStart || null,
            academic_year_end: academicYearEnd || null
        });
    };

    const tabs = [
        { id: 'general', label: 'General Info', icon: Building },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    if (isLoading) {
        return (
            <InstitutionLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </InstitutionLayout>
        );
    }

    return (
        <InstitutionLayout>
            <PageHeader
                title="Settings"
                subtitle="Configure institutional preferences and profile information"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-2">
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === item.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'general' && (
                        <>
                            <div className="dashboard-card pt-6">
                                <h3 className="text-lg font-semibold mb-6">General Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Institution Name</Label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Institution Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Institution Code</Label>
                                        <Input
                                            value={user?.institutionId || ''}
                                            disabled
                                            className="bg-muted"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email Address</Label>
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@institution.edu"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contact Number</Label>
                                        <Input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+1 234 567 8900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Current Academic Year (Display Name)</Label>
                                        <Input
                                            value={academicYear}
                                            onChange={(e) => setAcademicYear(e.target.value)}
                                            placeholder="2025-26"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Academic Year Start Date</Label>
                                        <Input
                                            type="date"
                                            value={academicYearStart}
                                            onChange={(e) => setAcademicYearStart(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Academic Year End Date</Label>
                                        <Input
                                            type="date"
                                            value={academicYearEnd}
                                            onChange={(e) => setAcademicYearEnd(e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label>Address</Label>
                                        <Textarea
                                            className="min-h-[100px]"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Enter full address"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="dashboard-card pt-6">
                                <h3 className="text-lg font-semibold mb-6">Logo & Branding</h3>
                                <div className="flex items-center gap-8">
                                    <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                                        {institution?.logo_url ? (
                                            <img src={institution.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Building className="w-8 h-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <Button size="sm" variant="outline" disabled>Update from Admin Portal</Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Logo management is handled by the system administrator.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="dashboard-card pt-6">
                            <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive daily summaries and critical alerts via email.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">SMS Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive instant alerts for urgent matters on your phone.</p>
                                    </div>
                                    <Switch />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Leave Request Alerts</Label>
                                        <p className="text-sm text-muted-foreground">Get notified when staff submits leave requests.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setActiveTab('general')}>Discard Changes</Button>
                        <Button
                            onClick={handleSave}
                            className="flex items-center gap-2"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </div>
        </InstitutionLayout>
    );
}
