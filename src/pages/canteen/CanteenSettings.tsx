import { useState, useEffect } from 'react';
import { CanteenLayout } from '@/layouts/CanteenLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { User, Lock, Phone, Mail, LogOut, MapPin, Briefcase, Loader2, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export function CanteenSettings() {
    const { user, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // State for personal information
    const [personalInfo, setPersonalInfo] = useState({
        phone: '',
        address: ''
    });
    const [isSavingPersonalInfo, setIsSavingPersonalInfo] = useState(false);

    // State for password change
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // Fetch user profile data
    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (data) {
                    setPersonalInfo({
                        phone: data.phone || '',
                        address: data.address || '' // Will be empty string if column doesn't exist or is null
                    });
                }
            } catch (error: any) {
                console.error('Error fetching profile:', error);
                // Don't show toast on load error to avoid annoyance, just log it
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const handlePersonalInfoChange = (field: string, value: string) => {
        setPersonalInfo(prev => ({ ...prev, [field]: value }));
    };

    const handleSavePersonalInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingPersonalInfo(true);

        try {
            // Check if address column exists by peeking the profile first? 
            // Better strategy: try to update both. Supabase ignores extra fields? No, it throws error.
            // We'll assume the schema supports it or the fetch would have failed (select *).
            // Actually select * works even if I expect a column that isn't there (it just won't be in the object).
            // But if I try to update a non-existent column, it errors.

            const updates: any = {
                phone: personalInfo.phone,
                updated_at: new Date().toISOString()
            };

            // Only include address if we think it's supported (for now we assume yes to satisfy user request)
            // If it fails, we catch it.
            updates.address = personalInfo.address;

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user!.id);

            if (error) {
                // If error is about column not found, try retry without address
                if (error.message?.includes('column "address" does not exist')) {
                    console.warn("Address column missing, updating only phone");
                    delete updates.address;
                    const { error: retryError } = await supabase
                        .from('profiles')
                        .update(updates)
                        .eq('id', user!.id);

                    if (retryError) throw retryError;
                    toast.warning("Phone updated, but Address storage is not enabled in database.");
                } else {
                    throw error;
                }
            } else {
                toast.success('Personal information updated successfully!');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setIsSavingPersonalInfo(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate passwords
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
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

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;

            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            toast.success('Password updated successfully');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update password');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    if (!user) return null;

    return (
        <CanteenLayout>
            <PageHeader
                title="Profile & Settings"
                subtitle="Manage your canteen profile and preferences"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
                        <div className="bg-primary/10 h-32 relative">
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                <div className="w-24 h-24 rounded-full bg-white p-1 border border-border">
                                    <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                                        {user.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="pt-12 pb-6 px-6 text-center">
                            <h3 className="font-bold text-xl mb-1">{user.name}</h3>
                            <p className="text-muted-foreground text-sm mb-4">Employee ID: {user.id.slice(0, 8).toUpperCase()}</p>
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-6">
                                <div className="flex items-center justify-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {user.email}
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <Briefcase className="w-4 h-4" />
                                    Canteen Manager
                                </div>
                            </div>
                            <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 border-destructive/50" onClick={logout}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
                        <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Department Info</h4>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <UtensilsCrossed className="w-4 h-4 text-primary mt-1" />
                                <div>
                                    <p className="text-sm font-medium">Department</p>
                                    <p className="text-xs text-muted-foreground">Canteen Management</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Briefcase className="w-4 h-4 text-primary mt-1" />
                                <div>
                                    <p className="text-sm font-medium">Office</p>
                                    <p className="text-xs text-muted-foreground">Canteen Building</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Forms */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
                        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            Personal Information
                        </h3>
                        <form onSubmit={handleSavePersonalInfo}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input value={user.name} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <Input value={user.email} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            className="pl-10"
                                            value={personalInfo.phone}
                                            onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                                            placeholder="+91..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Address</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            className="pl-10"
                                            value={personalInfo.address}
                                            onChange={(e) => handlePersonalInfoChange('address', e.target.value)}
                                            placeholder="Enter address"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <Button type="submit" disabled={isSavingPersonalInfo || isLoading}>
                                    {isSavingPersonalInfo ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
                        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            Security
                        </h3>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            {/* Note: In Supabase, verification of current password usually requires a separate re-auth step which is complex. 
                                For simple 'updateUser', we might skip current password check or assume session is valid. 
                                We will remove 'Current Password' field to avoid confusion if we aren't validating it strictly against DB 
                                (unless we use signInWithPassword to verify, which is good practice).
                                Let's keep it simple for now as requested, or just remove the current password field if we don't use it.
                                Most simple implementations just ask for new password if already logged in. 
                            */}
                            {/* <div className="space-y-2">
                                <Label>Current Password</Label>
                                <Input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                />
                            </div> */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>New Password</Label>
                                    <Input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        placeholder="Min 6 characters"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Confirm New Password</Label>
                                    <Input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        placeholder="Min 6 characters"
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
                                        "Update Password"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </CanteenLayout>
    );
}
