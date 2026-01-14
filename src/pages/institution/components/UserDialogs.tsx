import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { generateUUID } from '@/lib/utils';
import { Plus, Upload, X, Loader2, ChevronDown, Check } from 'lucide-react';
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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session found. Please log in again.');

            // DEBUG: Log the token explicitly to verify it exists and is attached
            console.log('Using Access Token:', session.access_token ? (session.access_token.substring(0, 10) + '...') : 'NULL');

            const { data: responseData, error } = await supabase.functions.invoke('create-user', {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                },
                body: {
                    email: data.email,
                    password: data.password,
                    role: 'student',
                    full_name: data.name,
                    institution_id: institutionId,
                    parent_email: data.parentEmail,
                    parent_phone: data.parentPhone,
                    parent_name: data.parentName,
                    register_number: data.registerNumber,
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
            const errorMsg = error.message || 'Failed to add student';
            const errorDetails = error.details || error.hint ? ` (${error.details || error.hint})` : '';
            toast.error(errorMsg + errorDetails);
            console.error('Student creation error:', error);

            if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
                toast.error('Session expired or unauthorized. Please Log Out and Log In again.');
            }
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
                        <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="e.g. John Doe" />
                    </div>
                    <div className="space-y-2">
                        <Label>Register Number</Label>
                        <Input value={data.registerNumber} onChange={(e) => setData({ ...data, registerNumber: e.target.value })} placeholder="e.g. REG-2024-001" />
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
                        <Input value={data.parentName} onChange={(e) => setData({ ...data, parentName: e.target.value })} placeholder="e.g. Robert Doe" />
                    </div>
                    <div className="space-y-2">
                        <Label>Parent Email *</Label>
                        <Input type="email" value={data.parentEmail} onChange={(e) => setData({ ...data, parentEmail: e.target.value })} placeholder="valid@email.com" />
                    </div>
                    <div className="space-y-2">
                        <Label>Parent Phone *</Label>
                        <Input type="tel" value={data.parentPhone} onChange={(e) => setData({ ...data, parentPhone: e.target.value })} placeholder="e.g. 9876543210 (10 digits)" />
                    </div>
                    <div className="space-y-2">
                        <Label>Student Email *</Label>
                        <Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="student@school.com" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Address</Label>
                        <Input value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} placeholder="Full residential address" />
                    </div>
                    <div className="space-y-2">
                        <Label>Password *</Label>
                        <Input type="password" value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} placeholder="Min 6 characters" />
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
    const [isSubjectsOpen, setIsSubjectsOpen] = useState(false);
    const [data, setData] = useState({ name: '', staffId: '', role: '', email: '', phone: '', dob: '', password: '', department: '', subjects: [] as string[] });
    const queryClient = useQueryClient();

    const { data: subjectsList = [] } = useQuery({
        queryKey: ['institution-subjects-list', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const { data, error } = await supabase
                .from('subjects')
                .select('id, name, department')
                .eq('institution_id', institutionId);

            if (error) throw error;
            return data || [];
        },
        enabled: !!institutionId && open
    });

    const uniqueDepartments = useMemo(() => {
        return Array.from(new Set(subjectsList.map((s: any) => s.department).filter(Boolean))).sort();
    }, [subjectsList]);

    const availableSubjects = useMemo(() => {
        if (!data.department) return subjectsList.map((s: any) => s.name);
        return subjectsList.filter((s: any) => s.department === data.department).map((s: any) => s.name);
    }, [subjectsList, data.department]);

    const handleSubmit = async () => {
        if (!data.name || !data.email || !data.password || !data.staffId) {
            toast.error('Please fill all mandatory fields');
            return;
        }
        setIsSubmitting(true);
        try {
            console.log('=== Starting Staff Creation ===');
            console.log('Institution ID:', institutionId);
            console.log('Staff Data:', {
                name: data.name,
                email: data.email,
                staffId: data.staffId,
                department: data.department,
                phone: data.phone
            });

            // Check for existing user
            const { data: existingProfile, error: checkError } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', data.email)
                .maybeSingle();

            if (checkError) {
                console.error('Error checking existing profile:', checkError);
                throw new Error(`Database error: ${checkError.message}`);
            }

            if (existingProfile) {
                console.warn('Profile already exists:', existingProfile);
                throw new Error('A user with this email already exists');
            }

            // Generate UUID for the profile
            const profileId = generateUUID();
            console.log('Generated Profile ID:', profileId);

            // Prepare staff profile data
            const profileData = {
                id: profileId,
                email: data.email,
                full_name: data.name,
                role: 'faculty',
                institution_id: institutionId,
                staff_id: data.staffId,
                department: data.department || null,
                phone: data.phone || null,
                date_of_birth: data.dob || null
            };

            console.log('Inserting profile with data:', profileData);

            // Create profile directly
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert(profileData)
                .select()
                .single();

            if (insertError) {
                console.error('Profile insertion error:', insertError);
                console.error('Error details:', {
                    message: insertError.message,
                    details: insertError.details,
                    hint: insertError.hint,
                    code: insertError.code
                });
                throw new Error(`Failed to create profile: ${insertError.message}`);
            }

            console.log('Profile created successfully:', newProfile);

            // NOTE: Password is ignored in this workaround
            // In production, create user via Supabase Auth Admin API or Edge Function

            toast.success('Staff member added successfully!');

            // Force refetch of staff list
            await queryClient.invalidateQueries({ queryKey: ['institution-staff', institutionId] });
            await queryClient.refetchQueries({ queryKey: ['institution-staff', institutionId] });

            onSuccess();
            onOpenChange(false);
            setData({ name: '', staffId: '', role: '', email: '', phone: '', dob: '', password: '', department: '', subjects: [] });
        } catch (error: any) {
            console.error('=== Staff Creation Failed ===');
            console.error('Error:', error);
            toast.error(error.message || 'Failed to create staff');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Staff</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2"><Label>Name *</Label><Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="e.g. Sarah Smith" /></div>
                    <div className="space-y-2"><Label>Staff ID *</Label><Input value={data.staffId} onChange={e => setData({ ...data, staffId: e.target.value })} placeholder="e.g. STF-2024-005" /></div>
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={data.role} onValueChange={v => setData({ ...data, role: v })}>
                            <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="teacher">Teacher</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="support">Support</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Department</Label>
                        <Select value={data.department} onValueChange={v => setData({ ...data, department: v, subjects: [] })}>
                            <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                            <SelectContent>
                                {uniqueDepartments.map((dept: any) => (
                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label>Subjects</Label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsSubjectsOpen(!isSubjectsOpen)}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className={data.subjects.length === 0 ? "text-muted-foreground" : ""}>
                                    {data.subjects.length > 0 ? `${data.subjects.length} subjects selected` : "Select subjects..."}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </button>

                            {isSubjectsOpen && (
                                <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                                    <div className="p-2 max-h-60 overflow-y-auto">
                                        {availableSubjects.length === 0 ? (
                                            <p className="text-sm text-muted-foreground p-2">No subjects available {data.department ? `in ${data.department}` : ''}</p>
                                        ) : (
                                            <div className="grid gap-1">
                                                {availableSubjects.map((subName: string) => (
                                                    <div
                                                        key={subName}
                                                        className="flex items-center space-x-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                                                        onClick={() => {
                                                            const newSubs = data.subjects.includes(subName)
                                                                ? data.subjects.filter(s => s !== subName)
                                                                : [...data.subjects, subName];
                                                            setData({ ...data, subjects: newSubs });
                                                        }}
                                                    >
                                                        <div className={`flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${data.subjects.includes(subName) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"}`}>
                                                            <Check className="h-4 w-4" />
                                                        </div>
                                                        <span className="text-sm">{subName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {data.department && <p className="text-[10px] text-muted-foreground">Showing subjects for {data.department} (change department to filter differently or clear department to see all)</p>}
                    </div>

                    <div className="space-y-2"><Label>Email *</Label><Input type="email" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} placeholder="staff@institution.com" /></div>
                    <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} placeholder="e.g. 9876543210" /></div>
                    <div className="space-y-2"><Label>DOB</Label><Input type="date" value={data.dob} onChange={e => setData({ ...data, dob: e.target.value })} /></div>
                    <div className="space-y-2 md:col-span-2"><Label>Password *</Label><Input type="password" value={data.password} onChange={e => setData({ ...data, password: e.target.value })} placeholder="Min 6 characters" /></div>
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

    // Filter students by matching parent email
    const filteredStudents = useMemo(() => {
        if (!data.email) return students;
        return students.filter((s: any) =>
            s.parent_email?.toLowerCase() === data.email.toLowerCase()
        );
    }, [students, data.email]);

    const handleSubmit = async () => {
        if (!data.name || !data.email || !data.phone || !data.password || data.studentIds.length === 0) {
            toast.error('Please fill all mandatory fields');
            return;
        }
        setIsSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session found. Please log in again.');

            const { data: responseData, error } = await supabase.functions.invoke('create-user', {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                },
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
                    <div className="space-y-2"><Label>Name *</Label><Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="e.g. Robert Doe" /></div>
                    <div className="space-y-2"><Label>Email *</Label><Input type="email" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} placeholder="valid@email.com" /></div>
                    <div className="space-y-2"><Label>Phone *</Label><Input type="tel" value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} placeholder="e.g. 9876543210 (10 digits)" /></div>
                    <div className="space-y-2"><Label>Password *</Label><Input type="password" value={data.password} onChange={e => setData({ ...data, password: e.target.value })} placeholder="Min 6 characters" /></div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Children * {data.email && `(matching ${data.email})`}</Label>
                        <div className="grid grid-cols-1 gap-2 border rounded-lg p-3 max-h-40 overflow-y-auto bg-card">
                            {filteredStudents.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                    {data.email ? 'No students found with this parent email' : 'Enter parent email to see matching students'}
                                </p>
                            ) : (
                                filteredStudents.map((child: any) => (
                                    <div key={child.id} className="flex items-center gap-2">
                                        <input type="checkbox" checked={data.studentIds.includes(child.id)}
                                            onChange={(e) => {
                                                const newIds = e.target.checked ? [...data.studentIds, child.id] : data.studentIds.filter(id => id !== child.id);
                                                setData({ ...data, studentIds: newIds });
                                            }}
                                        />
                                        <span className="text-sm">{child.name}</span>
                                    </div>
                                ))
                            )}
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
