# Day 03 - 2025-12-27 05:50 AM

## 📋 Overview

**Date:** 2025-12-27 05:50 AM  
**Day Number:** 03  
**Focus:** Understanding architecture + wiring mobile → backend connectivity  
**Status:** ✅ Completed

---

## 🎯 Goals for Today

- [x] Understand how mobile app and backend connect (real request, not just theory)
- [x] Confirm landing page is separate (marketing only)
- [x] Set up clean dev workflow commands (what to run, in what order)
- [x] Document architecture and workflow in `docs/architecture/`

---

## ✅ What Was Accomplished

### Completed Tasks
- ✅ Documented architecture in `docs/architecture/ARCHITECTURE_OVERVIEW.md`
- ✅ Documented dev workflow in `docs/architecture/DEV_WORKFLOW.md`
- ✅ Implemented mobile → backend connectivity check (GET `/`) and displayed response in the app
- ✅ Confirmed website remains marketing-only (no backend calls)

### Progress Made
- Mobile now shows:
  - Which API base URL it is using
  - Whether backend responded (status text)
- We have a concrete proof that mobile can talk to backend in dev (even on a real phone)

### Code Changes
- **Files Modified:**
  - `apps/mobile/App.tsx`
  
- **New Files Created:**
  - `apps/mobile/src/api/getApiBaseUrl.ts`
  - `docs/architecture/ARCHITECTURE_OVERVIEW.md`
  - `docs/architecture/DEV_WORKFLOW.md`

- **Commits:**
  - `Day 3: document architecture + connect mobile to backend`

---

## 🐛 Issues Encountered

None.

---

## 💡 Solutions Found

- For dev on a physical phone, don’t use `localhost` for the backend URL.
- We derive the host IP from Metro’s script URL (`NativeModules.SourceCode.scriptURL`) and map it to port `3001`.

---

## 🤔 Decisions Made

- Mobile derives backend host automatically in dev (no manual IP editing).

---

## 📝 Notes & Learnings

- Ports: Website 3000, Backend 3001, Metro 8081.

---

## 🔄 Next Steps

### Tomorrow's Goals (Day 4)
- Database setup (PostgreSQL via Docker) + Prisma init

---

## ⏱️ Time Tracking

**Total Time Spent:** (Fill in)  
**Breakdown:**
- Documentation: (Fill in)
- Development: (Fill in)
- Debugging: (Fill in)


