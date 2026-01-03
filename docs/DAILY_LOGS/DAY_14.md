# Day 14-16 - Groups

**Date:** 2025-12-28  
**Start Time:** [To be filled]  
**End Time:** [To be filled]  
**Status:** ✅ COMPLETED

---

## Goals

- ✅ Create groups (roommates, friends, etc.)
- ✅ Add/remove members
- ✅ Use groups for expenses

### Backend Tasks:
- [x] Create Group and GroupMember models in Prisma schema ✅
- [x] Create group service (create, list, add/remove members) ✅
- [x] Create group controller (POST /groups, GET /groups, POST /groups/:id/members, DELETE /groups/:id/members/:memberId) ✅
- [x] Link expenses to groups (optional groupId field) ✅
- [x] Add group balances endpoint (GET /groups/:id/balances) ✅

### Mobile Tasks:
- [x] Create group list screen ✅
- [x] Create group creation screen ✅
- [x] Create group detail screen (with members and expenses) ✅
- [x] Display group balances ✅
- [x] Navigation integration ✅
- [ ] Add/remove members UI (backend ready, UI pending friends feature) ⏳
- [ ] Select group when creating expense (backend ready, UI pending) ⏳

---

## Work Done

### Backend Implementation:

1. **Database Schema:**
   - Created `Group` model with name, description, creator, and timestamps
   - Created `GroupMember` model with unique constraint on (groupId, userId)
   - Added optional `groupId` field to `Expense` model
   - Added relations between User, Group, GroupMember, and Expense
   - Ran migration: `add_groups`

2. **Group Service:**
   - Created `group.service.ts` with:
     - `createGroup()` - Creates group with creator as first member
     - `getGroups()` - Gets all groups where user is a member
     - `getGroupById()` - Gets group with members and expenses
     - `addMember()` - Adds member to group (with permission check)
     - `removeMember()` - Removes member from group (cannot remove creator)
     - `getGroupBalances()` - Calculates balances for group expenses

3. **Group Controller:**
   - Created `group.controller.ts` with endpoints:
     - `POST /groups` - Create group
     - `GET /groups` - Get all user's groups
     - `GET /groups/:id` - Get group details
     - `GET /groups/:id/balances` - Get group balances
     - `POST /groups/:id/members` - Add member
     - `DELETE /groups/:id/members/:memberId` - Remove member
   - All endpoints protected with JWT authentication

4. **Expense Integration:**
   - Updated `CreateExpenseDto` to include optional `groupId`
   - Updated `expense.service.ts` to validate group membership when creating group expenses
   - Updated all expense queries to include group information in responses

### Mobile Implementation:

1. **Group API:**
   - Created `api/groupApi.ts` with functions:
     - `createGroup()` - Create new group
     - `getGroups()` - Fetch all groups
     - `getGroupById()` - Get group with expenses
     - `getGroupBalances()` - Get group balance summary
     - `addGroupMember()` - Add member to group
     - `removeGroupMember()` - Remove member from group
   - TypeScript interfaces for Group, GroupMember, GroupWithExpenses, BalanceInfo

2. **Group List Screen:**
   - Created `screens/GroupListScreen.tsx` with:
     - List of all user's groups
     - Group name, description, member count, expense count
     - Empty state with call-to-action
     - Pull-to-refresh functionality
     - Error handling
   - Follows UI/UX Design Guide

3. **Create Group Screen:**
   - Created `screens/CreateGroupScreen.tsx` with:
     - Group name input (required)
     - Description input (optional)
     - Form validation
     - Success/error handling
   - Note: Member selection will be added when friends feature is ready
   - Follows UI/UX Design Guide

4. **Group Detail Screen:**
   - Created `screens/GroupDetailScreen.tsx` with:
     - Group header (name, description, member count)
     - Group balances card (you owe, owed to you, net)
     - Members list with creator badge
     - Group expenses list
     - Create expense button
     - Pull-to-refresh functionality
   - Follows UI/UX Design Guide

5. **Navigation:**
   - Updated `App.tsx` to include group screens
   - Updated `HomeScreen.tsx` to add "Groups" button
   - Navigation flow: Home → Groups → Group Detail → Create Expense

**Files Created:**
- `apps/backend/src/group/dto/create-group.dto.ts`
- `apps/backend/src/group/group.service.ts`
- `apps/backend/src/group/group.controller.ts`
- `apps/backend/src/group/group.module.ts`
- `apps/backend/prisma/migrations/20251228070513_add_groups/migration.sql`
- `apps/mobile/src/api/groupApi.ts`
- `apps/mobile/src/screens/GroupListScreen.tsx`
- `apps/mobile/src/screens/CreateGroupScreen.tsx`
- `apps/mobile/src/screens/GroupDetailScreen.tsx`

**Files Modified:**
- `apps/backend/prisma/schema.prisma` - Added Group and GroupMember models, linked Expense to Group
- `apps/backend/src/app.module.ts` - Added GroupModule
- `apps/backend/src/expense/dto/create-expense.dto.ts` - Added optional groupId
- `apps/backend/src/expense/expense.service.ts` - Added group validation and group info in responses
- `apps/mobile/src/api/expenseApi.ts` - Added groupId and group to Expense interface
- `apps/mobile/App.tsx` - Added group screen navigation
- `apps/mobile/src/screens/HomeScreen.tsx` - Added Groups button

---

## Decisions (ADRs)

- **ADR-024**: Groups have a creator who cannot be removed (prevents orphaned groups)
- **ADR-025**: Expenses can optionally belong to a group (groupId is nullable)
- **ADR-026**: Group membership is checked when creating group expenses
- **ADR-027**: Group balances calculate only expenses within that group
- **ADR-028**: Member selection UI deferred until friends/search feature is ready
- **ADR-029**: Group expenses are visible to all group members

---

## Issues / Blockers

**None encountered** - Implementation went smoothly!

**Note:** 
- Member selection UI will be added when friends/search feature is ready (Day 20-22)
- Group selection in expense creation UI will be added as an enhancement
- Backend fully supports adding/removing members - just needs UI

---

## Verification / Checks

**End of Day 14-16 Checklist:**
- [x] Can create groups ✅
- [x] Can view group members ✅
- [x] Can view group expenses ✅
- [x] Can see group balances ✅
- [x] Backend supports add/remove members ✅
- [ ] UI for adding/removing members (pending friends feature) ⏳
- [ ] UI for selecting group when creating expense (enhancement) ⏳

---

## Notes

- Backend fully supports member management - UI will be added when friends/search feature is ready
- Group expenses are automatically linked when created within a group context
- Group balances are calculated separately from personal balances
- All group endpoints require user to be a member (security)
- Group creator cannot be removed (prevents orphaned groups)
- UI follows design system (colors, typography, spacing from UI/UX Design Guide)
- Navigation flow supports creating expenses from group detail screen

---

## Next Steps

- ✅ Day 14-16 Complete - Groups implemented
- **Next:** Day 17-19: Personal Finance (Basic - Single Currency)
  - Add income/expense transactions
  - View balance
  - Basic categories
- **Future Enhancements:**
  - Add member selection UI when friends feature is ready
  - Add group selection in expense creation UI
  - Add "leave group" functionality

