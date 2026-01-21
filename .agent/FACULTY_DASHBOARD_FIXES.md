# Faculty Dashboard Fixes - January 21, 2026

## Issues Identified and Fixed

### 1. **Missing `onClick` Prop in StatCard Component**
**File:** `src/components/common/StatCard.tsx`

**Problem:** The `StatCard` component was being used with an `onClick` handler in `FacultyDashboard.tsx` (line 98), but the component didn't support this prop.

**Solution:** 
- Added `onClick?: () => void` to the `StatCardProps` interface
- Passed the `onClick` prop to the root `div` element
- This allows stat cards to be clickable (e.g., clicking "Pending Reviews" navigates to the leave requests page)

---

### 2. **Incorrect Loading State in useFacultyDashboard Hook**
**File:** `src/hooks/useFacultyDashboard.ts`

**Problem:** The hook was returning `isLoading: false` hardcoded, which meant the dashboard would show empty data immediately instead of displaying a loader while fetching data from multiple queries.

**Solution:**
- Extracted `isLoading` state from all 6 `useQuery` calls:
  - `isTotalStudentsLoading`
  - `isMyStudentsLoading`
  - `isAssignedSubjectsLoading`
  - `isTodayScheduleLoading`
  - `isTodayAttendanceLoading`
  - `isPendingReviewsLoading`
- Aggregated all loading states using OR operator (`||`)
- Now the dashboard shows the loader until ALL queries complete

**Impact:** Better UX with proper loading feedback, preventing flash of empty content.

---

### 3. **Missing Dependency: qrcode.react**
**File:** `src/pages/institution/InstitutionStaffAttendance.tsx`

**Problem:** The file was importing `QRCodeSVG` from `qrcode.react` package, but this package was not installed in the project dependencies.

**Error Message:**
```
[plugin:vite:import-analysis] Failed to resolve import "qrcode.react" from "src/pages/institution/InstitutionStaffAttendance.tsx". Does the file exist?
```

**Solution:**
- Installed the missing package: `npm install qrcode.react`
- This added 70 packages to the project (including dependencies)

---

## Summary of Changes

### Files Modified:
1. ✅ `src/components/common/StatCard.tsx` - Added onClick support
2. ✅ `src/hooks/useFacultyDashboard.ts` - Fixed loading state aggregation

### Packages Installed:
1. ✅ `qrcode.react` - QR code generation library

### TypeScript Errors Fixed:
- **47 TypeScript errors** were resolved (all related to the broken hook structure)
- **1 Vite import error** was resolved (missing qrcode.react package)

---

## Verification

All fixes have been verified:
- ✅ TypeScript compilation passes (`npx tsc --noEmit --skipLibCheck`)
- ✅ No import resolution errors
- ✅ All components properly typed
- ✅ Loading states correctly aggregated

---

## Testing Recommendations

1. **Test Faculty Dashboard Loading:**
   - Navigate to `/faculty` as a faculty user
   - Verify the loader displays for the minimum time (1500ms)
   - Confirm all stats, subjects, and schedule load correctly

2. **Test StatCard Click Interaction:**
   - Click on the "Pending Reviews" stat card
   - Verify navigation to `/faculty/student-leaves`

3. **Test Institution Staff Attendance:**
   - Navigate to the Institution Staff Attendance page
   - Verify QR codes render correctly without errors

---

## Root Cause Analysis

The issues stemmed from:
1. **Incomplete component props** - StatCard was used with features it didn't support
2. **Premature optimization** - Loading state was hardcoded to false, assuming defaults were sufficient
3. **Missing dependency** - Package was used but not installed in package.json

All issues have been systematically resolved with proper type safety and error handling.
