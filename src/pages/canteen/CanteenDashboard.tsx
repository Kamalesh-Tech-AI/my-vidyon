
import { useState, useMemo, useEffect } from 'react';
import { CanteenLayout } from '@/layouts/CanteenLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/common/Badge';
import {
    CheckCircle2,
    XCircle,
    Loader2,
    Calendar,
    Search,
    Users,
    GraduationCap,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';
import { useInstitution } from '@/context/InstitutionContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CanteenDashboard() {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'classes' | 'sections' | 'students'>('classes');
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, string>>({});
    const [canteenEntries, setCanteenEntries] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [dbClasses, setDbClasses] = useState<string[]>([]);
    const [dbSections, setDbSections] = useState<string[]>([]);

    const institutionId = user?.institutionId;
    const today = new Date().toISOString().split('T')[0];

    // Fetch unique classes on mount
    useEffect(() => {
        const fetchClasses = async () => {
            if (!institutionId) return;
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('class_name')
                    .eq('institution_id', institutionId)
                    .not('class_name', 'is', null);

                if (error) throw error;

                const uniqueClasses = Array.from(new Set(data.map(s => s.class_name))).sort((a, b) => {
                    const order = ['LKG', 'UKG'];
                    const indexA = order.indexOf(a);
                    const indexB = order.indexOf(b);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.localeCompare(b, undefined, { numeric: true });
                });
                setDbClasses(uniqueClasses);
            } catch (err: any) {
                console.error('Error fetching classes:', err);
            }
        };
        fetchClasses();
    }, [institutionId]);

    // Fetch unique sections when class is selected
    useEffect(() => {
        const fetchSections = async () => {
            if (!institutionId || !selectedClass) return;
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('section')
                    .eq('institution_id', institutionId)
                    .eq('class_name', selectedClass)
                    .not('section', 'is', null);

                if (error) throw error;

                const uniqueSections = Array.from(new Set(data.map(s => s.section))).sort();
                setDbSections(uniqueSections);
            } catch (err: any) {
                console.error('Error fetching sections:', err);
            }
        };
        fetchSections();
    }, [institutionId, selectedClass]);

    const fetchStudents = async () => {
        if (!selectedClass || !selectedSection || !institutionId) return;
        setLoading(true);

        try {
            const { data: studentsData, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('institution_id', institutionId)
                .eq('class_name', selectedClass)
                .eq('section', selectedSection)
                .eq('is_active', true)
                .order('name');

            if (studentError) throw studentError;

            const studentIds = studentsData.map(s => s.id);

            const { data: attData } = await supabase
                .from('student_attendance')
                .select('student_id, status')
                .eq('institution_id', institutionId)
                .eq('attendance_date', today)
                .in('student_id', studentIds);

            const attMap: Record<string, string> = {};
            attData?.forEach(a => attMap[a.student_id] = a.status);
            setAttendance(attMap);

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

    const handleStudentClick = async (studentId: string, morningStatus: string) => {
        const newStatus = morningStatus === 'present'
            ? (canteenEntries[studentId] === 'present' ? 'absent' : 'present')
            : 'absent';

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
            toast.success(newStatus === 'present' ? 'Permitted in canteen' : 'Marked absent in canteen');
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
            s.register_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    const stats = useMemo(() => {
        const morningPresent = filteredStudents.filter(s => (attendance[s.id] || 'absent') === 'present').length;
        const morningAbsent = filteredStudents.filter(s => (attendance[s.id] || 'absent') === 'absent').length;
        const canteenPermitted = filteredStudents.filter(s => canteenEntries[s.id] === 'present').length;
        return { morningPresent, morningAbsent, canteenPermitted, total: filteredStudents.length };
    }, [filteredStudents, attendance, canteenEntries]);

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
                    {dbClasses.map((cls) => (
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
                        {dbSections.map((sec) => (
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
                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4 border-2">
                            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Students</div>
                        </Card>
                        <Card className="p-4 border-2 border-green-200 bg-green-50/50">
                            <div className="text-2xl font-bold text-green-600">{stats.morningPresent}</div>
                            <div className="text-xs text-green-700 uppercase tracking-wider mt-1">Morning Present</div>
                        </Card>
                        <Card className="p-4 border-2 border-red-200 bg-red-50/50">
                            <div className="text-2xl font-bold text-red-600">{stats.morningAbsent}</div>
                            <div className="text-xs text-red-700 uppercase tracking-wider mt-1">Morning Absent</div>
                        </Card>
                        <Card className="p-4 border-2 border-blue-200 bg-blue-50/50">
                            <div className="text-2xl font-bold text-blue-600">{stats.canteenPermitted}</div>
                            <div className="text-xs text-blue-700 uppercase tracking-wider mt-1">Canteen Permitted</div>
                        </Card>
                    </div>

                    {/* Class/Section Header + Search */}
                    <div className="bg-card border-2 rounded-2xl p-4 md:p-6 shadow-sm">
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

                    {/* Students Grid */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                            <p className="text-muted-foreground font-medium">Loading students...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredStudents.map((student) => {
                                    const morningStatus = attendance[student.id] || 'absent';
                                    const isMorningPresent = morningStatus === 'present';
                                    const isCanteenPermitted = canteenEntries[student.id] === 'present';

                                    return (
                                        <Card
                                            key={student.id}
                                            className={cn(
                                                "p-4 transition-all border-2 cursor-pointer hover:shadow-lg",
                                                isMorningPresent
                                                    ? isCanteenPermitted
                                                        ? "border-green-300 bg-green-50/30 hover:border-green-400"
                                                        : "border-border hover:border-primary/30"
                                                    : "border-red-200 bg-red-50/20 hover:border-red-300"
                                            )}
                                            onClick={() => handleStudentClick(student.id, morningStatus)}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex-shrink-0 flex items-center justify-center">
                                                        <span className="text-xs font-bold text-primary uppercase">
                                                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-bold text-sm leading-tight truncate">{student.name}</h3>
                                                        <p className="text-xs text-muted-foreground font-medium">
                                                            Reg: {student.register_number || student.id.slice(0, 4)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                                <Badge
                                                    variant={isMorningPresent ? "success" : "destructive"}
                                                    className="text-[10px] font-black uppercase"
                                                >
                                                    {isMorningPresent ? "Morning ✓" : "Morning ✗"}
                                                </Badge>

                                                <div className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                                                    isMorningPresent
                                                        ? isCanteenPermitted
                                                            ? "bg-green-500 hover:bg-green-600"
                                                            : "bg-gray-200 hover:bg-green-100"
                                                        : "bg-red-500 hover:bg-red-600"
                                                )}>
                                                    {isMorningPresent ? (
                                                        <CheckCircle2 className={cn(
                                                            "w-7 h-7",
                                                            isCanteenPermitted ? "text-white" : "text-gray-400"
                                                        )} />
                                                    ) : (
                                                        <XCircle className="w-7 h-7 text-white" />
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}

                                {filteredStudents.length === 0 && (
                                    <div className="col-span-full py-20 text-center space-y-4">
                                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-40">
                                            <Search className="w-10 h-10" />
                                        </div>
                                        <p className="text-muted-foreground font-bold">No students found.</p>
                                    </div>
                                )}
                            </div>

                            {/* Legend */}
                            <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border">
                                <h3 className="font-bold text-sm mb-3">How to use:</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        <span><strong>Green Tick:</strong> Student present in morning. Click to permit in canteen.</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-5 h-5 text-red-600" />
                                        <span><strong>Red Cross:</strong> Student absent in morning. Click to mark absent in canteen.</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </CanteenLayout>
    );
}
