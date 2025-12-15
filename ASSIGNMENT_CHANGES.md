# Assignment Feature Changes

## Summary
Fixed the `assigned_by` field to correctly capture the logged-in user's `staff_no` instead of always using 214255. Also improved logging to show staff names instead of just numbers.

## Changes Made

### 1. Created User Context (`lib/user-context.tsx`)
- New context to track the currently logged-in user across the application
- Stores the full `BuildupStaff` object including `staff_no`, `name`, and `job_code`
- Provides `currentUser`, `setCurrentUser`, and `logout` functions

### 2. Updated App Entry Point (`app/page.tsx`)
- Wrapped the app in `UserProvider` to make user context available
- Modified `handleLogin` to store the logged-in user in context
- Added console logging when user logs in

### 3. Updated Allocation Assignment Screen (`components/allocation-assignment-screen.tsx`)
- Now uses `useUser()` hook to get the current logged-in user
- `assigned_by` is now set to `currentUser?.staff_no` (the logged-in user)
- If no user is logged in, `assigned_by` remains `undefined` (null in DB)
- Added enhanced console logging that shows:
  - Flight number (e.g., "EK0801")
  - Operator name and staff_no (assigned_to)
  - Supervisor name and staff_no (assigned_by) or "No login"

### 4. Updated Load Plan Context (`lib/load-plan-context.tsx`)
- Modified assignment sync logic to handle cases where `assignedByStaffNo` is undefined
- Added name lookups for both operator and supervisor for better logging
- Console logs now show: `"[LoadPlan] EK0801 is assigned to JOHN DOE (Staff No: 123456), assigned by JANE SMITH (Staff No: 214255)"` or `"assigned by No login"`

### 5. Updated Supabase Functions (`lib/load-plans-supabase.ts`)
- Changed `assignedBy` parameter type to `number | undefined`
- Only updates `assigned_by` field when a valid staff_no is provided
- Sets `assigned_by` to `null` when no user is logged in (instead of 0 or invalid value)

## Behavior

### With Login:
- User logs in with Staff ID
- When assigning flights, `assigned_by` = logged-in user's `staff_no`
- Console log shows: `"EK0801 is assigned to [Operator Name] (Staff No: X), assigned by [Logged User Name] (Staff No: Y)"`

### Without Login:
- User logs in without Staff ID (master view)
- When assigning flights, `assigned_by` = `null` (no change to the field)
- Console log shows: `"EK0801 is assigned to [Operator Name] (Staff No: X), assigned by No login"`

## Testing
1. Login with a CHS supervisor staff_no (e.g., 214255)
2. Assign a flight to an operator
3. Check console logs - should show correct names and staff numbers
4. Check database - `assigned_by` should match your logged-in staff_no
5. Try without login - `assigned_by` should be null
