# Day 04 - 2025-12-27 06:15 AM

## 📋 Overview

**Date:** 2025-12-27 06:15 AM  
**Day Number:** 04  
**Focus:** Database setup (PostgreSQL + Prisma)  
**Status:** ✅ Completed

---

## 🎯 Goals for Today

- [x] Start local Postgres via Docker and verify it’s running
- [x] Add Prisma to backend and create initial schema (User, UserProfile)
- [x] Run first migration and verify tables exist

---

## ✅ What Was Accomplished

### Completed Tasks
- ✅ Fixed Docker Postgres 18+ volume mount requirement and removed obsolete compose version header
- ✅ Worked around Windows Postgres using port 5432 by mapping Docker Postgres to **5433**
- ✅ Started Postgres container successfully (`dreamfinora_postgres`)
- ✅ Added Prisma to `apps/backend` (`prisma` + `@prisma/client`)
- ✅ Created initial Prisma schema:
  - `User`
  - `UserProfile`
- ✅ Applied first migration: `20251227123550_init`
- ✅ Verified tables created in DB: `User`, `UserProfile`, `_prisma_migrations`

### Notes
- Prisma v7 uses `prisma.config.ts` for datasource URL; schema files no longer support `url = ...` in the datasource block.

---

## 🐛 Issues Encountered

### Issue: Docker Postgres 18+ mount + port conflict
- **Cause 1:** Postgres 18+ Docker image expects volume mount at `/var/lib/postgresql` (not `/var/lib/postgresql/data`).
- **Cause 2:** Local Windows PostgreSQL is already listening on port `5432` (admin required to stop).
- **Fix:** Updated `docker-compose.yml` to mount correctly and expose container on `localhost:5433`.

---

## 🔄 Next Steps (Day 5)

- Implement authentication module (register/login) skeleton
- Add PrismaService (Nest provider) and wire into backend modules
- Create first protected route stub


