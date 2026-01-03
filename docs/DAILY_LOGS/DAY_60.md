# Day 60-61 - Financial Goals

**Date:** 2025-12-31  
**Status:** ✅ COMPLETED  
**Related Days:** Day 57 (Personal Finance Simplification), Day 58 (Budgets Backend), Day 59 (Budgets Mobile UI)

---

## Goals

### Backend Tasks
- [x] Add `FinancialGoal` and `GoalContribution` models to Prisma schema (with context and status)
- [x] Implement `GoalService` with CRUD, progress tracking, and contribution logic
- [x] Expose REST endpoints in `GoalController` for goals list/detail, update/delete, and contributions
- [x] Ensure goals are context-aware (`local` / `home`) and optionally linked to accounts
- [x] Keep finance transactions and goals linked via `goalId` where contributions reference transactions

### Mobile Tasks
- [x] Implement `GoalsScreen` with filters (all / active / completed / paused) per finance context
- [x] Implement `CreateGoalScreen` for creating goals with target amount, current amount, category, priority, and optional target date
- [x] Implement `GoalDetailScreen` showing progress, contributions list, remaining amount, and basic time-to-goal info
- [x] Implement `AddContributionScreen` to add contributions (with optional transaction link)
- [x] Wire navigation from `FinanceScreen` to the goals flow and back

---

## Work Completed

### Backend

- Added `FinancialGoal` and `GoalContribution` models and relations in Prisma schema, plus `goalId` / `goalContribution` links on `FinanceTransaction`.
- Implemented `GoalService` methods for `createGoal`, `getGoals`, `getGoalById`, `updateGoal`, `deleteGoal`, and `addContribution`, including account/context validation and automatic `completedAt` handling.
- Implemented `GoalController` endpoints under `/finance/goals` using `JwtAuthGuard` and `CurrentUser` for user scoping.

### Mobile

- Built goal list, create, detail, and contribution screens and connected them to `financeApi` goal endpoints.
- Goals are filtered by context (local/home) and status, and cards show percentage progress, remaining amount, category icon, and priority.
- Integrated goals navigation from the `FinanceScreen` "Goals" entry, following the design system for colors, typography, and spacing.

---

## Issues / Decisions

- Kept goal tracking logic inside `GoalService` rather than a separate `GoalTrackingService` to avoid unnecessary abstraction while still matching the roadmap’s behaviour.
- Enforced that contributions can only be added to active goals to avoid inconsistent states for completed/paused goals.

---

## Next Steps

- Move to **Day 62-63: Loans Management** to support loan creation, EMI tracking, and payment history in both backend and mobile.


