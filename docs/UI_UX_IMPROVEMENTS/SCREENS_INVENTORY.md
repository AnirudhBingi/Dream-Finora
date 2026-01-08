# Dream Finora - Complete Screens Inventory

## Overview

This document lists **ALL** screens in the Dream Finora mobile app, organized by feature, including all sub-pages and complete navigation flows. This is a comprehensive reference for UI/UX improvements.

---

## 🔐 Authentication & Onboarding

### 1. Login Screen
- **File**: `LoginScreen.tsx`
- **Purpose**: User login with email/mobile and password
- **Navigation From**: App entry point (when not authenticated)
- **Navigation To**: 
  - `RegisterScreen` (via "Sign Up" link)
  - `HomeScreen` (on successful login)

### 2. Register Screen
- **File**: `RegisterScreen.tsx`
- **Purpose**: New user registration
- **Navigation From**: `LoginScreen` (via "Sign Up" link)
- **Navigation To**: 
  - `LoginScreen` (via "Already have account?" link)
  - `HomeScreen` (on successful registration)

---

## 🏠 Main Navigation (Bottom Tabs)

### 3. Home Screen
- **File**: `HomeScreen.tsx`
- **Purpose**: Dashboard with quick actions and overview
- **Tab**: Main tab (Home icon)
- **Navigation To**:
  - `ProfileScreen` (via profile button)
  - `ExpenseListScreen` (via expenses section)
  - `GroupListScreen` (via groups section)
  - `FinanceScreen` (via finance section)
  - `ChoreListScreen` (via chores section)
  - `RideListScreen` (via rides section)
  - `SpaceVListScreen` (via SpaceV section)
  - `ConversationListScreen` (via messages section)
  - `AnalyticsScreen` (via analytics section)
  - `ActivityFeedScreen` (via activity section)
  - `FriendsListScreen` (via friends section)
  - `NotificationsScreen` (via notifications button)
  - `SettingsScreen` (via settings button)

---

## 💰 Expense Splitting (Billchop)

### 4. Expense List Screen
- **File**: `ExpenseListScreen.tsx`
- **Purpose**: List of all expenses (personal and group)
- **Tab**: Expenses tab (Billchop icon)
- **Navigation From**: `HomeScreen`, Bottom Navigation
- **Navigation To**:
  - `CreateExpenseScreen` (via "+" button)
  - `ExpenseDetailScreen` (via tapping expense item)
  - `BillchopAnalyticsScreen` (via analytics button)
  - `BalanceSummaryScreen` (via balances button)
  - `BillchopFriendsScreen` (via friends button)
  - `BillchopGroupsScreen` (via groups button)
  - `ProfileScreen` (via profile button)
  - `NotificationsScreen` (via notifications button)
  - `SettingsScreen` (via settings button)

### 5. Create Expense Screen
- **File**: `CreateExpenseScreen.tsx`
- **Purpose**: Create new expense with splits
- **Navigation From**: `ExpenseListScreen`, `GroupDetailScreen`
- **Navigation To**: 
  - `ExpenseListScreen` (on success, back button)
  - `GroupDetailScreen` (if created from group, on success)

### 6. Expense Detail Screen
- **File**: `ExpenseDetailScreen.tsx`
- **Purpose**: View full expense details, splits, participants
- **Navigation From**: `ExpenseListScreen`, `BalanceSummaryScreen`, `BillchopFriendsScreen`, `BillchopGroupsScreen`, `ActivityFeedScreen`, `NotificationsScreen`
- **Navigation To**:
  - `EditExpenseScreen` (via edit button)
  - `UserProfileScreen` (via tapping participant name)
  - `ExpenseListScreen` (via back button)

### 7. Edit Expense Screen
- **File**: `EditExpenseScreen.tsx`
- **Purpose**: Edit existing expense
- **Navigation From**: `ExpenseDetailScreen`
- **Navigation To**:
  - `ExpenseDetailScreen` (on success, back button)

### 8. Expense History Screen
- **File**: `ExpenseHistoryScreen.tsx`
- **Purpose**: View expense change history (audit trail)
- **Navigation From**: `ExpenseDetailScreen` (via history button)
- **Navigation To**:
  - `ExpenseDetailScreen` (via back button)

