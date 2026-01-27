import { useState } from 'react';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Search, Mail, Phone, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export function FacultyStudents() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const queryClient = useQueryClient();

    // 1. Fetch Faculty's Assigned Class
    const { data: assignment } = useQuery({
        queryKey: ['faculty-assignment', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await supabase
                .from('faculty_subjects')
                .select(`
                    id,
                    section,
                    classes:class_id (name)
                `)
                .eq('faculty_profile_id', user.id)
                .eq('assignment_type', 'class_teacher')
                .maybeSingle();

            if (data) {
                return {
                    class_assigned: (data.classes as any)?.name,
                    section_assigned: data.section
                };
            }
            // Fallback to staff_details if not found in faculty_subjects
            const { data: staffData } = await supabase
                .from('staff_details')
                .select('class_assigned, section_assigned')
                .eq('profile_id', user.id)
                .maybeSingle();

            return staffData;
        },
        enabled: !!user?.id
    });

    // 2. Fetch Students for that Class
    const { data: students = [], isLoading } = useQuery({
        queryKey: ['faculty-students-list', assignment?.class_assigned, assignment?.section_assigned],
        queryFn: async () => {
            if (!assignment?.class_assigned) return [];

            let query = supabase
                .from('students')
                .select('*')
                .eq('class_name', assignment.class_assigned)
                .order('name');

            // Optionally filter by section if assigned
            if (assignment.section_assigned) {
                query = query.eq('section', assignment.section_assigned);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !!assignment?.class_assigned
    });

    // 3. Real-time Subscription
    useEffect(() => {
        if (!assignment?.class_assigned) return;

        const channel = supabase
            .channel('faculty-students-list-live')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'students',
                    filter: `class_name=eq.${assignment.class_assigned}`
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['faculty-students-list'] });
                    toast('Student list updated');
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [assignment?.class_assigned, queryClient]);


    // Filter students based on search query
    const filteredStudents = students.filter((student: any) => {
        const query = searchQuery.toLowerCase();
        return (
            student.name?.toLowerCase().includes(query) ||
            student.roll_no?.toLowerCase().includes(query) ||
            student.email?.toLowerCase().includes(query)
        );
    });

    const columns = [
        { key: 'roll_no', header: 'Roll No.' },
        { key: 'name', header: 'Full Name' },
        {
            key: 'class_info',
            header: 'Class',
            render: (item: any) => `${item.class_name} - ${item.section}`
        },
        { key: 'gender', header: 'Gender' },
        {
            key: 'contact',
            header: 'Contact',
            render: (item: any) => item.parent_phone || item.phone || 'N/A'
        },
        {
            key: 'actions',
            header: 'Communication',
            render: (item: any) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => {
                            const phone = item.parent_phone || item.phone;
                            if (phone) {
                                const cleanPhone = phone.replace(/[^\d]/g, '');
                                window.open(`https://wa.me/${cleanPhone}`, '_blank');
                            } else {
                                toast.error('No contact number available');
                            }
                        }}
                        title="Message on WhatsApp"
                    >
                        <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                            const phone = item.parent_phone || item.phone;
                            if (phone) {
                                window.location.href = `tel:${phone}`;
                            } else {
                                toast.error('No contact number available');
                            }
                        }}
                        title="Call Parent"
                    >
                        <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/faculty/students/${item.id}`)}
                    >
                        View Profile
                    </Button>
                </div>
            )
        }
    ];

    return (
        <FacultyLayout>
            <PageHeader
                title="Student Directory"
                subtitle={`Viewing students for Class ${assignment?.class_assigned || '...'} ${assignment?.section_assigned ? '- ' + assignment.section_assigned : ''}`}
            />

            <div className="dashboard-card mb-6">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="input-field pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <DataTable columns={columns} data={filteredStudents} emptyMessage="No students found in your assigned class." />
                )}
            </div>
        </FacultyLayout>
    );
}
