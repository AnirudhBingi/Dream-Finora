# Header Integration - Analysis & Implementation Plan

## Overview

This document analyzes the current state of header integration across all screens and provides a plan for consistent header implementation.

**Status:** In Progress  
**Last Updated:** 2025-01-28

---

## Current Header Component

**File:** `apps/mobile/src/components/Header.tsx`

**Features:**
- ✅ Indigo background (`#6366F1`)
- ✅ Profile avatar (left) with caching
- ✅ Notifications icon with badge (right)
- ✅ Settings icon (right)
- ✅ Safe area support
- ✅ 3D visual effects (shadows/elevation)
- ✅ Module-level profile caching for performance

**Props:**
- `onNavigateToProfile?: () => void`
- `onNavigateToNotifications?: () => void`
- `onNavigateToSettings?: () => void`

---

## Current State Analysis

### Screens WITH Header ✅

1. **HomeScreen** - ✅ Has Header
2. **ExpenseListScreen** - ✅ Has Header
3. **ChoreListScreen** - ✅ Has Header
4. **RideListScreen** - ✅ Has Header
5. **SpaceVListScreen** - ✅ Has CollapsibleHeader (special case)

### Screens WITHOUT Header ❌

#### List Screens (Need Standard Header)
- [x] GroupListScreen ✅
- [x] FriendsListScreen ✅
- [x] ConversationListScreen ✅
- [x] FinanceScreen ✅
- [ ] BudgetScreen
- [ ] GoalsScreen
- [ ] LoansListScreen
- [ ] NotificationsScreen
- [ ] AnalyticsScreen
- [ ] ActivityFeedScreen

#### Detail Screens (Need Header with Back Button)
- [x] ExpenseDetailScreen (has custom header, needs to use Header component) ✅
- [ ] ChoreDetailScreen
- [ ] RideDetailScreen
- [ ] GroupDetailScreen
- [ ] ProfileScreen
- [ ] UserProfileScreen
- [ ] SpaceVDetailScreen
- [ ] MessageThreadScreen
- [ ] TrustScoreInsightsScreen
- [ ] GoalDetailScreen
- [ ] LoanDetailScreen
- [ ] BillchopAnalyticsScreen
- [ ] ChoreStatsScreen

#### Create/Edit Screens (Need Header with Back Button)
- [ ] CreateExpenseScreen
- [ ] EditExpenseScreen
- [ ] CreateChoreScreen
- [ ] EditChoreScreen
- [ ] CreateRideScreen
- [ ] EditRideScreen
- [ ] CreateGroupScreen
- [ ] CreateSpaceVScreen
- [ ] EditSpaceVScreen
- [ ] AddTransactionScreen
- [ ] EditTransactionScreen
- [ ] CreateBudgetScreen
- [ ] EditBudgetScreen
- [ ] CreateGoalScreen
- [ ] EditGoalScreen
- [ ] CreateLoanScreen
- [ ] CreateAccountScreen
- [ ] EditAccountScreen
- [ ] AddContributionScreen
- [ ] RecordLoanPaymentScreen

#### Other Screens
- [ ] BalanceSummaryScreen
- [ ] SettleUpScreen
- [ ] GroupSettingsScreen
- [x] AddGroupMemberScreen ✅
- [ ] GroupInvitationScreen
- [x] BillchopFriendsScreen ✅
- [x] BillchopGroupsScreen ✅
- [ ] FriendExpenseListScreen
- [x] FriendSearchScreen ✅
- [ ] EditProfileScreen
- [ ] AccountSettingsScreen
- [ ] SettingsScreen
- [ ] FinancialAdvisorScreen
- [ ] ExpenseHistoryScreen
- [ ] ChoreHistoryScreen
- [ ] FinanceHistoryScreen

---

## Implementation Pattern

### Standard Pattern (List Screens)

```tsx
import { Header } from '../components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
  <Header
    onNavigateToProfile={onNavigateToProfile}
    onNavigateToNotifications={onNavigateToNotifications}
    onNavigateToSettings={onNavigateToSettings}
  />
  <ScrollView>
    {/* Content */}
  </ScrollView>
</SafeAreaView>
```

### Detail/Create/Edit Pattern (With Back Button)

