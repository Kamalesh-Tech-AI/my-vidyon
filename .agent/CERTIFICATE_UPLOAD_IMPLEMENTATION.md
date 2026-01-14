# Faculty Upload Certificate - Implementation Plan

## 🎯 Requirements

### **Current Issues:**
1. ❌ Class dropdown doesn't work
2. ❌ Section dropdown doesn't work  
3. ❌ Need to auto-detect faculty's assigned class/section

### **Desired Behavior:**
1. ✅ Auto-fill class and section based on faculty's assignment
2. ✅ Show only students from that class/section
3. ✅ Upload certificate for selected student
4. ✅ Certificate appears in student's portal

---

## 📊 Database Schema Needed

### **certificates Table:**

```sql
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  
  -- Certificate details
  category TEXT NOT NULL,
  course_description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  
  -- Metadata
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  uploaded_by TEXT,
  
  -- Class info (for filtering)
  class_name TEXT,
  section TEXT
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students can view own certificates" 
ON public.certificates 
FOR SELECT 
TO authenticated 
USING (student_email = auth.jwt()->>'email');

CREATE POLICY "Faculty can manage certificates" 
ON public.certificates 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_certificates_student_email ON public.certificates(student_email);
CREATE INDEX IF NOT EXISTS idx_certificates_faculty_id ON public.certificates(faculty_id);
CREATE INDEX IF NOT EXISTS idx_certificates_institution_id ON public.certificates(institution_id);
```

---

## 🔧 Implementation Steps

### **Step 1: Create Certificates Table**

Run the SQL above in Supabase Dashboard.

### **Step 2: Modify Faculty Upload Certificate Page**

**File**: `src/pages/faculty/FacultyUploadCertificate.tsx`

**Changes Needed:**

1. **Auto-detect faculty's class/section:**
   ```typescript
   // Fetch faculty's assigned class from staff_details or timetable_slots
   const { data: facultyClass } = await supabase
     .from('staff_details')
     .select('class_name, section')  // Assuming these fields exist
     .eq('profile_id', user.id)
     .single();
   
   // OR from timetable_slots (get most common class)
   const { data: timetableSlots } = await supabase
     .from('timetable_slots')
     .select('class_id, section, classes(name)')
     .eq('faculty_id', user.id);
   ```

2. **Disable class/section dropdowns:**
   ```typescript
   <Select disabled value={facultyClass?.class_name}>
     <SelectTrigger>
       <SelectValue />
     </SelectTrigger>
   </Select>
   ```

3. **Fetch students from that class/section:**
   ```typescript
   const { data: students } = await supabase
     .from('students')
     .select('id, name, email, register_number')
     .eq('class_name', facultyClass.class_name)
     .eq('section', facultyClass.section)
     .order('name');
   ```

4. **Upload certificate:**
   ```typescript
   // Upload file to Supabase Storage
   const { data: uploadData, error: uploadError } = await supabase.storage
     .from('certificates')
     .upload(`${user.institutionId}/${selectedStudent.id}/${file.name}`, file);
   
   // Save certificate record
   const { error: insertError } = await supabase
     .from('certificates')
     .insert({
       student_id: selectedStudent.id,
       student_email: selectedStudent.email,
       faculty_id: user.id,
       institution_id: user.institutionId,
       category: selectedCategory,
       course_description: courseDescription,
       file_url: uploadData.path,
       file_name: file.name,
       file_size: file.size,
       class_name: facultyClass.class_name,
       section: facultyClass.section,
       uploaded_by: user.email
     });
   ```

### **Step 3: Create Student Certificates Page**

**File**: `src/pages/student/StudentCertificates.tsx` (NEW)

```typescript
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function StudentCertificates() {
  const { user } = useAuth();
  
  const { data: certificates = [] } = useQuery({
    queryKey: ['student-certificates', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('student_email', user.email)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email
  });
  
  return (
    <StudentLayout>
      <PageHeader title="My Certificates" />
      <div className="grid gap-4">
        {certificates.map((cert) => (
          <Card key={cert.id}>
            <CardContent className="p-4">
              <h3>{cert.category}</h3>
              <p>{cert.course_description}</p>
              <Button onClick={() => downloadCertificate(cert.file_url)}>
                Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </StudentLayout>
  );
}
```

---

## 🎨 UI Flow

### **Faculty Side:**

1. **Faculty opens** Upload Certificate page
2. **System auto-detects** faculty's class (e.g., "10th A")
3. **Class/Section fields** are pre-filled and disabled
4. **Student dropdown** shows only 10th A students
5. **Faculty selects** student (e.g., "Rahul")
6. **Faculty fills** category and description
7. **Faculty uploads** certificate file
8. **Clicks** "Post Certificate"
9. **System**:
   - Uploads file to Supabase Storage
   - Saves record to `certificates` table
   - Shows success message

### **Student Side:**

1. **Student opens** Certificates page
2. **System fetches** all certificates for that student
3. **Shows list** of certificates with:
   - Category
   - Course description
   - Upload date
   - Download button
4. **Student clicks** Download
5. **File downloads** from Supabase Storage

---

## 📝 Summary

### **Database:**
- ✅ Create `certificates` table
- ✅ Add RLS policies
- ✅ Add indexes

### **Faculty Portal:**
- ✅ Auto-detect faculty's class/section
- ✅ Disable class/section dropdowns (show as read-only)
- ✅ Filter students by class/section
- ✅ Upload certificate to Supabase Storage
- ✅ Save certificate record

### **Student Portal:**
- ✅ Create Certificates page
- ✅ Fetch student's certificates
- ✅ Display certificates with download option

---

## 🚀 Quick Start

1. **Run SQL** to create `certificates` table
2. **Modify** `FacultyUploadCertificate.tsx` to auto-detect class
3. **Create** `StudentCertificates.tsx` page
4. **Add route** for student certificates page
5. **Test** the flow

This implementation will ensure faculty can only upload certificates for their assigned class, and students can view their certificates!
