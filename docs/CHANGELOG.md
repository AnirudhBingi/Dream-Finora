# Changelog

All notable changes to Dream Finora will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Day 1: Complete environment setup
  - All development tools verified (Node.js v24.12.0, Git, PostgreSQL 18.1, Docker 29.1.3)
  - All accounts created (GitHub, Vercel, Expo)
  - VS Code extensions installed in Cursor
  - Git configured
  - Ready for project initialization
- Day 2: Project initialization
  - Monorepo folders created (`apps/`, `packages/`)
  - Expo mobile app scaffolded (`apps/mobile`)
  - Next.js landing page scaffolded (`apps/website`)
  - NestJS backend scaffolded (`apps/backend`)
  - Shared package scaffolded (`packages/shared`)
  - Hello World running: Website (3000), Backend (3001), Expo Metro (8081)
  - Added Issue doc: `ISSUE-001` (binaries not recognized after removing node_modules)
- Day 4: Database setup (PostgreSQL + Prisma)
  - Docker Postgres fixed for v18+ (mount at `/var/lib/postgresql`)
  - Local Windows Postgres used port 5432, so Docker Postgres mapped to `localhost:5433`
  - Prisma added to backend and first migration applied (User, UserProfile)
- Day 5: Authentication backend implementation
  - Created `PrismaService` with lifecycle hooks for DB connection management
  - Implemented `AuthModule` with register and login endpoints
  - Password hashing with bcrypt (10 salt rounds)
  - JWT token generation with 7-day expiration
  - DTO validation with `class-validator`
  - Global validation pipe and CORS enabled
  - Endpoints: `POST /auth/register`, `POST /auth/login`
- Day 6: Authentication mobile implementation
  - Created `AuthContext` with React Context API for state management
  - Implemented token persistence with AsyncStorage
  - Created Login and Register screens with form validation
  - Created Home screen with logout functionality
  - Protected routes via conditional rendering (shows login if not authenticated)
  - Full auth flow: register → login → persist token → logout

### Changed
- [Changes in existing functionality]

### Deprecated
- [Features that will be removed]

### Removed
- [Removed features]

### Fixed
- [Bug fixes]

### Security
- [Security fixes]

---

## [0.1.0] - YYYY-MM-DD

### Added
- Initial project setup
- Project documentation
- Development roadmap

---

## Format Guidelines

### Version Numbers
- **MAJOR.MINOR.PATCH** (e.g., 1.0.0)
- **MAJOR:** Breaking changes
- **MINOR:** New features (backwards compatible)
- **PATCH:** Bug fixes

### Categories
- **Added:** New features
- **Changed:** Changes to existing features
- **Deprecated:** Soon-to-be removed features
- **Removed:** Removed features
- **Fixed:** Bug fixes
- **Security:** Security-related fixes

---

*Keep this updated as you make changes to the project.*

