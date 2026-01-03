# Development Roadmap: Days 1-40 (Historical Reference)

> **⚠️ HISTORICAL REFERENCE ONLY - Days 1-40 Completed**
> 
> **This document contains the original roadmap for Days 1-40, which have been completed.**
> 
> **For the current roadmap (Days 41-110), see `DEVELOPMENT_ROADMAP_COMPREHENSIVE.md`**
> 
> **Quick reference:** See `ROADMAP_SUMMARY.md` for overview

---

## Status: Days 1-40 ✅ COMPLETED

This document is kept for historical reference. It shows what was planned and completed in the initial phases of development.

**Current Status:** Day 40 completed. Continue with `DEVELOPMENT_ROADMAP_COMPREHENSIVE.md` starting at Day 41.

---

## Prerequisites: What You Need to Know

**Don't worry if you don't know these yet - we'll learn as we build:**

1. **Basic understanding of:**
   - JavaScript/TypeScript basics
   - Git (version control)
   - Terminal/Command line basics

**📚 Important Reference Documents:**
- **[UI/UX Design Guide](./SOP/UI_UX_DESIGN_GUIDE.md)** - **ALWAYS reference this when building UI components!** Contains colors, typography, spacing, component specs, and design patterns.
- [Technical Roadmap](./SOP/TECHNICAL_ROADMAP.md) - Technology stack
- [Feature Specifications](./SOP/FEATURE_SPECIFICATIONS.md) - Feature details

