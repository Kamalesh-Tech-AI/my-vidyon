# Timetable Debugging Guide

## Issue
Data is being saved but not displaying in the timetable cells (both faculty and institution portals).

## Steps to Debug

### 1. Check Browser Console
Open the browser console (F12) and look for these logs when you:
- Load the timetable page
- Click a cell to edit
- Save the data

**Expected logs:**
```
Fetching class timetable for 10th A...
10th class ID: <some-uuid>
Fetched class timetable slots: [array of slots]
```

When saving:
```
Saving slot: {day: "Monday", period: 1, data: {...}}
Using class ID: <some-uuid>
Using config ID: <some-uuid>
Inserting slot data: {...}
Inserted successfully: [...]
Timetable saved successfully, refetching data...
```

### 2. Check Database

Run the SQL queries in `supabase/admin/debug_timetable.sql`:

**Query 1: Check if 10th class exists**
```sql
SELECT id, name, institution_id 
FROM classes 
WHERE name = '10th';
```

**Expected result:** Should return at least one row with a class named "10th"

**If no results:** You need to create a "10th" class first!

**Query 2: Check what timetable slots exist**
```sql
SELECT ts.*, s.name as subject_name, p.full_name as faculty_name
FROM timetable_slots ts
LEFT JOIN subjects s ON ts.subject_id = s.id
LEFT JOIN profiles p ON ts.faculty_id = p.id
WHERE ts.section = 'A'
ORDER BY ts.day_of_week, ts.period_index;
```

**Expected result:** Should show all saved timetable slots

### 3. Common Issues

#### Issue A: No "10th" class in database
**Solution:** Create the class first
```sql
INSERT INTO classes (name, institution_id)
VALUES ('10th', '<your-institution-id>');
```

#### Issue B: Data saves but doesn't display
**Possible causes:**
1. Query key mismatch - Check console for refetch logs
2. Data structure mismatch - Check if `subjects` and `profiles` joins are working
3. Day/Period mismatch - Verify `day_of_week` and `period_index` values

#### Issue C: subject_id is null
**Check:** Make sure you're selecting a subject in the dropdown (not "No Subject")

### 4. Verify Data Flow

**Faculty Portal:**
1. Click cell → Dialog opens
2. Fill in all fields:
   - Start Time: 09:00 AM
   - End Time: 10:00 AM
   - Subject: (select any subject)
   - Assign Faculty: (select any faculty)
   - Room: 101
3. Click Save
4. Check console for "Inserted successfully" log
5. Check if cell updates immediately

**Institution Portal:**
1. Select a faculty member
2. Click a cell in their timetable
3. Fill in all fields
4. Click Save
5. Verify data appears in the cell

### 5. Manual Verification

After saving, manually check the database:
```sql
SELECT * FROM timetable_slots 
WHERE day_of_week = 'Monday' 
AND period_index = 1 
AND section = 'A'
ORDER BY created_at DESC
LIMIT 1;
```

This should show the most recently saved slot for Monday Period 1.

## Next Steps

1. **Open browser console** and try to save a timetable slot
2. **Copy all console logs** and share them
3. **Run the SQL queries** and share the results
4. This will help identify exactly where the issue is

## Expected Behavior

When working correctly:
1. Click cell → Dialog opens
2. Fill fields → Click Save
3. Console shows "Inserted successfully"
4. Toast notification: "Timetable updated successfully"
5. Cell immediately shows the subject name, faculty name, and time
6. Hovering shows delete icon
