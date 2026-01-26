import { useState, useEffect } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
    IndianRupee,
    FileText,
    ChevronRight,
    Users,
    ArrowLeft,
    Check,
    Info,
    Send,
    Layers,
    GraduationCap,
    School,
    ArrowRight,
    MapPin,
    Plus,
    Loader2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useAuth } from '@/context/AuthContext';
import { useInstitution } from '@/context/InstitutionContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function InstitutionFees() {
    const { user } = useAuth();
    const { allClasses } = useInstitution();

    // Derived Classes & Sections
    const uniqueClasses = Array.from(new Set(allClasses.map(c => c.name))).sort();

    // State for Stats
    const [stats, setStats] = useState({ revenue: 0, outstanding: 0 });

    // State
    const [isSelectionStarted, setIsSelectionStarted] = useState(false);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'tree' | 'students'>('tree');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [availableSections, setAvailableSections] = useState<string[]>([]);

    // Data
    const [students, setStudents] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Popup State
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [openDialog, setOpenDialog] = useState<'none' | 'fees' | 'bio' | 'track' | 'create_structure' | 'receipt'>('none');

    // Create Fee Structure State
    const [newFeeStructure, setNewFeeStructure] = useState({
        name: '',
        amount: '',
        dueDate: '',
        description: ''
    });

    // Fetch Global Stats
    useEffect(() => {
        if (!user?.institutionId) return;

        const fetchStats = async () => {
            try {
                const { data, error } = await supabase
                    .from('student_fees')
                    .select('amount_paid, amount_due')
                    .eq('institution_id', user.institutionId);

                if (error) throw error;

                const revenue = data.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
                const due = data.reduce((sum, r) => sum + (Number(r.amount_due) || 0), 0);
                setStats({ revenue, outstanding: due - revenue });
            } catch (err) {
                console.error("Stats fetch error:", err);
            }
        };
        fetchStats();
    }, [user?.institutionId]);

    // Effects
    useEffect(() => {
        if (selectedClass) {
            const sections = allClasses
                .filter(c => c.name === selectedClass)
                .map(c => c.section)
                .sort();
            setAvailableSections(sections);
        }
    }, [selectedClass, allClasses]);

    // Fetch Fee Structures
    useEffect(() => {
        if (!user?.institutionId) return;
        const fetchFeeStructures = async () => {
            const { data } = await supabase.from('fee_structures').select('*').eq('institution_id', user.institutionId);
            setFeeStructures(data || []);
        };
        fetchFeeStructures();

        // Subscribe
        const channel = supabase.channel('fee_structures_sub')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_structures', filter: `institution_id=eq.${user.institutionId}` }, () => fetchFeeStructures())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user?.institutionId]);


    const fetchStudents = async () => {
        if (!selectedClass || !selectedSection || !user?.institutionId) return;
        setLoading(true);



        try {
            // 1. Get Class object
            const classObj = allClasses.find(c => c.name === selectedClass && c.section === selectedSection);
            if (!classObj) return;

            // 2. Fetch Students in Class
            const { data: studentsData, error: stuError } = await supabase
                .from('students')
                .select('*')
                .eq('institution_id', user.institutionId)
                .eq('class_name', selectedClass)
                .eq('section', selectedSection);

            if (stuError) throw stuError;

            // 3. Fetch Fee Structures for this institution
            const { data: classFeeStructures, error: feeStructError } = await supabase
                .from('fee_structures')
                .select('*')
                .eq('institution_id', user.institutionId);

            if (feeStructError) {
                console.error("Fee structure error:", feeStructError);
                // Don't throw, just log and continue with empty fee structures
            }

            // 4. Fetch Student Fees (if any exist)
            let feesData: any[] = [];
            if (studentsData && studentsData.length > 0) {
                const { data: fees, error: feesError } = await supabase
                    .from('student_fees')
                    .select('*')
                    .eq('institution_id', user.institutionId)
                    .in('student_id', studentsData.map(s => s.id));

                if (feesError) {
                    console.error("Fee fetch error:", feesError);
                    // Don't throw, just continue with empty fees
                } else {
                    feesData = fees || [];
                }
            }

            // Merge Data - Show ALL students even if they have no fees
            const merged = studentsData.map(s => {
                const sFees = feesData?.filter(f => f.student_id === s.id) || [];

                // Calculate Totals
                const totalDue = sFees.reduce((sum, f) => sum + (Number(f.amount_due) || 0), 0);
                const totalPaid = sFees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0);
                const pending = totalDue - totalPaid;

                let status = sFees.length === 0 ? 'No Fees' : 'Paid';
                if (pending > 0) status = 'Pending';
                if (sFees.some(f => f.status === 'overdue')) status = 'Due';

                return {
                    id: s.id,
                    name: s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
                    rollNo: s.roll_number || s.register_number || 'N/A',
                    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${s.name || s.first_name || 'Student'}`,
                    dob: s.dob || s.date_of_birth,
                    bloodGroup: s.blood_group,
                    parentName: s.parent_name || 'Guardian',
                    contact: s.emergency_contact || s.parent_phone,
                    address: s.address,
                    fees: {
                        total: totalDue,
                        paid: totalPaid,
                        pending: pending,
                        status: status,
                        structure: sFees.map(f => ({
                            category: 'Fee',
                            amount: f.amount_due,
                            paid: f.amount_paid,
                            dueDate: f.due_date
                        })),
                        classFeeStructures: classFeeStructures || []
                    }
                };
            });
            setStudents(merged);

        } catch (err: any) {
            console.error("Error fetching students:", err);
            toast.error("Failed to load student data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'students') {
            fetchStudents();
        }
    }, [viewMode, selectedClass, selectedSection]);

    // Real-time subscription for fee updates
    useEffect(() => {
        if (viewMode !== 'students' || !user?.institutionId) return;

        // Subscribe to student_fees changes
        const subscription = supabase
            .channel('student_fees_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'student_fees',
                    filter: `institution_id=eq.${user.institutionId}`
                },
                (payload) => {
                    console.log('📡 Fee update received:', payload);
                    // Refresh the student data when fees are updated
                    fetchStudents();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [viewMode, user?.institutionId, selectedClass, selectedSection]);



    const handleSendMessage = (student: any) => {
        // In a real app, this would open a dialog to compose a message
        // For now, we'll simulate sending a reminder
        const message = `Dear ${student.name}, this is a reminder to pay your outstanding fees of ₹${student.fees.pending}.`;

        // Simulate API call
        toast.promise(new Promise(resolve => setTimeout(resolve, 1000)), {
            loading: 'Sending reminder...',
            success: `Reminder sent to ${student.name}`,
            error: 'Failed to send message'
        });
    };

    const handleSendReceipt = (student: any) => {
        setSelectedStudent(student);
        setOpenDialog('receipt');
    };

    const handleDownloadReceipt = () => {
        toast.success("Receipt downloaded successfully!");
        setOpenDialog('none');
    };

    const handleViewDetails = (student: any) => {
        setSelectedStudent(student);
        setOpenDialog('bio');
    };

    const handleViewFees = (student: any) => {
        setSelectedStudent(student);
        setOpenDialog('fees');
    };


    // Handlers
    const handleClassSelect = (cls: string) => {
        if (selectedClass === cls) return;
        setSelectedClass(cls);
        setSelectedSection(null);
        setFilterStatus('All');
    };

    const handleSectionSelect = (sec: string) => {
        setSelectedSection(sec);
        setFilterStatus('All');
    };

    const handleViewStudents = () => {
        if (selectedClass && selectedSection) {
            setViewMode('students');
        }
    };

    const startSelection = () => {
        setIsSelectionStarted(true);
        setSelectedClass(null);
        setSelectedSection(null);
        setFilterStatus('All');
    };

    const resetSelection = () => {
        setIsSelectionStarted(false);
        setSelectedClass(null);
        setSelectedSection(null);
        setFilterStatus('All');
        setViewMode('tree');
    };

    const handleCreateFeeStructure = async () => {
        if (!user?.institutionId) return;
        try {
            const { error } = await supabase.from('fee_structures').insert([{
                institution_id: user.institutionId,
                name: newFeeStructure.name,
                amount: parseFloat(newFeeStructure.amount),
                due_date: newFeeStructure.dueDate ? new Date(newFeeStructure.dueDate).toISOString() : null,
                // description: newFeeStructure.description // need column check
            }]);

            if (error) throw error;

            toast.success("Fee Structure Created");
            setOpenDialog('none');
            setNewFeeStructure({ name: '', amount: '', dueDate: '', description: '' });

        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <InstitutionLayout>
            <PageHeader
                title="Fee Management"
                subtitle="Track and manage student fees across all classes"
                actions={
                    <Button onClick={() => setOpenDialog('create_structure')} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Create Fee Structure
                    </Button>
                }
            />

            {/* Statistics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="dashboard-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-success/10 rounded-lg text-success">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Total Revenue (YTD)</span>
                    </div>
                    <span className="text-2xl font-bold">₹ {stats.revenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="dashboard-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Outstanding</span>
                    </div>
                    <span className="text-2xl font-bold">₹ {stats.outstanding.toLocaleString('en-IN')}</span>
                </div>
                {/* ... other stats ... */}
            </div>

            {/* Main Interactive Area */}
            <div className="dashboard-card h-[600px] overflow-hidden bg-card border shadow-sm relative">
                {viewMode === 'tree' ? (
                    <div className="w-full h-full flex flex-col">
                        <div className="h-16 border-b flex items-center px-6 justify-between bg-card/50">
                            {isSelectionStarted ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto">
                                    <Button variant="ghost" size="sm" onClick={resetSelection} className="text-primary hover:text-primary/80 -ml-2 whitespace-nowrap">
                                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>
                                    <span className="text-border">|</span>
                                    {/* Mobile: Show simpler breadcrumb */}
                                    <div className="flex items-center">
                                        {selectedClass && (
                                            <Button variant="ghost" size="sm" className={cn("px-1 h-auto font-normal", !selectedSection && "font-bold text-foreground")} onClick={() => setSelectedSection(null)}>
                                                {selectedClass}
                                            </Button>
                                        )}
                                        {selectedSection && (
                                            <>
                                                <ChevronRight className="w-3 h-3 mx-1" />
                                                <span className="font-bold text-foreground">{selectedSection}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <h3 className="font-semibold">Quick Selection</h3>
                            )}
                        </div>

                        <div className="flex-1 relative overflow-hidden">
                            {!isSelectionStarted ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                        <School className="w-10 h-10 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">Explore Fees</h2>
                                    <p className="text-muted-foreground mb-8 text-center max-w-sm">Select a class to view student fee details, payment status, and send reminders.</p>
                                    <Button
                                        size="lg"
                                        onClick={startSelection}
                                        className="h-14 px-10 text-lg rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                                    >
                                        Select Class <ChevronRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row h-full divide-y md:divide-y-0 md:divide-x divide-border/50">
                                    {/* Class Selection Column */}
                                    <div className={cn(
                                        "flex-1 min-w-[250px] max-w-full md:max-w-sm flex flex-col bg-card/30 animate-in slide-in-from-left-4 duration-300",
                                        selectedClass ? "hidden md:flex" : "flex"
                                    )}>
                                        <div className="p-4 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur-sm z-10">Select Class</div>
                                        <ScrollArea className="flex-1">
                                            <div className="p-2 space-y-1">
                                                {uniqueClasses.map((cls) => (
                                                    <Button
                                                        key={cls}
                                                        variant={selectedClass === cls ? "secondary" : "ghost"}
                                                        className={cn(
                                                            "w-full justify-between h-12 px-4 transition-all font-bold",
                                                            selectedClass === cls ? "bg-primary/10 text-primary" : "text-foreground hover:text-primary hover:bg-muted"
                                                        )}
                                                        onClick={() => handleClassSelect(cls)}
                                                    >
                                                        <span className="flex items-center gap-3">
                                                            <div className={cn("w-2 h-2 rounded-full", selectedClass === cls ? "bg-primary" : "bg-muted-foreground/30")} />
                                                            {cls}
                                                        </span>
                                                        {selectedClass === cls && <ChevronRight className="w-4 h-4 ml-2" />}
                                                    </Button>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>

                                    {/* Section Selection Column */}
                                    <div className={cn(
                                        "flex-1 min-w-[250px] max-w-full md:max-w-sm flex flex-col bg-card/30 relative",
                                        (!selectedClass || selectedSection) ? "hidden md:flex" : "flex"
                                    )}>
                                        {selectedClass ? (
                                            <div className="absolute inset-0 flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                                                <div className="p-4 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur-sm z-10 flex justify-between items-center">
                                                    Section
                                                    <Badge variant="outline" className="text-[10px] h-5">{selectedClass}</Badge>
                                                </div>
                                                <div className="p-4 grid grid-cols-1 gap-2">
                                                    {availableSections.map((sec) => (
                                                        <Button
                                                            key={sec}
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start h-14 px-4 text-base transition-all border-l-4",
                                                                selectedSection === sec
                                                                    ? "border-l-primary bg-primary/5 border-t-border border-r-border border-b-border"
                                                                    : "border-l-transparent hover:border-l-muted-foreground/50"
                                                            )}
                                                            onClick={() => handleSectionSelect(sec)}
                                                        >
                                                            <div className="flex items-center gap-4 w-full">
                                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors", selectedSection === sec ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>{sec}</div>
                                                                <span className={cn(selectedSection === sec ? "font-semibold" : "font-normal")}>Section {sec}</span>
                                                                {selectedSection === sec && <Check className="w-4 h-4 ml-auto text-primary" />}
                                                            </div>
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 p-8 text-center hidden md:flex">
                                                <Layers className="w-12 h-12 mb-4 opacity-20" />
                                                <p>Select a class to view sections</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Summary / Action Column */}
                                    <div className={cn(
                                        "flex-[2] flex flex-col bg-muted/10 relative",
                                        !selectedSection ? "hidden md:flex" : "flex"
                                    )}>
                                        {selectedSection ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 animate-in zoom-in-95 fade-in duration-500 text-center">
                                                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                                    <GraduationCap className="w-12 h-12 text-primary" />
                                                </div>
                                                <h3 className="text-2xl font-bold mb-2">{selectedClass} - Section {selectedSection}</h3>
                                                <p className="text-muted-foreground mb-8 max-w-xs">Detailed student list, fee status, and individual actions available.</p>

                                                <Button
                                                    size="lg"
                                                    className="w-full max-w-xs h-12 text-lg shadow-lg"
                                                    onClick={handleViewStudents}
                                                >
                                                    View Students <ArrowRight className="ml-2 w-5 h-5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 p-8 text-center hidden md:flex">
                                                <Users className="w-16 h-16 mb-4 opacity-20" />
                                                <p>{selectedClass ? "Select a section to proceed" : "Start by selecting a class"}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="h-16 border-b flex items-center px-6 gap-4 bg-card/50 flex-shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => setViewMode('tree')} className="hover:bg-muted">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">Students List <Badge variant="outline" className="ml-2">{selectedClass}-{selectedSection}</Badge></h2>
                            </div>
                            <div className="ml-auto w-[180px]">
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Students</SelectItem>
                                        <SelectItem value="Paid">Paid</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Due">Due</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Fee Structures for this Class */}
                        {students.length > 0 && students[0]?.fees?.classFeeStructures && students[0].fees.classFeeStructures.length > 0 && (
                            <div className="px-6 pt-4 pb-2">
                                <div className="bg-muted/30 border border-primary/20 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileText className="w-4 h-4 text-primary" />
                                        <h3 className="font-semibold text-sm">Fee Structures for {selectedClass} - Section {selectedSection}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {students[0].fees.classFeeStructures.map((feeStructure: any) => (
                                            <div key={feeStructure.id} className="bg-card border rounded-lg p-3 hover:border-primary/50 transition-colors">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-sm">{feeStructure.name}</h4>
                                                        {feeStructure.due_date && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Due: {new Date(feeStructure.due_date).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className="ml-2">
                                                        ₹{Number(feeStructure.amount).toLocaleString()}
                                                    </Badge>
                                                </div>
                                                {feeStructure.class_id ? (
                                                    <Badge variant="default" className="text-[10px] h-5">Class Specific</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] h-5">General</Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <ScrollArea className="flex-1 p-6">
                            {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div> :
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                    {students.filter(student => filterStatus === 'All' ? true : student.fees.status === filterStatus).map((student) => (
                                        <div key={student.id} className="group relative border rounded-xl p-5 hover:shadow-lg hover:border-primary/50 transition-all bg-card/50">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-muted overflow-hidden border-2 border-transparent group-hover:border-primary transition-colors">
                                                        <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold group-hover:text-primary transition-colors">{student.name}</h3>
                                                        <p className="text-xs text-muted-foreground">Roll: {student.rollNo}</p>
                                                        {student.fees.status === 'Due' && (
                                                            <p className="text-xs text-destructive font-medium mt-0.5">Due: {student.fees.dueDate}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge variant={student.fees.status === 'Paid' ? 'success' : student.fees.status === 'Pending' ? 'warning' : 'destructive'} className="uppercase text-[10px]">{student.fees.status}</Badge>
                                            </div>

                                            <div className="flex items-center gap-2 mt-4">
                                                {/* Actions */}
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="flex-1 gap-2 text-xs h-9"
                                                    onClick={() => handleViewDetails(student)}
                                                >
                                                    Details
                                                </Button>

                                                {student.fees.status === 'Paid' ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            className="flex-1 gap-2 text-xs h-9"
                                                            variant="default"
                                                            onClick={() => handleViewFees(student)}
                                                        >
                                                            Fees
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-9 w-9 p-0 border-primary/20 text-primary hover:bg-primary/5"
                                                            onClick={() => handleSendReceipt(student)}
                                                            title="Send Receipt"
                                                        >
                                                            <Send className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            className="flex-1 gap-2 text-xs h-9"
                                                            variant="default"
                                                            onClick={() => handleViewFees(student)}
                                                        >
                                                            Fees
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-9 w-9 p-0 bg-orange-500 hover:bg-orange-600 text-white"
                                                            onClick={() => handleSendMessage(student)}
                                                            title="Send Reminder"
                                                        >
                                                            <Send className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {students.length === 0 && <div className="col-span-3 text-center text-muted-foreground py-10">No students found in this section or no fee data tracked yet.</div>}
                                </div>
                            }
                        </ScrollArea>
                    </div>
                )}
            </div>

            {/* Create Fee Structure Dialog */}
            <Dialog open={openDialog === 'create_structure'} onOpenChange={(open) => !open && setOpenDialog('none')}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Fee Structure</DialogTitle>
                        <DialogDescription>Add a new fee type (e.g. Annual Tuition)</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input value={newFeeStructure.name} onChange={(e) => setNewFeeStructure({ ...newFeeStructure, name: e.target.value })} placeholder="e.g. Tuition Fee 2026" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Amount</Label>
                            <Input type="number" value={newFeeStructure.amount} onChange={(e) => setNewFeeStructure({ ...newFeeStructure, amount: e.target.value })} placeholder="0.00" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Due Date</Label>
                            <Input type="date" value={newFeeStructure.dueDate} onChange={(e) => setNewFeeStructure({ ...newFeeStructure, dueDate: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateFeeStructure}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Student Details Dialog */}
            <Dialog open={openDialog === 'bio'} onOpenChange={(open) => !open && setOpenDialog('none')}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Student Details</DialogTitle>
                    </DialogHeader>
                    {selectedStudent && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-4 mb-4">
                                <img src={selectedStudent.avatar} alt="Avatar" className="w-16 h-16 rounded-full bg-muted" />
                                <div>
                                    <h3 className="font-bold text-lg">{selectedStudent.name}</h3>
                                    <p className="text-sm text-muted-foreground">Roll No: {selectedStudent.rollNo}</p>
                                    <Badge variant="outline" className="mt-1">{selectedClass} - {selectedSection}</Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground block mb-1">Parent Name</span>
                                    <span className="font-medium">{selectedStudent.parentName}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block mb-1">Contact</span>
                                    <span className="font-medium">{selectedStudent.contact || selectedStudent.fees.status}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground block mb-1">Address</span>
                                    <span className="font-medium">{selectedStudent.address || "No address provided"}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Fees Details Dialog */}
            <Dialog open={openDialog === 'fees'} onOpenChange={(open) => !open && setOpenDialog('none')}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fee Breakdown</DialogTitle>
                        <DialogDescription>Detailed fee status for {selectedStudent?.name}</DialogDescription>
                    </DialogHeader>
                    {selectedStudent && (
                        <div className="space-y-4 py-2">
                            <div className="p-4 bg-muted/20 rounded-lg flex justify-between items-center">
                                <span className="font-medium">Status</span>
                                <Badge variant={selectedStudent.fees.status === 'Paid' ? 'success' : 'warning'}>{selectedStudent.fees.status}</Badge>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fee Structure</h4>
                                {selectedStudent.fees.structure && selectedStudent.fees.structure.length > 0 ? (
                                    selectedStudent.fees.structure.map((f: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-sm p-2 border-b last:border-0 border-border/50">
                                            <span>{f.category}</span>
                                            <div className="text-right">
                                                <span className="block font-medium">Due: ₹{f.amount}</span>
                                                <span className="block text-xs text-muted-foreground">Paid: ₹{f.paid}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground italic">No fee structure details found.</div>
                                )}
                            </div>

                            <div className="flex justify-between items-center text-sm pt-4 border-t">
                                <span className="font-bold">Total Due</span>
                                <span className="font-bold">₹{selectedStudent.fees.total}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold">Total Paid</span>
                                <span className="font-bold text-success">₹{selectedStudent.fees.paid}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold">Outstanding</span>
                                <span className="font-bold text-destructive">₹{selectedStudent.fees.pending}</span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Receipt Dialog */}
            <Dialog open={openDialog === 'receipt'} onOpenChange={(open) => !open && setOpenDialog('none')}>
                <DialogContent className="max-w-md bg-white text-black p-0 overflow-hidden rounded-2xl">
                    {selectedStudent && (
                        <div className="relative">
                            {/* Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none overflow-hidden">
                                <div className="text-4xl font-bold -rotate-45 whitespace-nowrap">created@myvidyon created@myvidyon</div>
                            </div>

                            <div className="p-8 relative z-10 bg-white/90">
                                <div className="text-center border-b border-dashed border-gray-300 pb-6 mb-6">
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <School className="w-8 h-8 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight">Fee Receipt</h2>
                                    <p className="text-sm text-gray-500 mt-1">Receipt #{Math.floor(Math.random() * 100000)}</p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString()}</p>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Student Name</span>
                                        <span className="font-bold">{selectedStudent.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Roll Number</span>
                                        <span className="font-bold">{selectedStudent.rollNo}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Class</span>
                                        <span className="font-bold">{selectedClass} - {selectedSection}</span>
                                    </div>
                                    <div className="my-4 border-t border-gray-100"></div>
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                        <span className="text-sm font-medium">Amount Paid</span>
                                        <span className="text-xl font-bold text-success">₹{selectedStudent.fees.paid.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <Button className="w-full h-12 text-lg gap-2" onClick={handleDownloadReceipt}>
                                        <Send className="w-4 h-4" /> Send Receipt
                                    </Button>
                                    <p className="text-[10px] text-gray-400 mt-4">Automated computerized receipt. No signature required.</p>
                                    <p className="text-[10px] text-gray-300 mt-1">created@myvidyon</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </InstitutionLayout >
    );
}
