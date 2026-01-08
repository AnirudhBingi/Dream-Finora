# Rotation for Non-Recurring Tasks - Fix

## Issue Identified

**Problem**: Users can enable rotation on one-time (non-recurring) tasks, but rotation doesn't make sense for these tasks because:
1. There's only one occurrence - no "next rotation"
2. It just assigns to the first person and that's it
3. The UI shows "Never" for other members because they're never assigned
4. There's no "next rotation date" to show

## Root Cause

Rotation is designed to work with **recurring tasks** where:
- Each occurrence gets assigned to the next person in rotation
- The rotation happens automatically when new occurrences are generated
- Users can see when it's their turn next

For **one-time tasks**, rotation doesn't provide value because there's only one task.

## Fixes Applied

### 1. **Frontend - CreateChoreScreen**
- **Change**: Rotation toggle only appears when recurring is enabled
- **Before**: Rotation was available for all group chores
- **After**: `{selectedGroupId && !selectedFriend && isRecurring && (`
- **Result**: Users can only enable rotation when they've set up recurring

### 2. **Frontend - ChoreDetailScreen**
- **Change**: Better messaging for rotation status
  - For recurring tasks: Shows "Next rotation: [date]" when `nextOccurrenceDate` is available
  - For non-recurring tasks: Shows warning "⚠️ Rotation works best with recurring tasks. For one-time tasks, it only assigns to the first person."
- **Change**: Better "Last assigned" text
  - For recurring tasks: Shows "Last: [date]" or "Never"
  - For non-recurring tasks: Shows "Assigned" or "Not assigned" instead of "Last: Never"

### 3. **Backend - ChoreService**
- **Change**: Added validation and warning for rotation on non-recurring tasks
- **Behavior**: 
  - If rotation is enabled but task is not recurring, logs a warning
  - Doesn't initialize rotation for non-recurring tasks
  - For recurring tasks, rotation is initialized but parent chore is not assigned (occurrences get assigned)

## How Rotation Works Now

### For Recurring Tasks with Rotation:
1. **Task Creation**: 
   - User enables recurring (e.g., weekly)
   - User enables rotation
   - User selects 4 members
   - Rotation is initialized with 4 members

2. **First Occurrence**:
   - Generated with due date = first occurrence date
   - Assigned to Member #1 (first in rotation)
   - `lastAssignedAt` updated for Member #1

3. **Second Occurrence**:
   - Generated with due date = second occurrence date
   - Assigned to Member #2 (next in rotation)
   - `lastAssignedAt` updated for Member #2

4. **UI Shows**:
   - Rotation Order: All 4 members with "Last: [date]" or "Never"
   - Next Rotation: Shows date of next occurrence
   - Upcoming Schedule: Shows next 10 occurrences with assignments

### For One-Time Tasks:
- **Rotation Option**: Not available (only shown when recurring is enabled)
- **If somehow enabled** (legacy data): Shows warning message
- **Assignment**: Just assigns to first person, no rotation happens

## User Experience Improvements

1. **Clearer UI**: Rotation only appears when it makes sense (recurring tasks)
2. **Better Messaging**: Users understand when rotation will happen
3. **Next Rotation Date**: Shows when the next occurrence will be assigned
4. **No More "Never" Confusion**: Better text for one-time vs recurring tasks

## Testing Checklist

- [x] Rotation toggle only appears when recurring is enabled
- [x] Rotation works correctly for recurring tasks
- [x] Next rotation date shows for recurring tasks
- [x] Warning message shows for non-recurring tasks with rotation (legacy)
- [x] "Last assigned" text is clearer
- [x] Backend validates rotation only for recurring tasks

