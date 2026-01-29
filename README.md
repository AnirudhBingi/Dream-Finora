# Dream Finora

**All-in-One Social Finance & Living App**

---

## Project Overview

Dream Finora is a comprehensive mobile application that integrates expense splitting, personal finance management, chore coordination, ridesharing, and community listings into a single platform.

**Tech Stack:**
- **Backend:** NestJS + Prisma + PostgreSQL
- **Mobile:** React Native + Expo
- **Database:** PostgreSQL
- **Architecture:** Monorepo

---

## Current Status

**Progress:** ~90% feature complete  
**Ready for:** MVP launch preparation

**See:** [docs/planning/PRIORITY_ACTION_PLAN.md](./docs/planning/PRIORITY_ACTION_PLAN.md) for what to work on next

---

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL (via Docker or local)
- Expo CLI

### Setup
```bash
# Install dependencies
npm install

# Backend setup
cd apps/backend
cp .env.example .env
# Configure DATABASE_URL in .env
npx prisma migrate dev
npm run start:dev

# Mobile setup
cd apps/mobile
npm start
```

---

## Documentation

All documentation is in the [`docs/`](./docs/) directory:

- **[docs/analysis/CODEBASE_ANALYSIS.md](./docs/analysis/CODEBASE_ANALYSIS.md)** - Complete codebase analysis
- **[docs/analysis/FEATURES_STATUS.md](./docs/analysis/FEATURES_STATUS.md)** - Feature completion status
- **[docs/planning/WHATS_NEEDED.md](./docs/planning/WHATS_NEEDED.md)** - What needs to be built
- **[docs/architecture/ARCHITECTURAL_OVERVIEW.md](./docs/architecture/ARCHITECTURAL_OVERVIEW.md)** - Complete development lifecycle & operations
- **[docs/architecture/ROOT_ARCHITECTURAL_ISSUES.md](./docs/architecture/ROOT_ARCHITECTURAL_ISSUES.md)** - All root architectural issues
- **[docs/architecture/ARCHITECTURE_ISSUES.md](./docs/architecture/ARCHITECTURE_ISSUES.md)** - Design/feature coupling (detailed)


---

**Built for people who want to simplify their shared life**
