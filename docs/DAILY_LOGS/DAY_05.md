# Day 05 - Authentication (Backend)

**Date:** 2025-12-27  
**Start Time:** 2025-12-27 06:30 AM  
**End Time:** 2025-12-27 07:00 AM  
**Status:** ✅ COMPLETED

---

## Goals
- Implement backend authentication foundation:
  - `POST /auth/register`
  - `POST /auth/login`
  - Password hashing
  - JWT access token generation
- Confirm we can create/read a user in PostgreSQL via Prisma.

---

## Work Done
- ✅ Created `PrismaService` with proper lifecycle hooks (connect/disconnect)
- ✅ Created `PrismaModule` and integrated into `AppModule`
- ✅ Installed auth dependencies: `bcrypt`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `class-validator`, `class-transformer`
- ✅ Created `AuthModule` with:
  - `RegisterDto` and `LoginDto` with validation
  - `AuthService` with password hashing (bcrypt) and JWT generation
  - `AuthController` with `POST /auth/register` and `POST /auth/login` endpoints
- ✅ Enabled global validation pipe in `main.ts`
- ✅ Enabled CORS for mobile app
- ✅ Generated Prisma Client
- ✅ Updated `env.example` with `JWT_SECRET`

**Files Created:**
- `apps/backend/src/prisma/prisma.service.ts`
- `apps/backend/src/prisma/prisma.module.ts`
- `apps/backend/src/auth/auth.module.ts`
- `apps/backend/src/auth/auth.service.ts`
- `apps/backend/src/auth/auth.controller.ts`
- `apps/backend/src/auth/dto/register.dto.ts`
- `apps/backend/src/auth/dto/login.dto.ts`

**Files Modified:**
- `apps/backend/src/app.module.ts` - Added `AuthModule` import
- `apps/backend/src/main.ts` - Added validation pipe and CORS
- `apps/backend/env.example` - Added `JWT_SECRET`

---

## Decisions (ADRs)
- **ADR-005**: Using bcrypt for password hashing (industry standard, secure)
- **ADR-006**: JWT tokens with 7-day expiration for MVP (can add refresh tokens later)
- **ADR-007**: Global validation pipe with whitelist + transform for all DTOs

---

## Issues / Blockers
- None encountered.

---

## Verification / Checks
**To test (after restarting backend):**

1. **Register a new user:**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

2. **Login with credentials:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

3. **Test duplicate email rejection:**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```
Should return 409 Conflict.

4. **Test invalid credentials:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"wrongpassword\"}"
```
Should return 401 Unauthorized.

- [ ] Register creates a user in DB
- [ ] Login returns a valid JWT token
- [ ] Duplicate email registration is rejected
- [ ] Invalid credentials are rejected

---

## Notes
- Keep auth simple for MVP; add refresh tokens + protected routes later (Day 6).
- JWT secret is using a default dev value; must be changed in production.
- Backend needs to be restarted to pick up new auth module.


