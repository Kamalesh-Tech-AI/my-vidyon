
import { useState, useEffect } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/common/Badge';
import { Plus, Trash2, Save, Send, ChevronRight, School, Loader2, IndianRupee, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Group {
    id: string;
    name: string;
    classes: ClassItem[];
}

interface ClassItem {
    id: string;
    name: string;
    sections: string[]; // "sections" is array of strings in groups table
    groupName?: string;
}

interface FeeComponent {
    id: string;
    title: string;
    amount: string; // string for input handling, convert to number for maths
}

export function InstitutionFeeStructure() {
    const { user } = useAuth();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    // Main Dialog State
    const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [feeComponents, setFeeComponents] = useState<FeeComponent[]>([{ id: '1', title: 'Tuition Fee', amount: '0' }]);
    const [structureName, setStructureName] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [feeStructureId, setFeeStructureId] = useState<string | null>(null);

    // Student-wise View State
    const [showStudentWise, setShowStudentWise] = useState(false);
    const [studentsInClass, setStudentsInClass] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [studentFeeComponents, setStudentFeeComponents] = useState<FeeComponent[]>([]);
    const [studentFeeId, setStudentFeeId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.institutionId) {
            fetchClasses();
        }
    }, [user?.institutionId]);

    const sortClasses = (classes: ClassItem[]) => {
        const classOrder = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

        return [...classes].sort((a, b) => {
            const normalizeClass = (className: string) => {
                return className
                    .toUpperCase()
                    .replace(/(\d+)(ST|ND|RD|TH)/i, '$1')
                    .replace(/GRADE\s*/i, '')
                    .replace(/CLASS\s*/i, '')
                    .trim();
            };

            const normalizedA = normalizeClass(a.name);
            const normalizedB = normalizeClass(b.name);

            const indexA = classOrder.indexOf(normalizedA);
            const indexB = classOrder.indexOf(normalizedB);

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.name.localeCompare(b.name);
        });
    };

    const fetchClasses = async () => {
        try {
            // Fetch unique classes and sections from students table
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('class_name, section')
                .eq('institution_id', user!.institutionId);

            if (studentsError) throw studentsError;

            // Group students by class_name and collect unique sections
            const classMap = new Map<string, Set<string>>();

            studentsData?.forEach((student) => {
                if (student.class_name && student.class_name.trim()) {
                    if (!classMap.has(student.class_name)) {
                        classMap.set(student.class_name, new Set());
                    }
                    if (student.section && student.section.trim()) {
                        classMap.get(student.class_name)!.add(student.section);
                    }
                }
            });

            // Convert to ClassItem array
            const allClasses: ClassItem[] = Array.from(classMap.entries()).map(([className, sectionsSet]) => ({
                id: className, // Using class name as ID since we don't have class table IDs
                name: className,
                sections: Array.from(sectionsSet).sort((a, b) => a.localeCompare(b))
            }));

            // Sort classes in educational order
            const sortedClasses = sortClasses(allClasses);

            // Group classes into educational levels
            const groupedClasses: Group[] = [
                {
                    id: 'primary',
                    name: 'Primary School (LKG - 5th)',
                    classes: sortedClasses.filter(c => {
                        const normalized = c.name.toUpperCase().replace(/(\d+)(ST|ND|RD|TH)/i, '$1');
                        return ['LKG', 'UKG', '1', '2', '3', '4', '5'].includes(normalized);
                    })
                },
                {
                    id: 'middle',
                    name: 'Middle School (6th - 8th)',
                    classes: sortedClasses.filter(c => {
                        const normalized = c.name.toUpperCase().replace(/(\d+)(ST|ND|RD|TH)/i, '$1');
                        return ['6', '7', '8'].includes(normalized);
                    })
                },
                {
                    id: 'high',
                    name: 'High School (9th - 10th)',
                    classes: sortedClasses.filter(c => {
                        const normalized = c.name.toUpperCase().replace(/(\d+)(ST|ND|RD|TH)/i, '$1');
                        return ['9', '10'].includes(normalized);
                    })
                },
                {
                    id: 'higher_secondary',
                    name: 'Higher Secondary (11th - 12th)',
                    classes: sortedClasses.filter(c => {
                        const normalized = c.name.toUpperCase().replace(/(\d+)(ST|ND|RD|TH)/i, '$1');
                        return ['11', '12'].includes(normalized);
                    })
                }
            ].filter(group => group.classes.length > 0); // Only include groups with classes

            console.log('Fetched classes from students:', sortedClasses);
            console.log('Grouped classes:', groupedClasses);
            setGroups(groupedClasses);
        } catch (error) {
            console.error("Error fetching classes:", error);
            toast.error("Failed to load classes");
        } finally {
            setLoading(false);
        }
    };

    const handleClassClick = async (cls: ClassItem, groupName: string) => {
        setSelectedClass({ ...cls, groupName });
        setShowStudentWise(false);
        setIsDialogOpen(true);

        // Fetch existing fee structure for this class (read-only)
        const { data } = await supabase
            .from('fee_structures')
            .select('*')
            .eq('institution_id', user!.institutionId)
            .ilike('name', `%${cls.name}%`)
            .limit(1);

        if (data && data.length > 0) {
            const fs = data[0];
            setFeeStructureId(fs.id);
            setStructureName(fs.name);
            setDueDate(fs.due_date ? fs.due_date.split('T')[0] : '');

            try {
                if (fs.description && fs.description.startsWith('[')) {
                    setFeeComponents(JSON.parse(fs.description));
                } else {
                    setFeeComponents([{ id: '1', title: fs.name, amount: fs.amount.toString() }]);
                }
            } catch (e) {
                setFeeComponents([{ id: '1', title: fs.name, amount: fs.amount.toString() }]);
            }
        } else {
            // No structure found
            setFeeStructureId(null);
            setStructureName(`${cls.name} Fee Structure`);
            setDueDate('');
            setFeeComponents([{ id: '1', title: 'No structure defined', amount: '0' }]);
        }

        // Fetch students in this class
        const { data: students } = await supabase
            .from('students')
            .select('id, name, register_number')
            .eq('institution_id', user!.institutionId)
            .eq('class_name', cls.name);

        setStudentsInClass(students || []);
    };

    const handleViewStudentFee = async (student: any) => {
        setSelectedStudent(student);
        setIsEditingStudent(false);
        setIsStudentDialogOpen(true);

        // Fetch student-specific fee
        const { data } = await supabase
            .from('student_fees')
            .select('*')
            .eq('student_id', student.id)
            .eq('fee_structure_id', feeStructureId!)
            .maybeSingle();

        if (data) {
            setStudentFeeId(data.id);
            try {
                const parsed = JSON.parse(data.description || '[]');
                setStudentFeeComponents(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
                setStudentFeeComponents([{ id: '1', title: 'Fee', amount: data.amount_due.toString() }]);
            }
        } else {
            // No student fee found, use base structure
            setStudentFeeId(null);
            setStudentFeeComponents([...feeComponents]);
        }
    };

    const handleEditStudentFee = () => {
        setIsEditingStudent(true);
    };

    const handleSaveStudentFee = async () => {
        if (!selectedStudent || !user?.institutionId) return;

        setSaving(true);
        try {
            const totalAmount = studentFeeComponents.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
            const componentsJson = JSON.stringify(studentFeeComponents);

            if (studentFeeId) {
                // Update existing
                const { error } = await supabase
                    .from('student_fees')
                    .update({
                        amount_due: totalAmount,
                        description: componentsJson
                    })
                    .eq('id', studentFeeId);

                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase.from('student_fees').insert([{
                    student_id: selectedStudent.id,
                    fee_structure_id: feeStructureId,
                    institution_id: user.institutionId,
                    amount_due: totalAmount,
                    amount_paid: 0,
                    due_date: dueDate ? new Date(dueDate).toISOString() : null,
                    status: 'pending',
                    description: componentsJson
                }]);

                if (error) throw error;
            }

            toast.success('Student fee updated successfully');
            setIsEditingStudent(false);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const addComponent = () => {
        setFeeComponents([...feeComponents, { id: Date.now().toString(), title: '', amount: '' }]);
    };

    const removeComponent = (id: string) => {
        if (feeComponents.length === 1) return;
        setFeeComponents(feeComponents.filter(c => c.id !== id));
    };

    const updateComponent = (id: string, field: keyof FeeComponent, value: string) => {
        setFeeComponents(feeComponents.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const calculateTotal = () => {
        return feeComponents.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    };

    const handleSave = async () => {
        if (!user?.institutionId || !selectedClass) return;
        setSaving(true);
        try {
            const totalAmount = calculateTotal();
            const componentsJson = JSON.stringify(feeComponents);

            // Insert into fee_structures
            // Note: We are using 'description' field to store the components JSON for now.
            const { error } = await supabase.from('fee_structures').insert([{
                institution_id: user.institutionId,
                name: structureName,
                amount: totalAmount,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                description: componentsJson, // Storing breakdown here
                // class_id: selectedClass.id // If column exists, good. If not, this might fail unless we check schema.
                // Safest to omit class_id if not sure, but user wants class-specific.
                // We'll rely on the name containing the context or add a meta field if possible.
            }]);

            if (error) throw error;
            toast.success("Fee structure saved successfully");
            setIsDialogOpen(false);
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error("Failed to save: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSendNotification = async () => {
        if (!selectedClass || !user?.institutionId) return;

        toast.promise(sendNotificationLogic(), {
            loading: 'Sending notifications...',
            success: 'Notifications sent to ' + selectedClass.name,
            error: 'Failed to send notifications'
        });
    };

    const sendNotificationLogic = async () => {
        // Logic: Find students in this class -> Insert notifications
        // We know class ID (selectedClass.id) but `students` table usually uses `class_name` and `section`.
        // `selectedClass.name` is the class name (e.g. "Grade 10").
        // Need to target ALL sections.

        const { data: students, error: stuError } = await supabase
            .from('students')
            .select('id, parent_id, user_id') // user_id might be student login?
            .eq('institution_id', user!.institutionId)
            .eq('class_name', selectedClass!.name); // Fetch by name to cover all sections

        if (stuError) throw stuError;
        if (!students || students.length === 0) throw new Error("No students found in this class");

        const notifications = [];
        const timestamp = new Date().toISOString();
        const message = `New Fee Structure released for ${selectedClass!.name}. Total Amount: ₹${calculateTotal()}`;

        // Notify Students (if they have user accounts) & Parents
        students.forEach(s => {
            // Notify Parent
            if (s.parent_id) {
                notifications.push({
                    user_id: s.parent_id,
                    title: 'New Fee Structure',
                    message: message,
                    type: 'fees',
                    read: false,
                    date: timestamp
                });
            }
            // Notify Student?? optional.
        });

        // Batch insert
        // Note: Supabase might have limits on batch size, but for a single class it's usually fine.
        if (notifications.length > 0) {
            const { error } = await supabase.from('notifications').insert(notifications);
            if (error) throw error;
        }
    };

    const getDisplayName = (cls: ClassItem, groupName: string) => {
        const lowerName = cls.name.toLowerCase();
        // Check if 11 or 12 or XI or XII
        if (['11', '12', 'xi', 'xii'].some(s => lowerName.includes(s))) {
            return `${cls.name} (${groupName})`;
        }
        return cls.name;
    };

    return (
        <InstitutionLayout>
            <PageHeader
                title="Fee Structures"
                subtitle="Manage and configure fees for all classes"
            />

            <div className="space-y-8 animate-in fade-in duration-500">
                {groups.map((group) => {
                    // Filter out empty groups if any, but usually we want to see hierarchy
                    if (!group.classes || group.classes.length === 0) return null;

                    return (
                        <div key={group.id} className="space-y-4">
                            <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2 flex items-center gap-2">
                                <School className="w-5 h-5" />
                                {group.name}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {group.classes.map((cls) => (
                                    <Card
                                        key={cls.id}
                                        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden border-2 border-transparent hover:border-primary"
                                        onClick={() => handleClassClick(cls, group.name)}
                                    >
                                        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[120px]">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <IndianRupee className="w-6 h-6 text-primary" />
                                            </div>
                                            <h4 className="font-bold text-lg">{getDisplayName(cls, group.name)}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">{cls.sections.length} Sections</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {groups.length === 0 && !loading && (
                    <div className="text-center py-20 text-muted-foreground">
                        No classes found. Please configure classes in Institution Settings.
                    </div>
                )}
            </div>

            {/* Class Fee Structure Dialog - Read-Only with Student Toggle */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Fee Structure: {selectedClass ? getDisplayName(selectedClass, selectedClass.groupName || '') : ''}</span>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="student-wise-toggle" className="text-sm text-muted-foreground cursor-pointer">Student-wise</Label>
                                <input
                                    type="checkbox"
                                    id="student-wise-toggle"
                                    className="w-4 h-4 cursor-pointer"
                                    checked={showStudentWise}
                                    onChange={(e) => setShowStudentWise(e.target.checked)}
                                />
                            </div>
                        </DialogTitle>
                        <DialogDescription>
                            {!showStudentWise && 'View the base fee structure for this class (Read-only)'}
                            {showStudentWise && 'Click a student to view or edit their specific fees'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
                        {!showStudentWise ? (
                            // Base Structure View (Read-Only)
                            <>
                                <div className="grid grid-cols-2 gap-4 opacity-75">
                                    <div className="space-y-2">
                                        <Label>Fee Title</Label>
                                        <Input value={structureName} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Due Date</Label>
                                        <Input type="date" value={dueDate} disabled />
                                    </div>
                                </div>

                                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                                    <div className="flex justify-between items-center mb-2">
                                        <Label className="text-base font-semibold">Fee Breakdown</Label>
                                        <Badge variant="outline">Total: ₹{calculateTotal().toLocaleString()}</Badge>
                                    </div>

                                    {feeComponents.map((comp) => (
                                        <div key={comp.id} className="grid grid-cols-12 gap-2 p-2 rounded-md bg-muted/30">
                                            <div className="col-span-8 space-y-1">
                                                <Label className="text-xs text-muted-foreground">Title</Label>
                                                <p className="text-sm font-medium">{comp.title}</p>
                                            </div>
                                            <div className="col-span-4 space-y-1 text-right">
                                                <Label className="text-xs text-muted-foreground">Amount</Label>
                                                <p className="text-sm font-medium">₹{parseFloat(comp.amount).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <p className="text-xs text-muted-foreground text-center">This is a read-only view. Use the "Create Fee Structure" wizard in Fee Management to modify.</p>
                            </>
                        ) : (
                            // Student List View
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground mb-4">
                                    {studentsInClass.length} students in {selectedClass?.name}
                                </p>
                                {studentsInClass.map((student) => (
                                    <div
                                        key={student.id}
                                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex justify-between items-center"
                                        onClick={() => handleViewStudentFee(student)}
                                    >
                                        <div>
                                            <p className="font-medium">{student.name}</p>
                                            <p className="text-xs text-muted-foreground">{student.register_number}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                ))}
                                {studentsInClass.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No students found in this class</p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Student Fee Dialog - View/Edit */}
            <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Fee Details: {selectedStudent?.name}</span>
                            {!isEditingStudent && (
                                <Button size="sm" variant="outline" onClick={handleEditStudentFee} className="gap-2">
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                </Button>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditingStudent ? 'Modify the fee components' : 'Read-only view of student fees'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
                        <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                            <div className="flex justify-between items-center mb-2">
                                <Label className="text-base font-semibold">Fee Components</Label>
                                <Badge variant="outline">Total: ₹{studentFeeComponents.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toLocaleString()}</Badge>
                            </div>

                            {studentFeeComponents.map((comp) => (
                                <div key={comp.id} className="grid grid-cols-12 gap-2 p-2 rounded-md items-end">
                                    {isEditingStudent ? (
                                        <>
                                            <div className="col-span-7 space-y-1">
                                                <Label className="text-xs text-muted-foreground">Title</Label>
                                                <Input
                                                    value={comp.title}
                                                    onChange={(e) => setStudentFeeComponents(studentFeeComponents.map(c => c.id === comp.id ? { ...c, title: e.target.value } : c))}
                                                />
                                            </div>
                                            <div className="col-span-4 space-y-1">
                                                <Label className="text-xs text-muted-foreground">Amount</Label>
                                                <Input
                                                    type="number"
                                                    value={comp.amount}
                                                    onChange={(e) => setStudentFeeComponents(studentFeeComponents.map(c => c.id === comp.id ? { ...c, amount: e.target.value } : c))}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => setStudentFeeComponents(studentFeeComponents.filter(c => c.id !== comp.id))}
                                                    disabled={studentFeeComponents.length === 1}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="col-span-8 space-y-1">
                                                <Label className="text-xs text-muted-foreground">Title</Label>
                                                <p className="text-sm font-medium">{comp.title}</p>
                                            </div>
                                            <div className="col-span-4 space-y-1 text-right">
                                                <Label className="text-xs text-muted-foreground">Amount</Label>
                                                <p className="text-sm font-medium">₹{parseFloat(comp.amount).toLocaleString()}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}

                            {isEditingStudent && (
                                <div className="pt-2">
                                    <Button
                                        onClick={() => setStudentFeeComponents([...studentFeeComponents, { id: Date.now().toString(), title: '', amount: '0' }])}
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-dashed"
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Add Component
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        {isEditingStudent ? (
                            <>
                                <Button variant="outline" onClick={() => setIsEditingStudent(false)}>Cancel</Button>
                                <Button onClick={handleSaveStudentFee} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={() => setIsStudentDialogOpen(false)}>Close</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </InstitutionLayout>
    );
}
