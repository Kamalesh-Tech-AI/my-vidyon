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


const steps = [
    { id: 1, name: 'Basic Details', icon: Building2 },
    { id: 2, name: 'Setup & Admin', icon: UserCog },
    { id: 3, name: 'Subjects', icon: BookOpen },
    { id: 4, name: 'Review', icon: Check },
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

    // Admin Credentials
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [showAdminCreds, setShowAdminCreds] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditMode);

    useEffect(() => {
        if (isEditMode) {
            if (editId) {
                fetchInstitutionData();
            } else {
                // If mode is edit but no ID, stop loading and warn
                setIsLoading(false);
                toast.error("No institution ID provided for editing.");
            }
        }
    }, [isEditMode, editId]);

    const fetchInstitutionData = async () => {
        try {
            // 1. Fetch Institution
            const { data: inst, error: instError } = await supabase
                .from('institutions')
                .select('*')
                .eq('institution_id', editId)
                .maybeSingle(); // Changed single() to maybeSingle() to avoid 406 on no rows

            if (instError) throw instError;
            if (!inst) throw new Error('Institution not found');

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


    const validateStep = (step: number) => {
        switch (step) {
            case 1:
                if (!institutionName) { toast.error('Institution Name is required'); return false; }
                if (!institutionId) { toast.error('School Code is required'); return false; }
                if (!institutionType) { toast.error('Institution Type is required'); return false; }
                if (!address) { toast.error('Address is required'); return false; }
                if (!city) { toast.error('City is required'); return false; }
                if (!state) { toast.error('State is required'); return false; }
                if (!contactEmail) { toast.error('Contact Email is required'); return false; }
                if (!contactPhone) { toast.error('Contact Phone is required'); return false; }
                if (!academicYear) { toast.error('Academic Year is required'); return false; }
                return true;
            case 2:
                // In edit mode, only validate if user explicitly wants to change creds
                if (isEditMode && !showAdminCreds) return true;

                if (!adminEmail) { toast.error('Admin Email is required'); return false; }
                if (!adminPassword) { toast.error('Admin Password is required'); return false; }
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentStep < steps.length) {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        // Final validation across all critical steps
        if (!validateStep(1) || !validateStep(2)) return;

        setIsSubmitting(true);
        const loadingToast = toast.loading('Initializing onboarding sequence...');

        try {
            // 1. Upload Logo if exists
            let uploadedLogoUrl = '';
            if (logo) {
                console.log('Step 1/6: Logo details:', { name: logo.name, size: logo.size, type: logo.type });
                toast.loading('Step 1/6: Uploading logo (timeout in 15s)...', { id: loadingToast });

                const fileExt = logo.name.split('.').pop();
                const fileName = `${institutionId}-${Math.random()}.${fileExt}`;

                try {
                    // Timeout-safe upload
                    const uploadPromise = supabase.storage
                        .from('logos')
                        .upload(fileName, logo, { upsert: true });

                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Logo upload timed out (15s). Please check your connection or bucket settings.')), 15000)
                    );

                    const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

                    if (uploadError) {
                        console.error('Logo upload error:', uploadError);
                        toast.error('Logo upload failed, but continuing with onboarding...', { duration: 3000 });
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('logos')
                            .getPublicUrl(fileName);
                        uploadedLogoUrl = publicUrl;
                        console.log('Logo uploaded successfully:', uploadedLogoUrl);
                    }
                } catch (timeoutErr: any) {
                    console.warn('Logo upload skipped due to error/timeout:', timeoutErr.message);
                    toast.error('Logo upload timed out. Continuing without logo...', { duration: 4000 });
                }
            } else {
                console.log('Step 1/6: Skipping logo upload (none selected)');
            }

            // 2. Create/Update Institution
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
                status: institutionStatus,
                // Only update admin credentials if explicit or new
                ...((!isEditMode || showAdminCreds) && {
                    admin_email: adminEmail,
                    // admin_password is NOT stored in the institutions table, only used for auth provisioning
                })
            };

            // If editing, we MUST query by ID to safely update, OR rely on institution_id being unique and immutable-ish
            // The safest is to NOT allow changing institution_id in edit mode or handle it carefully.
            if (isEditMode) {
                // We don't have the UUID readily available in state unless we stored it.
                // Let's rely on the upsert by institution_id uniqueness which is the school code.
            }

            if (uploadedLogoUrl) {
                institutionData.logo_url = uploadedLogoUrl;
            } else if (isEditMode && logoUrl) {
                institutionData.logo_url = logoUrl;
            }

            // Perform UPSERT based on 'institution_id' which is our unique business key
            const { error: instError } = await supabase
                .from('institutions')
                .upsert([institutionData], { onConflict: 'institution_id' });

            if (instError) throw new Error(`Failed to create institution: ${instError.message}`);
            console.log('Institution record saved successfully.');

            // 2.5 Provision Institution Admin account
            if ((!isEditMode || showAdminCreds) && adminEmail && adminPassword) {
                toast.loading('Step 2.5/6: Provisioning institution admin...', { id: loadingToast });
                const { error: adminProvError } = await supabase.functions.invoke('create-user', {
                    body: {
                        email: adminEmail,
                        password: adminPassword,
                        role: 'institution',
                        full_name: `${institutionName} Admin`,
                        institution_id: institutionId,
                        staff_id: `ADM-${institutionId}`
                    }
                });
                if (adminProvError) {
                    console.error('Failed to provision institution admin:', adminProvError);
                    toast.error('Institution created, but admin account provisioning failed. Please create it manually.', { id: loadingToast });
                }
            }

            // 3. Create/Update Groups & Classes
            toast.loading('Step 3/6: Processing groups and classes...', { id: loadingToast });

            // Helper to identify real UUIDs
            const isUUID = (id: string) => id.length > 20;

            if (isEditMode) {
                // A. Cleanup deleted items
                const keepGroupIds = groups.filter(g => isUUID(g.id)).map(g => g.id);
                const keepClassIds = groups.flatMap(g => g.classes).filter(c => isUUID(c.id)).map(c => c.id);

                // 1. Delete removed groups (cascades to classes usually, or we handle it)
                if (keepGroupIds.length > 0) {
                    await supabase.from('groups').delete().eq('institution_id', institutionId).not('id', 'in', `(${keepGroupIds.join(',')})`);
                } else {
                    // Be careful not to delete everything if state is empty? 
                    // If state is empty, keepGroupIds is empty. Logic should be: delete all groups for this institution that are NOT in empty list = Delete All.
                    // But .not('id', 'in', '()') might fail syntax.
                    // Safer: Fetch all groups, delete those not in keep list.
                    // Or: if keepGroupIds empty, do we delete all? Yes.
                    // But Supabase query builder limitations...
                    // Let's use a simpler approach: 
                    // If IDs to keep, delete others. If no IDs to keep, delete all.
                    if (groups.length === 0) {
                        await supabase.from('groups').delete().eq('institution_id', institutionId);
                    } else {
                        await supabase.from('groups').delete().eq('institution_id', institutionId).not('id', 'in', `(${keepGroupIds.join(',')})`);
                    }
                }

                // 2. Delete removed classes from kept groups
                if (keepGroupIds.length > 0) {
                    // We only need to prune classes for groups that we KEPT.
                    // Deleted groups already took their classes with them (assuming cascade or we don't care as they are orphaned).
                    const { error: pruneError } = await supabase
                        .from('classes')
                        .delete()
                        .in('group_id', keepGroupIds)
                        // If keepClassIds is empty, we delete all classes in these groups?
                        .not('id', 'in', `(${keepClassIds.length > 0 ? keepClassIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

                    if (pruneError) console.error("Error pruning classes:", pruneError);
                }

                // B. Upsert (Update Existing / Insert New)
                for (const group of groups) {
                    let groupId = group.id;

                    if (isUUID(group.id)) {
                        // Update existing group
                        await supabase.from('groups').update({ name: group.name }).eq('id', group.id);
                    } else {
                        // Insert new group
                        const { data: newGroup, error: newGroupError } = await supabase
                            .from('groups')
                            .insert([{ name: group.name, institution_id: institutionId }])
                            .select()
                            .single();
                        if (newGroupError) throw newGroupError;
                        groupId = newGroup.id;
                    }

                    // Handle classes for this group
                    for (const cls of group.classes) {
                        if (isUUID(cls.id)) {
                            // Update existing class
                            await supabase.from('classes').update({ name: cls.name, sections: cls.sections }).eq('id', cls.id);
                        } else {
                            // Insert new class
                            const { error: newClassError } = await supabase.from('classes').insert({
                                group_id: groupId,
                                name: cls.name,
                                sections: cls.sections
                            });
                            if (newClassError) throw newClassError;
                        }
                    }
                }

            } else {
                // Create Mode: Just Insert All (Original Logic)
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
            }


            // 4. Create/Update Subjects
            toast.loading('Step 4/6: Processing subjects...', { id: loadingToast });

            if (isEditMode) {
                const keepSubjectIds = subjects.filter(s => isUUID(s.id)).map(s => s.id);

                // 1. Delete removed subjects
                if (subjects.length === 0) {
                    await supabase.from('subjects').delete().eq('institution_id', institutionId);
                } else {
                    await supabase.from('subjects').delete().eq('institution_id', institutionId).not('id', 'in', `(${keepSubjectIds.join(',')})`);
                }

                // 2. Upsert
                for (const subject of subjects) {
                    const payload = {
                        institution_id: institutionId,
                        name: subject.name,
                        code: subject.code || '',
                        class_name: subject.className,
                        group_name: subject.group
                    };

                    if (isUUID(subject.id)) {
                        await supabase.from('subjects').update(payload).eq('id', subject.id);
                    } else {
                        await supabase.from('subjects').insert(payload);
                    }
                }

            } else {
                if (subjects.length > 0) {
                    const subjectsToInsert = subjects.map(s => ({
                        institution_id: institutionId,
                        name: s.name,
                        code: s.code || '',
                        class_name: s.className,
                        group_name: s.group
                    }));
                    const { error: subError } = await supabase.from('subjects').insert(subjectsToInsert);
                    if (subError) throw subError;
                }
            }

            toast.dismiss(loadingToast);
            toast.success('Institution onboarding completed successfully!');
            navigate('/admin');
        } catch (error: any) {
            console.error('Onboarding failed at some step:', error);
            toast.dismiss(loadingToast);

            // Handle different error objects (Supabase vs Standard)
            const errorMessage = error.message || error.error_description || error.msg || 'An unknown error occurred';
            toast.error(`Onboarding Error: ${errorMessage}`);

            // If it failed at Step 1, it might be storage permissions
            if (errorMessage.toLowerCase().includes('storage') || errorMessage.toLowerCase().includes('bucket')) {
                toast.error('Storage error detected. Please ensure the "logos" bucket exists and has correct RLS policies.');
            }
        } finally {
            setIsSubmitting(false);
        }
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
                                        <SelectItem value="higher-secondary">Higher Secondary</SelectItem>
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
                        <Card className="p-6 border-primary/20 bg-primary/5">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <UserCog className="w-5 h-5 text-primary" />
                                Institution Admin Credentials
                            </h3>

                            {isEditMode && !showAdminCreds ? (
                                <div className="flex flex-col items-center justify-center py-6 bg-muted/20 rounded-lg border border-dashed border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UserCog className="w-5 h-5 text-muted-foreground" />
                                        <p className="font-medium text-muted-foreground">Admin credentials are hidden</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAdminCreds(true)}
                                    >
                                        Change Admin Email/Password
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                    {isEditMode && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute -top-1 right-0 h-6 w-6"
                                            onClick={() => setShowAdminCreds(false)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="adminEmail">Admin Email *</Label>
                                        <Input
                                            id="adminEmail"
                                            type="email"
                                            value={adminEmail}
                                            onChange={(e) => setAdminEmail(e.target.value)}
                                            placeholder="admin@institution.com"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="adminPassword">Admin Password {isEditMode ? '(Optional)' : '*'}</Label>
                                        <Input
                                            id="adminPassword"
                                            type="password"
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            placeholder={isEditMode ? "Leave blank to keep current" : "Enter secure password"}
                                            required={!isEditMode}
                                        />
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3">
                                This account will be created as the primary administrator for this institution.
                            </p>
                        </Card>

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

                        {
                            groups.length === 0 ? (
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
                            )
                        }
                    </div >
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
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                            <div className="space-y-2">
                                                <Label>Subject Name</Label>
                                                <Input
                                                    value={subject.name}
                                                    onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                                                    placeholder="Mathematics"
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

                {currentStep < steps.length ? (
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