2. **Tools to Install:**
   - Node.js (v18+) - [nodejs.org](https://nodejs.org)
   - Git - [git-scm.com](https://git-scm.com)
   - VS Code (recommended editor) - [code.visualstudio.com](https://code.visualstudio.com)
   - Expo Go app on your phone (for testing)

3. **Accounts to Create (All Free):**
   - GitHub account (free hosting for code)
   - Vercel account (free web hosting)
   - Expo account (free mobile app builds)
   - Supabase account (optional - for production database, free tier)

---

## Phase 0: Setup & Learning (Days 1-3)

### Day 1: Environment Setup

**Goals:**
- ✅ Install all required tools
- ✅ Create accounts
- ✅ Verify everything works

**Tasks:**

1. **Verify Node.js Installation (You Already Have v24.12.0!)**
   ```bash
   # Verify installation
   node --version  # Should show v24.12.0 (perfect!)
   npm --version   # Should show version number
   ```

2. **Install Git**
   ```bash
   # Verify installation
   git --version
   ```

3. **Create GitHub Account**
   - Go to github.com
   - Create account
   - We'll use this to store our code

4. **Install VS Code**
   - Install recommended extensions:
     - ESLint
     - Prettier
     - TypeScript
     - Expo Tools

5. **Verify PostgreSQL & Docker**
   - You already have PostgreSQL 18.1 installed! ✅
   - Verify Docker Desktop is running
   - We'll set up database on Day 4 using Docker
   - Optional: Create Supabase account for production later

6. **Create Expo Account**
   - Go to expo.dev
   - Create free account
   - Install Expo Go app on your phone

7. **Create Vercel Account**
   - Go to vercel.com
   - Sign up with GitHub
   - Free tier is perfect for our needs

**End of Day 1 Checklist:**
- [x] Node.js v24.12.0 installed and working ✅
- [x] Git installed and working ✅
- [x] GitHub account created ✅
- [x] VS Code installed ✅
- [x] Docker Desktop installed and running ✅
- [x] PostgreSQL 18.1 installed and verified ✅
- [x] Expo account created + Expo Go on phone ✅
- [x] Vercel account created ✅

---

### Day 2: Project Initialization

**Goals:**
- ✅ Set up monorepo structure
- ✅ Initialize mobile app (Expo)
- ✅ Initialize landing page website (Next.js)
- ✅ Initialize backend API (NestJS)
- ✅ Get basic "Hello World" running

**Tasks:**

1. **Create Project Structure**
   ```bash
   # We'll create this together - don't worry about understanding everything yet
   # Just follow along step by step
   ```

2. **Initialize Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Foundation setup"
   ```

**What We'll Build:**
- Basic monorepo folder structure
- Expo mobile app (shows "Hello World")
- Next.js landing page (shows "Welcome" page)
- NestJS backend API (responds "Hello World")
- Package.json files configured

**End of Day 2 Checklist:**
- [x] Monorepo structure created ✅
- [x] Mobile app (Expo) shows "Hello World" in Expo Go ✅
- [x] Landing page website shows welcome page ✅
- [x] Backend API responds "Hello World" at localhost:3001 ✅
- [x] Code committed to Git ✅

---

### Day 3: Understanding the Architecture

**Goals:**
- ✅ Understand how mobile app and backend connect
- ✅ Understand landing page is separate (marketing only)
- ✅ Set up development workflow
- ✅ Learn how to run all apps simultaneously

**Tasks:**
- Walk through the codebase structure
- Understand mobile app connects to backend API
- Understand landing page is static (no backend connection)
- Practice running and testing apps

**End of Day 3 Checklist:**
- [x] Can start mobile app in Expo Go ✅
- [x] Can start landing page locally (localhost:3000) ✅
- [x] Can start backend API (localhost:3001) ✅
- [x] Understand mobile app connects to backend API ✅
- [x] Understand landing page is separate marketing site ✅

---

## Phase 1: Foundation (Days 4-10)

### Day 4: Database Setup

**Goals:**
- ✅ Set up local PostgreSQL database (using Docker)
- ✅ Design basic schema (users, profiles)
- ✅ Learn Prisma (database tool)

**What We'll Build:**

1. **Set up PostgreSQL with Docker:**
   ```yaml
   # docker-compose.yml (we'll create this)
   version: '3.8'
   services:
     postgres:
       image: postgres:18.1
       environment:
         POSTGRES_USER: dreamfinora
         POSTGRES_PASSWORD: your_password
         POSTGRES_DB: dreamfinora_dev
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

2. **Prisma Schema:**
   ```prisma
   // Basic schema - users and profiles
   model User {
     id        String   @id @default(uuid())
     email     String   @unique
     password  String   // encrypted
     createdAt DateTime @default(now())
     
     profile   UserProfile?
   }
   
   model UserProfile {
     id        String   @id @default(uuid())
     userId    String   @unique
     name      String?
     avatar    String?
     createdAt DateTime @default(now())
     
     user      User     @relation(fields: [userId], references: [id])
   }
   ```

**Steps:**
1. Create `docker-compose.yml` in project root
2. Run `docker-compose up -d` to start PostgreSQL
3. Set up Prisma with connection string
4. Create first migration

**Learning Resources:**
- Prisma quick start guide
- Docker basics
- PostgreSQL connection strings

**End of Day 4 Checklist:**
- [x] PostgreSQL running in Docker ✅
- [x] Database connection working ✅
- [x] Prisma schema created ✅
- [x] First migration run successfully ✅

---

### Day 5-6: Authentication System

**Goals:**
- ✅ User registration
- ✅ User login
- ✅ JWT tokens
- ✅ Protected routes

**What We'll Build:**
1. **Backend:**
   - Register endpoint (`POST /auth/register`)
   - Login endpoint (`POST /auth/login`)
   - JWT token generation
   - Password encryption (bcrypt)

2. **Mobile:**
   - Login screen
   - Register screen
   - Save auth token
   - Redirect based on auth status

3. **Web:**
   - Same login/register screens
   - Token management

**User Flow:**
```
1. User opens app → Check if logged in
2. If not logged in → Show login screen
3. User logs in → Save token → Redirect to home
4. If logged in → Show home screen
```

**End of Day 5 Checklist:**
- [x] Register endpoint created (`POST /auth/register`) ✅
- [x] Login endpoint created (`POST /auth/login`) ✅
- [x] JWT token generation working ✅
- [x] Password encryption (bcrypt) implemented ✅
- [x] PrismaService created and integrated ✅
- [x] Database connection working ✅

**End of Day 6 Checklist:**
- [x] Can register new user ✅
- [x] Can login ✅
- [x] Token saved and used for requests ✅
- [x] Protected routes work (redirect if not logged in) ✅
- [x] Can logout ✅

---

### Day 7: User Profile

**📚 UI Reference:** [UI/UX Design Guide](./SOP/UI_UX_DESIGN_GUIDE.md) - Follow design system for profile screen

**Goals:**
- ✅ Create/update user profile
- ✅ Upload profile picture
- ✅ Display profile information

**What We'll Build:**
1. **Backend:**
   - Get profile endpoint
   - Update profile endpoint
   - Image upload endpoint (local storage for dev, can use Supabase Storage for production)

2. **Mobile/Web:**
   - Profile screen
   - Edit profile form
   - Image picker/upload

**End of Day 7 Checklist:**
- [x] Can view own profile ✅
- [x] Can edit profile (name, bio) ✅
- [x] Can upload profile picture ✅
- [x] Profile picture displays correctly ✅

---

### Day 8-10: Trust Score Foundation

**Goals:**
- ✅ Basic trust score calculation
- ✅ Display score on profile
- ✅ Score history (basic)

**What We'll Build:**
```typescript
// Basic trust score (we'll expand later)
// For now: Simple score based on account age + verification
trustScore = (accountAge * 10) + (verified ? 50 : 0)
```

**End of Day 10 Checklist:**
- [x] Trust score calculates (basic version) ✅
- [x] Score displays on profile ✅
- [x] Score updates correctly ✅
- [x] Score history is tracked ✅
- [x] UI matches design system ✅

---

## Phase 2: Core Features - MVP (Days 11-25)

### Day 11-13: Expense Splitting (Basic)

**Goals:**
- ✅ Create expenses
- ✅ Split expenses between users
- ✅ View "who owes what"
- ✅ Mark expenses as settled

**What We'll Build:**

1. **Database Schema:**
```prisma
model Expense {
  id          String   @id @default(uuid())
  createdBy   String
  description String
  amount      Float
  currency    String   @default("USD")
  date        DateTime @default(now())
  
  splits      ExpenseSplit[]
  createdByUser User   @relation(...)
}

model ExpenseSplit {
  id       String   @id @default(uuid())
  expenseId String
  userId   String
  amount   Float
  isPaid   Boolean  @default(false)
  
  expense  Expense  @relation(...)
  user     User     @relation(...)
}
```

2. **Backend:**
   - Create expense endpoint
   - Get expenses endpoint
   - Settle expense endpoint
   - Calculate balances endpoint

3. **Mobile/Web:**
   - Create expense screen
   - Expense list screen
   - Balance view (who owes what)
   - Settle button

**User Flow:**
```
1. User creates expense: "Dinner $60"
2. Split equally between 3 friends
3. Each person owes $20
4. Friend pays → Mark as settled
5. Balance updates
```

**End of Day 13 Checklist:**
- [x] Can create expense ✅
- [x] Can split expense between friends ✅
- [x] Can see who owes money ✅
- [x] Can mark expense as settled ✅
- [x] Balances calculate correctly ✅

---

### Day 14-16: Groups

**Goals:**
- ✅ Create groups (roommates, friends, etc.)
- ✅ Add/remove members
- ✅ Use groups for expenses

**What We'll Build:**
```prisma
model Group {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdBy   String
  
  members     GroupMember[]
  expenses    Expense[]
}

model GroupMember {
  id      String @id @default(uuid())
  groupId String
  userId  String
  
  group   Group  @relation(...)
  user    User   @relation(...)
}
```

**Features:**
- Create group
- Add friends to group
- View group members
- Create expenses within group
- View group expenses

**End of Day 16 Checklist:**
- [x] Can create group ✅
- [x] Can add members to group ✅
- [x] Can create expense in group ✅
- [x] Can view group expenses ✅
- [x] Can see group balance ✅

---

### Day 17-19: Personal Finance (Basic - Single Currency)

**Goals:**
- ✅ Add income/expense transactions
- ✅ View balance
- ✅ Basic categories

**Note:** We're skipping bank integration for now. Manual entry only.

**What We'll Build:**
```prisma
model FinanceAccount {
  id        String   @id @default(uuid())
  userId    String
  name      String
  currency  String   @default("USD")
  balance   Float    @default(0)
  
  transactions FinanceTransaction[]
}

model FinanceTransaction {
  id          String   @id @default(uuid())
  accountId   String
  type        String   // "income" or "expense"
  amount      Float
  category    String
  description String?
  date        DateTime @default(now())
  
  account     FinanceAccount @relation(...)
}
```

**Features:**
- Add income transaction
- Add expense transaction
- View current balance
- View transaction history
- Filter by category

**End of Day 19 Checklist:**
- [x] Can add income ✅
- [x] Can add expense ✅
- [x] Balance calculates correctly ✅
- [x] Can view transaction history ✅
- [x] Can filter by category ✅
- [x] Can see spending by category ✅

---

### Day 20-22: Chore Management

**Goals:**
- ✅ Create chores
- ✅ Assign chores
- ✅ Complete chores
- ✅ Points system
- ✅ Update trust score based on chores

**What We'll Build:**
```prisma
model Chore {
  id          String   @id @default(uuid())
  groupId     String?
  createdBy   String
  title       String
  description String?
  points      Int      @default(10)
  status      String   @default("pending") // pending, assigned, completed
  assignedTo  String?
  dueDate     DateTime?
  
  completions ChoreCompletion[]
}

model ChoreCompletion {
  id        String   @id @default(uuid())
  choreId   String
  userId    String
  completedAt DateTime @default(now())
  pointsEarned Int
  
  chore     Chore    @relation(...)
  user      User     @relation(...)
}
```

**Features:**
- Create chore (with points)
- Assign to group member
- Grab unassigned chore (bonus points)
- Mark as complete
- View chore list
- Points contribute to trust score

**End of Day 22 Checklist:**
- [x] Can create chore ✅
- [x] Can assign chore ✅
- [x] Can grab unassigned chore ✅
- [x] Can mark chore complete ✅
- [x] Points awarded correctly ✅
- [x] Trust score updates from chores ✅

---

### Day 23-25: Rideshare (Basic)

**Goals:**
- ✅ Create ride record
- ✅ Charge passengers
- ✅ Auto-add to expenses

**What We'll Build:**
```prisma
model Ride {
  id            String   @id @default(uuid())
  driverId      String
  type          String   // "giveRide" or "rideshare"
  origin        String
  destination   String
  distance      Float?
  chargePerMile Float?
  chargePerRide Float?
  totalCost     Float
  currency      String   @default("USD")
  date          DateTime @default(now())
  
  participants  RideParticipant[]
}
```

**Features:**
- Create ride (give ride or rideshare)
- Add passengers
- Calculate cost
- Auto-create expense in expense splitting

**End of Day 25 Checklist:**
- [x] Can create ride ✅
- [x] Can add passengers ✅
- [x] Cost calculates correctly ✅
- [x] Auto-adds to expense splitting ✅
- [x] Shows in expense list ✅
- [x] Can join ride ✅
- [x] Expense splits update when joining ✅

---

## Phase 3: Polish & Advanced Features (Days 26-40)

### Day 26-28: Receipt Upload (Manual Entry First)

**Goals:**
- ✅ Upload receipt image
- ✅ Manual entry of expense details
- ✅ Link receipt to expense

**Note:** We're NOT doing AI scanning yet (that's Phase 4). Just image upload + manual entry.

**What We'll Build:**
- Image upload (local storage for dev, Supabase Storage optional for production)
- Store receipt URL with expense
- Display receipt image in expense details

**End of Day 28 Checklist:**
- [x] Can upload receipt image ✅
- [x] Receipt stores with expense ✅
- [x] Can view receipt in expense details ✅

---

### Day 29-31: Listings (Basic)

**Goals:**
- ✅ Create listings (roommate, accommodation, item)
- ✅ Browse listings
- ✅ Contact listing creator

**What We'll Build:**
```prisma
model Listing {
  id          String   @id @default(uuid())
  userId      String
  type        String   // "roommate", "accommodation", "item", "event", "ride"
  title       String
  description String
  location    String?
  price       Float?
  currency    String?
  status      String   @default("active") // active, completed, closed
  createdAt   DateTime @default(now())
  
  images      String[] // Array of image URLs
}
```

**Features:**
- Create listing
- Add images
- Browse listings (list view)
- View listing details
- Contact creator (we'll add messaging later)

**End of Day 31 Checklist:**
- [x] Can create listing ✅
- [x] Can add images to listing ✅
- [x] Can browse all listings ✅
- [x] Can filter by type ✅
- [x] Can view listing details ✅

---

### Day 32-34: Messaging (Basic)

**Goals:**
- ✅ Direct messages between users
- ✅ Message list (inbox)
- ✅ Real-time updates

**What We'll Build:**
```prisma
model Chat {
  id        String   @id @default(uuid())
  type      String   @default("direct") // "direct" or "group"
  createdAt DateTime @default(now())
  
  participants ChatParticipant[]
  messages     Message[]
}

model Message {
  id        String   @id @default(uuid())
  chatId    String
  senderId  String
  content   String
  sentAt    DateTime @default(now())
  readAt    DateTime?
  
  chat      Chat     @relation(...)
}
```

**Features:**
- Send message to user
- View conversation
- Message list (inbox)
- Real-time updates (WebSocket or polling)

**Note:** We'll use simple polling first (check for new messages every few seconds). WebSocket optimization later.

**End of Day 34 Checklist:**
- [x] Can send message ✅
- [x] Can view conversation ✅
- [x] Can see message list (inbox) ✅
- [x] Messages appear in real-time (polling) ✅

**Note:** Messaging is complete but limited to listing contacts until user discovery features are added in later phases.

---

### Day 35-37: Analytics (Basic)

**Goals:**
- ✅ Spending by category (pie chart)
- ✅ Monthly spending trends
- ✅ Balance over time

**What We'll Build:**
- Basic charts using a simple chart library (recharts for web, react-native-chart-kit for mobile)
- Calculate spending by category
- Show trends over time

**End of Day 37 Checklist:**
- [x] Can see spending by category (pie chart) ✅
- [x] Can see monthly spending trends ✅
- [x] Can see balance over time ✅

---

### Day 38-40: Trust Score Enhancement

**Goals:**
- ✅ Complete trust score algorithm
- ✅ Score breakdown visible
- ✅ Score updates in real-time

**Full Trust Score Calculation:**
```typescript
// Expense Score (40%)
expenseScore = (
  onTimeSettlementRate * 0.5 +
  recentActivityBonus * 0.3 +
  volumeBonus * 0.2
) * 40

// Chore Score (30%)
choreScore = (
  completionRate * 0.4 +
  onTimeRate * 0.3 +
  pointsBonus * 0.3
) * 30

// Community Score (30%)
communityScore = (
  listingSuccessRate * 0.5 +
  engagementRate * 0.3 +
  responseRate * 0.2
) * 30

totalScore = expenseScore + choreScore + communityScore
```

**End of Day 40 Checklist:**
- [x] Complete trust score algorithm implemented ✅
- [x] Score breakdown visible on profile ✅
- [x] Score updates when actions completed ✅
- [x] Score history tracked ✅

---

## ✅ Days 1-40 Completed

**This roadmap ends here. Days 1-40 have been completed.**

**Next Steps:**
- See `DEVELOPMENT_ROADMAP_COMPREHENSIVE.md` for Days 41-110 (Complete Core Features, Enhancements, Testing, Deployment)
- See `ROADMAP_SUMMARY.md` for quick overview of the restructured roadmap

---

## Learning Resources

Still relevant reference materials:

**🎨 UI/UX Design (CRITICAL - Reference for ALL UI work):**
- **[UI/UX Design Guide](./SOP/UI_UX_DESIGN_GUIDE.md)** - **ALWAYS check this before building any UI component**
  - Colors, typography, spacing, component specifications
  - Design patterns, interaction guidelines
  - Trust score display, button styles, card layouts
  - **Follow the design system for consistency across the app**

**TypeScript:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

**React Native/Expo:**
- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)

**Next.js:**
- [Next.js Documentation](https://nextjs.org/docs)

**NestJS:**
- [NestJS Documentation](https://docs.nestjs.com)

**Prisma:**
- [Prisma Documentation](https://www.prisma.io/docs)

**Supabase:**
- [Supabase Documentation](https://supabase.com/docs)

---

**End of Historical Reference (Days 1-40)**

For current development, see:
- `DEVELOPMENT_ROADMAP_COMPREHENSIVE.md` - Current roadmap (Days 41-110)
- `ROADMAP_SUMMARY.md` - Quick overview
- `docs/PROGRESS.md` - Current status

---

*Last Updated: December 2025 - Historical reference only*

