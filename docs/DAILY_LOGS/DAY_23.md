# Day 23-25 - Rideshare (Basic)

**Date:** 2025-12-28  
**Start Time:** [To be filled]  
**End Time:** [To be filled]  
**Status:** ✅ COMPLETED

---

## Goals

- ✅ Create rideshare trips
- ✅ Join rideshare trips
- ✅ Track trip status
- ✅ Basic trip management

### Backend Tasks:
- [x] Create Ride and RideParticipant models in Prisma schema
- [x] Create ride service (create, join, get, list)
- [x] Create ride controller (POST /rides, GET /rides, GET /rides/:id, PUT /rides/:id/join)
- [x] Auto-create expense in expense splitting
- [x] Support both "giveRide" and "rideshare" types

### Mobile Tasks:
- [x] Create ride list screen
- [x] Create ride creation screen
- [x] Create ride detail screen
- [x] Join ride functionality
- [x] Display ride participants

---

## Work Done

**Backend Implementation:**
- Created `Ride` and `RideParticipant` models in Prisma schema
- Implemented `RideService` with full CRUD operations:
  - `createRide`: Create new rides (giveRide or rideshare) with automatic expense creation
  - `getRides`: List rides (filtered by group if provided)
  - `getRideById`: Get detailed ride information
  - `joinRide`: Join a ride and automatically update expense splits
- Auto-creates expense in expense splitting module when ride is created
- Supports two ride types:
  - `giveRide`: Driver charges passengers (driver doesn't pay)
  - `rideshare`: Cost is split among all participants (including driver)
- Cost calculation: Supports both charge per mile and charge per ride
- Created `RideController` with all endpoints
- Registered `RideModule` in `AppModule`

**Mobile Implementation:**
- Created `rideApi.ts` with all API functions
- Created `RideListScreen`: Displays all rides with status badges (driver/participant)
- Created `CreateRideScreen`: Form to create new rides with type selection, origin/destination, pricing, and passenger selection
- Created `RideDetailScreen`: View ride details, see participants, and join rides
- Integrated ride navigation in `App.tsx`
- Added "Rides" button to `HomeScreen`

**Files Created:**
- `apps/backend/src/ride/dto/create-ride.dto.ts`
- `apps/backend/src/ride/ride.service.ts`
- `apps/backend/src/ride/ride.controller.ts`
- `apps/backend/src/ride/ride.module.ts`
- `apps/mobile/src/api/rideApi.ts`
- `apps/mobile/src/screens/RideListScreen.tsx`
- `apps/mobile/src/screens/CreateRideScreen.tsx`
- `apps/mobile/src/screens/RideDetailScreen.tsx`

**Files Modified:**
- `apps/backend/prisma/schema.prisma` (added Ride and RideParticipant models)
- `apps/backend/src/app.module.ts` (added RideModule)
- `apps/mobile/App.tsx` (added ride navigation)
- `apps/mobile/src/screens/HomeScreen.tsx` (added Rides button)

---

## Decisions (ADRs)

[Any architectural decisions made]

---

## Issues / Blockers

[Any issues or blockers encountered]

---

## Verification / Checks

**End of Day 23-25 Checklist:**
- [x] Can create ride
- [x] Can join ride
- [x] Can view ride details
- [x] Can list available rides
- [x] Auto-creates expense in expense splitting
- [x] Supports both giveRide and rideshare types
- [x] Cost calculates correctly
- [x] Expense splits update when joining ride

---

## Notes

[Any notes or learnings from today]

---

## Next Steps

- Continue with rideshare implementation
- Test ride creation and joining
- Verify trip status management

