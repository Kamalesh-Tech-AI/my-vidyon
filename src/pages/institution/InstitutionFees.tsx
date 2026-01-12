import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import { Textarea } from '@/components/ui/textarea';
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
    MapPin
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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

// Mock Data
const CLASSES = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const FACULTY = ['Smitha Jones', 'Robert Wilson', 'Priya Sharma', 'David Miller'];

const MOCK_STUDENTS = Array.from({ length: 15 }).map((_, i) => {
    const status = i % 3 === 0 ? 'Paid' : i % 3 === 1 ? 'Pending' : 'Due';
    return {
        id: `STU${2025000 + i}`,
        name: `Student Name ${i + 1}`,
        rollNo: `25CS${100 + i}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        dob: '12-05-2008',
        bloodGroup: 'B+',
        parentName: 'Parent Name',
        contact: '+91 98765 43210',
        address: '123, Main Street, City',
        fees: {
            total: 45000,
            paid: status === 'Paid' ? 45000 : 30000,
            pending: status === 'Paid' ? 0 : 15000,
            status: status as 'Paid' | 'Pending' | 'Due',
            dueDate: status === 'Due' ? '15th Feb 2025' : undefined,
            structure: [
                { category: 'Tuition Fee', amount: 25000 },
                { category: 'Term Fee', amount: 10000 },
                { category: 'Lab & Activity', amount: 5000 },
                { category: 'Transport', amount: 5000 },
            ]
        },
        notifications: {
            status: i % 3 === 0 ? 'completed' : i % 2 === 0 ? 'pending' : 'current',
            currentStep: i % 3 === 0 ? 4 : i % 2 === 0 ? 1 : 2
        }
    };
});

type TrackingStage = {
    id: number;
    title: string;
    description: string;
    date?: string;
    status: 'completed' | 'current' | 'pending';
};

export function InstitutionFees() {
    // Navigation State
    const [isSelectionStarted, setIsSelectionStarted] = useState(false);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'tree' | 'students'>('tree');
    const [filterStatus, setFilterStatus] = useState<string>('All');

    // Popup State
    const [selectedStudent, setSelectedStudent] = useState<typeof MOCK_STUDENTS[0] | null>(null);
    const [openDialog, setOpenDialog] = useState<'none' | 'fees' | 'bio' | 'track'>('none');

    // Notification Flow State
    const [feeDialogView, setFeeDialogView] = useState<'summary' | 'notify' | 'tracking'>('summary');
    const [notificationMessage, setNotificationMessage] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState<string>('');
    const [trackingSteps, setTrackingSteps] = useState<TrackingStage[]>([
        { id: 1, title: 'Sent to Faculty', description: 'Request sent for approval', status: 'pending' },
        { id: 2, title: 'Faculty Approved', description: 'Class teacher approved', status: 'pending' },
        { id: 3, title: 'Sent to Parent', description: 'Notification delivered', status: 'pending' },
        { id: 4, title: 'Sent to Student', description: 'Student dashboard updated', status: 'pending' },
    ]);

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
    };

    const openFeesDialog = (student: typeof MOCK_STUDENTS[0]) => {
        setSelectedStudent(student);
        setFeeDialogView('summary');
        setOpenDialog('fees');
    };

    const openBioDialog = (student: typeof MOCK_STUDENTS[0]) => {
        setSelectedStudent(student);
        setOpenDialog('bio');
    };

    const openTrackDialog = (student: typeof MOCK_STUDENTS[0]) => {
        setSelectedStudent(student);
        // Simulate fetching current status
        const currentStep = student.notifications.currentStep;
        const newSteps = trackingSteps.map(step => ({
            ...step,
            status: step.id < currentStep ? 'completed' as const : step.id === currentStep ? 'current' as const : 'pending' as const,
            date: step.id <= currentStep ? new Date().toLocaleDateString() : undefined
        }));
        setTrackingSteps(newSteps);

        setFeeDialogView('tracking');
        setOpenDialog('track');
    }

    const handleSendNotification = () => {
        setFeeDialogView('tracking');

        const simulateStep = (index: number) => {
            setTrackingSteps(prev => {
                const newSteps = [...prev];
                if (index > 0) newSteps[index - 1].status = 'completed';
                if (index < newSteps.length) {
                    newSteps[index].status = 'current';
                    newSteps[index].date = new Date().toLocaleTimeString();
                }
                return newSteps;
            });
        };

        simulateStep(0);
        setTimeout(() => simulateStep(1), 1500);
        setTimeout(() => simulateStep(2), 3000);
        setTimeout(() => {
            setTrackingSteps(prev => prev.map(s => ({ ...s, status: 'completed', date: new Date().toLocaleTimeString() })));
        }, 4500);
    };

    return (
        <InstitutionLayout>
            <PageHeader
                title="Fee Management"
                subtitle="Track and manage student fees across all classes"
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
                    <span className="text-2xl font-bold">₹12.5M</span>
                </div>
                <div className="dashboard-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Outstanding</span>
                    </div>
                    <span className="text-2xl font-bold">₹1.2M</span>
                </div>
                <div className="dashboard-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-info/10 rounded-lg text-info">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Scholarships</span>
                    </div>
                    <span className="text-2xl font-bold">₹450K</span>
                </div>
                <div className="dashboard-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-warning/10 rounded-lg text-warning">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Refunds</span>
                    </div>
                    <span className="text-2xl font-bold">₹85K</span>
                </div>
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
                                        <span className={cn(!selectedSection && "font-semibold text-foreground")}>Class {selectedClass}</span>
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
                                                {CLASSES.map((cls) => (
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
                                                            Standard {cls}
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
                                                    <Badge variant="outline" className="text-[10px] h-5">Class {selectedClass}</Badge>
                                                </div>
                                                <div className="p-4 grid grid-cols-1 gap-2">
                                                    {SECTIONS.map((sec) => (
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
                                                <h3 className="text-2xl font-bold mb-2">Class {selectedClass} - Section {selectedSection}</h3>
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
                                <h2 className="text-lg font-bold flex items-center gap-2">Students List <Badge variant="outline" className="ml-2">Class {selectedClass}-{selectedSection}</Badge></h2>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                {MOCK_STUDENTS.filter(student => filterStatus === 'All' ? true : student.fees.status === filterStatus).map((student) => (
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
                                            <Button variant="secondary" size="sm" className="flex-1 gap-2 text-xs h-9" onClick={() => openBioDialog(student)}><Info className="w-3.5 h-3.5" /> Details</Button>
                                            <Button size="sm" className="flex-1 gap-2 text-xs h-9" variant="outline" onClick={() => openTrackDialog(student)}><MapPin className="w-3.5 h-3.5" /> Track</Button>
                                            <Button size="sm" className="flex-1 gap-2 text-xs h-9" variant="default" onClick={() => openFeesDialog(student)}><FileText className="w-3.5 h-3.5" /> Fees</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>

            {/* Reused Dialogs */}
            <Dialog open={openDialog === 'bio'} onOpenChange={(open) => !open && setOpenDialog('none')}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Student Profile</DialogTitle></DialogHeader>
                    {selectedStudent && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                                <img src={selectedStudent.avatar} className="w-16 h-16 rounded-full bg-white" alt="Avatar" />
                                <div><h3 className="font-bold text-lg">{selectedStudent.name}</h3><p className="text-muted-foreground">{selectedStudent.id}</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><Label className="text-muted-foreground">Class</Label><div className="font-medium">{selectedClass} - {selectedSection}</div></div>
                                <div><Label className="text-muted-foreground">Roll Number</Label><div className="font-medium">{selectedStudent.rollNo}</div></div>
                                <div><Label className="text-muted-foreground">Date of Birth</Label><div className="font-medium">{selectedStudent.dob}</div></div>
                                <div><Label className="text-muted-foreground">Blood Group</Label><div className="font-medium">{selectedStudent.bloodGroup}</div></div>
                                <div><Label className="text-muted-foreground">Parent Name</Label><div className="font-medium">{selectedStudent.parentName}</div></div>
                                <div><Label className="text-muted-foreground">Contact</Label><div className="font-medium">{selectedStudent.contact}</div></div>
                                <div className="col-span-2"><Label className="text-muted-foreground">Address</Label><div className="font-medium">{selectedStudent.address}</div></div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={openDialog === 'fees'} onOpenChange={(open) => { if (!open) { setOpenDialog('none'); setFeeDialogView('summary'); } }}>
                <DialogContent className="max-w-[500px] h-[600px] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{feeDialogView === 'summary' && 'Fee Details'}{feeDialogView === 'notify' && 'Send Payment Reminder'}{feeDialogView === 'tracking' && 'Notification Status'}</DialogTitle>
                        <DialogDescription>{feeDialogView === 'summary' && `Fee structure for ${selectedStudent?.name}`}{feeDialogView === 'notify' && `Notify ${selectedStudent?.name}'s parents about pending dues`}{feeDialogView === 'tracking' && `Tracking notification delivery`}</DialogDescription>
                    </DialogHeader>
                    {selectedStudent && (
                        <div className="mt-4 flex-1 overflow-hidden flex flex-col">
                            {/* Scrollable Container */}
                            <div className="flex-1 overflow-y-auto pr-2">
                                {feeDialogView === 'summary' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-lg bg-muted/40 text-center"><div className="text-xs text-muted-foreground uppercase font-semibold">Total Fees</div><div className="text-xl font-bold mt-1">₹{selectedStudent.fees.total.toLocaleString()}</div></div>
                                            <div className="p-4 rounded-lg bg-warning/10 text-center text-warning"><div className="text-xs uppercase font-semibold opacity-80">Pending</div><div className="text-xl font-bold mt-1">₹{selectedStudent.fees.pending.toLocaleString()}</div></div>
                                        </div>
                                        <div className="space-y-3">
                                            {selectedStudent.fees.structure.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm p-3 rounded-lg border bg-card"><span className="text-muted-foreground">{item.category}</span><span className="font-medium">₹{item.amount.toLocaleString()}</span></div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {feeDialogView === 'notify' && (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-muted/40 rounded-md text-sm"><span className="font-medium">To: </span> {selectedStudent.parentName} ({selectedStudent.contact})</div>

                                        <div className="space-y-2">
                                            <Label>Faculty Approver</Label>
                                            <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Faculty" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {FACULTY.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2"><Label>Message</Label><Textarea placeholder="Enter reminder message..." className="min-h-[120px]" value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} /></div>
                                    </div>
                                )}
                                {feeDialogView === 'tracking' && (
                                    <div className="relative pl-6 py-2 space-y-8">
                                        <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-border" />
                                        {trackingSteps.map((step) => (
                                            <div key={step.id} className="relative flex items-start gap-4">
                                                <div className={cn("relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors duration-300", step.status === 'completed' ? "bg-success border-success text-white" : step.status === 'current' ? "bg-primary border-primary text-white" : "bg-background border-muted-foreground/30")}>
                                                    {step.status === 'completed' && <Check className="w-3 h-3" />}{step.status === 'current' && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                                                </div>
                                                <div className="flex-1 pt-0.5">
                                                    <div className="flex justify-between items-start"><h4 className={cn("font-medium text-sm", step.status === 'pending' && "text-muted-foreground")}>{step.title}</h4>{step.date && <span className="text-xs text-muted-foreground">{step.date}</span>}</div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer Buttons */}
                            <div className="pt-4 mt-auto border-t bg-background">
                                {feeDialogView === 'summary' && (
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" className="flex-1" onClick={() => setOpenDialog('none')}>Close</Button>
                                        <Button className="flex-1 gap-2" onClick={() => setFeeDialogView('notify')}><Send className="w-4 h-4" /> Notify</Button>
                                    </div>
                                )}
                                {feeDialogView === 'notify' && (
                                    <div className="flex items-center gap-3">
                                        <Button variant="ghost" onClick={() => setFeeDialogView('summary')}>Back</Button>
                                        <Button className="flex-1" onClick={handleSendNotification} disabled={!notificationMessage || !selectedFaculty}>Send Notification</Button>
                                    </div>
                                )}
                                {feeDialogView === 'tracking' && (
                                    <Button className="w-full" variant="outline" onClick={() => setOpenDialog('none')}>Close</Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Separate TRACK dialog for direct access */}
            <Dialog open={openDialog === 'track'} onOpenChange={(open) => !open && setOpenDialog('none')}>
                <DialogContent className="max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Notification Status</DialogTitle>
                        <DialogDescription>Tracking notification delivery for {selectedStudent?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        <div className="relative pl-6 py-2 space-y-8">
                            <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-border" />
                            {trackingSteps.map((step) => (
                                <div key={step.id} className="relative flex items-start gap-4">
                                    <div className={cn("relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors duration-300", step.status === 'completed' ? "bg-success border-success text-white" : step.status === 'current' ? "bg-primary border-primary text-white" : "bg-background border-muted-foreground/30")}>
                                        {step.status === 'completed' && <Check className="w-3 h-3" />}{step.status === 'current' && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <div className="flex justify-between items-start"><h4 className={cn("font-medium text-sm", step.status === 'pending' && "text-muted-foreground")}>{step.title}</h4>{step.date && <span className="text-xs text-muted-foreground">{step.date}</span>}</div>
                                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </InstitutionLayout>
    );
}
