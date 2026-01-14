# Fix for Staff Creation - DOB Column, Department Dropdown & RLS Policy Issues

## Problems
1. **DOB Error**: When trying to add a staff member, you get the error:
   ```
   Failed to create profile: Could not find the 'date_of_birth' column of 'profiles' in the schema cache
   ```

2. **Department Dropdown Empty**: The "Select Department" dropdown shows no options because the `subjects` table is missing the `department` column.

3. **RLS Policy Error**: After fixing the columns, you get:
   ```
   Failed to create profile: new row violates row-level security policy for table "profiles"
   ```

## Root Causes
1. The `profiles` table is missing several columns:
   - `date_of_birth` (DATE)
   - `phone` (TEXT)
   - `staff_id` (TEXT)
   - `department` (TEXT)

2. The `subjects` table is missing the `department` column that the code expects for populating the department dropdown.

3. The `profiles` table is missing an INSERT policy in RLS (Row Level Security), which prevents creating new profiles.

## Solution

### Step 1: Apply the Database Migration

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of: `supabase/admin/fix_profiles_table.sql`
4. Click **Run** to execute the SQL

This will add:
- Missing columns to `profiles` table
- `department` column to `subjects` table
- Necessary indexes for performance

**Option B: Using Supabase CLI (if available)**

```bash
supabase db reset
```

### Step 2: Add Sample Subjects with Departments (Optional but Recommended)

To populate the department dropdown with options:

1. Open the file: `supabase/admin/seed_subjects_with_departments.sql`
2. **IMPORTANT**: Replace `'YOUR_INSTITUTION_ID'` with your actual institution ID
   - Find your institution ID by running: `SELECT institution_id FROM public.institutions LIMIT 1;`
3. Copy the SQL and run it in Supabase SQL Editor

This will create sample subjects in departments like:
- Mathematics
- Science
- English
- Social Studies
- Computer Science
- Languages

### Step 3: Verify the Fix

After running the SQL:
1. Open the "Add Staff" dialog
2. The "Department" dropdown should now show available departments
3. Select a department to filter subjects
4. Fill in all required fields including DOB
5. Successfully create a staff member without errors

## Files Modified

1. **supabase/schema.sql** - Updated base schema with new columns
2. **supabase/migrations/20260114000000_add_profile_fields.sql** - Migration file
3. **supabase/admin/fix_profiles_table.sql** - Manual fix script (UPDATED)
4. **supabase/admin/seed_subjects_with_departments.sql** - Sample data (NEW)

## What Was Changed

### profiles table now includes:
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'student',
  institution_id TEXT,
  status TEXT DEFAULT 'active',
  date_of_birth DATE,           -- NEW
  phone TEXT,                    -- NEW
  staff_id TEXT,                 -- NEW
  department TEXT,               -- NEW
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
```

### subjects table now includes:
```sql
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  department TEXT,               -- NEW
  class_name TEXT,
  group_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
```

## How the Department Dropdown Works

The department dropdown in "Add Staff" dialog:
1. Fetches all subjects for your institution
2. Extracts unique department values from subjects
3. Displays them in the dropdown
4. When you select a department, it filters the subjects list to show only subjects from that department

**This means you need subjects with department values for the dropdown to work!**

## Testing

After applying the fixes:
1. ✅ Try adding a new staff member with a DOB
2. ✅ Verify the department dropdown shows options
3. ✅ Select a department and verify subjects are filtered
4. ✅ Verify the staff member appears in the staff list
5. ✅ Check that all fields (including DOB, phone, department) are saved correctly

## Notes

- The migration uses `ADD COLUMN IF NOT EXISTS` so it's safe to run multiple times
- Existing data will not be affected
- New columns are nullable, so existing records will have NULL values
- You can add more subjects with departments later through the UI or SQL