### 9. Balance Summary Screen
- **File**: `BalanceSummaryScreen.tsx`
- **Purpose**: View who owes/owed amounts (simplified balances)
- **Navigation From**: `ExpenseListScreen`
- **Navigation To**:
  - `SettleUpScreen` (via tapping a person to settle with)
  - `ExpenseListScreen` (via back button)

### 10. Settle Up Screen
- **File**: `SettleUpScreen.tsx`
- **Purpose**: Record settlement payment between users
- **Navigation From**: `BalanceSummaryScreen`
- **Navigation To**:
  - `BalanceSummaryScreen` (on success, back button)

### 11. Billchop Analytics Screen
- **File**: `BillchopAnalyticsScreen.tsx`
- **Purpose**: Expense analytics and insights
- **Navigation From**: `ExpenseListScreen`
- **Navigation To**:
  - `ExpenseListScreen` (via back button)

### 12. Billchop Friends Screen
- **File**: `BillchopFriendsScreen.tsx`
- **Purpose**: List friends with expense balances
- **Navigation From**: `ExpenseListScreen`
- **Navigation To**:
  - `FriendExpenseListScreen` (via tapping a friend)
  - `ExpenseDetailScreen` (via tapping an expense)
  - `ExpenseListScreen` (via back button)

### 13. Billchop Groups Screen
- **File**: `BillchopGroupsScreen.tsx`
- **Purpose**: List groups with expense balances
- **Navigation From**: `ExpenseListScreen`
- **Navigation To**:
  - `GroupDetailScreen` (via tapping a group)
  - `ExpenseDetailScreen` (via tapping an expense)
  - `ExpenseListScreen` (via back button)

### 14. Friend Expense List Screen
- **File**: `FriendExpenseListScreen.tsx`
- **Purpose**: List expenses with a specific friend
- **Navigation From**: `BillchopFriendsScreen`
- **Navigation To**:
  - `ExpenseDetailScreen` (via tapping an expense)
  - `BillchopFriendsScreen` (via back button)

---

## 👥 Groups

### 15. Group List Screen
- **File**: `GroupListScreen.tsx`
- **Purpose**: List of all user's groups
- **Navigation From**: `HomeScreen`
- **Navigation To**:
  - `CreateGroupScreen` (via "+" button)
  - `GroupDetailScreen` (via tapping a group)
  - `HomeScreen` (via back button)

### 16. Create Group Screen
- **File**: `CreateGroupScreen.tsx`
- **Purpose**: Create new group with initial members
- **Navigation From**: `GroupListScreen`
- **Navigation To**:
  - `GroupDetailScreen` (on success with new group)
  - `GroupListScreen` (via back button)

### 17. Group Detail Screen
- **File**: `GroupDetailScreen.tsx`
- **Purpose**: View group details, members, expenses, chores, rides
- **Navigation From**: `GroupListScreen`, `BillchopGroupsScreen`, `ActivityFeedScreen`, `NotificationsScreen`
- **Navigation To**:
  - `CreateExpenseScreen` (via "Add Expense" button)
  - `GroupSettingsScreen` (via settings button)
  - `AddGroupMemberScreen` (via "Add Member" button)
  - `UserProfileScreen` (via tapping member name)
  - `GroupListScreen` (via back button)

### 18. Group Settings Screen
- **File**: `GroupSettingsScreen.tsx`
- **Purpose**: Edit group details, manage members, transfer ownership
- **Navigation From**: `GroupDetailScreen`
- **Navigation To**:
  - `AddGroupMemberScreen` (via "Add Member" button)
  - `UserProfileScreen` (via tapping member name)
  - `GroupDetailScreen` (via back button, on update)

### 19. Add Group Member Screen
- **File**: `AddGroupMemberScreen.tsx`
- **Purpose**: Add members to group (search and invite)
- **Navigation From**: `GroupDetailScreen`, `GroupSettingsScreen`
- **Navigation To**:
  - `GroupDetailScreen` (on success, back button)

### 20. Group Invitation Screen
- **File**: `GroupInvitationScreen.tsx`
- **Purpose**: Accept/decline group invitation
- **Navigation From**: Deep link (via invitation token), `NotificationsScreen`
- **Navigation To**:
  - `GroupDetailScreen` (on accept)
  - `GroupListScreen` (on decline, back button)

---

## 🧹 Chores

