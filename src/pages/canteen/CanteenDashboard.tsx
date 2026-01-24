
import { useState, useMemo, useEffect } from 'react';
import { CanteenLayout } from '@/layouts/CanteenLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import {
    ChevronRight,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Users,
    GraduationCap,
    Loader2,
    Calendar,
    Search
} from 'lucide-react';
import { useInstitution } from '@/context/InstitutionContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function CanteenDashboard() {
    const { user } = useAuth();
    const { allClasses } = useInstitution();
    const [viewMode, setViewMode] = useState<'classes' | 'sections' | 'students'>('classes');
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, string>>({});
    const [canteenEntries, setCanteenEntries] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const institutionId = user?.institutionId;
    const today = new Date().toISOString().split('T')[0];

    // Get unique classes sorted
    const classGroups = useMemo(() => {
        const unique = Array.from(new Set(allClasses.map(c => c.name)));
        // Custom sort for LKG, UKG, 1, 2...
        return unique.sort((a, b) => {
            const order = ['LKG', 'UKG'];
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b, undefined, { numeric: true });
        });
    }, [allClasses]);

    const availableSections = useMemo(() => {
        if (!selectedClass) return [];
        return allClasses
            .filter(c => c.name === selectedClass)
            .map(c => c.section)
            .sort();
    }, [selectedClass, allClasses]);

    const fetchStudents = async () => {
        if (!selectedClass || !selectedSection || !institutionId) return;
        setLoading(true);

        // Mock Data Bypass
        if (user?.id.startsWith('MOCK_')) {
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
            const mockStudents = [
                { id: 'S1', name: 'John Doe', roll_no: '101' },
                { id: 'S2', name: 'Jane Smith', roll_no: '102' },
                { id: 'S3', name: 'Alex Johnson', roll_no: '103' },
                { id: 'S4', name: 'Sarah Parker', roll_no: '104' },
                { id: 'S5', name: 'Michael Brown', roll_no: '105' },
            ];

            setStudents(mockStudents);
            setAttendance({
                'S2': 'absent',
                'S4': 'absent'
            });
            setCanteenEntries({
                'S1': 'present'
            });
            setLoading(false);
            return;
        }

        try {
            // 1. Get students for class/section
            // We need to find the correct class_id first or just filter by name/section
            const { data: studentsData, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('institution_id', institutionId)
                .eq('class_name', selectedClass)
                .eq('section', selectedSection)
                .order('name');

            if (studentError) throw studentError;

            const studentIds = studentsData.map(s => s.id);

            // 2. Get morning attendance
            const { data: attData } = await supabase
                .from('student_attendance')
                .select('student_id, status')
                .eq('institution_id', institutionId)
                .eq('attendance_date', today)
                .in('student_id', studentIds);

            const attMap: Record<string, string> = {};
            attData?.forEach(a => attMap[a.student_id] = a.status);
            setAttendance(attMap);

            // 3. Get canteen entries
            const { data: canteenData } = await supabase
                .from('canteen_attendance')
                .select('student_id, status')
                .eq('institution_id', institutionId)
                .eq('canteen_date', today)
                .in('student_id', studentIds);

            const canteenMap: Record<string, string> = {};
            canteenData?.forEach(c => canteenMap[c.student_id] = c.status);
            setCanteenEntries(canteenMap);

            setStudents(studentsData);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'students') {
            fetchStudents();
        }
    }, [viewMode, selectedClass, selectedSection]);

    const toggleCanteenEntry = async (studentId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'present' ? 'absent' : 'present';

        if (user?.id.startsWith('MOCK_')) {
            setCanteenEntries(prev => ({ ...prev, [studentId]: newStatus }));
            toast.success(newStatus === 'present' ? 'Permitted (Mock)' : 'Access Revoked (Mock)');
            return;
        }

        try {
            const { error } = await supabase
                .from('canteen_attendance')
                .upsert({
                    student_id: studentId,
                    institution_id: institutionId!,
                    canteen_date: today,
                    status: newStatus
                }, { onConflict: 'student_id, canteen_date' });

            if (error) throw error;

            setCanteenEntries(prev => ({ ...prev, [studentId]: newStatus }));
            toast.success(newStatus === 'present' ? 'Permitted' : 'Access Revoked');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleClassClick = (cls: string) => {
        setSelectedClass(cls);
        setViewMode('sections');
    };

    const handleSectionClick = (sec: string) => {
        setSelectedSection(sec);
        setViewMode('students');
    };

    const goBack = () => {
        if (viewMode === 'students') setViewMode('sections');
        else if (viewMode === 'sections') setViewMode('classes');
    };

    const filteredStudents = useMemo(() => {
        return students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.roll_no?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    return (
        <CanteenLayout>
            <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Canteen Management</h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                {viewMode !== 'classes' && (
                    <Button variant="ghost" onClick={goBack} className="self-start sm:self-center gap-2 h-10 md:h-12 px-4 md:px-6 rounded-xl border border-border bg-card hover:bg-muted transition-all shadow-sm">
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="text-sm md:text-base">Back</span>
                    </Button>
                )}
            </div>

            {viewMode === 'classes' && (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    {classGroups.map((cls) => (
                        <Card
                            key={cls}
                            className="p-4 md:p-6 cursor-pointer hover:shadow-xl hover:border-primary/50 hover:scale-102 transition-all bg-card/50 backdrop-blur-sm border-2 flex flex-col items-center justify-center text-center gap-3 md:gap-4 group"
                            onClick={() => handleClassClick(cls)}
                        >
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                <GraduationCap className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg md:text-xl font-bold">{cls}</h3>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-semibold opacity-60">Grade</p>
                            </div>
                            <div className="mt-1 md:mt-2 w-full pt-3 md:pt-4 border-t border-border/50 flex items-center justify-center text-primary font-bold text-[10px] md:text-xs gap-1 group-hover:translate-x-1 transition-transform">
                                VIEW SECTIONS <ChevronRight className="w-3 h-3" />
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {viewMode === 'sections' && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="text-center mb-8">
                        <Badge variant="outline" className="mb-2 px-4 py-1 text-sm font-bold uppercase tracking-wider">{selectedClass}</Badge>
                        <h2 className="text-3xl font-bold">Select Section</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        {availableSections.map((sec) => (
                            <Card
                                key={sec}
                                className="p-4 md:p-8 cursor-pointer hover:shadow-lg hover:border-primary border-2 transition-all bg-card flex items-center justify-between group"
                                onClick={() => handleSectionClick(sec)}
                            >
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-muted flex items-center justify-center text-base md:text-lg font-black group-hover:bg-primary group-hover:text-white transition-colors">
                                        {sec}
                                    </div>
                                    <span className="text-lg md:text-xl font-bold">Section {sec}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === 'students' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">
                    <div className="bg-card border-2 rounded-2xl p-4 md:p-6 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none hidden md:block">
                            <Users className="w-32 h-32" />
                        </div>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                    <Users className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black">{selectedClass} - {selectedSection}</h2>
                                    <p className="text-xs md:text-sm text-muted-foreground">Class Strength: {students.length} Students</p>
                                </div>
                            </div>
                            <div className="relative w-full lg:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or roll no..."
                                    className="pl-10 h-10 md:h-11 rounded-xl w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                            <p className="text-muted-foreground font-medium">Fetching student records...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStudents.map((student) => {
                                const isAbsentInMorning = attendance[student.id] === 'absent';
                                const isPermittedAction = canteenEntries[student.id] === 'present';

                                return (
                                    <Card
                                        key={student.id}
                                        className={cn(
                                            "p-5 transition-all border-2 relative overflow-hidden group",
                                            isAbsentInMorning ? "opacity-50 grayscale bg-muted/30" : "hover:shadow-md hover:border-primary/30 bg-card",
                                            isPermittedAction && !isAbsentInMorning && "border-green-500/50 bg-green-50/10"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-muted border-2 border-transparent overflow-hidden group-hover:border-primary/20 transition-all">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`}
                                                        alt={student.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-base leading-tight">{student.name}</h3>
                                                    <p className="text-xs text-muted-foreground font-medium">Roll: {student.roll_no || student.id.slice(0, 4)}</p>
                                                </div>
                                            </div>
                                            <Badge
                                                variant={isAbsentInMorning ? "destructive" : "success"}
                                                className="uppercase text-[10px] font-black"
                                            >
                                                {isAbsentInMorning ? "Morning Absent" : "Morning Present"}
                                            </Badge>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                className={cn(
                                                    "flex-1 gap-2 rounded-xl h-11 font-bold transition-all shadow-sm",
                                                    isPermittedAction ? "bg-green-600 hover:bg-green-700 text-white" : "bg-muted text-muted-foreground hover:bg-green-50 hover:text-green-600"
                                                )}
                                                onClick={() => toggleCanteenEntry(student.id, canteenEntries[student.id] || 'absent')}
                                                disabled={isAbsentInMorning}
                                            >
                                                <CheckCircle2 className="w-5 h-5" />
                                                {isPermittedAction ? "PERMITTED" : "PERMIT"}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-12 h-11 p-0 rounded-xl transition-all border-2",
                                                    !isPermittedAction ? "bg-red-50 text-red-600 border-red-200" : "text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                )}
                                                onClick={() => toggleCanteenEntry(student.id, canteenEntries[student.id] || 'absent')}
                                                disabled={isAbsentInMorning || !isPermittedAction}
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </Button>
                                        </div>

                                        {isAbsentInMorning && (
                                            <div className="absolute inset-0 bg-background/5 backdrop-blur-[1px] cursor-not-allowed flex flex-col items-center justify-center z-10 gap-3">
                                                <Badge variant="destructive" className="px-4 py-2 scale-110 shadow-lg">NOT ELIGIBLE</Badge>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="rounded-full w-10 h-10 p-0 shadow-lg hover:scale-110 transition-transform cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReport(student);
                                                    }}
                                                    title="Report Student (Found in canteen while absent)"
                                                >
                                                    <XCircle className="w-6 h-6" />
                                                </Button>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}

                            {filteredStudents.length === 0 && (
                                <div className="col-span-full py-20 text-center space-y-4">
                                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-40">
                                        <Search className="w-10 h-10" />
                                    </div>
                                    <p className="text-muted-foreground font-bold">No students matched your search.</p>
                                    <Button variant="link" onClick={() => setSearchTerm('')}>Clear search</Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </CanteenLayout>
    );
}
