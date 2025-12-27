# Day 02 - 2025-12-27 05:50 AM

## 📋 Overview

**Date:** 2025-12-27 05:50 AM  
**Day Number:** 02  
**Focus:** Project Initialization  
**Status:** ✅ Completed

---

## 🎯 Goals for Today

- [x] Set up monorepo structure
- [x] Initialize mobile app (Expo)
- [x] Initialize landing page website (Next.js)
- [x] Initialize backend API (NestJS)
- [x] Get basic "Hello World" running on all three
- [ ] Commit code to Git

---

## ✅ What Was Accomplished

### Completed Tasks
- ✅ Created monorepo folders: `apps/`, `packages/`
- ✅ Created app folders: `apps/mobile`, `apps/website`, `apps/backend`
- ✅ Created shared package folder: `packages/shared`
- ✅ Initialized Expo app (TypeScript) in `apps/mobile`
- ✅ Initialized Next.js landing page in `apps/website`
- ✅ Initialized NestJS backend in `apps/backend`
- ✅ Updated app UIs/response to show “Dream Finora / Hello World”
- ✅ Backend runs on `http://localhost:3001` and returns JSON “Hello World”
- ✅ Website runs on `http://localhost:3000` and shows “Dream Finora / Hello World”
- ✅ Expo Metro bundler running on `http://localhost:8081`
- ✅ Removed stray legacy folder `shared/` from project root

### Progress Made
- All three projects boot successfully
- Monorepo structure matches SOP
- Ready to initialize Git repo and push first commit

---

## 🐛 Issues Encountered

### Issue 1: `next` / `nest` not recognized
**What happened:** After removing per-app `node_modules`, running `npm run dev` / `npm run start:dev` failed because binaries weren’t found.

**Solution:** Ran `npm install` inside each app (`apps/backend`, `apps/website`, `apps/mobile`) and restarted dev servers.

---

## 💡 Solutions Found

- On Windows + monorepo, keep installs consistent. If scripts say “not recognized”, run `npm install` in that app folder (or standardize workspace installs later).

---

## 🤔 Decisions Made

- Keep website as a simple landing page only (per SOP) and start with a minimal “Hello World” landing screen.

---

## 📝 Notes & Learnings

- PowerShell `curl` is an alias for `Invoke-WebRequest` and fails in NonInteractive mode; use `curl.exe` instead.
- Dev ports: Website 3000, Backend 3001, Expo Metro 8081.

---

## 🔄 Next Steps

### Tomorrow's Goals (Day 3)
- Understand how mobile app and backend connect
- Understand landing page is separate (marketing only)
- Set up development workflow
- Learn how to run all apps simultaneously

---

## ✅ End of Day Summary

- Monorepo initialized (`apps/`, `packages/`)
- Mobile, website, backend all boot successfully (“Hello World”)
- Git repository initialized at project root and first commit created

---

## ⏱️ Time Tracking

**Total Time Spent:** [Fill in]  
**Breakdown:**
- Setup/Configuration: [X] hours
- Development: [X] hours
- Learning/Research: [X] hours

---

## ✅ Checklist

- [x] Monorepo structure created
- [x] Mobile app shows "Hello World" in Expo Go (via Expo Go + Metro)
- [x] Landing page shows welcome page
- [x] Backend API responds "Hello World" at localhost:3001
- [ ] Code committed to Git

---

**Note:** This is Day 2 of development. Fill this in as you work through the project initialization tasks.