### 21. Chore List Screen
- **File**: `ChoreListScreen.tsx`
- **Purpose**: List of all chores (personal and group)
- **Tab**: Chores tab
- **Navigation From**: `HomeScreen`, Bottom Navigation
- **Navigation To**:
  - `CreateChoreScreen` (via "+" button)
  - `ChoreDetailScreen` (via tapping chore item)
  - `ChoreStatsScreen` (via stats button)
  - `ProfileScreen` (via profile button)
  - `NotificationsScreen` (via notifications button)
  - `SettingsScreen` (via settings button)

### 22. Create Chore Screen
- **File**: `CreateChoreScreen.tsx`
- **Purpose**: Create new chore with assignment
- **Navigation From**: `ChoreListScreen`, `GroupDetailScreen`
- **Navigation To**:
  - `ChoreListScreen` (on success, back button)
  - `GroupDetailScreen` (if created from group, on success)

### 23. Chore Detail Screen
- **File**: `ChoreDetailScreen.tsx`
- **Purpose**: View chore details, complete chore, view history
- **Navigation From**: `ChoreListScreen`, `ActivityFeedScreen`, `NotificationsScreen`
- **Navigation To**:
  - `EditChoreScreen` (via edit button)
  - `ChoreHistoryScreen` (via history button)
  - `ChoreListScreen` (via back button, on refresh)

### 24. Edit Chore Screen
- **File**: `EditChoreScreen.tsx`
- **Purpose**: Edit existing chore
- **Navigation From**: `ChoreDetailScreen`
- **Navigation To**:
  - `ChoreDetailScreen` (on success, back button)

### 25. Chore History Screen
- **File**: `ChoreHistoryScreen.tsx`
- **Purpose**: View chore change history (audit trail)
- **Navigation From**: `ChoreDetailScreen`
- **Navigation To**:
  - `ChoreDetailScreen` (via back button)

### 26. Chore Stats Screen
- **File**: `ChoreStatsScreen.tsx`
- **Purpose**: Chore statistics, completion rates, streaks, achievements
- **Navigation From**: `ChoreListScreen`
- **Navigation To**:
  - `ChoreListScreen` (via back button)

---

## 💳 Finance Management

### 27. Finance Screen
- **File**: `FinanceScreen.tsx`
- **Purpose**: Overview of accounts, transactions, budgets, goals, loans
- **Navigation From**: `HomeScreen`
- **Navigation To**:
  - `AddTransactionScreen` (via "Add Income" or "Add Expense" buttons)
  - `BudgetScreen` (via budgets section, with context)
  - `GoalsScreen` (via goals section, with context)
  - `LoansListScreen` (via loans section, with context)
  - `FinancialAdvisorScreen` (via advisor section, with context)
  - `EditTransactionScreen` (via tapping transaction)
  - `FinanceHistoryScreen` (via history button, with context)
  - `HomeScreen` (via back button)

### 28. Add Transaction Screen
- **File**: `AddTransactionScreen.tsx`
- **Purpose**: Add income or expense transaction
- **Navigation From**: `FinanceScreen`, `FinancialAdvisorScreen`
- **Navigation To**:
  - `FinanceScreen` (on success, back button)

### 29. Edit Transaction Screen
- **File**: `EditTransactionScreen.tsx`
- **Purpose**: Edit existing transaction
- **Navigation From**: `FinanceScreen`
- **Navigation To**:
  - `FinanceScreen` (on success, back button)

### 30. Finance History Screen
- **File**: `FinanceHistoryScreen.tsx`
- **Purpose**: Transaction history with filters
- **Navigation From**: `FinanceScreen`
- **Navigation To**:
  - `FinanceScreen` (via back button)

### 31. Edit Account Screen
- **File**: `EditAccountScreen.tsx`
- **Purpose**: Edit finance account details
- **Navigation From**: `FinanceScreen` (via tapping account)
- **Navigation To**:
  - `FinanceScreen` (on success, back button)

### 32. Create Account Screen
- **File**: `CreateAccountScreen.tsx`
- **Purpose**: Create new finance account
- **Navigation From**: `FinanceScreen` (via "Add Account" button)
- **Navigation To**:
  - `FinanceScreen` (on success, back button)

---

## 📊 Budgets

### 33. Budget Screen
- **File**: `BudgetScreen.tsx`
- **Purpose**: List of budgets for a context (local/home)
- **Navigation From**: `FinanceScreen` (with context)
- **Navigation To**:
  - `CreateBudgetScreen` (via "+" button)
  - `EditBudgetScreen` (via tapping budget)
  - `FinanceScreen` (via back button)

