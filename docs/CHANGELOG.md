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
  - Fixed Prisma 7.2.0 compatibility (downgraded to Prisma 6.19.1)
  - Fixed mobile IP detection using `expo-constants` package
  - Improved error handling and network error detection
  - All authentication features tested and working end-to-end
- Day 7: User Profile implementation
  - Backend: Profile endpoints (GET, PUT, POST avatar)
  - Mobile: ProfileScreen and EditProfileScreen
  - Avatar upload functionality
- Day 8-10: Trust Score Foundation
  - Backend: TrustScore and TrustScoreHistory models
  - Basic calculation based on account age and verification
  - Mobile: Trust score display on ProfileScreen
- Day 11-13: Expense Splitting
  - Backend: Expense and ExpenseSplit models
  - Split calculation and balance tracking
  - Mobile: ExpenseListScreen, CreateExpenseScreen
- Day 14-16: Groups Management
  - Backend: Group and GroupMember models
  - Group expense integration
  - Mobile: GroupListScreen, CreateGroupScreen, GroupDetailScreen
- Day 17-19: Personal Finance
  - Backend: FinanceAccount and FinanceTransaction models
  - Support for income and expense tracking
  - Mobile: FinanceScreen, AccountDetailScreen, AddTransactionScreen, CreateAccountScreen
- Day 20-22: Chore Management
  - Backend: Chore and ChoreCompletion models
  - Points system and trust score integration
  - Mobile: ChoreListScreen, CreateChoreScreen, ChoreDetailScreen
- Day 23-25: Rideshare Tracking
  - Backend: Ride and RideParticipant models
  - Support for "giveRide" and "rideshare" types
  - Automatic expense creation for rides
  - Mobile: RideListScreen, CreateRideScreen, RideDetailScreen
- Day 26-28: Receipt Upload
  - Backend: Receipt image upload endpoint
  - Mobile: Receipt image picker and preview in CreateExpenseScreen
  - Receipt linking to expenses
- Day 29-31: Listings System (Basic)
  - Type-specific forms for roommate, accommodation, item, event, and ride listings
  - Auto-categorization system for listings, expenses, and finance transactions
  - Category field added to Expense model
  - Shared CategorizationService for intelligent category suggestions
  - Mobile: ListingListScreen, CreateListingScreen, ListingDetailScreen
- Day 32-34: Messaging System (Basic)
  - Backend: Chat, ChatParticipant, and Message models in Prisma schema
  - Backend: MessagingService with conversation and message management
  - Backend: MessagingController with endpoints for conversations and messages
  - Mobile: ConversationListScreen with real-time polling (every 5 seconds)
  - Mobile: MessageThreadScreen with real-time polling (every 3 seconds)
  - Mobile: "Contact Creator" button integrated in ListingDetailScreen
  - Mobile: Messages button added to HomeScreen
  - Shared utility: `utils/avatar.ts` for avatar URL formatting
  - **Note:** Messaging is complete but limited to listing contacts until user discovery features are added in later phases

### Changed
- Enhanced CreateListingScreen with dynamic forms based on listing type
- Enhanced CreateExpenseScreen and AddTransactionScreen with auto-categorization
- Updated ListingDetailScreen to support starting conversations with listing creators
- Enhanced HomeScreen with Messages navigation

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

