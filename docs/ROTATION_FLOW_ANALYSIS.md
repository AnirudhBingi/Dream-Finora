# Rotation & Recurring Tasks Flow Analysis & Fixes

## Issues Identified

### 1. **Rotation Included All Group Members**
**Problem**: When rotation was enabled, it included ALL group members, not just the selected members (4-6 members chosen during task creation).

**Fix**: 
- Modified `initializeRotation` to accept optional `userIds` parameter
- If `userIds` provided, only those users are included in rotation
- If not provided, falls back to all group members
- For recurring tasks, uses same rotation members as parent chore

### 2. **Due Date Confusion with Rotation**
**Problem**: Users were confused about how due dates work with rotation and recurring tasks.

**Clarification**:
- **Parent Chore**: Has initial due date (when first occurrence should be done)
- **Each Occurrence**: Gets its own due date based on recurrence pattern
- **Rotation Assignment**: Happens when occurrence is generated, assigns to next user in rotation
- **Due Date = When Task Should Be Completed**: The due date for each occurrence is when that specific task should be completed by the assigned user

### 3. **Users Don't Know When It's Their Turn**
**Problem**: No visibility into rotation schedule - users couldn't see:
- When it's their turn
- Who is assigned to upcoming occurrences
- Their position in rotation

**Fix**:
- Added `getRotationSchedule` API endpoint
- Shows upcoming 10 occurrences with assigned users
- Highlights current user's turns
- Shows due dates for each occurrence

### 4. **Rotation Schedule Not Visible**
**Problem**: Even with rotation enabled, users couldn't see the schedule.

**Fix**:
- Added "Upcoming Schedule" section in ChoreDetailScreen
- Shows rotation order with "You" labels
- Displays upcoming assignments with due dates
- Highlights user's turns with badges

## How Rotation Works Now

### For Weekly Recurring Tasks with 4 Members:

1. **Task Creation**:
   - User creates task "Take out garbage"
   - Selects 4 members: Alice, Bob, Charlie, Diana
   - Sets rotation enabled
   - Sets recurring: Weekly, Mondays and Wednesdays
   - Sets due date: Today (Monday)

2. **Rotation Initialization**:
   - Rotation includes ONLY the 4 selected members
   - Order: Alice (0), Bob (1), Charlie (2), Diana (3)

3. **First Occurrence (Monday)**:
   - Generated with due date = Today (Monday)
   - Assigned to Alice (first in rotation)
   - Alice sees task assigned to her

4. **Second Occurrence (Wednesday)**:
   - Generated with due date = Wednesday
   - Assigned to Bob (next in rotation)
   - Bob sees task assigned to him

5. **Third Occurrence (Next Monday)**:
   - Generated with due date = Next Monday
   - Assigned to Charlie (next in rotation)
   - Charlie sees task assigned to him

6. **Fourth Occurrence (Next Wednesday)**:
   - Generated with due date = Next Wednesday
   - Assigned to Diana (next in rotation)
   - Diana sees task assigned to her

7. **Fifth Occurrence (Following Monday)**:
   - Rotation cycles back to Alice
   - And so on...

### User Visibility:

- **Rotation Order Section**: Shows all 4 members in order with "You" label if current user
- **Upcoming Schedule Section**: Shows next 10 occurrences with:
  - Occurrence number (#1, #2, etc.)
  - Assigned user name
  - Due date
  - "Your Turn" badge if it's the current user's turn
  - Highlighted background for user's turns

## API Changes

### New Endpoint:
- `GET /chores/:id/rotation/schedule?count=10` - Returns rotation schedule

### Modified Endpoints:
- `POST /chores` - Now passes selected member IDs to rotation initialization
- `initializeRotation` - Now accepts optional `userIds` parameter

## Frontend Changes

### ChoreDetailScreen:
- Added rotation schedule loading
- Added "Upcoming Schedule" card
- Shows rotation order with user identification
- Highlights user's turns
- Shows due dates for upcoming occurrences

## Testing Checklist

- [ ] Create recurring task with rotation and 4 selected members
- [ ] Verify rotation only includes selected members
- [ ] Verify first occurrence assigned to first member
- [ ] Verify second occurrence assigned to second member
- [ ] Verify rotation cycles correctly
- [ ] Verify schedule shows upcoming assignments
- [ ] Verify "Your Turn" badges appear correctly
- [ ] Verify due dates match recurrence pattern
- [ ] Test with different recurrence patterns (daily, weekly, monthly)
- [ ] Test with different days of week for weekly recurrence