**Option 1: Extend Header Component** (Recommended)
- Add optional `title` prop
- Add optional `onBack` prop
- Add optional `rightActions` prop for Edit/Delete buttons
- Header shows back button when `onBack` is provided

**Option 2: Custom Header Wrapper** (Alternative)
- Create a wrapper component that combines Header with back button
- Less flexible but simpler

**Recommended Approach:** Extend Header component to support:
- `title?: string` - Screen title in center
- `onBack?: () => void` - Back button handler
- `rightActions?: React.ReactNode` - Custom right-side actions (Edit, Delete, etc.)

---

## Header Component Enhancement Needed

### Current Header Component Limitations

1. **No Back Button Support** - Need to add back button for detail/edit screens
2. **No Title Support** - Need to add screen title display
3. **No Custom Actions** - Need to add support for Edit/Delete buttons on right side

### Proposed Enhancement

```tsx
interface HeaderProps {
  // Existing props
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  
  // New props for detail/edit screens
  title?: string; // Screen title (centered)
  onBack?: () => void; // Back button handler
  rightActions?: React.ReactNode; // Custom actions (Edit, Delete, etc.)
  showProfile?: boolean; // Show/hide profile button (default: true)
  showNotifications?: boolean; // Show/hide notifications (default: true)
  showSettings?: boolean; // Show/hide settings (default: true)
}
```

### Header Layout Options

**Option A: Back + Title + Actions (Detail/Edit Screens)**
```
[← Back] [Title] [Edit] [Settings]
```

**Option B: Profile + Notifications + Settings (List Screens)**
```
[Profile] [Notifications] [Settings]
```

**Option C: Back + Profile + Notifications + Settings (Hybrid)**
```
[← Back] [Profile] [Notifications] [Settings]
```

**Recommended:** Support all three layouts based on props provided.

---

## Implementation Plan

### Phase 1: Enhance Header Component
- [x] Add `title` prop support
- [x] Add `onBack` prop support
- [x] Add `rightActions` prop support
- [x] Add conditional visibility for profile/notifications/settings
- [x] Test header with all layout options

### Phase 2: List Screens
- [x] GroupListScreen ✅
- [x] FriendsListScreen ✅
- [x] ConversationListScreen ✅
- [x] FinanceScreen ✅
- [ ] BudgetScreen
- [ ] GoalsScreen
- [ ] LoansListScreen
- [ ] NotificationsScreen
- [ ] AnalyticsScreen
- [ ] ActivityFeedScreen

### Phase 3: Detail Screens
- [x] ExpenseDetailScreen (replace custom header) ✅
- [ ] ChoreDetailScreen
- [ ] RideDetailScreen
- [ ] GroupDetailScreen
- [ ] ProfileScreen
- [ ] UserProfileScreen
- [ ] SpaceVDetailScreen
- [ ] MessageThreadScreen
- [ ] TrustScoreInsightsScreen
- [ ] GoalDetailScreen
- [ ] LoanDetailScreen
- [ ] BillchopAnalyticsScreen
- [ ] ChoreStatsScreen

### Phase 4: Create/Edit Screens
- [ ] All Create screens (11 screens)
- [ ] All Edit screens (10 screens)

### Phase 5: Other Screens
- [ ] BalanceSummaryScreen
- [ ] SettleUpScreen
- [ ] GroupSettingsScreen
- [x] AddGroupMemberScreen ✅
- [ ] GroupInvitationScreen
- [x] BillchopFriendsScreen ✅
- [x] BillchopGroupsScreen ✅
- [ ] FriendExpenseListScreen
- [x] FriendSearchScreen ✅
- [ ] EditProfileScreen
- [ ] AccountSettingsScreen
- [ ] SettingsScreen
- [ ] FinancialAdvisorScreen
- [ ] History screens (3 screens)

---

## Notes

- **SpaceVListScreen** already has CollapsibleHeader - keep as is
- **ExpenseDetailScreen** has custom header - replace with enhanced Header component
- Some screens may need custom right actions (Edit, Delete, etc.)
- All screens should use SafeAreaView with `edges={['top', 'left', 'right']}`
- Header should always be indigo (`#6366F1`) for consistency

---

**This analysis will be updated as work progresses.**

