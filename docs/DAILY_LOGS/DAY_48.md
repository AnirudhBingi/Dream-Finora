# Day 48 - Expense Split Types & Who Paid Enhancement (Part 1)

**Date:** 2025-12-29
**Start Time:** [To be filled]
**End Time:** [To be filled]
**Status:** ✅ COMPLETED (Continued in Day 49)
**Related Day:** Day 48-49 (Expense Split Types & Who Paid Enhancement)

---

## Goals

### Backend Tasks:
- [x] Add `paidBy` field to Expense model ✅
- [x] Add `SplitType` enum to Expense model ✅
- [x] Update create expense DTO to accept `paidBy` and `splitType` ✅
- [x] Update expense service to handle split types (EQUAL, CUSTOM, PERCENTAGE) ✅
- [x] Run Prisma migration ✅
- [ ] Update balance calculation to account for who paid ⏸️ (User simplified approach)
- [ ] Update all expense queries to include `paidByUser` relation ⏸️

### Mobile Tasks:
- [ ] Add "Who Paid" selector in CreateExpenseScreen
- [ ] Add split type selector (Equal/Custom/Percentage)
- [ ] Add custom split amount inputs
- [ ] Add percentage split inputs
- [ ] Update ExpenseDetailScreen to show who paid and split type
- [ ] Update EditExpenseScreen to allow changing split type and who paid

---

## Work Completed

### 1. Database Schema Updates ✅

**File:** `apps/backend/prisma/schema.prisma`

- Added `SplitType` enum with values: `EQUAL`, `CUSTOM`, `PERCENTAGE`
- Added `paidBy` field to `Expense` model (optional String, User ID who initially paid)
- Added `splitType` field to `Expense` model (defaults to `EQUAL`)
- Added `paidByUser` relation to `User` model (`ExpensePaidBy` relation)
- Added `expensesPaid` relation to `User` model

**Migration:** `20251229075753_add_split_type_and_paid_by` created and applied successfully

### 2. Backend DTO Updates ✅

**File:** `apps/backend/src/expense/dto/create-expense.dto.ts`

- Added `SplitType` enum export matching Prisma enum
- Updated `ExpenseSplitDto` to include optional `percentage` field (for percentage splits)
- Updated `CreateExpenseDto` to include:
  - `paidBy?: string` - User ID who paid (optional, defaults to creator)
  - `splitType?: SplitType` - Type of split (optional, defaults to EQUAL)

### 3. Expense Service Updates ✅ (Partial)

**File:** `apps/backend/src/expense/expense.service.ts`

**`createExpense` method:**
- Added validation for different split types:
  - **CUSTOM**: Validates that split amounts sum to total amount
  - **PERCENTAGE**: Validates that percentages sum to 100%, then calculates amounts from percentages
  - **EQUAL**: Validates that amounts sum to total (already calculated by frontend)
- Added validation that `paidBy` user must be a participant in the expense
- Updated expense creation to include `paidBy` and `splitType` fields
- Defaults `paidBy` to `userId` (creator) if not specified
- Defaults `splitType` to `EQUAL` if not specified

**Note:** User made changes to simplify balance calculation logic - using `createdBy` instead of `paidBy` for now. This will need to be revisited when implementing the full "who paid" feature.

### 4. Additional Enhancements Completed Today

- Fixed DTO validation issue (removed duplicate `@Min(100)` decorator on percentage field)
- Updated `getExpenses` method to include `paidByUser` in query results
- Started updating `getExpenseById` method (needs completion)

---

## Work Remaining

### Backend (To Continue Tomorrow)

1. **Complete Expense Service Updates:**
   - [ ] Add `paidByUser` to all expense query includes (`getExpenseById`, `markSplitAsPaid`, etc.)
   - [ ] Update `updateExpense` method to handle split type and `paidBy` changes
   - [ ] Revisit balance calculation to properly account for `paidBy` field
   - [ ] Add validation for edit expense endpoint

2. **Balance Calculation:**
   - Current implementation uses `createdBy` for balance calculations
   - Need to update to use `paidBy` when available:
     - If user paid (`paidBy === userId`), they're owed by others
     - If user didn't pay, they owe the payer
   - Update `getBalances` method to properly group by payer

### Mobile (To Continue Tomorrow)

1. **CreateExpenseScreen Updates:**
   - [ ] Add "Who Paid" selector (dropdown/picker showing participants)
   - [ ] Add split type selector (horizontal scrollable buttons: Equal/Custom/Percentage)
   - [ ] Add custom split amount inputs (show when "Custom" selected)
   - [ ] Add percentage split inputs (show when "Percentage" selected)
   - [ ] Real-time validation for custom amounts and percentages
   - [ ] Update split calculation logic to handle different split types

2. **ExpenseDetailScreen Updates:**
   - [ ] Display "Paid by" badge with payer information
   - [ ] Display split type used
   - [ ] Show individual split amounts/percentages clearly

3. **EditExpenseScreen Updates:**
   - [ ] Allow changing who paid
   - [ ] Allow changing split type
   - [ ] Allow editing split amounts/percentages
   - [ ] Reuse same UI components as create screen

4. **ExpenseListScreen Updates:**
   - [ ] Show who paid indicator on expense cards (small badge/icon)

---

## Technical Notes

### Split Type Logic

**EQUAL Split:**
- Frontend calculates equal amounts per participant
- Backend validates that amounts sum to total

**CUSTOM Split:**
- User manually enters amount for each participant
- Backend validates that sum equals total amount
- Allows for unequal splits (e.g., one person pays more)

**PERCENTAGE Split:**
- User enters percentage for each participant
- Backend validates that percentages sum to 100%
- Backend calculates amounts: `amount = (total * percentage) / 100`

### Who Paid Logic

- `paidBy` field tracks who initially paid for the expense
- Defaults to expense creator if not specified
- Must be one of the participants in the expense
- Used for balance calculations (who owes whom)

### User Changes

The user simplified the balance calculation to use `createdBy` instead of `paidBy` for now. This suggests:
- The balance calculation may need refinement
- The "who paid" feature might be implemented incrementally
- Current approach focuses on creator-based balances

---

## Issues & Blockers

- None currently

---

## Next Steps (Day 49)

1. Complete backend expense service updates (add `paidByUser` to all queries)
2. Update balance calculation to properly use `paidBy` field
3. Implement mobile UI for split types and who paid selector
4. Test all split types (EQUAL, CUSTOM, PERCENTAGE)
5. Test balance calculations with different payers
6. Update expense detail and edit screens

---

## Files Modified

- `apps/backend/prisma/schema.prisma` - Added SplitType enum, paidBy field, relations
- `apps/backend/src/expense/dto/create-expense.dto.ts` - Added splitType and paidBy fields
- `apps/backend/src/expense/expense.service.ts` - Updated createExpense method, partial updates to queries
- `apps/backend/prisma/migrations/20251229075753_add_split_type_and_paid_by/migration.sql` - Migration file

---

## Testing Notes

- Migration applied successfully
- Schema changes validated
- DTO validation working
- Split type validation logic implemented
- **Pending:** Full integration testing with mobile app
- **Pending:** Balance calculation testing with different payers

---

*End of Day 48 - Work will continue on Day 49*

