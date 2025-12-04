# Notification System Test Cases

## Overview
This document describes test cases for the notification system that alerts buildup staff when load plans are updated or assigned.

## Test Scenarios

### Test Case 1: Load Plan Updated - Supervisor Notification
**Scenario**: When a load plan is updated, all supervisors (CHS job_code) should receive a notification.

**Steps to Test**:
1. Login as a supervisor (CHS job_code) - e.g., staff ID: `416437` (Roosevelt)
2. Navigate to "Load Plans" screen
3. Upload or update an existing load plan (e.g., EK0205)
4. Check the notification badge in the Flight Assignment screen
5. Click the notification badge to see the notification

**Expected Result**:
- Notification appears with title "Load Plan Updated"
- Message: "Load plan for flight EK0205 has been updated."
- Notification is visible to all supervisors
- Unread count badge shows "1" or higher

**Hardcoded Test Data**:
- Flight: `EK0205`
- Supervisor Staff No: `416437` (Roosevelt Dsouza - CHS)

---

### Test Case 2: Load Plan Assigned to Staff - Staff Notification
**Scenario**: When a load plan is assigned to a specific staff member (COA job_code), that staff member should receive a notification.

**Steps to Test**:
1. Login as an operator (COA job_code) - e.g., staff ID: `416445` (Harley)
2. Navigate to "Flight Assignment" screen
3. Assign a flight (e.g., EK0544) to the staff member "Harley" (or their display name)
4. Navigate to "Build-up Staff" screen
5. Select the staff member who was assigned
6. Check the notification badge
7. Click the notification badge to see the notification

**Expected Result**:
- Notification appears with title "Load Plan Assigned"
- Message: "You have been assigned to flight EK0544 (STD: 02:50)."
- Notification is only visible to the assigned staff member
- Unread count badge shows "1" or higher

**Hardcoded Test Data**:
- Flight: `EK0544`
- Staff Member: `Harley` (Staff No: `416445` - COA)
- STD: `02:50`

---

### Test Case 3: Multiple Notifications
**Scenario**: A staff member should be able to see multiple notifications and mark them as read.

**Steps to Test**:
1. Login as staff member (e.g., Harley - 416445)
2. Assign multiple flights to this staff member:
   - EK0205 → Harley
   - EK0544 → Harley
3. Navigate to "Build-up Staff" screen
4. Select Harley
5. Check notification badge - should show count "2"
6. Click notification badge
7. Verify both notifications are visible
8. Click "Mark all read"
9. Verify notifications are marked as read (no blue background)
10. Verify badge count is now "0"

**Expected Result**:
- Two notifications appear in the list
- Unread count shows "2"
- After marking as read, count becomes "0"
- Notifications remain visible but are marked as read

**Hardcoded Test Data**:
- Staff Member: `Harley` (Staff No: `416445`)
- Flights: `EK0205`, `EK0544`

---

### Test Case 4: Supervisor Receives Update Notifications
**Scenario**: Supervisors should receive notifications when any load plan is updated, regardless of who updated it.

**Steps to Test**:
1. Login as supervisor (e.g., Roosevelt - 416437)
2. Navigate to "Flight Assignment" screen
3. In another session (or simulate), update a load plan:
   - Go to "Load Plans" screen
   - Upload/update load plan for flight EK0205
4. Return to "Flight Assignment" screen
5. Check notification badge
6. Verify notification appears

**Expected Result**:
- Supervisor receives notification about load plan update
- Notification shows flight number that was updated
- Notification is visible to all supervisors

**Hardcoded Test Data**:
- Supervisor: `Roosevelt` (Staff No: `416437` - CHS)
- Updated Flight: `EK0205`

---

### Test Case 5: Notification Persistence
**Scenario**: Notifications should persist when navigating between screens.

**Steps to Test**:
1. Login as staff member (e.g., Harley - 416445)
2. Assign a flight to Harley
3. Navigate away from "Build-up Staff" screen
4. Navigate back to "Build-up Staff" screen
5. Select Harley
6. Check notification badge

**Expected Result**:
- Notification is still present
- Unread count is still "1"
- Notification can be viewed and marked as read

---

## Hardcoded Sample Data

### Supervisors (CHS)
- Staff No: `416437` - Roosevelt Dsouza
- Staff No: `239035` - Farooq Ahmad
- Staff No: `190514` - Zainal Abdeen

### Operators (COA)
- Staff No: `416445` - Harley Joyce Enriquez
- Staff No: `437449` - Sohan Ghimire
- Staff No: `618485` - John Kimani Muchiri

### Sample Flights
- `EK0205` - STD: 09:35
- `EK0544` - STD: 02:50

---

## Implementation Notes

### Notification Types
1. **load_plan_updated**: Sent to all supervisors when a load plan is updated
   - `staffNo`: undefined (means all supervisors)
   - Triggered in: `addLoadPlan()` when `isUpdate === true`

2. **load_plan_assigned**: Sent to specific staff member when assigned
   - `staffNo`: specific staff member's staff_no
   - Triggered in: `updateFlightAssignment()` when `isNewAssignment === true`

### Notification Display
- Notification badge appears in:
  - Build-up Staff screen (for operators)
  - Flight Assignment screen (for supervisors)
- Badge shows unread count
- Clicking badge opens notification dropdown
- Notifications can be marked as read individually or all at once