### 34. Create Budget Screen
- **File**: `CreateBudgetScreen.tsx`
- **Purpose**: Create new budget
- **Navigation From**: `BudgetScreen`
- **Navigation To**:
  - `BudgetScreen` (on success, back button)

### 35. Edit Budget Screen
- **File**: `EditBudgetScreen.tsx`
- **Purpose**: Edit existing budget
- **Navigation From**: `BudgetScreen`
- **Navigation To**:
  - `BudgetScreen` (on success, back button)

---

## 🎯 Financial Goals

### 36. Goals Screen
- **File**: `GoalsScreen.tsx`
- **Purpose**: List of financial goals for a context (local/home)
- **Navigation From**: `FinanceScreen` (with context), `FinancialAdvisorScreen`
- **Navigation To**:
  - `CreateGoalScreen` (via "+" button)
  - `GoalDetailScreen` (via tapping goal)
  - `FinanceScreen` (via back button)

### 37. Create Goal Screen
- **File**: `CreateGoalScreen.tsx`
- **Purpose**: Create new financial goal
- **Navigation From**: `GoalsScreen`, `FinancialAdvisorScreen` (with prefill)
- **Navigation To**:
  - `GoalsScreen` (on success, back button)

### 38. Edit Goal Screen
- **File**: `EditGoalScreen.tsx`
- **Purpose**: Edit existing goal
- **Navigation From**: `GoalDetailScreen`
- **Navigation To**:
  - `GoalDetailScreen` (on success, back button)

### 39. Goal Detail Screen
- **File**: `GoalDetailScreen.tsx`
- **Purpose**: View goal details, progress, contributions
- **Navigation From**: `GoalsScreen`
- **Navigation To**:
  - `EditGoalScreen` (via edit button)
  - `AddContributionScreen` (via "Add Contribution" button)
  - `GoalsScreen` (via back button)

### 40. Add Contribution Screen
- **File**: `AddContributionScreen.tsx`
- **Purpose**: Add contribution to goal
- **Navigation From**: `GoalDetailScreen`, `FinancialAdvisorScreen` (with suggested amount)
- **Navigation To**:
  - `GoalDetailScreen` (on success, back button)

---

## 💰 Loans

### 41. Loans List Screen
- **File**: `LoansListScreen.tsx`
- **Purpose**: List of loans for a context (local/home)
- **Navigation From**: `FinanceScreen` (with context), `FinancialAdvisorScreen`
- **Navigation To**:
  - `CreateLoanScreen` (via "+" button)
  - `LoanDetailScreen` (via tapping loan)
  - `FinanceScreen` (via back button)

### 42. Create Loan Screen
- **File**: `CreateLoanScreen.tsx`
- **Purpose**: Create new loan record
- **Navigation From**: `LoansListScreen`
- **Navigation To**:
  - `LoansListScreen` (on success, back button)

### 43. Loan Detail Screen
- **File**: `LoanDetailScreen.tsx`
- **Purpose**: View loan details, payment history, remaining balance
- **Navigation From**: `LoansListScreen`
- **Navigation To**:
  - `RecordLoanPaymentScreen` (via "Record Payment" button)
  - `LoansListScreen` (via back button, on update)

### 44. Record Loan Payment Screen
- **File**: `RecordLoanPaymentScreen.tsx`
- **Purpose**: Record loan payment with principal/interest breakdown
- **Navigation From**: `LoanDetailScreen`, `FinancialAdvisorScreen` (with suggested amount)
- **Navigation To**:
  - `LoanDetailScreen` (on success, back button)

---

## 🤖 Financial Advisor

### 45. Financial Advisor Screen
- **File**: `FinancialAdvisorScreen.tsx`
- **Purpose**: AI-powered financial insights and recommendations
- **Navigation From**: `FinanceScreen` (with context)
- **Navigation To**:
  - `BudgetScreen` (via budget recommendations)
  - `GoalsScreen` (via goal recommendations)
  - `LoansListScreen` (via loan recommendations)
  - `AddTransactionScreen` (via transaction recommendations)
  - `CreateGoalScreen` (via goal creation with prefill)
  - `AddContributionScreen` (via contribution suggestions)
  - `RecordLoanPaymentScreen` (via payment suggestions)
  - `FinanceScreen` (via back button)

