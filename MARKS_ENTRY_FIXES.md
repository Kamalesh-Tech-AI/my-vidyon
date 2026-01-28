# Fixes Applied to Resolve Marks Entry Errors

## Issues Identified

From the console errors, there were two main problems:

1. **400 Error on `faculty_subjects` query**: The join syntax was failing because:
   - The `classes` table referenced in `faculty_subjects` foreign key might not exist
   - The join syntax needed adjustment

2. **400 Error on `students` query**: Column name mismatch:
   - Code was using `roll_no` 
   - Database schema has `register_number`

## Fixes Applied

### 1. Fixed Student Column Names
**Files Modified:**
- `FacultyMarks.tsx` (2 locations)
- `MarksEntryTable.tsx`

**Changes:**
- Changed `roll_no` → `register_number`
- Added `is_active` filter to only fetch active students
- Added better error logging for student queries

### 2. Fixed Faculty Subjects Query with Fallback Logic
**File:** `FacultyMarks.tsx`

**Strategy:**
The query now uses a **two-tier fallback approach**:

```typescript
// Try 1: Fetch with joins (if classes table exists)
let { data, error } = await supabase
    .from('faculty_subjects')
    .select(`
        *,
        subjects(name),
        classes(class_name)
    `)
    .eq('faculty_profile_id', user?.id);

// Try 2: If join fails, fetch without joins and manually resolve
if (error) {
    // Fetch basic data
    const { data: basicData } = await supabase
        .from('faculty_subjects')
        .select('*')
        .eq('faculty_profile_id', user?.id);
    
    // Manually fetch and map subject names
    const subjectIds = basicData.map(a => a.subject_id);
    const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds);
    
    // Merge the data
    data = basicData.map(assignment => ({
        ...assignment,
        subjects: subjects.find(s => s.id === assignment.subject_id)
    }));
}
```

This ensures the query **always succeeds** regardless of whether the `classes` table exists.

### 3. Created Classes Table Migration
**File:** `supabase/migrations/20260127170000_create_classes_table.sql`

**Purpose:**
- Creates the `classes` table that `faculty_subjects` references
- Populates it with existing class data from the `students` table
- Sets up proper RLS policies

**Schema:**
```sql
CREATE TABLE public.classes (
  id UUID PRIMARY KEY,
  institution_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  section TEXT DEFAULT 'A',
  academic_year TEXT DEFAULT '2025-26',
  UNIQUE(institution_id, class_name, section, academic_year)
);
```

### 4. Enhanced Error Logging
Added detailed console logging to help debug:
- Query parameters being used
- Which data source is being used (faculty_subjects, staff_details, or all subjects)
- Detailed error messages with full error objects

## Expected Behavior After Fix

1. **Subject Dropdown**: Will populate from one of three sources:
   - ✅ faculty_subjects table (preferred)
   - ✅ staff_details table (fallback)
   - ✅ All institution subjects (ultimate fallback)

2. **Students Table**: Will load correctly with:
   - Register numbers instead of roll numbers
   - Only active students
   - Proper ordering

3. **Class Marks Button**: Will work for:
   - Faculty with class_teacher assignment in faculty_subjects
   - Faculty with class teacher role in staff_details
   - Admins

## Next Steps

### Apply the Migration
Run this command to create the classes table:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration file directly in Supabase Dashboard
# SQL Editor → Run the contents of 20260127170000_create_classes_table.sql
```

### Verify the Fix
1. Open browser console (F12)
2. Refresh the Marks Entry page
3. You should see logs like:
   ```
   Faculty Assignments: [...]
   Using subjects from faculty_subjects: [...]
   Using classes from faculty_subjects: [...]
   ```

4. The subject dropdown should now be populated
5. Selecting a subject should show classes
6. Selecting a class should show students with register numbers

## Troubleshooting

If issues persist:

1. **Check if classes table exists:**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'classes';
   ```

2. **Check faculty_subjects data:**
   ```sql
   SELECT * FROM faculty_subjects 
   WHERE faculty_profile_id = 'YOUR_USER_ID';
   ```

3. **Check students table columns:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'students';
   ```

All queries should now work with proper fallbacks!
