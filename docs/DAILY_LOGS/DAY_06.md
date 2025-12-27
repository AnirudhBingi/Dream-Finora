# Day 06 - Authentication (Mobile/Web)

**Date:** 2025-12-27  
**Start Time:** 2025-12-27 07:00 AM  
**End Time:** 2025-12-27 07:30 AM  
**Status:** ✅ COMPLETED

---

## Goals
- Implement authentication screens on mobile app:
  - Login screen
  - Register screen
  - Token storage (AsyncStorage)
  - Auth state management
  - Protected routes (redirect if not logged in)
- Optional: Same for landing page website

---

## Work Done
- ✅ Installed `@react-native-async-storage/async-storage` for token persistence
- ✅ Created `authApi.ts` with `register()` and `login()` functions
- ✅ Created `AuthContext` with:
  - Token storage (AsyncStorage)
  - User state management
  - `login()`, `register()`, `logout()` functions
  - Auto-load auth state on app start
- ✅ Created `LoginScreen` component with form validation
- ✅ Created `RegisterScreen` component with password confirmation
- ✅ Created `HomeScreen` component with logout functionality
- ✅ Updated `App.tsx` to:
  - Wrap app in `AuthProvider`
  - Conditionally render screens based on auth state
  - Show loading state while checking auth
  - Navigate between Login/Register screens
- ✅ Protected routes implemented (if not authenticated, shows login/register)

**Files Created:**
- `apps/mobile/src/api/authApi.ts`
- `apps/mobile/src/auth/authContext.tsx`
- `apps/mobile/src/screens/LoginScreen.tsx`
- `apps/mobile/src/screens/RegisterScreen.tsx`
- `apps/mobile/src/screens/HomeScreen.tsx`

**Files Modified:**
- `apps/mobile/App.tsx` - Integrated auth flow with conditional rendering
- `apps/mobile/package.json` - Added AsyncStorage dependency

**Note:** Website auth screens deferred (landing page is marketing-only for now).

---

## Decisions (ADRs)
- **ADR-008**: Using React Context API for auth state (simple, no extra dependencies)
- **ADR-009**: Using AsyncStorage for token persistence (Expo-compatible, simple)
- **ADR-010**: Conditional rendering instead of React Navigation for MVP (can upgrade later)

---

## Issues / Blockers
- None encountered.

---

## Verification / Checks
**To test:**
1. Open mobile app → Should show Login screen if not logged in
2. Tap "Register" → Should show Register screen
3. Register a new user → Should automatically log in and show Home screen
4. Close and reopen app → Should still be logged in (token persisted)
5. Logout → Should return to Login screen
6. Login with registered credentials → Should show Home screen

- [ ] Can register new user from mobile app
- [ ] Can login from mobile app
- [ ] Token is saved and persisted
- [ ] App shows home screen if logged in, login screen if not
- [ ] Can logout

---

## Notes
- Auth flow is complete for mobile app
- Token persists across app restarts
- Protected routes work via conditional rendering
- Website auth screens can be added later when needed (landing page is marketing-only)

