import { useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, GraduationCap, UserCog, UserPlus, Plus, Building2, Loader2, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BulkUploadService } from '@/services/BulkUploadService';
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

interface Institution {
  institution_id: string;
  name: string;
  city: string;
  state: string;
  type: string;
  logo_url?: string;
}

type DialogType = 'student' | 'staff' | 'parent' | null;

export function AdminUsers() {
  const navigate = useNavigate();
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Upload State
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFileType, setBulkFileType] = useState<'student' | 'staff' | 'parent'>('student');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Student form state
  const [studentData, setStudentData] = useState({
    name: '',
    registerNumber: '',
    className: '',
    section: '',
    dob: '',
    gender: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    email: '',
    address: '',
    password: '',
  });

  // Staff form state
  const [staffData, setStaffData] = useState({
    name: '',
    staffId: '',
    role: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
  });

  // Parent form state
  const [parentData, setParentData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    studentIds: [] as string[],
  });

  // Students list for dropdown
  const { data: institutionStudents = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['institution-students', selectedInstitution?.institution_id],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name, email, register_number')
        .eq('institution_id', selectedInstitution.institution_id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedInstitution && dialogType === 'parent'
  });

  const { data: institutions = [], isLoading } = useQuery({
    queryKey: ['admin-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isSupabaseConfigured()
  });

  const openDialog = (institution: Institution, type: DialogType) => {
    setSelectedInstitution(institution);
    setDialogType(type);
  };

  const closeDialog = () => {
    setDialogType(null);
    setSelectedInstitution(null);
    // Reset forms
    setStudentData({
      name: '', registerNumber: '', className: '', section: '', dob: '', gender: '',
      parentName: '', parentEmail: '', parentPhone: '', email: '', address: '', password: ''
    });
    setStaffData({ name: '', staffId: '', role: '', email: '', phone: '', dob: '', password: '' });
    setParentData({ name: '', email: '', phone: '', password: '', studentIds: [] });
  };

  const handleAddStudent = async () => {
    if (!selectedInstitution) return;

    // Validation
    if (!studentData.name || !studentData.email || !studentData.password ||
      !studentData.parentEmail || !studentData.parentPhone) {
      toast.error('Please fill all mandatory fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create user account
      const { error: userError } = await supabase.functions.invoke('create-user', {
        body: {
          email: studentData.email,
          password: studentData.password,
          role: 'student',
          full_name: studentData.name,
          institution_id: selectedInstitution.institution_id,
          parent_email: studentData.parentEmail,
          parent_phone: studentData.parentPhone,
          parent_name: studentData.parentName
        }
      });

      if (userError) throw userError;

      // Insert student details
      const { error: studentError } = await supabase.from('students').insert({
        institution_id: selectedInstitution.institution_id,
        name: studentData.name,
        register_number: studentData.registerNumber,
        class_name: studentData.className,
        section: studentData.section,
        dob: studentData.dob,
        gender: studentData.gender,
        parent_name: studentData.parentName,
        parent_contact: studentData.parentPhone,
        parent_email: studentData.parentEmail,
        parent_phone: studentData.parentPhone,
        email: studentData.email,
        address: studentData.address,
      });

      if (studentError) throw studentError;

      toast.success('Student added successfully!');
      closeDialog();
      // Keep dialog open to add another student for the same institution
      openDialog(selectedInstitution, 'student');
      setStudentData({
        name: '', registerNumber: '', className: '', section: '', dob: '', gender: '',
        parentName: '', parentEmail: '', parentPhone: '', email: '', address: '', password: ''
      });
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Failed to add student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStaff = async () => {
    if (!selectedInstitution) return;

    if (!staffData.name || !staffData.email || !staffData.password || !staffData.staffId) {
      toast.error('Please fill all mandatory fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: {
          email: staffData.email,
          password: staffData.password,
          role: 'faculty',
          full_name: staffData.name,
          institution_id: selectedInstitution.institution_id,
          staff_id: staffData.staffId,
        }
      });

      if (error) throw error;

      toast.success('Staff member added successfully!');
      closeDialog();
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast.error(error.message || 'Failed to add staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddParent = async () => {
    if (!selectedInstitution) return;

    if (!parentData.name || !parentData.email || !parentData.phone ||
      !parentData.password || parentData.studentIds.length === 0) {
      toast.error('Please fill all mandatory fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: {
          email: parentData.email,
          password: parentData.password,
          role: 'parent',
          full_name: parentData.name,
          institution_id: selectedInstitution.institution_id,
          phone: parentData.phone,
          student_id: parentData.studentIds[0], // Pass the first one for direct link, others can be linked if function updated
          student_ids: parentData.studentIds // Added for future-proofing
        }
      });

      if (error) throw error;

      toast.success('Parent added successfully!');
      closeDialog();
    } catch (error: any) {
      console.error('Error adding parent:', error);
      toast.error(error.message || 'Failed to add parent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedInstitution || !bulkFile) {
      toast.error("Please select an institution and a file.");
      return;
    }

    setIsBulkUploading(true);
    setUploadProgress({ current: 0, total: 0 });

    try {
      const parsedData = await BulkUploadService.parseExcel(bulkFile);

      // Add roles based on selected type
      const dataWithRoles = parsedData.map((row: any) => ({
        ...row,
        role: bulkFileType === 'staff' ? (row.role || 'faculty') : bulkFileType
      }));

      const results = await BulkUploadService.bulkCreateUsers(
        dataWithRoles,
        selectedInstitution.institution_id,
        (current, total) => setUploadProgress({ current, total })
      );

      const successes = results.filter(r => r.status === 'success');
      const errors = results.filter(r => r.status === 'error');

      if (errors.length > 0) {
        console.error("Bulk upload errors:", errors);
        toast.error(`Completed with errors. Success: ${successes.length}, Failed: ${errors.length}. Downloading report...`);
        BulkUploadService.downloadResults(results, `upload-report-${Date.now()}.xlsx`);
      } else {
        toast.success(`Successfully imported ${successes.length} users!`);
        setShowBulkUpload(false);
        setBulkFile(null);
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


  return (
    <AdminLayout>
      <PageHeader
        title="User Management"
        subtitle="Add students, staff, and parents to institutions"
        actions={
          <Button onClick={() => setShowBulkUpload(true)} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading institutions...</p>
        </div>
      ) : institutions.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Institutions Found</h3>
          <p className="text-muted-foreground mb-6">
            Create an institution first before adding users
          </p>
          <Button onClick={() => navigate('/admin/add-institution')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Institution
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {institutions.map((institution) => (
            <Card key={institution.institution_id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                {institution.logo_url ? (
                  <img
                    src={institution.logo_url}
                    alt={institution.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate mb-1">{institution.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {institution.city}, {institution.state}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Code: {institution.institution_id}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openDialog(institution, 'student')}
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openDialog(institution, 'staff')}
                >
                  <UserCog className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openDialog(institution, 'parent')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Add Parent
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Student Dialog */}
      <Dialog open={dialogType === 'student'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Student - {selectedInstitution?.name}</DialogTitle>
            <DialogDescription>
              Fill in student details. Parent phone and email are mandatory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="student-name">Student Name *</Label>
              <Input
                id="student-name"
                value={studentData.name}
                onChange={(e) => setStudentData({ ...studentData, name: e.target.value })}
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-number">Register Number</Label>
              <Input
                id="register-number"
                value={studentData.registerNumber}
                onChange={(e) => setStudentData({ ...studentData, registerNumber: e.target.value })}
                placeholder="REG001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Input
                id="class"
                value={studentData.className}
                onChange={(e) => setStudentData({ ...studentData, className: e.target.value })}
                placeholder="10th"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                value={studentData.section}
                onChange={(e) => setStudentData({ ...studentData, section: e.target.value })}
                placeholder="A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={studentData.dob}
                onChange={(e) => setStudentData({ ...studentData, dob: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={studentData.gender} onValueChange={(value) => setStudentData({ ...studentData, gender: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-name">Parent Name</Label>
              <Input
                id="parent-name"
                value={studentData.parentName}
                onChange={(e) => setStudentData({ ...studentData, parentName: e.target.value })}
                placeholder="Parent/Guardian Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-email">Parent Email *</Label>
              <Input
                id="parent-email"
                type="email"
                value={studentData.parentEmail}
                onChange={(e) => setStudentData({ ...studentData, parentEmail: e.target.value })}
                placeholder="parent@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-phone">Parent Phone *</Label>
              <Input
                id="parent-phone"
                type="tel"
                value={studentData.parentPhone}
                onChange={(e) => setStudentData({ ...studentData, parentPhone: e.target.value })}
                placeholder="+91 XXXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-email">Student Email *</Label>
              <Input
                id="student-email"
                type="email"
                value={studentData.email}
                onChange={(e) => setStudentData({ ...studentData, email: e.target.value })}
                placeholder="student@email.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={studentData.address}
                onChange={(e) => setStudentData({ ...studentData, address: e.target.value })}
                placeholder="Full Address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-password">Password *</Label>
              <Input
                id="student-password"
                type="password"
                value={studentData.password}
                onChange={(e) => setStudentData({ ...studentData, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleAddStudent} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Staff Dialog */}
      <Dialog open={dialogType === 'staff'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Staff - {selectedInstitution?.name}</DialogTitle>
            <DialogDescription>
              Fill in staff member details
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Name *</Label>
              <Input
                id="staff-name"
                value={staffData.name}
                onChange={(e) => setStaffData({ ...staffData, name: e.target.value })}
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-id">Staff ID *</Label>
              <Input
                id="staff-id"
                value={staffData.staffId}
                onChange={(e) => setStaffData({ ...staffData, staffId: e.target.value })}
                placeholder="STAFF001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">Role</Label>
              <Select value={staffData.role} onValueChange={(value) => setStaffData({ ...staffData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email *</Label>
              <Input
                id="staff-email"
                type="email"
                value={staffData.email}
                onChange={(e) => setStaffData({ ...staffData, email: e.target.value })}
                placeholder="staff@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                type="tel"
                value={staffData.phone}
                onChange={(e) => setStaffData({ ...staffData, phone: e.target.value })}
                placeholder="+91 XXXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-dob">Date of Birth</Label>
              <Input
                id="staff-dob"
                type="date"
                value={staffData.dob}
                onChange={(e) => setStaffData({ ...staffData, dob: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="staff-password">Password *</Label>
              <Input
                id="staff-password"
                type="password"
                value={staffData.password}
                onChange={(e) => setStaffData({ ...staffData, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleAddStaff} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Parent Dialog */}
      <Dialog open={dialogType === 'parent'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Parent - {selectedInstitution?.name}</DialogTitle>
            <DialogDescription>
              Fill in parent details and link to their child
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="parent-name">Parent Name *</Label>
              <Input
                id="parent-name"
                value={parentData.name}
                onChange={(e) => setParentData({ ...parentData, name: e.target.value })}
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-email-field">Email *</Label>
              <Input
                id="parent-email-field"
                type="email"
                value={parentData.email}
                onChange={(e) => setParentData({ ...parentData, email: e.target.value })}
                placeholder="parent@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-phone-field">Phone *</Label>
              <Input
                id="parent-phone-field"
                type="tel"
                value={parentData.phone}
                onChange={(e) => setParentData({ ...parentData, phone: e.target.value })}
                placeholder="+91 XXXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-password">Password *</Label>
              <Input
                id="parent-password"
                type="password"
                value={parentData.password}
                onChange={(e) => setParentData({ ...parentData, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="children">Select Children *</Label>
              <div className="grid grid-cols-1 gap-2 border rounded-lg p-3 max-h-40 overflow-y-auto bg-card">
                {isStudentsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading students...
                  </div>
                ) : institutionStudents.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">
                    No students found in this institution
                  </div>
                ) : (
                  institutionStudents.map((child) => (
                    <div key={child.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors">
                      <input
                        type="checkbox"
                        id={`child-${child.id}`}
                        checked={parentData.studentIds.includes(child.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...parentData.studentIds, child.id]
                            : parentData.studentIds.filter(id => id !== child.id);
                          setParentData({ ...parentData, studentIds: ids });
                        }}
                        className="w-4 h-4 rounded border-input text-primary focus:ring-primary/20"
                      />
                      <Label htmlFor={`child-${child.id}`} className="flex flex-col cursor-pointer flex-1">
                        <span className="font-medium text-sm">{child.name}</span>
                        <span className="text-xs text-muted-foreground">{child.email} | {child.register_number}</span>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleAddParent} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Parent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              <Label>Select Institution</Label>
              <Select
                value={selectedInstitution?.institution_id || ''}
                onValueChange={(v) => {
                  const inst = institutions.find(i => i.institution_id === v);
                  setSelectedInstitution(inst || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Institution" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map(inst => (
                    <SelectItem key={inst.institution_id} value={inst.institution_id}>
                      {inst.name} ({inst.institution_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                    style={{ width: `${(uploadProgress.current / (uploadProgress.total || 1)) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Processing {uploadProgress.current} / {uploadProgress.total}...
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkUpload(false)}>Cancel</Button>
            <Button onClick={handleBulkUpload} disabled={isBulkUploading || !bulkFile}>
              {isBulkUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload & Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
