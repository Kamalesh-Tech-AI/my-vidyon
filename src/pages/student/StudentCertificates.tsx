import { useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Calendar, User, Loader2, Award } from 'lucide-react';
import { toast } from 'sonner';

interface Certificate {
    id: string;
    category: string;
    course_description: string;
    file_url: string;
    file_name: string;
    file_size: number;
    faculty_name: string;
    class_name: string;
    section: string;
    uploaded_at: string;
    status: string;
}

export function StudentCertificates() {
    const { user } = useAuth();

    // Fetch certificates for the logged-in student
    const { data: certificates = [], isLoading, refetch } = useQuery({
        queryKey: ['student-certificates', user?.email],
        queryFn: async () => {
            if (!user?.email) {
                console.log('[CERTIFICATES] No user email');
                return [];
            }

            console.log('[CERTIFICATES] Fetching certificates for:', user.email);

            const { data, error } = await supabase
                .from('certificates')
                .select('*')
                .eq('student_email', user.email)
                .eq('status', 'active')
                .order('uploaded_at', { ascending: false });

            if (error) {
                console.error('[CERTIFICATES] Error fetching certificates:', error);
                throw error;
            }

            console.log('[CERTIFICATES] Fetched certificates:', data?.length || 0);
            return data || [];
        },
        enabled: !!user?.email,
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    // Subscribe to real-time updates
    useEffect(() => {
        if (!user?.email) return;

        console.log('[CERTIFICATES] Setting up real-time subscription');

        const channel = supabase
            .channel('student-certificates-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'certificates',
                    filter: `student_email=eq.${user.email}`
                },
                (payload) => {
                    console.log('[CERTIFICATES] Real-time update received:', payload);
                    refetch();

                    if (payload.eventType === 'INSERT') {
                        toast.success('New certificate added!');
                    }
                }
            )
            .subscribe();

        return () => {
            console.log('[CERTIFICATES] Cleaning up real-time subscription');
            supabase.removeChannel(channel);
        };
    }, [user?.email, refetch]);

    const handleDownload = async (certificate: Certificate) => {
        try {
            console.log('[CERTIFICATES] Downloading:', certificate.file_name);

            // Open the file URL in a new tab
            window.open(certificate.file_url, '_blank');

            toast.success('Download started!');
        } catch (error) {
            console.error('[CERTIFICATES] Download error:', error);
            toast.error('Failed to download certificate');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    if (isLoading) {
        return (
            <StudentLayout>
                <PageHeader title="My Certificates" subtitle="View and download your certificates" />
                <div className="flex justify-center p-10">
                    <Loader2 className="animate-spin w-8 h-8" />
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            <PageHeader
                title="My Certificates"
                subtitle="View and download your certificates"
            />

            <div className="p-4 space-y-4">
                {certificates.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                            <Award className="w-16 h-16 mb-4 text-muted-foreground" />
                            <h2 className="text-xl font-semibold mb-2">No Certificates Yet</h2>
                            <p className="text-muted-foreground">
                                Your certificates will appear here once your teachers upload them.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {certificates.map((cert) => (
                            <Card key={cert.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-primary" />
                                            <CardTitle className="text-lg line-clamp-1">
                                                {cert.category}
                                            </CardTitle>
                                        </div>
                                        <Badge className="bg-success/10 text-success border-0">
                                            Active
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Course Description */}
                                    {cert.course_description && (
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                                Course
                                            </p>
                                            <p className="text-sm line-clamp-2">
                                                {cert.course_description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Faculty Name */}
                                    {cert.faculty_name && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Issued by:</span>
                                            <span className="font-medium">{cert.faculty_name}</span>
                                        </div>
                                    )}

                                    {/* Upload Date */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">
                                            {formatDate(cert.uploaded_at)}
                                        </span>
                                    </div>

                                    {/* File Info */}
                                    <div className="pt-2 border-t">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                            <span className="line-clamp-1">{cert.file_name}</span>
                                            <span>{formatFileSize(cert.file_size)}</span>
                                        </div>

                                        <Button
                                            onClick={() => handleDownload(cert)}
                                            className="w-full"
                                            size="sm"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download Certificate
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Summary Stats */}
                {certificates.length > 0 && (
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-primary" />
                                    <span className="font-semibold">
                                        Total Certificates: {certificates.length}
                                    </span>
                                </div>
                                <Badge className="bg-primary text-primary-foreground">
                                    All Active
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </StudentLayout>
    );
}
