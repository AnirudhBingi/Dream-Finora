# ISSUE-002: iOS (Expo Go) shows API `localhost` and backend not reachable

**Status:** ✅ Resolved (by improving host detection) / ⚠️ Depends on network  
**Category:** Configuration  
**Priority:** 🔴 High  
**Date Reported:** 2025-12-27  
**Related Day:** `docs/DAILY_LOGS/DAY_03.md`

---

## Symptoms

On iPhone (Expo Go), the app shows:
- `API: http://localhost:3001`
- `Backend not reachable`

---

## Root Cause

On a physical phone, `localhost` refers to the **phone itself**, not your PC.

So `http://localhost:3001` will never reach the backend running on your PC.

---

## Fix (Code)

We updated API base URL detection to use Expo Go’s manifest `debuggerHost` (or Metro script URL) to derive your PC’s LAN IP, then use port `3001`.

Files:
- `apps/mobile/src/api/getApiBaseUrl.ts`
- `apps/mobile/App.tsx` (improved message)

---

## Fix (How to run)

1. Start backend:

```bash
cd /d "D:\Dream Finora\apps\backend"
npm run start:dev
```

2. Start Expo (LAN mode):

```bash
cd /d "D:\Dream Finora\apps\mobile"
npx expo start --lan
```

3. iPhone must be on the **same Wi‑Fi** as the PC (not cellular 5G).

---

## If it still fails

- Ensure Windows Firewall allows inbound to port `3001`
- Ensure you are not using Expo `--tunnel` for Metro while trying to hit a LAN backend
- If backend errors with `EADDRINUSE`, another process is already using port 3001:
  - Find PID: `netstat -ano | findstr :3001`
  - Kill PID: `taskkill /PID <PID> /F`


