import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient, useQuery } from '@tanstack/react-query';

// --- SUB-COMPONENTS ---

function AddStudentDialog({ open, onOpenChange, onSuccess, institutionId }: any) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [data, setData] = useState({
        name: '', registerNumber: '', className: '', section: '', dob: '', gender: '',
        parentName: '', parentEmail: '', parentPhone: '', email: '', address: '', password: ''
    });
    const queryClient = useQueryClient();

    // Fetch Classes
    const { data: groups = [] } = useQuery({
        queryKey: ['institution-groups', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const { data, error } = await supabase
                .from('groups')
                .select('id, name, classes(id, name, sections)')
                .eq('institution_id', institutionId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!institutionId && open
    });

    const availableClasses = useMemo(() => {
        return groups.flatMap((g: any) =>
            g.classes.map((c: any) => ({
                id: c.id,
                name: c.name,
                sections: c.sections || []
            }))
        );
    }, [groups]);

    const availableSections = useMemo(() => {
        const selectedClass = availableClasses.find(c => c.name === data.className);
        return selectedClass ? selectedClass.sections : [];
    }, [availableClasses, data.className]);


    const handleSubmit = async () => {
        if (!data.name || !data.email || !data.password || !data.parentEmail || !data.parentPhone) {
            toast.error('Please fill all mandatory fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: data.email,
                    password: data.password,
                    role: 'student',
                    full_name: data.name,
                    institution_id: institutionId,
                    parent_email: data.parentEmail,
                    parent_phone: data.parentPhone,
                    parent_name: data.parentName,
                    class_name: data.className,
                    section: data.section
                }
            });

            if (error) throw error;
            toast.success('Student added successfully');
            // Optimistic update or immediate fetch
            queryClient.invalidateQueries({ queryKey: ['institution-students'] });
            onSuccess();
            onOpenChange(false);
            setData({ name: '', registerNumber: '', className: '', section: '', dob: '', gender: '', parentName: '', parentEmail: '', parentPhone: '', email: '', address: '', password: '' });
        } catch (error: any) {
            toast.error(error.message || 'Failed to add student');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Student</DialogTitle>
                    <DialogDescription>Fill in student details.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {/* Inputs with local state 'data' */}
                    <div className="space-y-2">
                        <Label>Student Name *</Label>
                        <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Register Number</Label>
                        <Input value={data.registerNumber} onChange={(e) => setData({ ...data, registerNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Class</Label>
                        <Select value={data.className} onValueChange={(val) => setData({ ...data, className: val, section: '' })}>
                            <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                            <SelectContent>
                                {availableClasses.map((c: any) => (
                                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Section</Label>
                        <Select value={data.section} onValueChange={(val) => setData({ ...data, section: val })} disabled={!data.className}>
                            <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                            <SelectContent>
                                {availableSections.map((sec: string) => (
                                    <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input type="date" value={data.dob} onChange={(e) => setData({ ...data, dob: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select value={data.gender} onValueChange={(val) => setData({ ...data, gender: val })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Parent Name</Label>
                        <Input value={data.parentName} onChange={(e) => setData({ ...data, parentName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Parent Email *</Label>
                        <Input type="email" value={data.parentEmail} onChange={(e) => setData({ ...data, parentEmail: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Parent Phone *</Label>
                        <Input type="tel" value={data.parentPhone} onChange={(e) => setData({ ...data, parentPhone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Student Email *</Label>
                        <Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Address</Label>
                        <Input value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Password *</Label>
                        <Input type="password" value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Student
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddStaffDialog({ open, onOpenChange, onSuccess, institutionId }: any) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [data, setData] = useState({ name: '', staffId: '', role: '', email: '', phone: '', dob: '', password: '' });
    const queryClient = useQueryClient();

    const handleSubmit = async () => {
        if (!data.name || !data.email || !data.password || !data.staffId) {
            toast.error('Please fill all mandatory fields');
            return;
        }
        setIsSubmitting(true);
        try {
            const { error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: data.email,
                    password: data.password,
                    role: 'faculty',
                    full_name: data.name,
                    institution_id: institutionId,
                    staff_id: data.staffId
                }
            });
            if (error) throw error;
            toast.success('Staff added');
            queryClient.invalidateQueries({ queryKey: ['institution-staff'] });
            onSuccess();
            onOpenChange(false);
            setData({ name: '', staffId: '', role: '', email: '', phone: '', dob: '', password: '' });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Add Staff</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2"><Label>Name *</Label><Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Staff ID *</Label><Input value={data.staffId} onChange={e => setData({ ...data, staffId: e.target.value })} /></div>
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={data.role} onValueChange={v => setData({ ...data, role: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="teacher">Teacher</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="support">Support</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label>Email *</Label><Input type="email" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} /></div>
                    <div className="space-y-2"><Label>DOB</Label><Input type="date" value={data.dob} onChange={e => setData({ ...data, dob: e.target.value })} /></div>
                    <div className="space-y-2 md:col-span-2"><Label>Password *</Label><Input type="password" value={data.password} onChange={e => setData({ ...data, password: e.target.value })} /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>Add Staff</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddParentDialog({ open, onOpenChange, onSuccess, institutionId, students }: any) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [data, setData] = useState({ name: '', email: '', phone: '', password: '', studentIds: [] as string[] });
    const queryClient = useQueryClient();

    const handleSubmit = async () => {
        if (!data.name || !data.email || !data.phone || !data.password || data.studentIds.length === 0) {
            toast.error('Please fill all mandatory fields');
            return;
        }
        setIsSubmitting(true);
        try {
            const { data: responseData, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: data.email,
                    password: data.password,
                    role: 'parent',
                    full_name: data.name,
                    institution_id: institutionId,
                    phone: data.phone,
                    student_id: data.studentIds[0],
                    student_ids: data.studentIds
                }
            });

            if (error) throw error;

            if (responseData?.user?.id && data.studentIds.length > 0) {
                // Link multiple logic (same as before)
                const { data: parentRecord } = await supabase.from('parents').select('id').eq('profile_id', responseData.user.id).single();
                if (parentRecord) {
                    const links = data.studentIds.map(sId => ({ student_id: sId, parent_id: parentRecord.id }));
                    await supabase.from('student_parents').upsert(links, { onConflict: 'student_id,parent_id' });
                }
            }
            toast.success('Parent added');
            queryClient.invalidateQueries({ queryKey: ['institution-parents'] });
            onSuccess();
            onOpenChange(false);
            setData({ name: '', email: '', phone: '', password: '', studentIds: [] });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Add Parent</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2"><Label>Name *</Label><Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Email *</Label><Input type="email" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Phone *</Label><Input type="tel" value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Password *</Label><Input type="password" value={data.password} onChange={e => setData({ ...data, password: e.target.value })} /></div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Children *</Label>
                        <div className="grid grid-cols-1 gap-2 border rounded-lg p-3 max-h-40 overflow-y-auto bg-card">
                            {students.map((child: any) => (
                                <div key={child.id} className="flex items-center gap-2">
                                    <input type="checkbox" checked={data.studentIds.includes(child.id)}
                                        onChange={(e) => {
                                            const newIds = e.target.checked ? [...data.studentIds, child.id] : data.studentIds.filter(id => id !== child.id);
                                            setData({ ...data, studentIds: newIds });
                                        }}
                                    />
                                    <span className="text-sm">{child.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>Add Parent</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export { AddStudentDialog, AddStaffDialog, AddParentDialog };
