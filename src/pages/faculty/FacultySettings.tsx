import { useState } from 'react';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { User, Lock, Phone, Mail, LogOut, MapPin, Briefcase, GraduationCap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/TranslationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

export function FacultySettings() {
    const { user, logout } = useAuth();
    const { t } = useTranslation();

    // Fetch Faculty Profile and Staff Details
    const { data: facultyData, isLoading } = useQuery({
        queryKey: ['faculty-profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            // Fetch from profiles table
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                console.error('Profile fetch error:', profileError);
                return null;
            }

            // Fetch from staff_details table
            const { data: staffDetails, error: staffError } = await supabase
                .from('staff_details')
                .select('*')
                .eq('profile_id', user.id)
                .maybeSingle();

            if (staffError) {
                console.error('Staff details fetch error:', staffError);
            }

            return {
                profile,
                staffDetails
            };
        },
        enabled: !!user?.id
    });

    // State for personal information
    const [personalInfo, setPersonalInfo] = useState({
        phone: facultyData?.profile?.phone || '',
        address: facultyData?.profile?.address || ''
    });
    const [isSavingPersonalInfo, setIsSavingPersonalInfo] = useState(false);

    // State for password change
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const handlePersonalInfoChange = (field: string, value: string) => {
        setPersonalInfo(prev => ({ ...prev, [field]: value }));
    };

    const handleSavePersonalInfo = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingPersonalInfo(true);

        // Simulate API call
        setTimeout(() => {
            setIsSavingPersonalInfo(false);
            toast.success('Personal information updated successfully!');
        }, 1000);
    };

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate passwords
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            toast.error('Please fill in all password fields');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        setIsUpdatingPassword(true);

        // Simulate API call
        setTimeout(() => {
            setIsUpdatingPassword(false);
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            toast.success(t.parent.settings?.passwordSuccess || 'Password updated successfully');
        }, 1000);
    };

    if (!user) return null;

    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const employeeId = facultyData?.staffDetails?.staff_id || 'Loading...';
    const department = facultyData?.staffDetails?.department || 'Not Assigned';
    const designation = facultyData?.staffDetails?.role || 'Faculty';
    const profileImageUrl = facultyData?.profile?.profile_image_url;

    return (
        <FacultyLayout>
            <PageHeader
                title={t.parent.settings?.title || "Profile & Settings"}
                subtitle={t.parent.settings?.subtitle || "Manage your faculty profile and teaching preferences"}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
                        <div className="bg-primary/10 h-32 relative">
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                <div className="w-24 h-24 rounded-full bg-white p-1 border border-border">
                                    {profileImageUrl ? (
                                        <img
                                            src={profileImageUrl}
                                            alt={user.name}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                                            {initials}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="pt-12 pb-6 px-6 text-center">
                            {isLoading ? (
                                <>
                                    <Skeleton className="h-6 w-32 mx-auto mb-2" />
                                    <Skeleton className="h-4 w-40 mx-auto mb-4" />
                                    <Skeleton className="h-4 w-48 mx-auto mb-2" />
                                    <Skeleton className="h-4 w-36 mx-auto mb-6" />
                                </>
                            ) : (
                                <>
                                    <h3 className="font-bold text-xl mb-1">{user.name}</h3>
                                    <p className="text-muted-foreground text-sm mb-4">Employee ID: {employeeId}</p>
                                    <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <Mail className="w-4 h-4" />
                                            {user.email}
                                        </div>
                                        <div className="flex items-center justify-center gap-2">
                                            <Briefcase className="w-4 h-4" />
                                            {designation}
                                        </div>
                                    </div>
                                </>
                            )}
                            <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 border-destructive/50" onClick={logout}>
                                <LogOut className="w-4 h-4 mr-2" />
                                {t.parent.settings?.logout || "Logout"}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
                        <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Department Info</h4>
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <GraduationCap className="w-4 h-4 text-primary mt-1" />
                                    <div>
                                        <p className="text-sm font-medium">Department</p>
                                        <p className="text-xs text-muted-foreground">{department}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Briefcase className="w-4 h-4 text-primary mt-1" />
                                    <div>
                                        <p className="text-sm font-medium">Designation</p>
                                        <p className="text-xs text-muted-foreground">{designation}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings Forms */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
                        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            {t.parent.settings?.personalInfo || "Personal Information"}
                        </h3>
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <form onSubmit={handleSavePersonalInfo}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t.parent.settings?.fullName || "Full Name"}</Label>
                                        <Input value={facultyData?.profile?.full_name || user.name} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t.parent.settings?.email || "Email Address"}</Label>
                                        <Input value={facultyData?.profile?.email || user.email} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t.parent.settings?.phone || "Phone Number"}</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                className="pl-10"
                                                value={facultyData?.profile?.phone || ''}
                                                placeholder="Not provided"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>{t.parent.settings?.address || "Address"}</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                className="pl-10"
                                                value={facultyData?.profile?.address || ''}
                                                placeholder="No address provided"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <Button type="submit" disabled>
                                        {t.parent.settings?.saveChanges || "Save Changes"}
                                    </Button>
                                </div>
                            </form>
                        )}

                    </div>

                    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
                        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            {t.parent.settings?.security || "Security"}
                        </h3>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t.parent.settings?.currentPassword || "Current Password"}</Label>
                                <Input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t.parent.settings?.newPassword || "New Password"}</Label>
                                    <Input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t.parent.settings?.confirmPassword || "Confirm New Password"}</Label>
                                    <Input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button type="submit" disabled={isUpdatingPassword}>
                                    {isUpdatingPassword ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        t.parent.settings?.updatePassword || "Update Password"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </FacultyLayout>
    );
}
