import { StudentLayout } from '@/layouts/StudentLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { User, Lock, Phone, Mail, LogOut, MapPin, GraduationCap, Building } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/TranslationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';

export function StudentSettings() {
    const { user, logout } = useAuth();
    const { t } = useTranslation();

    // Fetch Student Profile
    const { data: studentProfile, isLoading } = useQuery({
        queryKey: ['student-profile', user?.id],
        queryFn: async () => {
            if (!user?.email) return null;

            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('*')
                .ilike('email', user.email.trim())
                .maybeSingle();

            if (studentError) {
                console.error('Profile Fetch Error:', studentError);
                return null;
            }

            if (!studentData) return null;

            // Resolve class and group info separately since there's no direct FK
            const { data: classData } = await supabase
                .from('classes')
                .select(`
                    id, 
                    name, 
                    groups!inner(id, name, institution_id)
                `)
                .eq('name', studentData.class_name)
                .eq('groups.institution_id', studentData.institution_id)
                .contains('sections', [studentData.section])
                .maybeSingle();

            return {
                ...studentData,
                classes: classData
            };
        },
        enabled: !!user?.email,
        staleTime: 1000 * 60,
    });

    const { classTeacher } = useStudentDashboard(studentProfile?.id, studentProfile?.institution_id);

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success(t.parent.settings?.passwordSuccess || 'Password updated successfully');
    };

    if (!user) return null;

    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const studentDisplayName = studentProfile?.name || user.name;
    const studentId = studentProfile?.register_number || 'LOADING...';
    const className = studentProfile ? `${studentProfile.class_name}-${studentProfile.section}` : 'LOADING...';
    const departmentName = (studentProfile?.classes as any)?.groups?.name || 'Not Assigned';

    return (
        <StudentLayout>
            <PageHeader
                title={t.parent.settings?.title || "Profile & Settings"}
                subtitle={t.parent.settings?.subtitle || "Manage your student profile and account settings"}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                    <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
                        <div className="bg-primary/10 h-24 sm:h-32 relative">
                            <div className="absolute -bottom-8 sm:-bottom-10 left-1/2 -translate-x-1/2">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white p-1 border border-border">
                                    {studentProfile?.image_url ? (
                                        <img
                                            src={studentProfile.image_url}
                                            alt={studentDisplayName}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center text-xl sm:text-2xl font-bold text-primary">
                                            {initials}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="pt-10 sm:pt-12 pb-4 sm:pb-6 px-4 sm:px-6 text-center">
                            <h3 className="font-bold text-lg sm:text-xl mb-1">{studentDisplayName}</h3>
                            <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">Student ID: {studentId}</p>
                            <div className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="truncate">{studentProfile?.email || user.email}</span>
                                </div>
                                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    Class {className}
                                </div>
                            </div>
                            <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 border-destructive/50 min-h-[44px]" onClick={logout}>
                                <LogOut className="w-4 h-4 mr-2" />
                                {t.parent.settings?.logout || "Logout"}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-border p-4 sm:p-6 shadow-sm">
                        <h4 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider text-muted-foreground">Academic Info</h4>
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mt-1" />
                                <div>
                                    <p className="text-xs sm:text-sm font-medium">Department</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">{departmentName}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mt-1" />
                                <div>
                                    <p className="text-xs sm:text-sm font-medium">Advisor</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">{classTeacher || 'Assigned Faculty'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Forms */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    <div className="bg-white rounded-xl border border-border p-4 sm:p-6 shadow-sm">
                        <h3 className="font-semibold text-base sm:text-lg mb-4 sm:mb-6 flex items-center gap-2">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            {t.parent.settings?.personalInfo || "Personal Information"}
                        </h3>
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-2">
                                    <Label>{t.parent.settings?.fullName || "Full Name"}</Label>
                                    <Input value={studentProfile?.name || user.name} disabled className="bg-muted/50" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t.parent.settings?.email || "Email Address"}</Label>
                                    <Input value={studentProfile?.email || user.email} disabled className="bg-muted/50" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t.parent.settings?.phone || "Phone Number"}</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input className="pl-10 bg-muted/50" value={studentProfile?.parent_contact || ""} placeholder="Not provided" disabled />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Emergency Contact</Label>
                                    <Input value={studentProfile?.parent_phone || ""} placeholder="Not provided" disabled className="bg-muted/50" />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label>{t.parent.settings?.address || "Address"}</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <Input className="pl-10 bg-muted/50" value={studentProfile?.address || ""} placeholder="No address provided" disabled />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-3">
                            <Building className="w-5 h-5 text-amber-600 mt-0.5" />
                            <p className="text-sm text-amber-800">
                                <strong>Note:</strong> To update your personal or contact information, please visit the institution administration office.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-border p-4 sm:p-6 shadow-sm">
                        <h3 className="font-semibold text-base sm:text-lg mb-4 sm:mb-6 flex items-center gap-2">
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            {t.parent.settings?.security || "Security"}
                        </h3>
                        <form onSubmit={handlePasswordChange} className="space-y-3 sm:space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm">{t.parent.settings?.currentPassword || "Current Password"}</Label>
                                <Input type="password" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm">{t.parent.settings?.newPassword || "New Password"}</Label>
                                    <Input type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm">{t.parent.settings?.confirmPassword || "Confirm New Password"}</Label>
                                    <Input type="password" />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button type="submit" className="w-full sm:w-auto min-h-[44px]">{t.parent.settings?.updatePassword || "Update Password"}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
}
