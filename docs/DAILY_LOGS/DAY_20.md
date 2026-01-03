# Day 20-22 - Chore Management

**Date:** 2025-12-28  
**Start Time:** [To be filled]  
**End Time:** [To be filled]  
**Status:** ✅ COMPLETED

---

## Goals

- ✅ Create chores
- ✅ Assign chores
- ✅ Complete chores
- ✅ Points system
- ✅ Update trust score based on chores

### Backend Tasks:
- [x] Create Chore and ChoreCompletion models in Prisma schema
- [x] Create chore service (create, assign, complete, get points)
- [x] Create chore controller (POST /chores, PUT /chores/:id/assign, PUT /chores/:id/grab, PUT /chores/:id/complete)
- [x] Implement points system (base + 50% bonus for unassigned)
- [x] Integrate with trust score calculation

### Mobile Tasks:
- [x] Create chore list screen
- [x] Create chore creation screen
- [x] Create chore detail screen
- [x] Assign/complete/grab chore functionality
- [x] Display points earned

---

## Work Done

**Backend Implementation:**
- Created `Chore` and `ChoreCompletion` models in Prisma schema
- Implemented `ChoreService` with full CRUD operations:
  - `createChore`: Create new chores with optional group assignment
  - `getChores`: List chores (filtered by group if provided)
  - `getChoreById`: Get detailed chore information
  - `assignChore`: Assign chore to a specific user
  - `grabChore`: Grab unassigned chore (earns bonus points)
  - `completeChore`: Mark chore as complete and award points
- Points system: Base points + 50% bonus for unassigned chores
- Integrated with `TrustScoreService` to update trust score on completion
- Created `ChoreController` with all endpoints
- Registered `ChoreModule` in `AppModule`

**Mobile Implementation:**
- Created `choreApi.ts` with all API functions
- Created `ChoreListScreen`: Displays chores grouped by status (pending, assigned, completed)
- Created `CreateChoreScreen`: Form to create new chores with group/assignment options
- Created `ChoreDetailScreen`: View chore details, grab, assign, or complete chores
- Integrated chore navigation in `App.tsx`
- Added "Chores" button to `HomeScreen`

**Files Created:**
- `apps/backend/src/chore/dto/create-chore.dto.ts`
- `apps/backend/src/chore/chore.service.ts`
- `apps/backend/src/chore/chore.controller.ts`
- `apps/backend/src/chore/chore.module.ts`
- `apps/mobile/src/api/choreApi.ts`
- `apps/mobile/src/screens/ChoreListScreen.tsx`
- `apps/mobile/src/screens/CreateChoreScreen.tsx`
- `apps/mobile/src/screens/ChoreDetailScreen.tsx`

**Files Modified:**
- `apps/backend/prisma/schema.prisma` (added Chore and ChoreCompletion models)
- `apps/backend/src/app.module.ts` (added ChoreModule)
- `apps/backend/src/trust-score/trust-score.service.ts` (added updateChoreScore method)
- `apps/mobile/App.tsx` (added chore navigation)
- `apps/mobile/src/screens/HomeScreen.tsx` (added Chores button)

---

## Decisions (ADRs)

[Any architectural decisions made]

---

## Issues / Blockers

[Any issues or blockers encountered]

---

## Verification / Checks

**End of Day 20-22 Checklist:**
- [x] Can create chore
- [x] Can assign chore to someone
- [x] Can leave chore unassigned
- [x] Can grab unassigned chore (bonus points)
- [x] Can complete chore
- [x] Points are awarded correctly
- [x] Bonus points for unassigned chores (+50%)
- [x] Trust score updates based on chore completion

---

## Notes

[Any notes or learnings from today]

---

## Next Steps

- Continue with chore management implementation
- Test chore creation, assignment, and completion
- Verify points system and trust score integration

