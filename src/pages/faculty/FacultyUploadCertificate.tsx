import { useState, useEffect, useRef } from 'react';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, X, Loader2, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FacultyUploadCertificate() {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [facultyClass, setFacultyClass] = useState<{ class_name: string; section: string; class_id: string } | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [isLoadingClass, setIsLoadingClass] = useState(true);

    const [formData, setFormData] = useState({
        studentId: '',
        studentEmail: '',
        studentName: '',
        title: '',
        description: '',
        file: null as File | null
    });

    // Fetch faculty's assigned class/section
    useEffect(() => {
        const fetchFacultyClass = async () => {
            if (!user?.id) return;

            console.log('[CERTIFICATE] Fetching faculty class for:', user.email);
            setIsLoadingClass(true);

            try {
                // Try to get faculty's class from timetable_slots (most common class they teach)
                const { data: timetableData, error: timetableError } = await supabase
                    .from('timetable_slots')
                    .select(`
                        class_id,
                        section,
                        classes:class_id (name)
                    `)
                    .eq('faculty_id', user.id)
                    .limit(10);

                if (timetableError) {
                    console.error('[CERTIFICATE] Error fetching timetable:', timetableError);
                }

                if (timetableData && timetableData.length > 0) {
                    // Get the most common class/section combination
                    const classCounts: { [key: string]: { count: number; class_id: string; section: string; class_name: string } } = {};

                    timetableData.forEach((slot: any) => {
                        if (slot.class_id && slot.section && slot.classes) {
                            const key = `${slot.class_id}-${slot.section}`;
                            if (!classCounts[key]) {
                                classCounts[key] = {
                                    count: 0,
                                    class_id: slot.class_id,
                                    section: slot.section,
                                    class_name: slot.classes.name
                                };
                            }
                            classCounts[key].count++;
                        }
                    });

                    // Get the class with highest count
                    const mostCommon = Object.values(classCounts).sort((a, b) => b.count - a.count)[0];

                    if (mostCommon) {
                        console.log('[CERTIFICATE] Faculty class detected:', mostCommon);
                        setFacultyClass({
                            class_name: mostCommon.class_name,
                            section: mostCommon.section,
                            class_id: mostCommon.class_id
                        });
                    } else {
                        console.log('[CERTIFICATE] No class found in timetable');
                        toast.error('No class assigned to you. Please contact admin.');
                    }
                } else {
                    console.log('[CERTIFICATE] No timetable slots found for faculty');
                    toast.error('No class assigned to you. Please contact admin.');
                }
            } catch (error) {
                console.error('[CERTIFICATE] Error:', error);
                toast.error('Failed to load your class information');
            } finally {
                setIsLoadingClass(false);
            }
        };

        fetchFacultyClass();
    }, [user?.id]);

    // Fetch students when faculty class is detected
    useEffect(() => {
        const fetchStudents = async () => {
            if (!facultyClass || !user?.institutionId) return;

            console.log('[CERTIFICATE] Fetching students for:', facultyClass.class_name, facultyClass.section);

            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('id, name, email, register_number, class_name, section')
                    .eq('institution_id', user.institutionId)
                    .eq('class_name', facultyClass.class_name)
                    .eq('section', facultyClass.section)
                    .order('name');

                if (error) throw error;

                console.log('[CERTIFICATE] Students found:', data?.length || 0);
                setStudents(data || []);

                if (!data || data.length === 0) {
                    toast.info(`No students found in ${facultyClass.class_name} ${facultyClass.section}`);
                }
            } catch (error) {
                console.error('[CERTIFICATE] Error fetching students:', error);
                toast.error('Could not fetch students');
            }
        };

        fetchStudents();
    }, [facultyClass, user?.institutionId]);

    const validateFile = (file: File): boolean => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
            toast.error('Invalid file type. Please upload PDF, JPG, or PNG files only.');
            return false;
        }

        if (file.size > maxSize) {
            toast.error('File size exceeds 10MB. Please upload a smaller file.');
            return false;
        }

        return true;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && validateFile(file)) {
            setUploadedFile(file);
            setFormData(prev => ({ ...prev, file }));
            toast.success(`File "${file.name}" selected`);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file && validateFile(file)) {
            setUploadedFile(file);
            setFormData(prev => ({ ...prev, file }));
            toast.success(`File "${file.name}" uploaded`);
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setFormData(prev => ({ ...prev, file: null }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        toast.info('File removed');
    };

    const handleStudentChange = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        setFormData(prev => ({
            ...prev,
            studentId,
            studentEmail: student?.email || '',
            studentName: student?.name || ''
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.studentId || !formData.title || !uploadedFile || !user?.institutionId || !facultyClass) {
            toast.error('Please fill all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            console.log('[CERTIFICATE] Starting upload process...');

            // 1. Upload File to Supabase Storage
            const file = uploadedFile;
            const fileExt = file.name.split('.').pop();
            const fileName = `cert-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${user.institutionId}/${formData.studentId}/${fileName}`;

            console.log('[CERTIFICATE] Uploading file to:', filePath);

            const { error: uploadError } = await supabase.storage
                .from('certificates')
                .upload(filePath, file);

            if (uploadError) {
                console.error('[CERTIFICATE] Upload error:', uploadError);
                throw uploadError;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('certificates')
                .getPublicUrl(filePath);

            console.log('[CERTIFICATE] File uploaded, public URL:', publicUrl);

            // 2. Insert Certificate Record
            const certificateData = {
                student_id: formData.studentId,
                student_email: formData.studentEmail,
                student_name: formData.studentName,
                faculty_id: user.id,
                faculty_name: user.fullName || user.email,
                institution_id: user.institutionId,
                category: formData.title,
                course_description: formData.description,
                file_url: publicUrl,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                class_name: facultyClass.class_name,
                section: facultyClass.section,
                uploaded_by: user.email,
                status: 'active'
            };

            console.log('[CERTIFICATE] Inserting certificate record:', certificateData);

            const { error: insertError } = await supabase
                .from('certificates')
                .insert(certificateData);

            if (insertError) {
                console.error('[CERTIFICATE] Insert error:', insertError);
                throw insertError;
            }

            console.log('[CERTIFICATE] Certificate uploaded successfully!');
            toast.success('Certificate uploaded successfully!');

            // Reset form
            setFormData({
                studentId: '',
                studentEmail: '',
                studentName: '',
                title: '',
                description: '',
                file: null
            });
            setUploadedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error: any) {
            console.error('[CERTIFICATE] Upload failed:', error);
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingClass) {
        return (
            <FacultyLayout>
                <PageHeader
                    title="Upload Certificate"
                    subtitle="Issue new certificates to students"
                />
                <div className="flex justify-center p-10">
                    <Loader2 className="animate-spin w-8 h-8" />
                </div>
            </FacultyLayout>
        );
    }

    if (!facultyClass) {
        return (
            <FacultyLayout>
                <PageHeader
                    title="Upload Certificate"
                    subtitle="Issue new certificates to students"
                />
                <div className="max-w-2xl mx-auto">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            No class assigned to you. Please contact your institution administrator to assign you to a class.
                        </AlertDescription>
                    </Alert>
                </div>
            </FacultyLayout>
        );
    }

    return (
        <FacultyLayout>
            <PageHeader
                title="Upload Certificate"
                subtitle={`Issue certificates to ${facultyClass.class_name} ${facultyClass.section} students`}
            />

            <div className="max-w-2xl mx-auto dashboard-card">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">

                        {/* Class and Section (Read-only) */}
                        <Alert className="bg-primary/5 border-primary/20">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Your assigned class: <strong>{facultyClass.class_name} - Section {facultyClass.section}</strong>
                            </AlertDescription>
                        </Alert>

                        {/* Student Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="student">Select Student</Label>
                            <Select
                                value={formData.studentId}
                                onValueChange={handleStudentChange}
                                disabled={students.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={students.length === 0 ? "No students found" : "Select Student"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map(std => (
                                        <SelectItem key={std.id} value={std.id}>
                                            {std.name} {std.register_number ? `(${std.register_number})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Certificate Details */}
                        <div className="space-y-2">
                            <Label htmlFor="category">Certificate Category</Label>
                            <Select
                                value={formData.title}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, title: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Academic Excellence">Academic Excellence</SelectItem>
                                    <SelectItem value="Sports Achievement">Sports Achievement</SelectItem>
                                    <SelectItem value="Perfect Attendance">Perfect Attendance</SelectItem>
                                    <SelectItem value="Course Completion">Course Completion</SelectItem>
                                    <SelectItem value="Participation">Participation</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Course / Description</Label>
                            <Input
                                id="description"
                                placeholder="e.g. Web Development Bootcamp 2025"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                required
                            />
                        </div>

                        {/* File Upload with Drag and Drop */}
                        <div className="space-y-2">
                            <Label>Upload Certificate File</Label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                                className="hidden"
                                id="file-upload"
                            />

                            {!uploadedFile ? (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isDragging
                                        ? 'border-primary bg-primary/5 scale-[1.02]'
                                        : 'border-border hover:bg-muted/50 hover:border-primary/50'
                                        }`}
                                >
                                    <Upload className={`w-8 h-8 mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <p className="text-sm font-medium mb-1">
                                        {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">PDF, JPG or PNG (max. 10MB)</p>
                                </div>
                            ) : (
                                <div className="border-2 border-success bg-success/5 rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-8 h-8 text-success" />
                                        <div>
                                            <p className="text-sm font-medium">{uploadedFile.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(uploadedFile.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleRemoveFile}
                                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" className="btn-primary min-w-[120px]" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Post Certificate
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </FacultyLayout>
    );
}