---

## 🚗 Ridesharing

### 46. Ride List Screen
- **File**: `RideListScreen.tsx`
- **Purpose**: List of all rides (personal and group)
- **Tab**: Rides tab
- **Navigation From**: `HomeScreen`, Bottom Navigation
- **Navigation To**:
  - `CreateRideScreen` (via "+" button)
  - `RideDetailScreen` (via tapping ride item)
  - `ProfileScreen` (via profile button)
  - `NotificationsScreen` (via notifications button)
  - `SettingsScreen` (via settings button)

### 47. Create Ride Screen
- **File**: `CreateRideScreen.tsx`
- **Purpose**: Create new ride (rideshare or giveRide) with passengers
- **Navigation From**: `RideListScreen`, `GroupDetailScreen`
- **Navigation To**:
  - `RideListScreen` (on success, back button)
  - `GroupDetailScreen` (if created from group, on success)

### 48. Ride Detail Screen
- **File**: `RideDetailScreen.tsx`
- **Purpose**: View ride details, participants, linked expense
- **Navigation From**: `RideListScreen`, `ActivityFeedScreen`, `NotificationsScreen`
- **Navigation To**:
  - `ExpenseDetailScreen` (via tapping linked expense)
  - `RideListScreen` (via back button, on refresh)

### 49. Edit Ride Screen
- **File**: `EditRideScreen.tsx`
- **Purpose**: Edit existing ride
- **Navigation From**: `RideDetailScreen` (if implemented)
- **Navigation To**:
  - `RideDetailScreen` (on success, back button)

---

## 🏠 Listings (SpaceV)

### 50. SpaceV List Screen
- **File**: `SpaceVListScreen.tsx`
- **Purpose**: List of all listings (items, spaces, services)
- **Tab**: SpaceV tab
- **Navigation From**: `HomeScreen`, Bottom Navigation
- **Navigation To**:
  - `CreateSpaceVScreen` (via "+" button)
  - `SpaceVDetailScreen` (via tapping listing item)
  - `HomeScreen` (via back button)

### 51. Create SpaceV Screen
- **File**: `CreateSpaceVScreen.tsx`
- **Purpose**: Create new listing (item/space/service) with images
- **Navigation From**: `SpaceVListScreen`
- **Navigation To**:
  - `SpaceVListScreen` (on success, back button)

### 52. SpaceV Detail Screen
- **File**: `SpaceVDetailScreen.tsx`
- **Purpose**: View listing details, comments, favorites, contact seller
- **Navigation From**: `SpaceVListScreen`, `ActivityFeedScreen`, `NotificationsScreen`
- **Navigation To**:
  - `EditSpaceVScreen` (via edit button - if owner)
  - `MessageThreadScreen` (via message seller button)
  - `UserProfileScreen` (via tapping seller name)
  - `SpaceVListScreen` (via back button, on refresh)

### 53. Edit SpaceV Screen
- **File**: `EditSpaceVScreen.tsx`
- **Purpose**: Edit existing listing
- **Navigation From**: `SpaceVDetailScreen`
- **Navigation To**:
  - `SpaceVDetailScreen` (on success, back button)

### 54. Listing List Screen
- **File**: `ListingListScreen.tsx`
- **Purpose**: Alternative listing list view (if different from SpaceVListScreen)
- **Navigation From**: Various screens
- **Navigation To**:
  - `CreateListingScreen` (via "+" button)
  - `ListingDetailScreen` (via tapping listing)

### 55. Create Listing Screen
- **File**: `CreateListingScreen.tsx`
- **Purpose**: Create listing (alternative to CreateSpaceVScreen)
- **Navigation From**: `ListingListScreen`
- **Navigation To**:
  - `ListingListScreen` (on success, back button)

### 56. Listing Detail Screen
- **File**: `ListingDetailScreen.tsx`
- **Purpose**: View listing details (alternative to SpaceVDetailScreen)
- **Navigation From**: `ListingListScreen`
- **Navigation To**:
  - `EditListingScreen` (via edit button)
  - `ListingListScreen` (via back button)

### 57. Edit Listing Screen
- **File**: `EditListingScreen.tsx`
- **Purpose**: Edit listing (alternative to EditSpaceVScreen)
- **Navigation From**: `ListingDetailScreen`
- **Navigation To**:
  - `ListingDetailScreen` (on success, back button)

