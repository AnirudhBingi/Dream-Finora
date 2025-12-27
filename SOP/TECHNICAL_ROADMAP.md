# Technical Roadmap & Architecture

## What We're Building

**Dream Finora** - A mobile-first application (iOS/Android) with a simple marketing landing page website. The mobile app integrates:
- Expense splitting & group management
- Personal finance (multi-currency)
- Chore management with scoring
- Rideshare tracking & expense integration
- Community listings (roommates, accommodations, events)
- User profiles with trust scores
- AI-powered receipt scanning
- AI financial coaching
- Analytics & insights

---

## Technology Stack Decisions

### Mobile Development: Expo + React Native

**Why Expo:**
- ✅ Rapid development for iOS + Android simultaneously
- ✅ Expo Go for instant testing (your requirement)
- ✅ Rich ecosystem of pre-built APIs
- ✅ No native code setup required initially
- ✅ Easy deployment to app stores
- ✅ Over-the-air updates
- ✅ Strong TypeScript support

**Tech Stack:**
```
Mobile Stack:
├── Framework: Expo SDK 54+ (React Native 0.76+)
├── Language: TypeScript (strict mode)
├── Navigation: Expo Router (file-based routing)
├── State Management: Zustand (lightweight, simple)
├── UI Components: React Native Paper or NativeBase (TBD)
├── HTTP Client: Axios
├── Real-time: Socket.io-client
├── Form Handling: React Hook Form + Zod
├── Image Handling: Expo ImagePicker
└── Push Notifications: Expo Notifications
```

### Website: Next.js Landing Page (Marketing Only)

**Why Next.js for Landing Page:**
- ✅ Easy deployment to Vercel (free)
- ✅ Server-side rendering for SEO
- ✅ Fast loading times
- ✅ Mobile-responsive out of the box
- ✅ TypeScript support
- ✅ Simple static site generation

**Tech Stack:**
```
Landing Page Stack:
├── Framework: Next.js 14+ (Static Site)
├── Language: TypeScript
├── Styling: Tailwind CSS
├── Purpose: Marketing & App Download Promotion
├── Features:
│   ├── Hero section with value proposition
│   ├── Feature highlights
│   ├── App screenshots gallery
│   ├── Download buttons (App Store + Play Store)
│   ├── About/Contact sections
│   └── Privacy Policy & Terms links
└── Deployment: Vercel (free tier)
```

**What We're NOT Building:**
- ❌ Full web application with features
- ❌ Web dashboard
- ❌ Web-based expense management
- ❌ Any feature parity with mobile app

**Website Purpose:** Drive app downloads only (like Instagram, TikTok, Venmo model)

### Backend: NestJS + TypeScript

**Why NestJS:**
- ✅ Enterprise-grade architecture
- ✅ Built-in TypeScript support
- ✅ Modular design (perfect for microservices)
- ✅ Decorator-based (clean, readable code)
- ✅ Great for scalable APIs
- ✅ Built-in validation, guards, interceptors

**Tech Stack (Bootstrapped - Local Development First):**
```
Backend Stack:
├── Framework: NestJS 10+
├── Language: TypeScript
├── Node.js: v24.12.0 (you have this!)
├── Database: PostgreSQL 18.1 (local via Docker) + Redis (optional)
├── ORM: Prisma (type-safe, migrations)
├── Authentication: JWT + Passport (custom implementation)
├── Real-time: Socket.io
├── File Storage: Local storage for dev, Supabase Storage for production (free tier - 2GB)
├── Email: NodeMailer (local dev) or Resend (free tier for production)
├── Currency API: ExchangeRate-API (free tier - 1500 requests/month)
├── AI Services (Phase 4 - Skip for MVP):
│   ├── Receipt OCR: Google Cloud Vision API (when budget allows)
│   └── Financial Coach: OpenAI GPT-4 (when budget allows)
└── Deployment: Railway or Render (free tier) + Supabase PostgreSQL (production)
```

**Note:** 
- **Development:** Use local PostgreSQL 18.1 via Docker (faster, free, no internet needed)
- **Production:** Can use Supabase PostgreSQL or managed PostgreSQL on Railway/Render
- No third-party integrations (payment, banks) until later.

### Database: PostgreSQL 18.1 (Local Development) + Optional Production Options

**PostgreSQL 18.1 (Local Development - You Have This!):**
- ✅ Local PostgreSQL 18.1 installed
- ✅ Run via Docker Desktop (recommended) or direct installation
- ✅ Full control, no internet needed
- ✅ Fast local development
- ✅ ACID compliance (critical for financial data)
- ✅ JSON support (flexible schema where needed)
- ✅ Perfect for development and testing

**Production Database Options:**
- **Option 1: Supabase PostgreSQL (Recommended)**
  - ✅ Managed PostgreSQL (500MB free tier)
  - ✅ Easy migration from local to cloud
  - ✅ Built-in backups and monitoring
  - ✅ Same PostgreSQL version compatibility
  
- **Option 2: Railway/Render Managed PostgreSQL**
  - ✅ Included with backend deployment
  - ✅ Free tier available
  - ✅ Easy scaling

