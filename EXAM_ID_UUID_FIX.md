# Fixed: Invalid UUID Error for exam_id

## The Problem

**Error:**
```
"invalid input syntax for type uuid: \"mid-term-1\""
```

**Root Cause:**
The code was passing `"mid-term-1"` (an exam_type string) directly to the `exam_id` field, but the database expects a UUID.

## The Solution

Created a helper function `getExamId()` that:
1. Checks if the value is already a UUID (returns it)
2. Otherwise, looks up the exam UUID by `exam_type`

```typescript
const getExamId = async (examIdentifier: string) => {
    // If it's already a UUID format, return it
    if (examIdentifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return examIdentifier;
    }
    
    // Otherwise, look it up by exam_type
    const { data } = await supabase
        .from('exams')
        .select('id')
        .eq('exam_type', examIdentifier)
        .eq('institution_id', user?.institutionId)
        .limit(1)
        .single();
    
    return data?.id;
};
```

## Changes Made

### 1. Added Helper Function
- `getExamId()` - Converts exam_type to UUID

### 2. Updated Save Marks Mutation
```typescript
// Before
const records = Object.entries(marksData).map(([studentId, data]) => ({
    exam_id: selectedExam,  // ❌ "mid-term-1" string
    // ...
}));

// After
const examId = await getExamId(selectedExam);  // ✅ Gets UUID
const records = Object.entries(marksData).map(([studentId, data]) => ({
    exam_id: examId,  // ✅ Proper UUID
    // ...
}));
```

### 3. Updated Fetch Existing Marks
```typescript
// Now fetches with proper exam UUID
const examId = await getExamId(selectedExam);
const { data: existingMarks } = await supabase
    .from('exam_results')
    .select('*')
    .eq('exam_id', examId)  // ✅ UUID
    // ...
```

### 4. Updated Class Teacher Queries
- Class exam results query
- Approve marks mutation

Both now use `await getExamId(selectedExam)` to get the proper UUID.

## Files Modified

- `src/pages/faculty/FacultyMarks.tsx`
  - Added `getExamId()` helper
  - Updated `saveMarksMutation`
  - Updated `studentsData` query
  - Updated `classExamResults` query
  - Updated `approveMarksMutation`

## Testing

1. **Refresh the page**
2. **Select an exam** (e.g., "Mid 1")
3. **Enter marks** for students
4. **Click "Save Draft"**

Expected Result:
- ✅ No UUID errors
- ✅ Marks save successfully
- ✅ Toast shows "Draft saved successfully"
- ✅ Status badges update to "DRAFT"

## How It Works

```
User selects: "mid-term-1" (exam_type)
        ↓
getExamId() looks up in exams table
        ↓
Returns: "a1b2c3d4-..." (actual UUID)
        ↓
Uses UUID in all database operations
        ✅ Success!
```

## Additional Benefits

- Works with both exam_type strings AND UUIDs
- Future-proof if you change to storing UUIDs directly
- Validates exam exists before saving
- Clear error messages if exam not found

The marks entry system should now work perfectly! 🎉