### 58. Favorites Screen
- **File**: `FavoritesScreen.tsx`
- **Purpose**: List of favorited listings
- **Navigation From**: Various screens (via favorites button)
- **Navigation To**:
  - `SpaceVDetailScreen` or `ListingDetailScreen` (via tapping favorite)
  - Previous screen (via back button)

---

## 💬 Messaging

### 59. Conversation List Screen
- **File**: `ConversationListScreen.tsx`
- **Purpose**: List of all conversations/chats
- **Navigation From**: `HomeScreen`
- **Navigation To**:
  - `MessageThreadScreen` (via tapping conversation)
  - `HomeScreen` (via back button)

### 60. Message Thread Screen
- **File**: `MessageThreadScreen.tsx`
- **Purpose**: Chat interface for direct messages
- **Navigation From**: `ConversationListScreen`, `SpaceVDetailScreen`, `UserProfileScreen`, `NotificationsScreen`
- **Navigation To**:
  - `ConversationListScreen` (via back button)

---

## 👤 Profile & Social

### 61. Profile Screen
- **File**: `ProfileScreen.tsx`
- **Purpose**: User's own profile with trust score, stats
- **Navigation From**: `HomeScreen`, `ExpenseListScreen`, `ChoreListScreen`, `RideListScreen`
- **Navigation To**:
  - `EditProfileScreen` (via edit button)
  - `TrustScoreInsightsScreen` (via trust score section)
  - `SettingsScreen` (via settings button)
  - Previous screen (via back button)

### 62. Edit Profile Screen
- **File**: `EditProfileScreen.tsx`
- **Purpose**: Edit own profile (display name, avatar, bio, preferences)
- **Navigation From**: `ProfileScreen`, `SettingsScreen`
- **Navigation To**:
  - `ProfileScreen` (on success, back button)

### 63. User Profile Screen
- **File**: `UserProfileScreen.tsx`
- **Purpose**: View other user's profile (public view)
- **Navigation From**: `ExpenseDetailScreen`, `GroupDetailScreen`, `SpaceVDetailScreen`, `FriendsListScreen`, `NotificationsScreen`
- **Navigation To**:
  - `MessageThreadScreen` (via message button - if implemented)
  - Previous screen (via back button)

### 64. Trust Score Insights Screen
- **File**: `TrustScoreInsightsScreen.tsx`
- **Purpose**: Detailed trust score breakdown, insights, improvement suggestions
- **Navigation From**: `ProfileScreen`
- **Navigation To**:
  - `ProfileScreen` (via back button)

---

## 👥 Friends

### 65. Friends List Screen
- **File**: `FriendsListScreen.tsx`
- **Purpose**: List of all friends
- **Navigation From**: `HomeScreen`
- **Navigation To**:
  - `FriendSearchScreen` (via search button)
  - `UserProfileScreen` (via tapping friend)
  - `HomeScreen` (via back button)

### 66. Friend Search Screen
- **File**: `FriendSearchScreen.tsx`
- **Purpose**: Search for users and send friend requests
- **Navigation From**: `FriendsListScreen`
- **Navigation To**:
  - `UserProfileScreen` (via tapping user)
  - `FriendsListScreen` (via back button)

---

## 🔔 Notifications

### 67. Notifications Screen
- **File**: `NotificationsScreen.tsx`
- **Purpose**: List of all notifications
- **Navigation From**: `HomeScreen`, `ExpenseListScreen`, `ChoreListScreen`, `RideListScreen`
- **Navigation To**:
  - `ExpenseDetailScreen` (via expense notification)
  - `ChoreDetailScreen` (via chore notification)
  - `SpaceVDetailScreen` (via listing notification)
  - `RideDetailScreen` (via ride notification)
  - `GroupDetailScreen` (via group notification)
  - `GroupInvitationScreen` (via invitation notification)
  - `UserProfileScreen` (via friend notification)
  - `MessageThreadScreen` (via message notification)
  - Previous screen (via back button)

---

## ⚙️ Settings

### 68. Settings Screen
- **File**: `SettingsScreen.tsx`
- **Purpose**: App settings and preferences
- **Navigation From**: `HomeScreen`, `ExpenseListScreen`, `ChoreListScreen`, `RideListScreen`, `ProfileScreen`
- **Navigation To**:
  - `AccountSettingsScreen` (via account settings)
  - `ProfileScreen` (via profile settings)
  - Previous screen (via back button)