**Redis (Optional - Can Skip for MVP):**
- ✅ Session management (JWT handles this)
- ✅ Real-time data caching (Socket.io works without it)
- ✅ Can add later if needed
- ✅ Free tier available on Upstash if needed

---

## Architecture: Monorepo vs. Separate Repos

### Decision: Monorepo (Recommended)

**Structure:**
```
dream-finora/
├── apps/
│   ├── mobile/          # Expo React Native app (PRIMARY)
│   ├── website/         # Next.js landing page (MARKETING ONLY)
│   └── backend/         # NestJS API
├── packages/
│   └── shared/          # Shared TypeScript types/utils
├── tools/               # Build scripts, configs
├── docs/                # Documentation
└── package.json         # Root workspace config
```

**Tools:**
- **pnpm workspaces** or **npm workspaces** for package management
- **Turborepo** for build caching and task orchestration (optional but recommended)

**Benefits:**
- ✅ Shared code between mobile/web/backend
- ✅ Consistent TypeScript types across all apps
- ✅ Single dependency management
- ✅ Easier refactoring across codebase
- ✅ Atomic commits (change backend + frontend together)

**Alternative:** Separate repos if team scaling requires it (can migrate later)

---

## Target Users

### Primary Users
1. **College Students / Young Adults (18-28)**
   - Living with roommates
   - Shared expenses (rent, utilities, groceries)
   - Frequent group activities
   - Budget-conscious
   - Tech-savvy

2. **Young Professionals (25-35)**
   - Shared living arrangements
   - Travel and social expenses
   - International work/travel (multi-currency needs)
   - Building financial habits

3. **Roommate Groups**
   - Managing household expenses
   - Chore coordination
   - Building trust and reliability
   - Finding new roommates

### Secondary Users
- Families managing shared expenses
- Friend groups with frequent activities
- Small communities/organizations

---

## Database Schema Overview

### Core Entities

```prisma
// Users & Profiles
User
- id, email, password, createdAt
- verified (boolean)
- UserProfile
  - userId, displayName, profilePic, bio
  - trustScore, verifiedBadge
  - homeCurrency, localCurrency

// Groups (shared across expenses, chores, rideshare)
Group
- id, name, description, avatar
- createdAt, createdBy
- GroupMember
  - groupId, userId, role, joinedAt

// Expense Splitting
Expense
- id, groupId, createdBy, description
- amount, currency, date, category
- receiptImage, receiptScanData (JSON)
- ExpenseSplit
  - expenseId, userId, amount, isPaid

Settlement
- id, payerId, payeeId, amount, currency
- status, paidAt, paymentMethod

// Chores
Chore
- id, groupId, createdBy, title, description
- points, bonusPoints, status
- assignedTo, completedAt
- ChoreCompletion
  - choreId, userId, completedAt, pointsEarned

// Rideshare
Ride
- id, driverId, type (giveRide/rideshare)
- origin, destination, distance
- chargePerMile or chargePerRide
- totalCost, currency, date
- RideParticipant
  - rideId, userId, shareAmount

FavoriteRider
- driverId, riderId, presetAmount

// Listings
Listing
- id, userId, type (roommate/accommodation/item/event/ride)
- title, description, location
- price, currency, status
- createdAt, updatedAt

ListingInteraction
- listingId, userId, type (view/contact/favorite)

// Personal Finance
FinanceAccount
- id, userId, type (local/home)
- name, currency, balance
- FinanceTransaction
  - accountId, type (income/expense), category
  - amount, currency, date, description
  - linkedExpenseId (optional - links split expenses)

Budget
- id, accountId, category, amount, currency
- period (monthly/yearly)

Goal
- id, accountId, name, targetAmount, currentAmount
- currency, deadline

Reminder
- id, accountId, title, amount, dueDate
- recurring (boolean)

// Scoring System
UserScore
- userId, category (expenses/chores/listings)
- score, lastUpdated
- ScoreHistory (for transparency)

// Messaging
Chat
- id, type (direct/group), participants
- lastMessageAt

Message
- id, chatId, senderId, content
- sentAt, readAt

// Analytics (pre-computed)
UserAnalytics
- userId, period, category
- totalSpent, avgTransaction, trends (JSON)
```

---

## Backend Architecture

### Module Structure (NestJS)

```
backend/
├── src/
│   ├── auth/              # Authentication & authorization
│   ├── users/             # User management
│   ├── groups/            # Group management
│   ├── expenses/          # Expense splitting
│   ├── chores/            # Chore management
│   ├── rideshare/         # Ride tracking
│   ├── listings/          # Community listings
│   ├── finance/           # Personal finance
│   ├── messaging/         # Chat & inbox
│   ├── analytics/         # Analytics & insights
│   ├── ai/                # AI services (receipt, coach)
│   ├── scoring/           # Trust score calculation
│   ├── notifications/     # Push & email notifications
│   ├── shared/            # Shared modules
│   │   ├── database/      # Prisma service
│   │   ├── guards/        # Auth guards
│   │   ├── interceptors/  # Logging, transformation
│   │   ├── filters/       # Exception filters
│   │   └── decorators/    # Custom decorators
│   └── main.ts
```

