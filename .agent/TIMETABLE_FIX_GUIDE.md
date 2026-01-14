# Timetable Not Displaying - Complete Fix Guide

## Problem
After clicking a cell and saving a timetable slot, it doesn't appear in the table.

## Root Causes

### 1. Database Schema Issue
The `timetable_slots` table might be missing the `class_id` and `section` columns.

### 2. Data Not Refreshing
The queries might not be refreshing properly after save.

### 3. RLS Policies
Row Level Security policies might be blocking reads.

---

## Solution Steps

### Step 1: Fix Database Schema

Run this SQL in **Supabase SQL Editor**:

```sql
-- Add missing columns
ALTER TABLE public.timetable_slots 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS section TEXT;

-- Ensure RLS policy allows all operations
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.timetable_slots;
CREATE POLICY "Enable all access for authenticated users" 
ON public.timetable_slots 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
```

### Step 2: Verify Database Setup

Run this diagnostic query:

```sql
-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'timetable_slots'
ORDER BY ordinal_position;

-- Check if 10th class exists
SELECT id, name FROM classes WHERE name = '10th';

-- Check existing slots
SELECT 
    ts.day_of_week,
    ts.period_index,
    c.name as class_name,
    ts.section,
    s.name as subject_name,
    p.full_name as faculty_name
FROM timetable_slots ts
LEFT JOIN classes c ON ts.class_id = c.id
LEFT JOIN subjects s ON ts.subject_id = s.id
LEFT JOIN profiles p ON ts.faculty_id = p.id
WHERE c.name = '10th' AND ts.section = 'A';
```

### Step 3: Check Browser Console

1. Open **Developer Tools** (F12)
2. Go to **Console** tab
3. Try adding a timetable slot
4. Look for these log messages:
   - "Saving slot:" - Shows what's being saved
   - "Using class ID:" - Shows the class ID being used
   - "Inserted successfully:" - Confirms save worked
   - "Fetched class timetable slots:" - Shows what was fetched

### Step 4: Verify the Code Changes

The code has been updated to:
- ✅ Invalidate both `class-timetable-10th-a` AND `faculty-my-schedule` queries
- ✅ Force immediate refetch after save
- ✅ Log all operations to console

---

## Testing Procedure

### Test 1: Add a Slot

1. Go to **Faculty Timetable** page
2. Click **Class Timetable** tab
3. Click on **Monday, Period 1** cell
4. Fill in:
   - **Subject**: Choose any subject
   - **Assign Faculty**: Choose yourself
   - **Start Time**: 09:00 AM
   - **End Time**: 10:00 AM
5. Click **Save**
6. **Expected Result**: 
   - ✅ Toast message "Timetable updated successfully"
   - ✅ Slot appears immediately in the cell
   - ✅ Shows subject name and faculty name

### Test 2: Check My Schedule

1. Click **My Schedule** tab
2. **Expected Result**:
   - ✅ The slot you just created appears here too
   - ✅ Shows subject, class, section, and time

### Test 3: Edit a Slot

1. Go back to **Class Timetable** tab
2. Click on the slot you just created
3. Change the subject
4. Click **Save**
5. **Expected Result**:
   - ✅ Slot updates immediately
   - ✅ Shows new subject name

### Test 4: Delete a Slot

1. Hover over a slot
2. Click the **trash icon** that appears
3. Confirm deletion
4. **Expected Result**:
   - ✅ Slot disappears immediately
   - ✅ Cell shows "Click to add" again

---

## Troubleshooting

### Issue: "10th class not found" in console

**Solution**: Create a 10th class first
```sql
-- Check if class exists
SELECT * FROM classes WHERE name = '10th';

-- If not, you need to create it through the UI or SQL
```

### Issue: Slot saves but doesn't appear

**Possible Causes**:
1. **RLS Policy blocking read** - Run the RLS policy fix SQL above
2. **Wrong class_id** - Check console for "Using class ID:" message
3. **Query not refetching** - Check console for "Fetched class timetable slots:" message

**Debug Steps**:
1. Open browser console (F12)
2. Try saving a slot
3. Look for error messages in red
4. Check the "Fetched class timetable slots:" log - should show your new slot

### Issue: "subject_id" error

**Solution**: Make sure you selected a subject before saving
- The subject dropdown must have a value
- If you select "No Subject (Free Period)", the slot will be deleted

### Issue: Slot appears in Class Timetable but not My Schedule

**Cause**: The slot is assigned to a different faculty

**Solution**: 
- When creating the slot, make sure "Assign Faculty" is set to yourself
- Or check the "My Schedule" tab for the faculty you assigned

---

## Database Schema Reference

### timetable_slots Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| config_id | UUID | References timetable_configs |
| day_of_week | TEXT | 'Monday', 'Tuesday', etc. |
| period_index | INTEGER | 1, 2, 3, etc. |
| start_time | TIME | e.g., '09:00' |
| end_time | TIME | e.g., '10:00' |
| subject_id | UUID | References subjects table |
| faculty_id | UUID | References profiles table |
| class_id | UUID | References classes table |
| section | TEXT | 'A', 'B', etc. |
| room_number | TEXT | Optional |
| is_break | BOOLEAN | false for regular classes |

---

## Quick Fix Checklist

- [ ] Run the SQL fix in Supabase SQL Editor
- [ ] Verify `class_id` and `section` columns exist
- [ ] Check RLS policy allows all operations
- [ ] Open browser console (F12)
- [ ] Try adding a slot
- [ ] Check console logs for errors
- [ ] Verify slot appears in table
- [ ] Check My Schedule tab

---

## Files Reference

- **SQL Fix**: `supabase/admin/fix_timetable_complete.sql`
- **Component**: `src/pages/faculty/TimetableManagement.tsx`
- **Migration**: `supabase/migrations/20260113150000_fix_timetable_slots_schema.sql`

---

## Need More Help?

If the timetable still doesn't display after following all steps:

1. **Share the console logs** - Copy any error messages from browser console
2. **Run the diagnostic SQL** - Share the results
3. **Check Network tab** - Look for failed API requests (they'll be in red)
