# ISSUE-003: Prisma 7 PrismaClient Constructor Error

**Date:** 2025-12-27  
**Status:** ✅ Resolved  
**Severity:** High (blocks backend startup)

---

## Problem

Backend fails to start with error:
```
PrismaClientInitializationError: `PrismaClient` needs to be constructed with a non-empty, valid `PrismaClientOptions`:
```

When trying to pass empty object `{}`, error changes to:
```
Using engine type "client" requires either "adapter" or "accelerateUrl" to be provided to PrismaClient constructor.
```

## Environment

- Prisma: 7.2.0
- @prisma/client: 7.2.0
- NestJS: 11.0.1
- Node.js: v24.12.0
- Database: PostgreSQL 18.1 (Docker)

## Attempted Solutions

1. ✅ Created `.env` file with `DATABASE_URL`
2. ✅ Installed `@nestjs/config` and `dotenv`
3. ✅ Added `ConfigModule.forRoot()` in `AppModule`
4. ✅ Loaded `dotenv/config` in `main.ts` and `prisma.service.ts`
5. ❌ Tried passing `datasources` to constructor (TypeScript/runtime rejects it)
6. ❌ Tried passing empty object `{}` (requires adapter/accelerateUrl)
7. ❌ Tried letting PrismaClient read from `process.env` automatically (still requires options)

## Root Cause Analysis

Prisma 7.2.0 has changed how PrismaClient is constructed:
- Requires explicit `PrismaClientOptions`
- With engine type "client", requires either:
  - `adapter` (for edge runtimes like Cloudflare Workers, Vercel Edge)
  - `accelerateUrl` (for Prisma Accelerate)
  - OR needs different configuration for Node.js

## Possible Solutions

### Option 1: Check if Prisma schema needs adapter specification
```prisma
generator client {
  provider = "prisma-client-js"
  // Maybe need adapter or other options?
}
```

### Option 2: Pass adapter in constructor (if using edge runtime)
```typescript
super({
  adapter: /* edge adapter */
});
```

### Option 3: Downgrade Prisma (temporary workaround)
- Prisma 6.x might not have this requirement
- Check if downgrade is feasible

### Option 4: Use Prisma Accelerate
- Not suitable for local development
- Requires subscription

### Option 5: Check Prisma 7.2.0 release notes
- See if there's a new way to configure for Node.js
- Check if this is a breaking change

## Solution Applied

**Downgraded to Prisma 6.19.1**

Prisma 7.2.0 introduced breaking changes requiring adapter configuration even for Node.js. Since we're using NestJS (not edge runtime), downgraded to Prisma 6.x which works seamlessly.

### Changes Made:

1. **Downgraded Prisma packages:**
   ```bash
   npm install @prisma/client@^6.0.0 prisma@^6.0.0
   ```

2. **Updated schema.prisma:**
   - Added `url = env("DATABASE_URL")` to datasource block (required in Prisma 6)

3. **Simplified PrismaService:**
   - Removed ConfigService dependency (not needed in Prisma 6)
   - Prisma 6 reads DATABASE_URL from process.env automatically
   - Kept `dotenv/config` import to ensure .env loads before PrismaClient import

4. **Regenerated Prisma Client:**
   ```bash
   npx prisma generate
   ```

**Result:** Backend now starts successfully with Prisma 6.19.1 ✅

## Next Steps

- Consider upgrading to Prisma 7 in the future when we have time to implement adapter configuration
- For now, Prisma 6.19.1 provides all features we need

## References

- Prisma 7 breaking changes: Requires adapter for all environments
- Prisma 6 documentation: https://www.prisma.io/docs/orm/more/upgrade-guides

