# Chores Feature Improvements Plan

## Current Issues & Solutions

### 1. Stats & Leaderboard Refresh

**Current State:**
- Stats calculated on-demand (no caching)
- No time-based filtering (only all-time)
- No auto-refresh on chore completion
- Heavy database queries on every request

**Solution:**
- Add time-based leaderboards (weekly, monthly, all-time)
- Implement cache invalidation on chore completion
- Add real-time stats updates
- Optimize queries with indexes

### 2. Gamification Enhancements

**Current State:**
- Basic leaderboard (points only)
- Limited visual engagement
- No progress indicators
- No celebrations

**Solution:**
- Weekly/Monthly leaderboards with reset
- Streak displays with visual indicators
- Achievement celebration notifications
- "You're catching up!" motivational messages
- Relative position changes (↑↓ indicators)
- Group challenges/competitions

### 3. Due Date + Recurring + Rotation Synchronization

**Current State:**
- Due dates set correctly in recurring
- Rotation happens after creation (potential race conditions)
- Due date doesn't consider rotation assignment timing
- No validation that they work together

**Solution:**
- Ensure due date is set BEFORE rotation assignment
- Validate rotation only works with recurring chores
- Set due date based on recurrence pattern correctly
- Add UI hints about how they work together

## Implementation Order

1. **Stats/Leaderboard Enhancements** (High Priority)
2. **Gamification** (High Priority)
3. **Sync Due Date + Recurring + Rotation** (Medium Priority)
4. **Testing & Validation** (All features)

