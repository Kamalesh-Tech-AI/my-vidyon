import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Loader2, Plus, Search, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BulkUploadService } from '@/services/BulkUploadService';
import { useAuth } from '@/context/AuthContext';
import { useWebSocketContext } from '@/context/WebSocketContext';
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/common/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddStudentDialog, AddStaffDialog, AddParentDialog } from './components/UserDialogs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DialogType = 'student' | 'staff' | 'parent' | null;

export function InstitutionUsers() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [dialogType, setDialogType] = useState<DialogType>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Bulk Upload State
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [bulkFileType, setBulkFileType] = useState<'student' | 'staff' | 'parent'>('student');
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    // --- QUERIES ---

    const { data: institutionStudents = [], isLoading: isStudentsLoading } = useQuery({
        queryKey: ['institution-students', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return [];
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('institution_id', user.institutionId)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.institutionId,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true
    });

    const { data: institutionStaff = [], isLoading: isStaffLoading } = useQuery({
        queryKey: ['institution-staff', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return [];
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('institution_id', user.institutionId)
                .order('full_name');

            if (error) throw error;
            // Client-side filtering to avoid 400 errors if enum values don't match
            const targetRoles = ['faculty', 'admin', 'teacher', 'support'];
            return (data || []).filter((p: any) => targetRoles.includes(p.role));
        },
        enabled: !!user?.institutionId,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true
    });

    const { data: institutionParents = [], isLoading: isParentsLoading } = useQuery({
        queryKey: ['institution-parents', user?.institutionId],
        queryFn: async () => {
            if (!user?.institutionId) return [];
            const { data, error } = await supabase
                .from('parents')
                .select('*')
                .eq('institution_id', user.institutionId)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.institutionId,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true
    });

    // --- REALTIME SUBSCRIPTION ---
    const { subscribeToTable } = useWebSocketContext();

    useEffect(() => {
        if (!user?.institutionId) return;

        // Subscribe to Students
        const unsubStudents = subscribeToTable('students', () => {
            queryClient.invalidateQueries({ queryKey: ['institution-students'] });
        });

        // Subscribe to Staff (profiles)
        const unsubProfiles = subscribeToTable('profiles', () => {
            queryClient.invalidateQueries({ queryKey: ['institution-staff'] });
        });

        // Subscribe to Parents
        const unsubParents = subscribeToTable('parents', () => {
            queryClient.invalidateQueries({ queryKey: ['institution-parents'] });
        });

        return () => {
            unsubStudents();
            unsubProfiles();
            unsubParents();
        };
    }, [user?.institutionId, queryClient, subscribeToTable]);


    // --- HANDLERS ---

    const handleBulkUpload = async () => {
        if (!user?.institutionId || !bulkFile) {
            toast.error("Please select a file.");
            return;
        }

        setIsBulkUploading(true);
        setUploadProgress({ current: 0, total: 0 });

        try {
            const parsedData = await BulkUploadService.parseExcel(bulkFile);

            const dataWithRoles = parsedData.map((row: any) => ({
                ...row,
                role: bulkFileType === 'staff' ? (row.role || 'faculty') : bulkFileType
            }));

            const results = await BulkUploadService.bulkCreateUsers(
                dataWithRoles,
                user.institutionId,
                (current, total) => setUploadProgress({ current, total })
            );

            const successes = results.filter(r => r.status === 'success');
            const errors = results.filter(r => r.status === 'error');

            if (errors.length > 0) {
                toast.error(`Completed with errors. Success: ${successes.length}, Failed: ${errors.length}. Downloading report...`);
                BulkUploadService.downloadResults(results, `upload-report-${Date.now()}.xlsx`);
            } else {
                toast.success(`Successfully imported ${successes.length} users!`);
                setShowBulkUpload(false);
                setBulkFile(null);
                // Invalidate all related queries
                queryClient.invalidateQueries({ queryKey: ['institution-students'] });
                queryClient.invalidateQueries({ queryKey: ['institution-staff'] });
                queryClient.invalidateQueries({ queryKey: ['institution-parents'] });
            }

        } catch (error: any) {
            toast.error("Bulk upload failed: " + error.message);
        } finally {
            setIsBulkUploading(false);
        }
    };

    const handleDownloadTemplate = () => {
        BulkUploadService.generateTemplate(bulkFileType);
    };

    const filteredStudents = useMemo(() => institutionStudents.filter((s: any) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.register_number.toLowerCase().includes(searchTerm.toLowerCase())
    ), [institutionStudents, searchTerm]);

    const filteredStaff = useMemo(() => institutionStaff.filter((s: any) =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [institutionStaff, searchTerm]);

    const filteredParents = useMemo(() => institutionParents.filter((s: any) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    ), [institutionParents, searchTerm]);

    return (
        <InstitutionLayout>
            <PageHeader
                title="User Management"
                subtitle="Manage students, faculty, and parents for your institution"
                actions={
                    <Button onClick={() => setShowBulkUpload(true)} variant="outline" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Bulk Import Users
                    </Button>
                }
            />

            <div className="flex flex-col space-y-6">

                {/* Search & Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Tabs defaultValue="students" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="students">Students</TabsTrigger>
                        <TabsTrigger value="staff">Staff</TabsTrigger>
                        <TabsTrigger value="parents">Parents</TabsTrigger>
                    </TabsList>

                    {/* STUDENTS TAB */}
                    <TabsContent value="students" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Active Students ({filteredStudents.length})</h3>
                            <Button size="sm" onClick={() => setDialogType('student')} className="gap-2">
                                <Plus className="w-4 h-4" /> Add Student
                            </Button>
                        </div>

                        <Card className="border">
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b bg-muted/40">
                                        <tr className="border-b transition-colors">
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Name</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Register No</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Class</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Parent</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {isStudentsLoading ? (
                                            <tr><td colSpan={5} className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                                        ) : filteredStudents.length === 0 ? (
                                            <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No students found.</td></tr>
                                        ) : (
                                            filteredStudents.map((student: any) => (
                                                <tr key={student.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-4 font-medium">{student.name}
                                                        <div className="text-xs text-muted-foreground">{student.email}</div>
                                                    </td>
                                                    <td className="p-4">{student.register_number}</td>
                                                    <td className="p-4"><Badge variant="outline">{student.class_name || 'N/A'} - {student.section || 'A'}</Badge></td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span>{student.parent_name || 'N/A'}</span>
                                                            <span className="text-xs text-muted-foreground">{student.parent_contact || student.parent_phone}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4"><Badge className="bg-green-100 text-green-700 hover:bg-green-100/80 border-0">Active</Badge></td>
                                                    <td className="p-4">
                                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/institution/student/${student.id}`)}>
                                                            View Details
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* STAFF TAB */}
                    <TabsContent value="staff" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Active Faculty & Staff ({filteredStaff.length})</h3>
                            <Button size="sm" onClick={() => setDialogType('staff')} className="gap-2">
                                <Plus className="w-4 h-4" /> Add Staff
                            </Button>
                        </div>

                        <Card className="border">
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b bg-muted/40">
                                        <tr className="border-b transition-colors">
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Name</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Email</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Role</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {isStaffLoading ? (
                                            <tr><td colSpan={4} className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                                        ) : filteredStaff.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No staff found.</td></tr>
                                        ) : (
                                            filteredStaff.map((staff: any) => (
                                                <tr key={staff.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-4 font-medium">{staff.full_name}</td>
                                                    <td className="p-4">{staff.email}</td>
                                                    <td className="p-4"><Badge variant="outline" className="capitalize">{staff.role}</Badge></td>
                                                    <td className="p-4"><Badge className="bg-green-100 text-green-700 hover:bg-green-100/80 border-0">Active</Badge></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* PARENTS TAB */}
                    <TabsContent value="parents" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Registered Parents ({filteredParents.length})</h3>
                            <Button size="sm" onClick={() => setDialogType('parent')} className="gap-2">
                                <Plus className="w-4 h-4" /> Add Parent
                            </Button>
                        </div>
                        <Card className="border">
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b bg-muted/40">
                                        <tr className="border-b transition-colors">
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Name</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Email</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Phone</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {isParentsLoading ? (
                                            <tr><td colSpan={4} className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                                        ) : filteredParents.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No parents found.</td></tr>
                                        ) : (
                                            filteredParents.map((parent: any) => (
                                                <tr key={parent.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-4 font-medium">{parent.name}</td>
                                                    <td className="p-4">{parent.email}</td>
                                                    <td className="p-4">{parent.phone}</td>
                                                    <td className="p-4"><Badge className="bg-green-100 text-green-700 hover:bg-green-100/80 border-0">Active</Badge></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Render Dialogs conditionally or always render them but control open status with props? 
                Always rendering is fine if they are lightweight, but conditional rendering (mounting only when open) 
                resets their internal state cleanly.
            */}
            {dialogType === 'student' && (
                <AddStudentDialog
                    open={true}
                    onOpenChange={(open: boolean) => !open && setDialogType(null)}
                    institutionId={user?.institutionId}
                    onSuccess={() => { }}
                />
            )}

            {dialogType === 'staff' && (
                <AddStaffDialog
                    open={true}
                    onOpenChange={(open: boolean) => !open && setDialogType(null)}
                    institutionId={user?.institutionId}
                    onSuccess={() => { }}
                />
            )}

            {dialogType === 'parent' && (
                <AddParentDialog
                    open={true}
                    onOpenChange={(open: boolean) => !open && setDialogType(null)}
                    institutionId={user?.institutionId}
                    students={institutionStudents}
                    onSuccess={() => { }}
                />
            )}

            {/* Bulk Upload Dialog */}
            <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Bulk Import Users</DialogTitle>
                        <DialogDescription>
                            Upload an Excel file to bulk create users.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>User Type</Label>
                            <Select
                                value={bulkFileType}
                                onValueChange={(v: any) => setBulkFileType(v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="parent">Parent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="p-4 border border-dashed rounded-lg bg-muted/20 text-center space-y-3">
                            <div className="flex justify-center">
                                <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p>1. Download the template</p>
                                <Button variant="link" size="sm" onClick={handleDownloadTemplate} className="h-auto p-0">
                                    Download {bulkFileType} template
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bulk-file">Upload File</Label>
                            <Input
                                id="bulk-file"
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Supported formats: .xlsx, .xls, .csv
                            </p>
                        </div>

                        {isBulkUploading && (
                            <div className="space-y-1">
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs text-center text-muted-foreground">
                                    Processing {uploadProgress.current} of {uploadProgress.total}...
                                </p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </InstitutionLayout>
    );
}
