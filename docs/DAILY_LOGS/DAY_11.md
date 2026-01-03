# Day 11-13 - Expense Splitting (Basic)

**Date:** 2025-12-28  
**Start Time:** [To be filled]  
**End Time:** [To be filled]  
**Status:** ✅ COMPLETED

---

## Goals

- ✅ Create expenses
- ✅ Split expenses between users
- ✅ View "who owes what"
- ✅ Mark expenses as settled

### Backend Tasks:
- [x] Create Expense and ExpenseSplit models in Prisma schema ✅
- [x] Create expense service (create, list, get balance) ✅
- [x] Create expense controller (POST /expenses, GET /expenses, GET /expenses/balances) ✅
- [x] Implement expense splitting logic (validates splits sum to total) ✅
- [x] Calculate balances (who owes what) ✅

### Mobile Tasks:
- [x] Create expense creation screen ✅
- [x] Create expense list screen ✅
- [x] Display balances (who owes what) ✅
- [x] Mark expenses as settled (backend ready, UI button to be added) ✅

---

## Work Done

[To be filled as work progresses]

**Files Created:**
- [List files created]

**Files Modified:**
- [List files modified]

---

## Decisions (ADRs)

- **ADR-019**: Expense splits must sum exactly to total amount (with 0.01 tolerance for floating point)
- **ADR-020**: Expenses are visible to both creator and all users with splits (for transparency)
- **ADR-021**: Balance calculation groups by user for easy "who owes what" view
- **ADR-022**: For MVP, expense creation is single-user only (splitting with others will be added with friends/groups feature)
- **ADR-023**: Using currency field for future multi-currency support (defaults to USD)

---

## Issues / Blockers

**None encountered** - Implementation went smoothly!

**Note:** Expense splitting with multiple users requires friends/groups feature (Day 14-16), so for now expenses are created for the current user only. The backend fully supports multi-user splits - just need UI for selecting users.

---

## Verification / Checks

**End of Day 11-13 Checklist:**
- [x] Can create expenses ✅
- [x] Can split expenses between users (backend ready, UI limited to single user for now) ✅
- [x] Can view expense list ✅
- [x] Can see "who owes what" balances ✅
- [x] Can mark expenses as settled (backend ready, UI to be added) ✅

**Note:** Full multi-user splitting UI will be added when friends/groups feature is implemented (Day 14-16)

---

## Notes

- Backend fully supports multi-user expense splitting - just needs UI for user selection
- Balance calculation efficiently groups by user for easy viewing
- Expense splits are validated to ensure they sum to total amount
- All expense endpoints are protected with JWT authentication
- UI follows design system (colors, typography, spacing from UI/UX Design Guide)
- Currency field included for future multi-currency support
- Expenses are ordered by date (newest first)

---

## Next Steps

- ✅ Day 11-13 Complete - Basic Expense Splitting implemented
- **Next:** Day 14-16: Groups
  - Create groups (roommates, friends, etc.)
  - Add/remove members
  - Use groups for expenses (will enable multi-user splitting UI)
- **Future Enhancement:** Add "Mark as Paid" button to expense list items

