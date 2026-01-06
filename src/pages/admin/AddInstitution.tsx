import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { BulkUploadService } from '@/services/BulkUploadService';
import { toast } from 'sonner';
import {
    Building2,
    MapPin,
    Users,
    BookOpen,
    GraduationCap,
    UserCog,
    Check,
    ChevronRight,
    ChevronLeft,
    Upload,
    Download,
    Plus,
    Trash2,
    X,
    Loader2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Group {
    id: string;
    name: string;
    classes: ClassItem[];
}

interface ClassItem {
    id: string;
    name: string;
    sections: string[];
}

interface Subject {
    id: string;
    name: string;
    code: string;
    className: string;
    group: string;
}

interface Student {
    id: string;
    name: string;
    registerNumber: string;
    class: string;
    section: string;
    dob: string;
    gender: string;
    parentName: string;
    parentContact: string;
    email: string;
    address: string;
}

interface Staff {
    id: string;
    name: string;
    staffId: string;
    role: string;
    subjectAssigned: string;
    classAssigned: string;
    sectionAssigned: string; // Added section
    email: string;
    phone: string;
    dob: string; // Added for password generation
}

const steps = [
    { id: 1, name: 'Basic Details', icon: Building2 },
    { id: 2, name: 'Groups & Classes', icon: BookOpen },
    { id: 3, name: 'Subjects', icon: BookOpen },
    { id: 4, name: 'Students', icon: GraduationCap },
    { id: 5, name: 'Staff', icon: UserCog },
    { id: 6, name: 'Access & Roles', icon: Users },
];

export function AddInstitution() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isEditMode = searchParams.get('mode') === 'edit';
    const editId = searchParams.get('id');
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Basic Details
    const [institutionName, setInstitutionName] = useState('');
    const [institutionType, setInstitutionType] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [academicYear, setAcademicYear] = useState('');
    const [logo, setLogo] = useState<File | null>(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [institutionStatus, setInstitutionStatus] = useState('active');
    const [institutionId, setInstitutionId] = useState(''); // School Code

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditMode);

    useEffect(() => {
        if (isEditMode && editId) {
            fetchInstitutionData();
        }
    }, [isEditMode, editId]);

    const fetchInstitutionData = async () => {
        try {
            // 1. Fetch Institution
            const { data: inst, error: instError } = await supabase
                .from('institutions')
                .select('*')
                .eq('institution_id', editId)
                .single();

            if (instError) throw instError;

            setInstitutionName(inst.name);
            setInstitutionType(inst.type);
            setAddress(inst.address);
            setCity(inst.city);
            setState(inst.state);
            setContactEmail(inst.email);
            setContactPhone(inst.phone);
            setAcademicYear(inst.academic_year);
            setLogoUrl(inst.logo_url);
            setInstitutionStatus(inst.status);
            setInstitutionId(inst.institution_id);

            // 2. Fetch Groups & Classes
            const { data: groupsData, error: groupsError } = await supabase
                .from('groups')
                .select(`
                    id,
                    name,
                    classes (
                        id,
                        name,
                        sections
                    )
                `)
                .eq('institution_id', editId);

            if (groupsError) throw groupsError;
            setGroups(groupsData || []);

            // 3. Fetch Subjects
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select('*')
                .eq('institution_id', editId);

            if (subjectsError) throw subjectsError;
            setSubjects(subjectsData?.map(s => ({
                id: s.id,
                name: s.name,
                code: s.code,
                className: s.class_name,
                group: s.group_name
            })) || []);

            // 4. Fetch Students
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .eq('institution_id', editId);

            if (studentsError) throw studentsError;
            setStudents(studentsData?.map((s: any) => ({
                id: s.id,
                name: s.name,
                registerNumber: s.register_number,
                class: s.class_name,
                section: s.section,
                dob: s.dob,
                gender: s.gender,
                parentName: s.parent_name,
                parentContact: s.parent_contact,
                email: s.email,
                address: s.address
            })) || []);

            // 5. Fetch Staff
            const { data: staffData, error: staffError } = await supabase
                .from('staff_details')
                .select(`
                    id,
                    staff_id,
                    role,
                    subject_assigned,
                    class_assigned,
                    section_assigned,
                    profile:profiles (
                        full_name,
                        email
                    )
                `)
                .eq('institution_id', editId);

            if (staffError) throw staffError;
            setStaff(staffData?.map((s: any) => ({
                id: s.id,
                name: s.profile?.full_name || '',
                staffId: s.staff_id,
                role: s.role,
                subjectAssigned: s.subject_assigned,
                classAssigned: s.class_assigned,
                sectionAssigned: s.section_assigned,
                email: s.profile?.email || '',
                phone: '',
                dob: ''
            })) || []);

        } catch (error: any) {
            toast.error(`Error fetching data: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Groups & Classes
    const [groups, setGroups] = useState<Group[]>([]);
    const [hasHigherSecondary, setHasHigherSecondary] = useState(false);

    // Step 3: Subjects
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // Step 4: Students
    const [studentInputMethod, setStudentInputMethod] = useState<'manual' | 'excel'>('manual');
    const [students, setStudents] = useState<Student[]>([]);
    const [studentFile, setStudentFile] = useState<File | null>(null);

    // Step 5: Staff
    const [staffInputMethod, setStaffInputMethod] = useState<'manual' | 'excel'>('manual');
    const [staff, setStaff] = useState<Staff[]>([]);
    const [staffFile, setStaffFile] = useState<File | null>(null);

    const addGroup = () => {
        setGroups([...groups, { id: Date.now().toString(), name: '', classes: [] }]);
    };

    const removeGroup = (groupId: string) => {
        setGroups(groups.filter(g => g.id !== groupId));
    };

    const updateGroup = (groupId: string, name: string) => {
        setGroups(groups.map(g => g.id === groupId ? { ...g, name } : g));
    };

    const addClass = (groupId: string) => {
        setGroups(groups.map(g =>
            g.id === groupId
                ? { ...g, classes: [...g.classes, { id: Date.now().toString(), name: '', sections: [] }] }
                : g
        ));
    };

    const removeClass = (groupId: string, classId: string) => {
        setGroups(groups.map(g =>
            g.id === groupId
                ? { ...g, classes: g.classes.filter(c => c.id !== classId) }
                : g
        ));
    };

    const updateClass = (groupId: string, classId: string, name: string) => {
        setGroups(groups.map(g =>
            g.id === groupId
                ? { ...g, classes: g.classes.map(c => c.id === classId ? { ...c, name } : c) }
                : g
        ));
    };

    const addSection = (groupId: string, classId: string, section: string) => {
        setGroups(groups.map(g =>
            g.id === groupId
                ? {
                    ...g,
                    classes: g.classes.map(c =>
                        c.id === classId
                            ? { ...c, sections: [...c.sections, section] }
                            : c
                    )
                }
                : g
        ));
    };

    const removeSection = (groupId: string, classId: string, section: string) => {
        setGroups(groups.map(g =>
            g.id === groupId
                ? {
                    ...g,
                    classes: g.classes.map(c =>
                        c.id === classId
                            ? { ...c, sections: c.sections.filter(s => s !== section) }
                            : c
                    )
                }
                : g
        ));
    };

    const applyDefaultStructure = () => {
        const defaultGroups: Group[] = [
            {
                id: 'primary',
                name: 'Primary School (LKG - 5th)',
                classes: [
                    { id: 'lkg', name: 'LKG', sections: ['A'] },
                    { id: 'ukg', name: 'UKG', sections: ['A'] },
                    { id: 'c1', name: '1st', sections: ['A'] },
                    { id: 'c2', name: '2nd', sections: ['A'] },
                    { id: 'c3', name: '3rd', sections: ['A'] },
                    { id: 'c4', name: '4th', sections: ['A'] },
                    { id: 'c5', name: '5th', sections: ['A'] },
                ]
            },
            {
                id: 'middle',
                name: 'Middle School (6th - 8th)',
                classes: [
                    { id: 'c6', name: '6th', sections: ['A'] },
                    { id: 'c7', name: '7th', sections: ['A'] },
                    { id: 'c8', name: '8th', sections: ['A'] },
                ]
            },
            {
                id: 'high',
                name: 'High School (9th - 10th)',
                classes: [
                    { id: 'c9', name: '9th', sections: ['A'] },
                    { id: 'c10', name: '10th', sections: ['A'] },
                ]
            }
        ];

        if (hasHigherSecondary) {
            defaultGroups.push({
                id: 'higher-secondary',
                name: 'Higher Secondary (11th - 12th)',
                classes: [
                    { id: 'c11', name: '11th', sections: ['A'] },
                    { id: 'c12', name: '12th', sections: ['A'] }
                ]
            });
        }

        if (groups.length > 0) {
            if (!confirm('This will replace your current group structure. Continue?')) return;
        }

        setGroups(defaultGroups);
        toast.success('Default school structure applied!');
    };

    const allAvailableClasses = groups.flatMap(g => g.classes.map(c => ({ ...c, groupName: g.name })));
    const allAvailableSubjects = subjects.map(s => s.name);

    const addSubject = () => {
        setSubjects([...subjects, {
            id: Date.now().toString(),
            name: '',
            code: '',
            className: '',
            group: ''
        }]);
    };

    const removeSubject = (subjectId: string) => {
        setSubjects(subjects.filter(s => s.id !== subjectId));
    };

    const updateSubject = (subjectId: string, field: keyof Subject, value: string) => {
        setSubjects(subjects.map(s => s.id === subjectId ? { ...s, [field]: value } : s));
    };

    const addStudent = () => {
        setStudents([...students, {
            id: Date.now().toString(),
            name: '',
            registerNumber: '',
            class: '',
            section: '',
            dob: '',
            gender: '',
            parentName: '',
            parentContact: '',
            email: '',
            address: '',
        }]);
    };

    const removeStudent = (studentId: string) => {
        setStudents(students.filter(s => s.id !== studentId));
    };

    const updateStudent = (studentId: string, field: keyof Student, value: string) => {
        setStudents(students.map(s => s.id === studentId ? { ...s, [field]: value } : s));
    };

    const addStaffMember = () => {
        setStaff([...staff, {
            id: Date.now().toString(),
            name: '',
            staffId: '',
            role: '',
            subjectAssigned: '',
            classAssigned: '',
            sectionAssigned: '',
            email: '',
            phone: '',
            dob: '',
        }]);
    };

    const removeStaffMember = (staffId: string) => {
        setStaff(staff.filter(s => s.id !== staffId));
    };

    const updateStaffMember = (staffId: string, field: keyof Staff, value: string) => {
        setStaff(staff.map(s => s.id === staffId ? { ...s, [field]: value } : s));
    };

    const handleNext = () => {
        if (currentStep < 6) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const loadingToast = toast.loading('Step 1/6: Uploading logo...');

        try {
            // 1. Upload Logo if exists
            let uploadedLogoUrl = '';
            if (logo) {
                const fileExt = logo.name.split('.').pop();
                const fileName = `${institutionId}-${Math.random()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(fileName, logo);

                if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);

                const { data: { publicUrl } } = supabase.storage
                    .from('logos')
                    .getPublicUrl(fileName);

                uploadedLogoUrl = publicUrl;
            }

            // 2. Create/Update Institution
            toast.loading('Step 2/6: Saving institution details...', { id: loadingToast });
            const institutionData: any = {
                institution_id: institutionId,
                name: institutionName,
                type: institutionType,
                address: address,
                city: city,
                state: state,
                email: contactEmail,
                phone: contactPhone,
                academic_year: academicYear,
                status: institutionStatus
            };

            if (uploadedLogoUrl) {
                institutionData.logo_url = uploadedLogoUrl;
            } else if (isEditMode && logoUrl) {
                // Keep existing logoUrl
                institutionData.logo_url = logoUrl;
            }

            const { error: instError } = await supabase
                .from('institutions')
                .upsert([institutionData], { onConflict: 'institution_id' });

            if (instError) throw new Error(`Failed to create institution: ${instError.message}`);

            // 3. Create Groups & Classes
            toast.loading('Step 3/6: Creating groups and classes...', { id: loadingToast });
            for (const group of groups) {
                const { data: groupData, error: groupError } = await supabase
                    .from('groups')
                    .insert([{ name: group.name, institution_id: institutionId }])
                    .select()
                    .single();

                if (groupError) throw groupError;

                if (group.classes.length > 0) {
                    const classesToInsert = group.classes.map(c => ({
                        group_id: groupData.id,
                        name: c.name,
                        sections: c.sections
                    }));
                    const { error: classError } = await supabase.from('classes').insert(classesToInsert);
                    if (classError) throw classError;
                }
            }

            // 4. Create Subjects
            toast.loading('Step 4/6: Adding subjects...', { id: loadingToast });
            if (subjects.length > 0) {
                const subjectsToInsert = subjects.map(s => ({
                    institution_id: institutionId,
                    name: s.name,
                    code: s.code,
                    class_name: s.className,
                    group_name: s.group
                }));
                const { error: subError } = await supabase.from('subjects').insert(subjectsToInsert);
                if (subError) throw subError;
            }

            // 5. Create Students & Provision Accounts
            toast.loading('Step 5/6: Processing students...', { id: loadingToast });
            let finalStudents = [...students];
            if (studentFile) {
                const excelData = await BulkUploadService.parseExcel(studentFile);
                finalStudents = [...finalStudents, ...excelData];
            }

            if (finalStudents.length > 0) {
                // Insert into public.students table
                const studentsToInsert = finalStudents.map((s: any) => ({
                    institution_id: institutionId,
                    name: s.name,
                    register_number: s.register_number || s.registerNumber,
                    class_name: s.class_name || s.class || s.className,
                    section: s.section,
                    dob: s.dob,
                    gender: s.gender,
                    parent_name: s.parent_name || s.parentName,
                    parent_contact: s.parent_contact || s.parentContact,
                    email: s.email,
                    address: s.address
                }));
                const { error: stdError } = await supabase.from('students').insert(studentsToInsert);
                if (stdError) throw stdError;

                // Provision Auth Accounts for Students
                const studentProvisionData = finalStudents.filter(s => s.email).map(s => ({
                    ...s,
                    role: 'student'
                }));

                if (studentProvisionData.length > 0) {
                    const results = await BulkUploadService.bulkCreateUsers(
                        studentProvisionData as any,
                        institutionId,
                        (current, total) => {
                            toast.loading(`Step 5/6: Provisioning students (${current}/${total})...`, { id: loadingToast });
                        }
                    );
                    const successfulCount = results.filter(r => r.status === 'success').length;
                    if (successfulCount > 0) {
                        BulkUploadService.downloadResults(results, `${institutionId}-student-credentials.xlsx`);
                    }
                }
            }

            // 6. Create Staff (Bulk User Creation)
            toast.loading('Step 6/6: Provisioning staff accounts...', { id: loadingToast });
            let finalStaff = [...staff];
            if (staffFile) {
                const excelData = await BulkUploadService.parseExcel(staffFile);
                finalStaff = [...finalStaff, ...excelData.map(s => ({ ...s, role: 'faculty' }))];
            }

            if (finalStaff.length > 0) {
                // Ensure manual staff entries have faculty role if not specified
                const staffToProvision = finalStaff.filter(s => s.email).map(s => ({
                    ...s,
                    role: s.role || 'faculty'
                }));

                const results = await BulkUploadService.bulkCreateUsers(
                    staffToProvision as any,
                    institutionId,
                    (current, total) => {
                        toast.loading(`Step 6/6: Provisioning staff (${current}/${total})...`, { id: loadingToast });
                    }
                );

                const successfulCount = results.filter(r => r.status === 'success').length;

                if (successfulCount > 0) {
                    // Sync staff details to public.staff_details table
                    const staffDetailsToInsert = results
                        .filter(r => r.status === 'success')
                        .map(r => {
                            const original = staffToProvision.find(s => s.email === r.email);
                            return {
                                profile_id: r.userId,
                                institution_id: institutionId,
                                staff_id: original?.staffId || (original as any).staff_id,
                                role: original?.role,
                                subject_assigned: original?.subjectAssigned || (original as any).subject_assigned,
                                class_assigned: original?.classAssigned || (original as any).class_assigned,
                                section_assigned: original?.sectionAssigned || (original as any).section_assigned
                            };
                        })
                        .filter(sd => sd.profile_id);

                    if (staffDetailsToInsert.length > 0) {
                        const { error: sdError } = await supabase.from('staff_details').insert(staffDetailsToInsert);
                        if (sdError) console.error('Error inserting staff details:', sdError);
                    }

                    BulkUploadService.downloadResults(results, `${institutionId}-staff-credentials.xlsx`);
                }
            }

            toast.dismiss(loadingToast);
            toast.success('Institution onboarding completed successfully!');
            navigate('/admin');
        } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error(`Error: ${error.message}`);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadTemplate = (type: 'student' | 'staff') => {
        BulkUploadService.generateTemplate(type);
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold mb-4">{isEditMode ? 'Edit Institution Details' : 'Basic Institution Details'}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="institutionName">Institution Name *</Label>
                                <Input
                                    id="institutionName"
                                    value={institutionName}
                                    onChange={(e) => setInstitutionName(e.target.value)}
                                    placeholder="Enter institution name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="schoolCode">School Code *</Label>
                                <Input
                                    id="schoolCode"
                                    value={institutionId}
                                    onChange={(e) => setInstitutionId(e.target.value)}
                                    placeholder="Enter unique school code (e.g. SCH001)"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="institutionType">Institution Type *</Label>
                                <Select value={institutionType} onValueChange={setInstitutionType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="matriculation">Matriculation</SelectItem>
                                        <SelectItem value="cbse">CBSE</SelectItem>
                                        <SelectItem value="icse">ICSE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address *</Label>
                                <Textarea
                                    id="address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Enter full address"
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="city">City *</Label>
                                <Input
                                    id="city"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="Enter city"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="state">State *</Label>
                                <Input
                                    id="state"
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    placeholder="Enter state"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contactEmail">Contact Email *</Label>
                                <Input
                                    id="contactEmail"
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    placeholder="contact@institution.edu"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contactPhone">Contact Phone *</Label>
                                <Input
                                    id="contactPhone"
                                    type="tel"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    placeholder="+91 XXXXXXXXXX"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="academicYear">Academic Year *</Label>
                                <Input
                                    id="academicYear"
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                    placeholder="2024-2025"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="logo">Institution Logo</Label>
                                <Input
                                    id="logo"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setLogo(e.target.files?.[0] || null)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Institution Status *</Label>
                                <Select value={institutionStatus} onValueChange={setInstitutionStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="space-y-1">
                                <h4 className="font-medium text-sm">Quick Setup</h4>
                                <p className="text-xs text-muted-foreground">Apply a standard school template to get started faster</p>
                                <div className="flex items-center gap-3 mt-3">
                                    <Switch
                                        id="hs-toggle"
                                        checked={hasHigherSecondary}
                                        onCheckedChange={setHasHigherSecondary}
                                    />
                                    <Label htmlFor="hs-toggle" className="text-xs cursor-pointer select-none">Include Higher Secondary (11th & 12th)</Label>
                                </div>
                            </div>
                            <Button onClick={applyDefaultStructure} variant="secondary" size="sm" className="shrink-0">
                                <GraduationCap className="w-4 h-4 mr-2" />
                                Apply Default Structure
                            </Button>
                        </div>

                        <div className="flex items-center justify-between mb-4 mt-6">
                            <h3 className="text-lg font-semibold">Groups & Classes</h3>
                            <Button onClick={addGroup} variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Custom Group
                            </Button>
                        </div>

                        {groups.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No groups added yet. Click "Add Group" to start.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {groups.map((group) => (
                                    <Card key={group.id} className="p-6">
                                        <div className="flex items-center gap-4 mb-4">
                                            <Input
                                                value={group.name}
                                                onChange={(e) => updateGroup(group.id, e.target.value)}
                                                placeholder="Group name (e.g., Primary, Middle School)"
                                                className="flex-1"
                                            />
                                            <Button
                                                onClick={() => addClass(group.id)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Class
                                            </Button>
                                            <Button
                                                onClick={() => removeGroup(group.id)}
                                                variant="destructive"
                                                size="sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-3 ml-6">
                                            {group.classes.map((classItem) => (
                                                <div key={classItem.id} className="flex items-start gap-3">
                                                    <Input
                                                        value={classItem.name}
                                                        onChange={(e) => updateClass(group.id, classItem.id, e.target.value)}
                                                        placeholder="Class name (e.g., LKG, 1, 2, 10)"
                                                        className="w-48"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {classItem.sections.map((section) => (
                                                                <div
                                                                    key={section}
                                                                    className="px-3 py-1 bg-primary/10 text-primary rounded-md text-sm flex items-center gap-2"
                                                                >
                                                                    Section {section}
                                                                    <X
                                                                        className="w-3 h-3 cursor-pointer"
                                                                        onClick={() => removeSection(group.id, classItem.id, section)}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {['A', 'B', 'C', 'D', 'E'].map((section) => (
                                                                <Button
                                                                    key={section}
                                                                    onClick={() => addSection(group.id, classItem.id, section)}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={classItem.sections.includes(section)}
                                                                >
                                                                    {section}
                                                                </Button>
                                                            ))}
                                                            <div className="flex gap-1 ml-2">
                                                                <Input
                                                                    placeholder="Extra section"
                                                                    className="w-20 h-8 text-xs"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            const val = (e.target as HTMLInputElement).value.trim();
                                                                            if (val && !classItem.sections.includes(val)) {
                                                                                addSection(group.id, classItem.id, val);
                                                                                (e.target as HTMLInputElement).value = '';
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => removeClass(group.id, classItem.id)}
                                                        variant="ghost"
                                                        size="sm"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Add Subjects</h3>
                            <Button onClick={addSubject} variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Subject
                            </Button>
                        </div>

                        {subjects.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No subjects added yet. Click "Add Subject" to start.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {subjects.map((subject) => (
                                    <Card key={subject.id} className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                            <div className="space-y-2">
                                                <Label>Subject Name</Label>
                                                <Input
                                                    value={subject.name}
                                                    onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                                                    placeholder="Mathematics"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Subject Code</Label>
                                                <Input
                                                    value={subject.code}
                                                    onChange={(e) => updateSubject(subject.id, 'code', e.target.value)}
                                                    placeholder="MATH101"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Class</Label>
                                                <Select
                                                    value={subject.className}
                                                    onValueChange={(value) => updateSubject(subject.id, 'className', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Class" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {allAvailableClasses.map(c => (
                                                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Group</Label>
                                                <Select
                                                    value={subject.group}
                                                    onValueChange={(value) => updateSubject(subject.id, 'group', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Group" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {groups.map(g => (
                                                            <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button
                                                onClick={() => removeSubject(subject.id)}
                                                variant="destructive"
                                                size="sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold mb-4">Add Students</h3>

                        <div className="flex gap-4 mb-6">
                            <Button
                                onClick={() => setStudentInputMethod('manual')}
                                variant={studentInputMethod === 'manual' ? 'default' : 'outline'}
                                className="flex-1"
                            >
                                Manual Entry
                            </Button>
                            <Button
                                onClick={() => setStudentInputMethod('excel')}
                                variant={studentInputMethod === 'excel' ? 'default' : 'outline'}
                                className="flex-1"
                            >
                                Upload Excel
                            </Button>
                        </div>

                        {studentInputMethod === 'manual' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-muted-foreground">Add students one by one</p>
                                    <Button onClick={addStudent} variant="outline" size="sm">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Student
                                    </Button>
                                </div>

                                {students.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                        <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">No students added yet. Click "Add Student" to start.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {students.map((student) => (
                                            <Card key={student.id} className="p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <Input
                                                        value={student.name}
                                                        onChange={(e) => updateStudent(student.id, 'name', e.target.value)}
                                                        placeholder="Student Name"
                                                    />
                                                    <Input
                                                        value={student.registerNumber}
                                                        onChange={(e) => updateStudent(student.id, 'registerNumber', e.target.value)}
                                                        placeholder="Register Number"
                                                    />
                                                    <Select
                                                        value={student.class}
                                                        onValueChange={(value) => updateStudent(student.id, 'class', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Class" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {allAvailableClasses.map(c => (
                                                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={student.section}
                                                        onValueChange={(value) => updateStudent(student.id, 'section', value)}
                                                        disabled={!student.class}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Section" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {allAvailableClasses.find(c => c.name === student.class)?.sections.map(s => (
                                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        type="date"
                                                        value={student.dob}
                                                        onChange={(e) => updateStudent(student.id, 'dob', e.target.value)}
                                                        placeholder="Date of Birth"
                                                    />
                                                    <Select
                                                        value={student.gender}
                                                        onValueChange={(value) => updateStudent(student.id, 'gender', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Gender" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="male">Male</SelectItem>
                                                            <SelectItem value="female">Female</SelectItem>
                                                            <SelectItem value="other">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        value={student.parentName}
                                                        onChange={(e) => updateStudent(student.id, 'parentName', e.target.value)}
                                                        placeholder="Parent Name"
                                                    />
                                                    <Input
                                                        value={student.parentContact}
                                                        onChange={(e) => updateStudent(student.id, 'parentContact', e.target.value)}
                                                        placeholder="Parent Contact"
                                                    />
                                                    <Input
                                                        type="email"
                                                        value={student.email}
                                                        onChange={(e) => updateStudent(student.id, 'email', e.target.value)}
                                                        placeholder="Email"
                                                    />
                                                    <div className="md:col-span-2">
                                                        <Input
                                                            value={student.address}
                                                            onChange={(e) => updateStudent(student.id, 'address', e.target.value)}
                                                            placeholder="Address"
                                                        />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <Button
                                                            onClick={() => removeStudent(student.id)}
                                                            variant="destructive"
                                                            size="sm"
                                                            className="w-full"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Card className="p-6">
                                    <div className="text-center space-y-4">
                                        <Upload className="w-16 h-16 mx-auto text-muted-foreground" />
                                        <div>
                                            <h4 className="font-semibold mb-2">Upload Student Data</h4>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Upload an Excel file (.xlsx or .csv) with student information
                                            </p>
                                            <Button
                                                onClick={() => downloadTemplate('student')}
                                                variant="outline"
                                                size="sm"
                                                className="mb-4"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download Sample Template
                                            </Button>
                                        </div>
                                        <Input
                                            type="file"
                                            accept=".xlsx,.csv"
                                            onChange={(e) => setStudentFile(e.target.files?.[0] || null)}
                                            className="max-w-md mx-auto"
                                        />
                                        {studentFile && (
                                            <div className="text-sm text-success">
                                                <Check className="w-4 h-4 inline mr-2" />
                                                File selected: {studentFile.name}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                );

            case 5:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold mb-4">Add Staff</h3>

                        <div className="flex gap-4 mb-6">
                            <Button
                                onClick={() => setStaffInputMethod('manual')}
                                variant={staffInputMethod === 'manual' ? 'default' : 'outline'}
                                className="flex-1"
                            >
                                Manual Entry
                            </Button>
                            <Button
                                onClick={() => setStaffInputMethod('excel')}
                                variant={staffInputMethod === 'excel' ? 'default' : 'outline'}
                                className="flex-1"
                            >
                                Upload Excel
                            </Button>
                        </div>

                        {staffInputMethod === 'manual' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-muted-foreground">Add staff members one by one</p>
                                    <Button onClick={addStaffMember} variant="outline" size="sm">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Staff
                                    </Button>
                                </div>

                                {staff.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                        <UserCog className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">No staff added yet. Click "Add Staff" to start.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {staff.map((staffMember) => (
                                            <Card key={staffMember.id} className="p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <Input
                                                        value={staffMember.name}
                                                        onChange={(e) => updateStaffMember(staffMember.id, 'name', e.target.value)}
                                                        placeholder="Staff Name"
                                                    />
                                                    <Input
                                                        value={staffMember.staffId}
                                                        onChange={(e) => updateStaffMember(staffMember.id, 'staffId', e.target.value)}
                                                        placeholder="Staff ID"
                                                    />
                                                    <Select
                                                        value={staffMember.role}
                                                        onValueChange={(value) => updateStaffMember(staffMember.id, 'role', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Role" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="teacher">Teacher</SelectItem>
                                                            <SelectItem value="admin">Admin</SelectItem>
                                                            <SelectItem value="support">Support</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={staffMember.subjectAssigned}
                                                        onValueChange={(value) => updateStaffMember(staffMember.id, 'subjectAssigned', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Subject" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {subjects.map(s => (
                                                                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={staffMember.classAssigned}
                                                        onValueChange={(value) => updateStaffMember(staffMember.id, 'classAssigned', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Class" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {allAvailableClasses.map(c => (
                                                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={staffMember.sectionAssigned}
                                                        onValueChange={(value) => updateStaffMember(staffMember.id, 'sectionAssigned', value)}
                                                        disabled={!staffMember.classAssigned}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Section" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {allAvailableClasses.find(c => c.name === staffMember.classAssigned)?.sections.map(s => (
                                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        type="date"
                                                        value={staffMember.dob}
                                                        onChange={(e) => updateStaffMember(staffMember.id, 'dob', e.target.value)}
                                                        placeholder="Date of Birth"
                                                    />
                                                    <Input
                                                        type="email"
                                                        value={staffMember.email}
                                                        onChange={(e) => updateStaffMember(staffMember.id, 'email', e.target.value)}
                                                        placeholder="Email Address"
                                                    />
                                                    <Input
                                                        type="tel"
                                                        value={staffMember.phone}
                                                        onChange={(e) => updateStaffMember(staffMember.id, 'phone', e.target.value)}
                                                        placeholder="Phone Number"
                                                    />
                                                    <div className="flex items-end">
                                                        <Button
                                                            onClick={() => removeStaffMember(staffMember.id)}
                                                            variant="destructive"
                                                            size="sm"
                                                            className="w-full"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Card className="p-6">
                                    <div className="text-center space-y-4">
                                        <Upload className="w-16 h-16 mx-auto text-muted-foreground" />
                                        <div>
                                            <h4 className="font-semibold mb-2">Upload Staff Data</h4>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Upload an Excel file (.xlsx or .csv) with staff information
                                            </p>
                                            <Button
                                                onClick={() => downloadTemplate('staff')}
                                                variant="outline"
                                                size="sm"
                                                className="mb-4"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download Sample Template
                                            </Button>
                                        </div>
                                        <Input
                                            type="file"
                                            accept=".xlsx,.csv"
                                            onChange={(e) => setStaffFile(e.target.files?.[0] || null)}
                                            className="max-w-md mx-auto"
                                        />
                                        {staffFile && (
                                            <div className="text-sm text-success">
                                                <Check className="w-4 h-4 inline mr-2" />
                                                File selected: {staffFile.name}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                );

            case 6:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold mb-4">Access & Role Assignment</h3>

                        <Card className="p-6">
                            <h4 className="font-semibold mb-4">Automatic Role Assignment</h4>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <GraduationCap className="w-5 h-5 text-info" />
                                        <div>
                                            <p className="font-medium">Students</p>
                                            <p className="text-sm text-muted-foreground">Access to Student Dashboard</p>
                                        </div>
                                    </div>
                                    <Check className="w-5 h-5 text-success" />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <UserCog className="w-5 h-5 text-success" />
                                        <div>
                                            <p className="font-medium">Staff</p>
                                            <p className="text-sm text-muted-foreground">Access to Faculty Dashboard</p>
                                        </div>
                                    </div>
                                    <Check className="w-5 h-5 text-success" />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Building2 className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="font-medium">Institution Heads</p>
                                            <p className="text-sm text-muted-foreground">Access to Institution Dashboard</p>
                                        </div>
                                    </div>
                                    <Check className="w-5 h-5 text-success" />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h4 className="font-semibold mb-4">Summary</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Institution Name</p>
                                    <p className="font-medium">{institutionName || 'Not set'}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Type</p>
                                    <p className="font-medium">{institutionType || 'Not set'}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Groups Added</p>
                                    <p className="font-medium">{groups.length}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Subjects Added</p>
                                    <p className="font-medium">{subjects.length}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Students Added</p>
                                    <p className="font-medium">{students.length}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Staff Added</p>
                                    <p className="font-medium">{staff.length}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <AdminLayout>
            <PageHeader
                title="Add Institution"
                subtitle="Complete the multi-step form to onboard a new institution"
            />

            {/* Stepper */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <div key={step.id} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted
                                            ? 'bg-success border-success text-white'
                                            : isActive
                                                ? 'bg-primary border-primary text-white'
                                                : 'bg-background border-border text-muted-foreground'
                                            }`}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-6 h-6" />
                                        ) : (
                                            <Icon className="w-6 h-6" />
                                        )}
                                    </div>
                                    <p
                                        className={`text-xs mt-2 text-center ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                                            }`}
                                    >
                                        {step.name}
                                    </p>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`h-0.5 flex-1 mx-2 ${isCompleted ? 'bg-success' : 'bg-border'
                                            }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            <Card className="p-6 mb-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <p className="text-muted-foreground animate-pulse text-lg">Fetching institution data...</p>
                    </div>
                ) : (
                    renderStepContent()
                )}
            </Card>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                <Button
                    onClick={handlePrevious}
                    variant="outline"
                    disabled={currentStep === 1}
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                </Button>

                {currentStep < 6 ? (
                    <Button onClick={handleNext}>
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Submit & Create Institution
                            </>
                        )}
                    </Button>
                )}
            </div>
        </AdminLayout>
    );
}
