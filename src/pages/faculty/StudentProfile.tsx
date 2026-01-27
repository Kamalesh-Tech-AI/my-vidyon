import { useParams, useNavigate } from 'react-router-dom';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Award, TrendingUp, BookOpen, MessageCircle, User, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/common/Badge';

export function StudentProfile() {
    const { studentId } = useParams();
    const navigate = useNavigate();

    // 1. Fetch Student Data
    const { data: student, isLoading: isStudentLoading, error: studentError } = useQuery({
        queryKey: ['student-profile', studentId],
        queryFn: async () => {
            if (!studentId) return null;
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('id', studentId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!studentId
    });

    // 2. Fetch Attendance Stats
    const { data: attendanceStats } = useQuery({
        queryKey: ['student-attendance-stats', studentId],
        queryFn: async () => {
            if (!studentId) return null;

            const { data: allRecords, error: allErr } = await supabase
                .from('student_attendance')
                .select('status')
                .eq('student_id', studentId);

            if (allErr) throw allErr;
            if (!allRecords || allRecords.length === 0) return { percentage: 'N/A', total: 0 };

            const presentCount = allRecords.filter(r => r.status === 'present').length;
            const percentage = ((presentCount / allRecords.length) * 100).toFixed(1) + '%';

            return {
                percentage,
                total: allRecords.length,
                present: presentCount
            };
        },
        enabled: !!studentId
    });

    if (isStudentLoading) {
        return (
            <FacultyLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </FacultyLayout>
        );
    }

    if (studentError || !student) {
        return (
            <FacultyLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <h2 className="text-2xl font-bold mb-4">Student Not Found</h2>
                    <Button onClick={() => navigate('/faculty/students')}>
                        Back to Students
                    </Button>
                </div>
            </FacultyLayout>
        );
    }

    const handleWhatsApp = () => {
        const phone = student.parent_phone || student.phone;
        if (phone) {
            const cleanPhone = phone.replace(/[^\d]/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        } else {
            toast.error('No contact number available');
        }
    };

    const handleCall = () => {
        const phone = student.parent_phone || student.phone;
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            toast.error('No contact number available');
        }
    };

    return (
        <FacultyLayout>
            <PageHeader
                title="Student Profile"
                subtitle="View detailed information about the student"
                actions={
                    <Button variant="outline" onClick={() => navigate('/faculty/students')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Students
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="dashboard-card overflow-hidden">
                        <div className="flex flex-col items-center pt-4">
                            <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-primary/10 shadow-lg bg-white flex items-center justify-center mb-4">
                                {student.image_url ? (
                                    <img
                                        src={student.image_url}
                                        alt={student.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as any).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(student.name) + '&background=random';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                                        {student.name.split(' ').map((n: string) => n[0]).join('')}
                                    </div>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold mt-4">{student.name}</h2>
                            <p className="text-muted-foreground">Roll No: {student.roll_no || student.register_number || 'N/A'}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="info" className="px-3 py-1">
                                    {student.class_name} - {student.section}
                                </Badge>
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="p-2 bg-white rounded-md shadow-sm">
                                    <User className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Gender</span>
                                    <span className="text-sm font-medium capitalize">{student.gender || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="p-2 bg-white rounded-md shadow-sm">
                                    <Calendar className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Date of Birth</span>
                                    <span className="text-sm font-medium">{student.dob || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="p-2 bg-white rounded-md shadow-sm">
                                    <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Address</span>
                                    <span className="text-sm font-medium line-clamp-2">{student.address || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-3">
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={handleWhatsApp}
                            >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                                onClick={handleCall}
                            >
                                <Phone className="w-4 h-4 mr-2" />
                                Call
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Academic Overview */}
                    <div className="dashboard-card">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            Academic Overview
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="premium-stat-card bg-primary/5 border border-primary/10 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-sm">Attendance</span>
                                </div>
                                <p className="text-3xl font-bold">{attendanceStats?.percentage || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {attendanceStats?.present || 0} / {attendanceStats?.total || 0} working days
                                </p>
                            </div>
                            <div className="premium-stat-card bg-success/5 border border-success/10 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2 text-success font-semibold">
                                    <Award className="w-4 h-4" />
                                    <span className="text-sm">Academic Performance</span>
                                </div>
                                <p className="text-3xl font-bold">Grade A</p>
                                <p className="text-xs text-muted-foreground mt-1">Based on last term exams</p>
                            </div>
                            <div className="premium-stat-card bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2 text-blue-600 font-semibold">
                                    <BookOpen className="w-4 h-4" />
                                    <span className="text-sm">Enrolled Class</span>
                                </div>
                                <p className="text-2xl font-bold">{student.class_name}</p>
                                <p className="text-xs text-muted-foreground mt-1">Section {student.section}</p>
                            </div>
                        </div>
                    </div>

                    {/* Personal & Parent Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="dashboard-card">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Parent Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parent/Guardian Name</label>
                                    <p className="font-medium text-lg">{student.parent_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Number</label>
                                    <p className="font-medium text-lg text-primary">{student.parent_phone || student.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                                    <p className="font-medium break-all">{student.parent_email || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                School Records
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registration Number</label>
                                    <p className="font-medium text-lg capitalize">{student.register_number || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blood Group</label>
                                    <p className="font-medium text-lg text-red-600 uppercase">{student.blood_group || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">House Group</label>
                                    <p className="font-medium">N/A</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FacultyLayout>
    );
}