### 69. Account Settings Screen
- **File**: `AccountSettingsScreen.tsx`
- **Purpose**: Account management (change password, email, delete account)
- **Navigation From**: `SettingsScreen`
- **Navigation To**:
  - `SettingsScreen` (via back button)

---

## 📊 Analytics

### 70. Analytics Screen
- **File**: `AnalyticsScreen.tsx`
- **Purpose**: Overall app analytics and insights
- **Navigation From**: `HomeScreen`
- **Navigation To**:
  - `HomeScreen` (via back button)

---

## 📱 Activity Feed

### 71. Activity Feed Screen
- **File**: `ActivityFeedScreen.tsx`
- **Purpose**: System-wide activity feed (all features)
- **Navigation From**: `HomeScreen`
- **Navigation To**:
  - `ExpenseDetailScreen` (via expense activity)
  - `ChoreDetailScreen` (via chore activity)
  - `GroupDetailScreen` (via group activity)
  - `SpaceVDetailScreen` (via listing activity)
  - `RideDetailScreen` (via ride activity)
  - `HomeScreen` (via back button)

### 72. Activity Screen
- **File**: `ActivityScreen.tsx`
- **Purpose**: Alternative activity view (if different from ActivityFeedScreen)
- **Navigation From**: Various screens
- **Navigation To**:
  - `ExpenseDetailScreen` (via expense activity)
  - Previous screen (via back button)

---

## 📋 Screen Summary by Feature

### Authentication (2 screens)
1. Login Screen
2. Register Screen

### Main Navigation (1 screen)
3. Home Screen

### Expense Splitting - Billchop (11 screens)
4. Expense List Screen
5. Create Expense Screen
6. Expense Detail Screen
7. Edit Expense Screen
8. Expense History Screen
9. Balance Summary Screen
10. Settle Up Screen
11. Billchop Analytics Screen
12. Billchop Friends Screen
13. Billchop Groups Screen
14. Friend Expense List Screen

### Groups (6 screens)
15. Group List Screen
16. Create Group Screen
17. Group Detail Screen
18. Group Settings Screen
19. Add Group Member Screen
20. Group Invitation Screen

### Chores (6 screens)
21. Chore List Screen
22. Create Chore Screen
23. Chore Detail Screen
24. Edit Chore Screen
25. Chore History Screen
26. Chore Stats Screen

### Finance Management (6 screens)
27. Finance Screen
28. Add Transaction Screen
29. Edit Transaction Screen
30. Finance History Screen
31. Edit Account Screen
32. Create Account Screen

### Budgets (3 screens)
33. Budget Screen
34. Create Budget Screen
35. Edit Budget Screen

### Financial Goals (5 screens)
36. Goals Screen
37. Create Goal Screen
38. Edit Goal Screen
39. Goal Detail Screen
40. Add Contribution Screen

### Loans (4 screens)
41. Loans List Screen
42. Create Loan Screen
43. Loan Detail Screen
44. Record Loan Payment Screen

### Financial Advisor (1 screen)
45. Financial Advisor Screen

### Ridesharing (4 screens)
46. Ride List Screen
47. Create Ride Screen
48. Ride Detail Screen
49. Edit Ride Screen

### Listings - SpaceV (9 screens)
50. SpaceV List Screen
51. Create SpaceV Screen
52. SpaceV Detail Screen
53. Edit SpaceV Screen
54. Listing List Screen
55. Create Listing Screen
56. Listing Detail Screen
57. Edit Listing Screen
58. Favorites Screen

### Messaging (2 screens)
59. Conversation List Screen
60. Message Thread Screen

### Profile & Social (4 screens)
61. Profile Screen
62. Edit Profile Screen
63. User Profile Screen
64. Trust Score Insights Screen

### Friends (2 screens)
65. Friends List Screen
66. Friend Search Screen

### Notifications (1 screen)
67. Notifications Screen

### Settings (2 screens)
68. Settings Screen
69. Account Settings Screen

### Analytics (1 screen)
70. Analytics Screen

### Activity Feed (2 screens)
71. Activity Feed Screen
72. Activity Screen

---

## 📊 Total Screen Count

**Total Screens: 72**

