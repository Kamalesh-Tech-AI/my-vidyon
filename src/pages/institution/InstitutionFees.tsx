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
    const [openDialog, setOpenDialog] = useState<'none' | 'fees' | 'bio' | 'track' | 'create_structure'>('none');

    // Create Fee Structure State
    const [newFeeStructure, setNewFeeStructure] = useState({
        name: '',
        amount: '',
        dueDate: '',
        description: ''
    });

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

        if (user?.id.startsWith('MOCK_')) {
            await new Promise(resolve => setTimeout(resolve, 800));
            setStudents([
                { id: '1', name: 'John Doe', rollNo: '101', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=JD', fees: { total: 5000, paid: 5000, pending: 0, status: 'Paid' } },
                { id: '2', name: 'Jane Smith', rollNo: '102', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=JS', fees: { total: 5000, paid: 2000, pending: 3000, status: 'Pending' } },
                { id: '3', name: 'Alex Johnson', rollNo: '103', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AJ', fees: { total: 5000, paid: 0, pending: 5000, status: 'Due', dueDate: '2026-02-01' } },
            ]);
            setLoading(false);
            return;
        }

        try {
            // 1. Get Class object
            const classObj = allClasses.find(c => c.name === selectedClass && c.section === selectedSection);
            if (!classObj) return;

            // 2. Fetch Students in Class
            const { data: studentsData, error: stuError } = await supabase
                .from('students')
                .select('*')
                .eq('institution_id', user.institutionId)
                .eq('class_id', classObj.id);

            if (stuError) throw stuError;

            // 3. Fetch Student Fees
            const { data: feesData, error: feesError } = await supabase
                .from('student_fees')
                .select(`
                    *,
                    fee_structure:fee_structure_id (name)
                `)
                .eq('institution_id', user.institutionId)
                .in('student_id', studentsData.map(s => s.id));

            if (feesError) throw feesError;

            // Merge Data
            const merged = studentsData.map(s => {
                const sFees = feesData?.filter(f => f.student_id === s.id) || [];

                // Calculate Totals
                const totalDue = sFees.reduce((sum, f) => sum + (Number(f.amount_due) || 0), 0);
                const totalPaid = sFees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0);
                const pending = totalDue - totalPaid;

                let status = 'Paid';
                if (pending > 0) status = 'Pending'; // Simplified
                if (sFees.some(f => f.status === 'overdue')) status = 'Due';

                return {
                    id: s.id,
                    name: s.first_name + ' ' + s.last_name,
                    rollNo: s.roll_number || 'N/A',
                    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${s.first_name}`,
                    dob: s.dob,
                    bloodGroup: s.blood_group,
                    parentName: s.parent_name || 'Guardian',
                    contact: s.emergency_contact,
                    address: s.address,
                    fees: {
                        total: totalDue,
                        paid: totalPaid,
                        pending: pending,
                        status: status,
                        structure: sFees.map(f => ({
                            category: f.fee_structure?.name || 'Fee',
                            amount: f.amount_due,
                            paid: f.amount_paid
                        }))
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

            // TODO: Ideally we should also Create 'student_fees' records for all students linked to this structure?
            // For now, simpler implementation.

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

            {/* Statistics Section - Hardcoded placeholders for now as real aggregation is heavy */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="dashboard-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-success/10 rounded-lg text-success">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Total Revenue (YTD)</span>
                    </div>
                    <span className="text-2xl font-bold">₹ --</span>
                </div>
                <div className="dashboard-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Outstanding</span>
                    </div>
                    <span className="text-2xl font-bold">₹ --</span>
                </div>
                {/* ... other stats ... */}
            </div>

            {/* Main Interactive Area */}
            <div className="dashboard-card h-[600px] overflow-hidden bg-card border shadow-sm relative">
                {viewMode === 'tree' ? (
                    <div className="w-full h-full flex flex-col">
                        <div className="h-16 border-b flex items-center px-6 justify-between bg-card/50">
                            {isSelectionStarted ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Button variant="ghost" size="sm" onClick={resetSelection} className="text-primary hover:text-primary/80 -ml-2">
                                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Start
                                    </Button>
                                    <span className="text-border">|</span>
                                    <span>Selection</span>
                                    {selectedClass && <>
                                        <ChevronRight className="w-4 h-4" />
                                        <span className={cn(!selectedSection && "font-semibold text-foreground")}>{selectedClass}</span>
                                    </>}
                                    {selectedSection && <>
                                        <ChevronRight className="w-4 h-4" />
                                        <span className="font-semibold text-foreground">Section {selectedSection}</span>
                                    </>}
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
                                <div className="flex h-full divide-x divide-border/50">
                                    <div className="flex-1 min-w-[250px] max-w-sm flex flex-col bg-card/30 animate-in slide-in-from-left-4 duration-300">
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

                                    <div className="flex-1 min-w-[250px] max-w-sm flex flex-col bg-card/30 relative">
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
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 p-8 text-center">
                                                <Layers className="w-12 h-12 mb-4 opacity-20" />
                                                <p>Select a class to view sections</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-[2] flex flex-col bg-muted/10 relative">
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
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 p-8 text-center">
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
                                                <Button variant="secondary" size="sm" className="flex-1 gap-2 text-xs h-9" disabled>Details</Button>
                                                <Button size="sm" className="flex-1 gap-2 text-xs h-9" variant="default" disabled>Fees</Button>
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

        </InstitutionLayout>
    );
}
