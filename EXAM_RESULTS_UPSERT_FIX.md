# Fix for Exam Results Upsert 400 Error

## Error Details
```
Failed to load resource: the server responded with a status of 400
URL: /rest/v1/exam_results?on_conflict=exam_id,student_id,subject_id
```

## Root Causes

The 400 error when upserting exam results can be caused by:

1. **Missing columns** - The migration adding `internal_marks`, `external_marks`, `total_marks`, `status`, `class_id`, `section` may not have been applied
2. **Null values** - Sending `null` for required fields
3. **onConflict syntax** - Space in the conflict clause

## Fixes Applied

### 1. Fixed onConflict Syntax
**Changed:**
```typescript
// Before (with space - may cause issues)
{ onConflict: 'exam_id, student_id, subject_id' }

// After (no spaces)
{ onConflict: 'exam_id,student_id,subject_id' }
```

### 2. Ensured No Null Values
**Updated record creation:**
```typescript
const record: any = {
    institution_id: user?.institutionId,
    exam_id: selectedExam,
    student_id: studentId,
    subject_id: subjectId,
    internal_marks: data.internal || 0,      // Default to 0
    external_marks: data.external || 0,      // Default to 0
    total_marks: (data.internal || 0) + (data.external || 0),
    marks_obtained: (data.internal || 0) + (data.external || 0),
    max_marks: 100,                          // Always set
    status: status,
    staff_id: user?.id,
    class_id: selectedClass,
    section: selectedSection || 'A'
};

// Only include id if it exists (for updates)
if (data.id) {
    record.id = data.id;
}
```

### 3. Added Comprehensive Error Logging
Now logs:
- The exact records being upserted
- Full error details
- Subject ID validation

```typescript
console.log("Upserting records:", records);

if (error) {
    console.error("Upsert error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    throw error;
}
```

## Required Migration

**IMPORTANT**: Ensure this migration has been applied to your database:

**File:** `supabase/migrations/20260127160000_enhance_marks_workflow.sql`

```sql
ALTER TABLE public.exam_results
ADD COLUMN IF NOT EXISTS internal_marks DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS external_marks DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS total_marks DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS class_id TEXT,
ADD COLUMN IF NOT EXISTS section TEXT;
```

## How to Apply the Migration

### Option 1: Using Supabase CLI
```bash
cd c:\Users\DELL\Desktop\my-vidyon-main\my-vidyon
supabase db push
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Paste the contents of `supabase/migrations/20260127160000_enhance_marks_workflow.sql`
4. Click **Run**

### Option 3: Verify Columns Exist
Run this query in SQL Editor to check:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exam_results'
ORDER BY ordinal_position;
```

You should see:
- `internal_marks` (numeric)
- `external_marks` (numeric)
- `total_marks` (numeric)
- `status` (text)
- `staff_id` (uuid)
- `class_id` (text)
- `section` (text)

## Testing the Fix

1. **Clear browser cache** and refresh the page
2. **Open browser console** (F12)
3. Try to save marks
4. Check console for:
   ```
   Upserting records: [...]
   ```
5. If error occurs, you'll see detailed error info

## Expected Behavior

After the fix:
- ✅ Marks save successfully as DRAFT
- ✅ Marks can be submitted for review
- ✅ No 400 errors
- ✅ Detailed error messages if something fails

## Troubleshooting

If the error persists:

### Check 1: Verify Migration Applied
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'exam_results' 
AND column_name IN ('internal_marks', 'external_marks', 'status', 'class_id');
```

Should return 4 rows.

### Check 2: Check Console Logs
Look for:
```
Upserting records: [...]
Upsert error: {...}
```

### Check 3: Verify Unique Constraint
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'exam_results'
AND constraint_type = 'UNIQUE';
```

Should show a unique constraint on `(exam_id, student_id, subject_id)`.

### Check 4: Test Manual Insert
```sql
INSERT INTO exam_results (
    institution_id,
    exam_id,
    student_id,
    subject_id,
    internal_marks,
    external_marks,
    total_marks,
    marks_obtained,
    max_marks,
    status,
    class_id,
    section
) VALUES (
    'MYVID2026',
    'mid-term-1',
    'some-student-uuid',
    'some-subject-uuid',
    15.00,
    65.00,
    80.00,
    80.00,
    100.00,
    'DRAFT',
    '8th',
    'A'
);
```

If this fails, the migration hasn't been applied correctly.

## Summary

The fix ensures:
1. ✅ No spaces in onConflict clause
2. ✅ No null values sent to database
3. ✅ Comprehensive error logging
4. ✅ Validation before upsert

**Next Step**: Apply the migration if you haven't already!
