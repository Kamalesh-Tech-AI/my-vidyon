import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Clock } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Badge } from '@/components/common/Badge';
import { useQuery } from '@tanstack/react-query';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

interface TimetableSlot {
    id: string;
    day_of_week: string;
    period_index: number;
    start_time: string;
    end_time: string;
    subject_id?: string;
    faculty_id?: string;
    class_id?: string;
    section?: string;
    room_number?: string;
    is_break?: boolean;
    break_name?: string;
    subjects?: { name: string };
    profiles?: { full_name: string };
}


export function StudentTimetable() {
    const { user } = useAuth();
    const [studentInfo, setStudentInfo] = useState<{ class_name: string; section: string; class_id: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch student's class and section info
    useEffect(() => {
        const fetchStudentInfo = async () => {
            if (!user?.email) {
                console.log('[STUDENT] No user email available');
                return;
            }

            console.log('[STUDENT] Fetching student info for:', user.email);
            setError(null);

            try {
                // Try to get student's class and section from students table
                const { data: studentData, error: studentError } = await supabase
                    .from('students')
                    .select('class_name, section')
                    .eq('email', user.email)
                    .maybeSingle();

                if (studentError) {
                    console.error('[STUDENT] Error fetching student data:', studentError);
                    console.error('[STUDENT] Error details:', {
                        message: studentError.message,
                        details: studentError.details,
                        hint: studentError.hint,
                        code: studentError.code
                    });

                    // If table doesn't exist or RLS blocks, show helpful error
                    if (studentError.code === 'PGRST116' || studentError.code === '42P01') {
                        setError('Student data not found. Please contact your institution admin.');
                    } else {
                        setError(`Database error: ${studentError.message}`);
                    }
                    return;
                }

                if (!studentData) {
                    console.log('[STUDENT] No student data found in students table');
                    setError('Your student profile is not set up yet. Please contact your institution admin.');
                    return;
                }

                console.log('[STUDENT] Student data:', studentData);

                // Validate data
                if (!studentData.class_name || !studentData.section) {
                    console.error('[STUDENT] Incomplete student data:', studentData);
                    setError('Your class or section is not set. Please contact your institution admin.');
                    return;
                }

                // Get class ID
                const { data: classData, error: classError } = await supabase
                    .from('classes')
                    .select('id')
                    .eq('name', studentData.class_name)
                    .limit(1)
                    .maybeSingle();

                if (classError) {
                    console.error('[STUDENT] Error fetching class data:', classError);
                    setError(`Could not find class "${studentData.class_name}". Please contact your institution admin.`);
                    return;
                }

                if (!classData) {
                    console.log('[STUDENT] No class found for:', studentData.class_name);
                    setError(`Class "${studentData.class_name}" not found in the system.`);
                    return;
                }

                console.log('[STUDENT] Class ID:', classData.id);

                setStudentInfo({
                    class_name: studentData.class_name,
                    section: studentData.section,
                    class_id: classData.id
                });
            } catch (err) {
                console.error('[STUDENT] Unexpected error:', err);
                setError('An unexpected error occurred. Please try again later.');
            }
        };

        fetchStudentInfo();
    }, [user?.email]);

    // Fetch timetable slots for student's class and section
    const { data: timetableSlots = [], isLoading, refetch } = useQuery({
        queryKey: ['student-timetable', studentInfo?.class_id, studentInfo?.section],
        queryFn: async () => {
            if (!studentInfo?.class_id || !studentInfo?.section) {
                console.log('[STUDENT] No student info available yet');
                return [];
            }

            console.log('[STUDENT] Fetching timetable for class:', studentInfo.class_name, 'Section:', studentInfo.section);

            const { data, error } = await supabase
                .from('timetable_slots')
                .select(`
                    *,
                    subjects:subject_id (name),
                    profiles:faculty_id (full_name)
                `)
                .eq('class_id', studentInfo.class_id)
                .eq('section', studentInfo.section)
                .order('day_of_week')
                .order('period_index');

            if (error) {
                console.error('[STUDENT] Error fetching timetable:', error);
                throw error;
            }

            console.log('[STUDENT] Fetched timetable slots:', data);
            console.log('[STUDENT] Number of slots:', data?.length || 0);

            return data || [];
        },
        enabled: !!studentInfo?.class_id && !!studentInfo?.section,
        refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    });

    // Subscribe to real-time changes
    useEffect(() => {
        if (!studentInfo?.class_id || !studentInfo?.section) return;

        console.log('[STUDENT] Setting up real-time subscription for class:', studentInfo.class_name, 'Section:', studentInfo.section);

        const channel = supabase
            .channel('student-timetable-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'timetable_slots',
                    filter: `class_id=eq.${studentInfo.class_id}`
                },
                (payload) => {
                    console.log('[STUDENT] Real-time update received:', payload);
                    // Refetch timetable when changes occur
                    refetch();
                }
            )
            .subscribe();

        return () => {
            console.log('[STUDENT] Cleaning up real-time subscription');
            supabase.removeChannel(channel);
        };
    }, [studentInfo?.class_id, studentInfo?.section, refetch]);

    // Convert array to object for easier lookup
    const timetableData: { [key: string]: TimetableSlot } = {};
    timetableSlots.forEach((slot: any) => {
        const key = `${slot.day_of_week}-${slot.period_index}`;
        timetableData[key] = slot;
    });

    // Show error state
    if (error) {
        return (
            <StudentLayout>
                <PageHeader title="My Timetable" subtitle="View your weekly class schedule" />
                <Card className="m-4">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <Calendar className="w-12 h-12 mb-4 text-destructive" />
                        <h2 className="text-xl font-semibold mb-2 text-destructive">Error Loading Timetable</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <p className="text-sm text-muted-foreground mt-4">
                            If this problem persists, please contact your institution administrator.
                        </p>
                    </CardContent>
                </Card>
            </StudentLayout>
        );
    }

    if (isLoading || !studentInfo) {
        return (
            <StudentLayout>
                <PageHeader title="My Timetable" subtitle="View your weekly class schedule" />
                <div className="flex justify-center p-10">
                    <Loader2 className="animate-spin w-8 h-8" />
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            <PageHeader
                title="My Timetable"
                subtitle={`${studentInfo.class_name} - Section ${studentInfo.section}`}
            />

            <Card className="m-4">
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1000px]">
                        <thead>
                            <tr>
                                <th className="border p-4 bg-muted/50 w-32 font-bold text-left sticky left-0">Day</th>
                                {PERIODS.map((p) => (
                                    <th key={p} className="border p-3 bg-muted/50 text-sm font-medium text-left">
                                        Period {p}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map((day) => (
                                <tr key={day}>
                                    <td className="border p-4 font-semibold bg-muted/10 sticky left-0">{day}</td>
                                    {PERIODS.map((period) => {
                                        const key = `${day}-${period}`;
                                        const slot = timetableData[key];
                                        return (
                                            <td
                                                key={period}
                                                className="border p-2 min-w-[140px] h-[100px] align-top"
                                            >
                                                {slot?.subject_id ? (
                                                    <div className="space-y-1 p-1">
                                                        <Badge variant="default" className="w-full justify-start line-clamp-1 bg-primary/10 text-primary border-0 mb-1">
                                                            {slot.subjects?.name || 'Subject'}
                                                        </Badge>
                                                        {slot.profiles?.full_name && (
                                                            <div className="text-xs font-medium pl-1">
                                                                {slot.profiles.full_name}
                                                            </div>
                                                        )}
                                                        {slot.room_number && (
                                                            <div className="text-[10px] text-muted-foreground pl-1">
                                                                Room: {slot.room_number}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-1">
                                                            <Clock className="w-3 h-3" />
                                                            {slot.start_time} - {slot.end_time}
                                                        </div>
                                                    </div>
                                                ) : slot?.is_break ? (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Badge className="text-xs bg-secondary text-secondary-foreground">
                                                            {slot.break_name || 'Break'}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 text-xs">
                                                        -
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {timetableSlots.length === 0 && (
                <Card className="m-4">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                        <Calendar className="w-12 h-12 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No Timetable Published</h2>
                        <p>Your class teacher hasn't published the timetable yet.</p>
                        <p className="text-sm mt-2">Class: {studentInfo.class_name} - Section {studentInfo.section}</p>
                    </CardContent>
                </Card>
            )}
        </StudentLayout>
    );
}
