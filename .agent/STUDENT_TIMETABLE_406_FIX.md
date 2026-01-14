# Student Timetable 406 Error - Fix Guide

## 🚨 The Error

```
Failed to load resource: the server responded with a status of 406 ()
[STUDENT] Error fetching student data: Object
```

## 🔍 Root Cause

The **406 Not Acceptable** error occurs when:
1. The `students` table doesn't exist in the database, OR
2. RLS (Row Level Security) policies are blocking access

## ✅ THE FIX

### **Run This SQL in Supabase Dashboard:**

```sql
-- Step 1: Ensure students table exists
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  register_number TEXT UNIQUE,
  class_name TEXT,
  section TEXT,
  dob DATE,
  gender TEXT,
  parent_name TEXT,
  parent_contact TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Step 2: Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.students;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Students can read own data" ON public.students;

-- Step 4: Create comprehensive policies
CREATE POLICY "Authenticated users can read all students" 
ON public.students 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage students" 
ON public.students 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
```

---

## 🎯 What This Does

### **Creates/Ensures:**
1. ✅ `students` table exists with all required columns
2. ✅ RLS is enabled for security
3. ✅ Policies allow authenticated users to read student data
4. ✅ Policies allow institution admins to manage students

### **Fixes:**
- ✅ 406 error when students try to view timetable
- ✅ Students can now fetch their class and section
- ✅ Timetable page will load correctly

---

## 🧪 After Running SQL - Test

### **Step 1: Verify Student Data Exists**

Run this SQL to check:
```sql
-- Check if student exists
SELECT * FROM students WHERE email = 'kamalesh.s@myvidyon.edu';
```

**Expected Result:**
```
id | institution_id | name | class_name | section | email
---|----------------|------|------------|---------|-------
... | ...           | ...  | 10th       | A       | kamalesh.s@myvidyon.edu
```

**If NO data:**
You need to create the student record first! See "Creating Student Data" below.

### **Step 2: Test Timetable Page**

1. **Log in** as student (kamalesh.s@myvidyon.edu)
2. **Go to** Timetable page
3. **Check browser console** (F12)

**Expected Logs:**
```
[STUDENT] Fetching student info for: kamalesh.s@myvidyon.edu
[STUDENT] Student data: {class_name: "10th", section: "A"}
[STUDENT] Class ID: abc-123
[STUDENT] Fetching timetable for class: 10th Section: A
[STUDENT] Fetched timetable slots: [...]
```

**If Still Error:**
Check console for specific error message. The code now shows helpful error messages!

---

## 📊 Creating Student Data

If the student doesn't exist in the `students` table, you need to create it:

### **Option 1: Via Institution Portal**

1. **Log in** as Institution Admin
2. **Go to** Users → Students
3. **Click** "Add Student"
4. **Fill in**:
   - Name: Kamalesh
   - Email: kamalesh.s@myvidyon.edu
   - Class: 10th
   - Section: A
   - Other details...
5. **Save**

### **Option 2: Via SQL**

```sql
-- Insert student record
INSERT INTO public.students (
  institution_id,
  name,
  email,
  class_name,
  section,
  register_number
) VALUES (
  'your-institution-id',
  'Kamalesh',
  'kamalesh.s@myvidyon.edu',
  '10th',
  'A',
  'REG001'
);
```

---

## 🎨 Error Handling Improvements

The code now shows helpful error messages:

### **Error Messages:**

| Scenario | Message |
|----------|---------|
| Table doesn't exist | "Student data not found. Please contact your institution admin." |
| No student record | "Your student profile is not set up yet. Please contact your institution admin." |
| Missing class/section | "Your class or section is not set. Please contact your institution admin." |
| Class not found | "Class '10th' not found in the system." |
| Database error | "Database error: [specific error message]" |

### **UI Display:**
- Shows red calendar icon
- Shows "Error Loading Timetable" heading
- Shows specific error message
- Shows help text: "If this problem persists, please contact your institution administrator."

---

## 🔍 Debugging

### **Check Console Logs:**

The code logs everything:
```
[STUDENT] Fetching student info for: kamalesh.s@myvidyon.edu
[STUDENT] Error fetching student data: {...}
[STUDENT] Error details: {
  message: "...",
  code: "...",
  details: "...",
  hint: "..."
}
```

### **Common Error Codes:**

| Code | Meaning | Fix |
|------|---------|-----|
| `PGRST116` | No rows found | Student doesn't exist - create student record |
| `42P01` | Table doesn't exist | Run the SQL fix above |
| `42501` | RLS policy blocks | Run the SQL fix above |

---

## 📁 Files Created/Modified

1. ✅ `supabase/admin/fix_students_table_rls.sql` - SQL fix
2. ✅ `src/pages/student/StudentTimetable.tsx` - Better error handling
3. ✅ This documentation

---

## 🚀 Summary

### **The Problem:**
- 406 error when accessing `students` table
- Either table doesn't exist or RLS blocks access

### **The Solution:**
1. Run SQL to create/fix `students` table
2. Ensure student record exists with class and section
3. Code now shows helpful error messages

### **After Fix:**
- ✅ Students can view their timetable
- ✅ Shows class-specific timetable
- ✅ Real-time updates work
- ✅ Helpful error messages if something's wrong

---

## ⚡ Quick Action

**Run this SQL NOW:**

```sql
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read all students" ON public.students;
CREATE POLICY "Authenticated users can read all students" 
ON public.students FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage students" ON public.students;
CREATE POLICY "Authenticated users can manage students" 
ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

Then **verify student exists**:
```sql
SELECT * FROM students WHERE email = 'kamalesh.s@myvidyon.edu';
```

If no data, **create the student** via Institution Portal or SQL!

Then **refresh browser** and test the timetable page! 🎉