### Breakdown:
- **Authentication**: 2
- **Main Navigation**: 1
- **Expense Splitting**: 11
- **Groups**: 6
- **Chores**: 6
- **Finance Management**: 6
- **Budgets**: 3
- **Financial Goals**: 5
- **Loans**: 4
- **Financial Advisor**: 1
- **Ridesharing**: 4
- **Listings**: 9
- **Messaging**: 2
- **Profile & Social**: 4
- **Friends**: 2
- **Notifications**: 1
- **Settings**: 2
- **Analytics**: 1
- **Activity Feed**: 2

---

## 🔄 Navigation Flow Patterns

### Standard CRUD Flow
1. **List Screen** → Tap item → **Detail Screen**
2. **Detail Screen** → Edit button → **Edit Screen**
3. **Edit Screen** → Save → **Detail Screen**
4. **List Screen** → "+" button → **Create Screen**
5. **Create Screen** → Save → **List Screen** or **Detail Screen**

### Expense Flow Example
1. `ExpenseListScreen` → Tap expense → `ExpenseDetailScreen`
2. `ExpenseDetailScreen` → Edit → `EditExpenseScreen`
3. `EditExpenseScreen` → Save → `ExpenseDetailScreen`
4. `ExpenseListScreen` → "+" → `CreateExpenseScreen`
5. `CreateExpenseScreen` → Save → `ExpenseListScreen`
6. `ExpenseListScreen` → Balances → `BalanceSummaryScreen`
7. `BalanceSummaryScreen` → Settle → `SettleUpScreen`
8. `SettleUpScreen` → Save → `BalanceSummaryScreen`

### Group Flow Example
1. `GroupListScreen` → Tap group → `GroupDetailScreen`
2. `GroupDetailScreen` → Settings → `GroupSettingsScreen`
3. `GroupSettingsScreen` → Add Member → `AddGroupMemberScreen`
4. `AddGroupMemberScreen` → Save → `GroupDetailScreen`
5. `GroupDetailScreen` → Create Expense → `CreateExpenseScreen` (with groupId)

### Finance Flow Example
1. `FinanceScreen` → Budgets → `BudgetScreen` (with context)
2. `BudgetScreen` → "+" → `CreateBudgetScreen`
3. `CreateBudgetScreen` → Save → `BudgetScreen`
4. `FinanceScreen` → Goals → `GoalsScreen` (with context)
5. `GoalsScreen` → Tap goal → `GoalDetailScreen`
6. `GoalDetailScreen` → Add Contribution → `AddContributionScreen`
7. `AddContributionScreen` → Save → `GoalDetailScreen`

---

## ✅ Notes for UI/UX Improvements

1. **Consistency**: All list screens should follow the same pattern
2. **Detail Screens**: All entities should have detail screens with edit/delete actions
3. **Empty States**: All list screens need empty states
4. **Loading States**: All screens need skeleton loaders
5. **Error States**: All screens need error handling UI
6. **Navigation**: Consistent back button placement and behavior
7. **Bottom Navigation**: Only on main tab screens (Home, Expenses, Chores, SpaceV, Rides)
8. **Headers**: Consistent header design across all screens
9. **Forms**: Consistent form design for create/edit screens
10. **Transitions**: Smooth transitions between screens (already implemented)
11. **Avatar Rendering**: All screens now use standardized `Avatar` component (2025-01-28)

### Avatar Component Standardization (2025-01-28)

**Component:** `apps/mobile/src/components/Avatar.tsx`

**Screens Updated:**
- ✅ `FriendsListScreen` - Now uses Avatar component instead of hardcoded icons
- ✅ `BalanceSummaryScreen` - Now uses Avatar component with proper image + initials fallback
- ✅ `BillchopFriendsScreen` - Now uses Avatar component with proper URL processing
- ✅ `ParticipantPicker` - Now uses Avatar component for friends and group members

**Key Changes:**
- Removed duplicate `getAvatarUrl` functions from Header, ProfileScreen, UserProfileScreen
- Centralized URL processing in `apps/mobile/src/utils/avatar.ts`
- Removed unused avatar-related styles from updated screens
- All user profile pictures now render consistently with graceful fallback to colored initials

**See:** `docs/AVATAR_RENDERING_PATTERN.md` for complete documentation

---

This document serves as a complete reference for all screens in the Dream Finora app, organized by feature with complete navigation flows.

