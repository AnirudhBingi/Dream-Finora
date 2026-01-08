# Points System Fixes for Rotation & Recurring Tasks

## Issues Identified and Fixed

### 1. **Points Division for Rotation Tasks** ✅ FIXED

**Problem**: 
- When rotation was enabled with multiple members selected, the system set `assignmentType: 'multiple'`
- Points were divided among all members (e.g., 10 points ÷ 4 members = 2.5 points each)
- But rotation tasks assign to ONE person per occurrence, so each should get FULL points (10 points each)

**Root Cause**:
- Rotation tasks were incorrectly using `assignmentType: 'multiple'` when multiple members were selected
- This caused the system to create `ChoreAssignment` records and divide points
- But rotation tasks should use `assignmentType: 'single'` because each occurrence is assigned to ONE person

**Fix**:
1. **Chore Creation** (`createChore`):
   - When `rotationEnabled: true`, force `assignmentType: 'single'` (even if multiple members selected)
   - Don't create `ChoreAssignment` records when rotation is enabled
   - Rotation members are stored in `ChoreRotation` table instead

2. **Recurring Occurrences** (`generateNextOccurrence`):
   - When rotation is enabled, use `assignmentType: 'single'` for occurrences
   - Don't copy `ChoreAssignment` records if rotation is enabled
   - Each occurrence gets assigned to ONE person via `assignedTo` field

3. **Points Calculation**:
   - `completeChore` (single assignment): Gives FULL points ✅
   - `completeChoreAssignment` (multiple assignment): Checks if rotation is enabled
     - If rotation: Gives FULL points (each person does it individually)
     - If no rotation: Divides points (they work together)

### 2. **Recurring Task Points** ✅ VERIFIED

**Status**: Working correctly
- Each occurrence is a separate chore with its own `points` value
- When completed, uses `completeChore` which gives full points
- Points are awarded correctly for each occurrence

### 3. **Assignment Type Logic** ✅ FIXED

**Before**:
```typescript
// Wrong: Multiple members → multiple assignment
assignmentType = assignedToMultiple.length > 0 ? 'multiple' : 'single'
```

**After**:
```typescript
// Correct: Rotation enabled → single assignment (even with multiple members)
if (rotationEnabled) {
  assignmentType = assignedTo ? 'single' : 'open';
} else {
  assignmentType = assignedToMultiple.length > 0 ? 'multiple' : 'single';
}
```

## How It Works Now

### Rotation Task with 4 Members (10 points):

1. **Task Creation**:
   - User selects 4 members and enables rotation
   - System sets `assignmentType: 'single'` (not 'multiple')
   - Creates `ChoreRotation` entries for 4 members
   - Does NOT create `ChoreAssignment` records

2. **First Occurrence**:
   - Assigned to Member #1 via rotation
   - Uses `assignedTo` field (single assignment)
   - When completed: Member #1 gets **10 full points** ✅

3. **Second Occurrence**:
   - Assigned to Member #2 via rotation
   - Uses `assignedTo` field (single assignment)
   - When completed: Member #2 gets **10 full points** ✅

4. **And so on...**
   - Each member gets **10 full points** when it's their turn ✅

### Multiple Assignment (No Rotation) with 4 Members (10 points):

1. **Task Creation**:
   - User selects 4 members, NO rotation
   - System sets `assignmentType: 'multiple'`
   - Creates `ChoreAssignment` records for all 4 members

2. **Task Completion**:
   - All 4 members work together on the SAME task
   - Points divided: 10 ÷ 4 = **2.5 points each** ✅
   - This is correct because they share the work

## Key Differences

| Feature | Rotation Task | Multiple Assignment |
|---------|--------------|-------------------|
| **Assignment Type** | `'single'` | `'multiple'` |
| **Storage** | `ChoreRotation` table | `ChoreAssignment` table |
| **Assignment** | ONE person per occurrence | ALL people on same task |
| **Points** | FULL points per person | DIVIDED points per person |
| **Example** | 10 points each (4 occurrences) | 2.5 points each (1 task) |

## Testing Checklist

- [x] Rotation task with multiple members gives full points per occurrence
- [x] Multiple assignment (no rotation) divides points correctly
- [x] Recurring rotation tasks award points for each occurrence
- [x] Assignment type is correctly set to 'single' when rotation enabled
- [x] No ChoreAssignment records created for rotation tasks
- [x] ChoreRotation records created correctly for rotation tasks

## Files Modified

1. `apps/backend/src/chore/chore.service.ts`:
   - `createChore`: Force `assignmentType: 'single'` when rotation enabled
   - `completeChore`: Added comment clarifying full points for rotation
   - `completeChoreAssignment`: Check rotation before dividing points

2. `apps/backend/src/chore/recurring-chore.service.ts`:
   - `generateNextOccurrence`: Don't copy ChoreAssignment if rotation enabled
   - Handle rotation assignment correctly for occurrences

