import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { generateUUID } from '@/lib/utils';
import { Plus, Upload, X, Loader2, ChevronDown, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Trash2 } from 'lucide-react';
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
    const [progress, setProgress] = useState('');
    const [data, setData] = useState({
        name: '', registerNumber: '', className: '', section: '', dob: '', gender: '',
        parentName: '', parentEmail: '', parentPhone: '', email: '', address: '', password: '', phone: ''
    });
    const [image, setImage] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (error) {
            toast.error('Could not access camera');
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                setImage(canvasRef.current.toDataURL('image/jpeg'));
                stopCamera();
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
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
        const toastId = toast.loading('Creating student account...');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session found. Please log in again.');

            // 1. Photo Upload (if exists)
            let imageUrl = null;
            if (image) {
                setProgress('Uploading photo...');
                toast.loading('Uploading photo...', { id: toastId });

                const fileName = `student_${Date.now()}.jpg`;
                const byteString = atob(image.split(',')[1]);
                const mimeString = image.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                const blob = new Blob([ab], { type: mimeString });

                const { error: uploadError } = await supabase.storage
                    .from('student-photos')
                    .upload(fileName, blob);

                if (uploadError) {
                    console.warn('Photo upload failed:', uploadError);
                    toast.loading('Photo upload failed, continuing...', { id: toastId });
                } else {
                    const { data: { publicUrl } } = supabase.storage.from('student-photos').getPublicUrl(fileName);
                    imageUrl = publicUrl;
                }
            }

            // 2. Create user account
            setProgress('Creating account...');
            toast.loading('Creating account...', { id: toastId });

            console.log('[STUDENT] Creating student with data:', {
                email: data.email,
                role: 'student',
                full_name: data.name,
                institution_id: institutionId,
                register_number: data.registerNumber,
                class_name: data.className,
                section: data.section,
                has_image: !!imageUrl
            });

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
                    section: data.section,
                    image_url: imageUrl,
                    gender: data.gender,
                    address: data.address,
                    date_of_birth: data.dob,
                    phone: (data as any).phone || ""
                }
            });

            console.log('[STUDENT] Edge Function response:', { responseData, error });

            if (error) {
                console.error('[STUDENT] Edge Function error details:', error);
                throw error;
            }

            // Check if responseData contains an error
            if (responseData?.error) {
                console.error('[STUDENT] Response contains error:', responseData.error);
                throw new Error(responseData.error);
            }

            // 3. Success - Update UI immediately
            toast.success('Student added successfully!', { id: toastId });

            // Close dialog immediately for better UX
            onOpenChange(false);
            setData({ name: '', registerNumber: '', className: '', section: '', dob: '', gender: '', parentName: '', parentEmail: '', parentPhone: '', email: '', address: '', password: '', phone: '' });
            setImage(null);
            setProgress('');

            // Invalidate queries in background
            queryClient.invalidateQueries({ queryKey: ['institution-students'] });
            onSuccess();

        } catch (error: any) {
            console.error('[STUDENT] Full error object:', error);

            let errorMsg = 'Failed to add student';
            let errorDetails = '';

            // The error.context is a Response object, we need to read its body
            if (error.context && error.context instanceof Response) {
                try {
                    console.log('[STUDENT] Reading error response body...');
                    const errorBody = await error.context.json();
                    console.log('[STUDENT] Parsed error body:', errorBody);

                    if (errorBody.error) {
                        errorMsg = errorBody.error;
                    }
                    if (errorBody.details) {
                        errorDetails = errorBody.details;
                    }
                    if (errorBody.hint) {
                        errorDetails += (errorDetails ? ' | Hint: ' : 'Hint: ') + errorBody.hint;
                    }
                } catch (parseError) {
                    console.error('[STUDENT] Could not parse error response:', parseError);
                    // Try reading as text
                    try {
                        const errorText = await error.context.text();
                        console.log('[STUDENT] Error response as text:', errorText);
                        if (errorText) {
                            errorMsg = errorText;
                        }
                    } catch (textError) {
                        console.error('[STUDENT] Could not read error as text:', textError);
                    }
                }
            } else if (error.message) {
                errorMsg = error.message;
            }

            // Add helpful context
            if (errorMsg.includes('email') || (errorMsg.includes('duplicate key') && errorMsg.includes('email'))) {
                errorMsg += ' (Email might already be in use)';
            }
            if (errorMsg.includes('register_number') || (errorMsg.includes('duplicate key') && errorMsg.includes('register_number'))) {
                errorMsg += ' (Register number might already exist)';
            }
            if (errorMsg.includes('relation') && errorMsg.includes('does not exist')) {
                errorMsg += ' (Database table missing - contact admin)';
            }

            const fullErrorMsg = errorDetails ? `${errorMsg}\n\nDetails: ${errorDetails}` : errorMsg;
            toast.error(fullErrorMsg, { id: toastId, duration: 8000 });
            console.error('Student creation error:', error);

            if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
                toast.error('Session expired. Please log out and log in again.');
            }
        } finally {
            setIsSubmitting(false);
            setProgress('');
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
                        <Label>Student Phone</Label>
                        <Input type="tel" value={(data as any).phone || ''} onChange={(e) => setData({ ...data, phone: e.target.value } as any)} placeholder="e.g. 9876543210" />
                    </div>
                    <div className="space-y-2">
                        <Label>Password *</Label>
                        <Input type="password" value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} placeholder="Min 6 characters" />
                    </div>

                    {/* PHOTO SECTION */}
                    <div className="space-y-2 md:col-span-2 border-t pt-4">
                        <Label>Student Photo (For Camera Recognition)</Label>
                        <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-lg bg-muted/50">
                            {image ? (
                                <div className="relative w-48 aspect-square rounded-lg overflow-hidden shadow-md">
                                    <img src={image} alt="Student" className="w-full h-full object-cover" />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 rounded-full"
                                        onClick={() => setImage(null)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : isCameraOpen ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-64 aspect-video bg-black rounded-lg overflow-hidden relative">
                                        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                                        <canvas ref={canvasRef} className="hidden" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" onClick={capturePhoto} className="bg-primary">Capture</Button>
                                        <Button type="button" variant="outline" onClick={stopCamera}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button type="button" variant="outline" onClick={startCamera} className="gap-2">
                                            <Camera className="w-4 h-4" /> Take Photo
                                        </Button>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id="dialog-file-upload"
                                                onChange={handleFileUpload}
                                            />
                                            <Button type="button" variant="outline" onClick={() => document.getElementById('dialog-file-upload')?.click()} className="gap-2">
                                                <Upload className="w-4 h-4" /> Upload File
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
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

function AddStaffDialog({ open, onOpenChange, onSuccess, institutionId, fixedRole }: any) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubjectsOpen, setIsSubjectsOpen] = useState(false);
    const [data, setData] = useState({
        name: '',
        staffId: '',
        role: fixedRole || '',
        email: '',
        phone: '',
        dob: '',
        password: '',
        department: '',
        subjects: [] as string[]
    });

    useEffect(() => {
        if (fixedRole) {
            setData(prev => ({ ...prev, role: fixedRole }));
        }
    }, [fixedRole, open]);
    const [image, setImage] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const queryClient = useQueryClient();

    const startCamera = async () => {
        try {
            setIsCameraActive(true);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast.error("Could not access camera");
            setIsCameraActive(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = canvas.toDataURL('image/jpeg');
                setImage(imageData);
                stopCamera();
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

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
        const toastId = toast.loading('Creating staff account...');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session found. Please log in again.');

            // Upload photo if exists
            let imageUrl = null;
            if (image) {
                toast.loading('Uploading photo...', { id: toastId });

                const blob = await fetch(image).then(res => res.blob());
                const fileName = `staff_${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('student-photos')
                    .upload(fileName, blob);

                if (uploadError) {
                    console.warn('Photo upload failed:', uploadError);
                    toast.loading('Photo upload failed, continuing...', { id: toastId });
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('student-photos')
                        .getPublicUrl(fileName);
                    imageUrl = publicUrl;
                }
            }

            // Create user account
            toast.loading('Creating account...', { id: toastId });

            console.log('[STAFF] Creating user with data:', {
                email: data.email,
                role: data.role,
                full_name: data.name,
                institution_id: institutionId,
                staff_id: data.staffId,
                department: data.department || null,
                subjects: data.subjects,
                phone: data.phone || null,
                date_of_birth: data.dob || null,
                has_image: !!imageUrl
            });

            const { data: responseData, error } = await supabase.functions.invoke('create-user', {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                },
                body: {
                    email: data.email,
                    password: data.password,
                    role: data.role, // Use the dynamic role from state
                    full_name: data.name,
                    institution_id: institutionId,
                    staff_id: data.staffId,
                    department: data.department || null,
                    subjects: data.subjects,
                    phone: data.phone || null,
                    date_of_birth: data.dob || null,
                    image_url: imageUrl
                }
            });

            console.log('[STAFF] Edge Function response:', { responseData, error });

            if (error) {
                console.error('[STAFF] Edge Function error details:', error);
                throw error;
            }

            // Check if responseData contains an error
            if (responseData?.error) {
                console.error('[STAFF] Response contains error:', responseData.error);
                throw new Error(responseData.error);
            }

            // Success - Update UI immediately
            toast.success('Staff member added successfully!', { id: toastId });

            // Close dialog immediately for better UX
            onOpenChange(false);
            setData({ name: '', staffId: '', role: '', email: '', phone: '', dob: '', password: '', department: '', subjects: [] });
            setImage(null);

            // Invalidate queries in background
            queryClient.invalidateQueries({ queryKey: ['institution-staff', institutionId] });
            onSuccess();

            // Generate face embedding in background (non-blocking)
            if (imageUrl && responseData?.user?.id) {
                supabase.functions.invoke('generate-face-embedding', {
                    body: { imageUrl, userId: responseData.user.id, label: data.name }
                }).catch(e => {
                    console.warn('Embedding generation failed (non-critical):', e);
                });
            }

        } catch (error: any) {
            console.error('[STAFF] Full error object:', error);
            console.error('[STAFF] Error properties:', {
                message: error.message,
                context: error.context,
                status: error.status,
                statusText: error.statusText,
                name: error.name
            });

            let errorMsg = 'Failed to create staff member';
            let errorDetails = '';

            // The error.context is a Response object, we need to read its body
            if (error.context && error.context instanceof Response) {
                try {
                    console.log('[STAFF] Reading error response body...');
                    const errorBody = await error.context.json();
                    console.log('[STAFF] Parsed error body:', errorBody);

                    if (errorBody.error) {
                        errorMsg = errorBody.error;
                    }
                    if (errorBody.details) {
                        errorDetails = errorBody.details;
                    }
                    if (errorBody.hint) {
                        errorDetails += (errorDetails ? ' | Hint: ' : 'Hint: ') + errorBody.hint;
                    }
                } catch (parseError) {
                    console.error('[STAFF] Could not parse error response:', parseError);
                    // Try reading as text
                    try {
                        const errorText = await error.context.text();
                        console.log('[STAFF] Error response as text:', errorText);
                        if (errorText) {
                            errorMsg = errorText;
                        }
                    } catch (textError) {
                        console.error('[STAFF] Could not read error as text:', textError);
                    }
                }
            } else if (error.message) {
                errorMsg = error.message;
            }

            // Add helpful context
            if (errorMsg.includes('email') || errorMsg.includes('duplicate key') && errorMsg.includes('email')) {
                errorMsg += ' (Email might already be in use)';
            }
            if (errorMsg.includes('staff_id') || (errorMsg.includes('duplicate key') && errorMsg.includes('staff_id'))) {
                errorMsg += ' (Staff ID might already exist)';
            }
            if (errorMsg.includes('relation') && errorMsg.includes('does not exist')) {
                errorMsg += ' (Database table missing - contact admin)';
            }

            const fullErrorMsg = errorDetails ? `${errorMsg}\n\nDetails: ${errorDetails}` : errorMsg;
            toast.error(fullErrorMsg, { id: toastId, duration: 8000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleTitle = () => {
        if (fixedRole === 'accountant') return 'Add Accountant';
        if (fixedRole === 'canteen_manager') return 'Add Canteen Manager';
        if (fixedRole === 'teacher') return 'Add Teacher';
        return 'Add Staff';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{getRoleTitle()}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {/* Photo Capture Section */}
                    <div className="md:col-span-2 space-y-2">
                        <Label>Staff Photo (for Face Recognition)</Label>
                        <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-lg bg-muted/30">
                            {image ? (
                                <div className="relative">
                                    <img src={image} alt="Staff Preview" className="w-32 h-32 object-cover rounded-full border-2 border-primary" />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                        onClick={() => setImage(null)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : isCameraActive ? (
                                <div className="relative w-full max-w-[300px]">
                                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg border shadow-sm" />
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                                        <Button size="sm" onClick={capturePhoto} className="bg-primary text-white">Capture</Button>
                                        <Button size="sm" variant="secondary" onClick={stopCamera}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                                        <Upload className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={startCamera} variant="outline" type="button">Start Camera</Button>
                                        <Button variant="ghost" type="button" onClick={() => (document.getElementById('staff-image-upload') as HTMLInputElement).click()}>
                                            Upload File
                                        </Button>
                                        <input
                                            id="staff-image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2"><Label>Name *</Label><Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="e.g. Sarah Smith" /></div>
                    <div className="space-y-2"><Label>Staff ID *</Label><Input value={data.staffId} onChange={e => setData({ ...data, staffId: e.target.value })} placeholder="e.g. STF-2024-005" /></div>
                    {!fixedRole && (
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={data.role} onValueChange={v => setData({ ...data, role: v })}>
                                <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="teacher">Teacher</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="accountant">Accountant</SelectItem>
                                    <SelectItem value="canteen_manager">Canteen Manager</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {data.role !== 'accountant' && data.role !== 'canteen_manager' && (
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
                    )}

                    {data.role !== 'accountant' && data.role !== 'canteen_manager' && (
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
                    )}

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