### API Design Principles

- **RESTful APIs** for CRUD operations
- **GraphQL** (optional, if needed for complex queries)
- **WebSockets** (Socket.io) for real-time features:
  - Chat messages
  - Expense updates
  - Chore completions
  - Settlement notifications

---

## Frontend Architecture

### Mobile (Expo)

```
mobile/
├── app/                   # Expo Router (file-based)
│   ├── (auth)/           # Auth screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/           # Main tabs
│   │   ├── home.tsx
│   │   ├── expenses.tsx
│   │   ├── finance.tsx
│   │   ├── listings.tsx
│   │   └── profile.tsx
│   └── _layout.tsx
├── src/
│   ├── components/       # Reusable UI components
│   ├── services/         # API clients
│   ├── store/            # Zustand stores
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utilities
│   ├── types/            # TypeScript types (from shared)
│   └── constants/        # App constants
└── assets/               # Images, fonts
```

### Web (Next.js)

```
web/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   └── layout.tsx
│   ├── components/       # React components
│   ├── lib/              # Utilities, API clients
│   ├── store/            # Zustand stores
│   ├── hooks/            # Custom hooks
│   └── types/            # TypeScript types (from shared)
└── public/               # Static assets
```

---

## Security Considerations

1. **Authentication**
   - JWT tokens (access + refresh)
   - Secure password hashing (bcrypt)
   - Email verification
   - Optional: 2FA for premium users

2. **Authorization**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - Group membership checks

3. **Data Protection**
   - Encrypt sensitive data (financial information)
   - HTTPS only
   - Secure API keys management
   - Rate limiting

4. **Privacy**
   - Personal finance section completely private
   - User controls profile visibility
   - GDPR compliance considerations
   - Data export/deletion options

---

## Infrastructure & Deployment

### Development
- **Local Development:**
  - PostgreSQL 18.1 via Docker Desktop (local, fast, no internet needed)
  - Expo Go for mobile testing (instant testing on phone)
  - Local backend testing with Docker Compose
  - All services run locally for development

### Production (Free Tier Options)
- **Backend:** 
  - Railway.app (free $5 credit/month) OR
  - Render.com (free tier with limitations)
  - Supabase PostgreSQL (free tier - 500MB)
  - Supabase Storage (free tier - 2GB)
  - Can upgrade when needed

- **Mobile:**
  - Expo Application Services (EAS) for builds (free tier)
  - Over-the-air updates via Expo Updates (free)
  - TestFlight (iOS) or Internal Testing (Android) for beta

- **Web:**
  - Vercel (free tier - perfect for Next.js, unlimited deployments)

### Monitoring & Analytics (Free Options)
- **Error Tracking:** Sentry (free tier - 5K events/month)
- **Analytics:** Google Analytics (free) or Vercel Analytics (free)
- **Logging:** Railway/Render built-in logs (free)
- **Performance:** Vercel Analytics (free) for web

---

## Development Phases

See `DEVELOPMENT_ROADMAP.md` for detailed day-by-day plan (50 days to production).

### Quick Overview:

### Phase 1: Foundation (Days 4-10)
- ✅ Project setup (monorepo, dependencies)
- ✅ Database schema design & Prisma setup (Supabase)
- ✅ Authentication system (Supabase Auth)
- ✅ Basic user profiles
- ✅ Mobile & web scaffolding

### Phase 2: Core Features - MVP (Days 11-25)
- Expense splitting (basic)
- Groups management
- Simple receipt upload (manual entry, no AI yet)
- Personal finance (basic, single currency)
- Chore management
- Rideshare tracking
- Basic trust scoring

### Phase 3: Polish & Advanced Features (Days 26-40)
- Listings (roommate, accommodation, etc.)
- Messaging/chat
- Analytics (basic charts)
- Trust score enhancement

### Phase 4: Testing & Deployment (Days 41-50)
- Testing all features
- Bug fixes
- UI/UX polish
- Deploy to production
- App store submission prep

### Future Phases (Post-Launch):
- AI receipt scanning (when budget allows)
- Multi-currency support
- AI financial coach
- Payment integration
- Bank integration

---

## Key Technical Decisions Rationale

### Why TypeScript Everywhere?
- Type safety across all layers
- Better developer experience
- Catch errors at compile time
- Easier refactoring

### Why Zustand over Redux?
- Simpler API, less boilerplate
- Great TypeScript support
- Smaller bundle size
- Perfect for our use case

### Why Prisma over TypeORM?
- Better TypeScript integration
- Excellent migration system
- Type-safe queries
- Better developer experience

### Why PostgreSQL?
- Reliable for financial data (ACID)
- JSON support for flexibility
- Strong ecosystem
- Excellent performance

---

## Next Steps

1. Set up monorepo structure
2. Initialize Expo + Next.js projects
3. Set up NestJS backend
4. Configure Prisma with PostgreSQL
5. Set up shared package for types
6. Implement authentication flow
7. Build first feature (expense splitting)

---

*Last Updated: January 2025*

