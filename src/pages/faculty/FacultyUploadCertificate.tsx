import { useState, useEffect, useRef } from 'react';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function FacultyUploadCertificate() {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [classes, setClasses] = useState<any[]>([]);
    const [availableSections, setAvailableSections] = useState<string[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        classId: '',
        section: '',
        studentId: '', // selected student ID
        title: '', // Category/Title
        description: '', // Course/Description
        file: null as File | null
    });

    useEffect(() => {
        if (user?.institutionId) {
            fetchClasses();
        }
    }, [user?.institutionId]);

    const fetchClasses = async () => {
        try {
            const { data: groupsWithClasses, error } = await supabase
                .from('groups')
                .select('classes(id, name, sections)')
                .eq('institution_id', user?.institutionId);

            if (error) throw error;

            if (groupsWithClasses) {
                const flatClasses = groupsWithClasses.flatMap(g => g.classes);
                setClasses(flatClasses);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const handleClassChange = (classId: string) => {
        const selectedClass = classes.find(c => c.id === classId);
        const sections = selectedClass?.sections || [];

        setFormData(prev => ({ ...prev, classId, section: '', studentId: '' }));
        setAvailableSections(sections);
        setStudents([]); // Clear students until section is selected
    };

    const handleSectionChange = async (section: string) => {
        setFormData(prev => ({ ...prev, section, studentId: '' }));
        setStudents([]);

        if (!formData.classId || !section) return;

        const selectedClass = classes.find(c => c.id === formData.classId);
        if (!selectedClass) {
            console.error("Selected class not found in classes list");
            return;
        }

        try {
            console.log(`Fetching students for: Class '${selectedClass.name}', Section '${section}'`);

            const query = supabase
                .from('students')
                .select('id, name, admission_no')
                .eq('institution_id', user?.institutionId)
                .eq('class_name', selectedClass.name)
                .eq('section', section);

            const { data, error } = await query;

            if (error) throw error;
            console.log("Students found:", data?.length);
            setStudents(data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
            toast.error('Could not fetch students');
        }
    };

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.studentId || !formData.title || !uploadedFile || !user?.institutionId) {
            toast.error('Please fill all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Upload File
            const file = uploadedFile;
            const fileExt = file.name.split('.').pop();
            const fileName = `cert-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${user.institutionId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('certificates')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('certificates')
                .getPublicUrl(filePath);

            // 2. Insert Record
            const { error: insertError } = await supabase
                .from('student_certificates')
                .insert({
                    title: formData.title,
                    student_id: formData.studentId,
                    course: formData.description,
                    file_url: publicUrl,
                    institution_id: user.institutionId,
                    uploaded_by: user.id,
                    issued_date: new Date().toISOString(),
                    status: 'available',
                    category: formData.title
                });

            if (insertError) throw insertError;

            toast.success('Certificate uploaded successfully!');

            // Reset form
            setFormData({
                classId: '',
                section: '',
                studentId: '',
                title: '',
                description: '',
                file: null
            });
            setUploadedFile(null);
            setStudents([]);
            setAvailableSections([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FacultyLayout>
            <PageHeader
                title="Upload Certificate"
                subtitle="Issue new certificates to students"
            />

            <div className="max-w-2xl mx-auto dashboard-card">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">

                        {/* Class Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="studentClass">Select Class</Label>
                            <Select
                                value={formData.classId}
                                onValueChange={handleClassChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(cls => (
                                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Section Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="studentSection">Select Section</Label>
                            <Select
                                value={formData.section}
                                onValueChange={handleSectionChange}
                                disabled={!formData.classId || availableSections.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSections.map(sec => (
                                        <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Student Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="student">Select Student</Label>
                            <Select
                                value={formData.studentId}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, studentId: val }))}
                                disabled={!formData.section || students.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={!formData.section ? "Select Section first" : (students.length === 0 ? "No students found" : "Select Student")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map(std => (
                                        <SelectItem key={std.id} value={std.id}>
                                            {std.name} ({std.admission_no})
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
