# Timetable Not Displaying - Debug Guide

## Current Status

**Problem**: Timetable saves successfully but doesn't display in either:
- Institution Portal (after creating for faculty)
- Faculty Portal (My Schedule tab)

## Debugging Steps Added

I've added comprehensive console logging to help diagnose the issue. Here's what to do:

### Step 1: Open Browser Console

1. **Open your browser** (where the app is running)
2. **Press F12** to open Developer Tools
3. **Click "Console" tab**
4. **Clear the console** (click the 🚫 icon)

### Step 2: Test in Institution Portal

1. **Go to** Institution Portal → Timetable
2. **Select** a faculty member (e.g., "Maddy")
3. **Look for this log**:
   ```
   [INSTITUTION] Fetching timetable for faculty: Maddy <faculty-id>
   [INSTITUTION] Fetched timetable slots: [...]
   [INSTITUTION] Number of slots: 0
   ```

4. **Click** a cell (e.g., Monday, Period 1)
5. **Fill in**:
   - Subject: Select any subject
   - Class: Select a class
   - Section: Select A
   - Time: 09:00 AM - 10:00 AM
6. **Click "Save Slot"**

7. **Look for these logs**:
   ```
   [INSTITUTION] Saving slot: {day: "Monday", period: 1, ...}
   [INSTITUTION] Using existing config: <config-id>
   [INSTITUTION] Deleting existing slot...
   [INSTITUTION] Deleted existing slot (if any)
   [INSTITUTION] Inserting slot: {config_id: ..., faculty_id: ..., ...}
   [INSTITUTION] Inserted successfully: [{...}]
   [INSTITUTION] Slot saved successfully, refetching timetable...
   [INSTITUTION] Fetching timetable for faculty: Maddy <faculty-id>
   [INSTITUTION] Fetched timetable slots: [{...}]
   [INSTITUTION] Number of slots: 1
   ```

### Step 3: Share the Console Logs

**Copy and share**:
1. All logs starting with `[INSTITUTION]`
2. Any **red error messages**
3. The `Fetched timetable slots` data

---

## Common Issues & Solutions

### Issue 1: "Number of slots: 0" after saving

**Possible Causes**:
1. **Insert failed** - Check for `[INSTITUTION] Insert error:` in console
2. **Wrong faculty_id** - Check if `faculty_id` in insert matches the selected faculty
3. **Database columns missing** - Run the SQL fix

**Solution**:
```sql
-- Run in Supabase SQL Editor
ALTER TABLE public.timetable_slots 
ADD COLUMN IF NOT EXISTS class_id UUID,
ADD COLUMN IF NOT EXISTS section TEXT;
```

### Issue 2: Insert error in console

**Check the error message**. Common errors:

**"column does not exist"**:
```sql
-- Add missing columns
ALTER TABLE public.timetable_slots 
ADD COLUMN IF NOT EXISTS class_id UUID,
ADD COLUMN IF NOT EXISTS section TEXT;
```

**"violates foreign key constraint"**:
```sql
-- Check if subject_id exists
SELECT id, name FROM subjects WHERE id = '<the-subject-id-from-logs>';

-- Check if class_id exists
SELECT id, name FROM classes WHERE id = '<the-class-id-from-logs>';
```

**"violates row-level security policy"**:
```sql
-- Fix RLS policy
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.timetable_slots;
CREATE POLICY "Enable all access for authenticated users" 
ON public.timetable_slots 
FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Issue 3: Slot inserts but doesn't display

**Check the fetch query**:
- Look for `[INSTITUTION] Fetched timetable slots:` in console
- If it shows empty array `[]`, the query filter might be wrong
- Check if `faculty_id` in database matches the selected faculty's ID

**Debug SQL**:
```sql
-- Check what's actually in the database
SELECT 
    ts.*,
    p.full_name as faculty_name,
    s.name as subject_name,
    c.name as class_name
FROM timetable_slots ts
LEFT JOIN profiles p ON ts.faculty_id = p.id
LEFT JOIN subjects s ON ts.subject_id = s.id
LEFT JOIN classes c ON ts.class_id = c.id
WHERE p.email = 'maddy@myvidyon.edu';
```

---

## What the Logs Tell Us

### Good Logs (Everything Working):
```
[INSTITUTION] Saving slot: {day: "Monday", period: 1, faculty_id: "abc-123"}
[INSTITUTION] Using existing config: "config-xyz"
[INSTITUTION] Deleting existing slot...
[INSTITUTION] Deleted existing slot (if any)
[INSTITUTION] Inserting slot: {config_id: "config-xyz", faculty_id: "abc-123", ...}
[INSTITUTION] Inserted successfully: [{id: "slot-123", ...}]
[INSTITUTION] Slot saved successfully, refetching timetable...
[INSTITUTION] Fetching timetable for faculty: Maddy abc-123
[INSTITUTION] Fetched timetable slots: [{id: "slot-123", ...}]
[INSTITUTION] Number of slots: 1
```

### Bad Logs (Something Wrong):
```
[INSTITUTION] Saving slot: ...
[INSTITUTION] Insert error: {message: "...", ...}  ← ERROR HERE
```

OR

```
[INSTITUTION] Inserted successfully: [{...}]
[INSTITUTION] Fetching timetable for faculty: ...
[INSTITUTION] Fetched timetable slots: []  ← EMPTY!
[INSTITUTION] Number of slots: 0  ← PROBLEM!
```

---

## Next Steps

1. **Test with console open**
2. **Copy all `[INSTITUTION]` logs**
3. **Share the logs** so I can see exactly what's happening
4. **Check for red errors** in console

The logs will tell us exactly where the problem is:
- Is the insert failing?
- Is the insert succeeding but fetch failing?
- Is the data being saved with wrong faculty_id?

Once we see the logs, we'll know exactly what to fix! 🔍
