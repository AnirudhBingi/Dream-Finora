# ISSUE-001: `next` / `nest` commands not recognized on Windows

**Status:** ✅ Resolved  
**Category:** Configuration  
**Priority:** 🟡 Medium  
**Date Reported:** 2025-12-27  
**Date Resolved:** 2025-12-27  
**Related Day:** `docs/DAILY_LOGS/DAY_02.md`

---

## Description

When running app scripts:
- `apps/backend`: `npm run start:dev` failed with `'nest' is not recognized...`
- `apps/website`: `npm run dev` failed with `'next' is not recognized...`

---

## Steps to Reproduce

1. Delete `node_modules` inside an app folder (e.g. `apps/backend/node_modules`)
2. Run `npm run start:dev` in that folder
3. Observe: binary not found

---

## Expected Behavior

`npm run` should find the local binaries from `node_modules/.bin` (`nest`, `next`).

---

## Actual Behavior

Commands fail because the local `node_modules` are missing.

---

## Root Cause

Local app dependencies (and their binaries) were removed, so `node_modules/.bin` didn’t exist for that app.

---

## Solution

Reinstall dependencies per app, then restart dev servers:

```bash
cd apps/backend && npm install
cd apps/website && npm install
cd apps/mobile && npm install
```

---

## Prevention

- Don’t delete app `node_modules` unless you’re immediately reinstalling.
- If a script says “not recognized”, first step is `npm install` in that app folder.


