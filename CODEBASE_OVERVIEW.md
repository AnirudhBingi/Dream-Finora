# Dream Finora - Complete Codebase Overview

## Project Overview

**Dream Finora** is a comprehensive, socially interconnected mobile application (iOS & Android) that integrates:
- Expense splitting (Billchop)
- Personal finance management
- Chore coordination
- Ridesharing
- Community listings (SpaceV)
- Messaging
- Trust score system

**Architecture:** Monorepo with:
- **Backend**: NestJS + Prisma + PostgreSQL (REST API)
- **Mobile**: React Native + Expo
- **Website**: Next.js (landing page only)
- **Shared**: Common types and utilities

---

## Database Schema (Prisma)

### Core Models

#### User & Profile
- **User**: Authentication (email, mobileNumber, password, JWT tokens)
- **UserProfile**: Display name, avatar, bio, currency preferences, notification settings, privacy settings

#### Trust Score System
- **TrustScore**: User reliability score (0-100), verified status
- **TrustScoreHistory**: Historical score changes with reasons

**Score Calculation:**
- **Expense Score (40%)**: On-time settlement rate (50%), recent activity (30%), volume (20%)
- **Chore Score (30%)**: Completion rate (35%), on-time rate (25%), points (20%), streak (10%), achievements (10%)
- **Community Score (30%)**: Listing success (50%), engagement (30%), message response rate (20%)

#### Expense Splitting
- **Expense**: Description, amount, currency, date, category, receipt, split type (EQUAL/CUSTOM/PERCENTAGE)
- **ExpenseSplit**: Individual user's portion, paid status, paidAt timestamp
- **Settlement**: Payment between users (payer, payee, amount, method, notes)
- **SettlementSplit**: Links settlements to expense splits
- **ExpenseHistory**: Audit trail of expense changes

#### Groups
- **Group**: Name, description, createdBy
- **GroupMember**: User membership with role (ADMIN/MEMBER)
- **GroupInvitation**: Email/mobile invitations with tokens, expiration, status

#### Chores
- **Chore**: Title, description, points, status (pending/assigned/completed), assignedTo, dueDate
- **ChoreCompletion**: Completion record with points earned, onTime flag
- **ChoreHistory**: Audit trail of chore changes

#### Finance Management
- **FinanceAccount**: Name, currency, balance, context (local/home), accountType
- **FinanceTransaction**: Type (income/expense), amount, category, description, date, context, source
- **Budget**: Name, amount, period (monthly), startDate, endDate, warningThreshold
- **BudgetTracking**: Period-based spending tracking
- **FinancialGoal**: Target amount, current amount, target date, category, priority, status
- **GoalContribution**: Contributions toward goals
- **Loan**: Principal, remaining amount, interest rate, EMI, loan term, payment frequency
- **LoanPayment**: Payment records with principal/interest breakdown

#### Ridesharing
- **Ride**: Driver, type (rideshare/giveRide), origin, destination, distance, cost calculation
- **RideParticipant**: Driver and passengers
- Auto-creates expense splits for ride costs

#### Listings (SpaceV)
- **Listing**: Type (item/space/service), title, description, location, price, images, status
- **ListingComment**: Comments on listings
- **ListingFavorite**: User favorites

#### Messaging
- **Chat**: Type (direct/group), participants
- **ChatParticipant**: User participation, lastReadAt
- **Message**: Content, sentAt, readAt, editedAt, deletedAt

#### Friends
- **Friend**: Bidirectional friendship with status (pending/accepted)
- **UserInvitation**: Invite users by email/mobile

#### Notifications
- **Notification**: Type, title, message, data (JSON), read status, timestamps

#### Activity
- **Activity**: System-wide activity feed (expenses, chores, groups, listings, rides)

---

## Backend Architecture (NestJS)

### Module Structure

#### Core Modules
- **AuthModule**: JWT authentication, registration, login
- **PrismaModule**: Database service
- **SharedModule**: Currency conversion, email service, categorization

#### Feature Modules
- **ProfileModule**: User profile CRUD
- **ExpenseModule**: Expense splitting, settlements, balances
- **GroupModule**: Group management, invitations, member management
- **ChoreModule**: Chore CRUD, completion, stats, history
- **FinanceModule**: Accounts, transactions, budgets, goals, loans
- **RideModule**: Ride creation, participant management, expense integration
- **ListingModule**: Listing CRUD, search, favorites, comments
- **MessagingModule**: Chat creation, message sending, conversation management
- **FriendModule**: Friend requests, invitations, friend management
- **TrustScoreModule**: Score calculation, breakdown, insights, history
- **NotificationModule**: Notification creation, delivery, preferences
- **ActivityModule**: Activity feed generation
- **AnalyticsModule**: Analytics and insights
- **AccountModule**: Account settings, password management
- **ExportModule**: Data export functionality

### Key Services

#### AuthService
- Registration with email/mobile validation
- Login with email or mobile number
- JWT token generation (7-day expiration)
- Password hashing with bcrypt

#### ExpenseService
- Create expenses with multiple split types (equal, custom, percentage)
- Calculate balances between users
- Settlement creation and tracking
- Expense history tracking
- Auto-categorization
- Currency conversion support

#### TrustScoreService
- Real-time score calculation
- Score breakdown by category
- Score history tracking
- Insights and improvement suggestions
- Comparison with friends
- Auto-updates on expense payment, chore completion, community activity

#### FinanceService
- Multi-currency account management
- Transaction categorization
- Budget tracking and warnings
- Goal tracking and contributions
- Loan payment tracking
- Context separation (local vs home country)

#### ChoreService
- Chore assignment and completion
- Points system
- Streak tracking
- Achievement calculation
- Stats and analytics
- History tracking

#### GroupService
- Group creation with initial members
- Member invitation (email/mobile)
- Role management (ADMIN/MEMBER)
- Ownership transfer
- Group balances calculation

#### MessagingService
- Direct chat creation/finding
- Message sending with read receipts
- Conversation list with unread counts
- Message editing and deletion

#### NotificationService
- Type-specific notifications
- User preference checking
- Push notification support (Expo)
- Email notification support (SendGrid)

### API Endpoints Structure

```
/auth
  POST /register
  POST /login

/profile
  GET /profile
  PUT /profile
  GET /profile/:userId

/expenses
  GET /expenses
  POST /expenses
  GET /expenses/:id
  PUT /expenses/:id
  DELETE /expenses/:id
  GET /expenses/:id/history
  POST /expenses/settle
  GET /expenses/balances

/groups
  GET /groups
  POST /groups
  GET /groups/:id
  PUT /groups/:id
  DELETE /groups/:id
  POST /groups/:id/members
  DELETE /groups/:id/members/:userId
  POST /groups/:id/invite
  GET /groups/:id/invitations
  POST /groups/:id/invitations/:token/accept
  GET /groups/:id/balances

/chores
  GET /chores
  POST /chores
  GET /chores/:id
  PUT /chores/:id
  DELETE /chores/:id
  POST /chores/:id/complete
  GET /chores/:id/history
  GET /chores/stats

/finance
  GET /finance/accounts
  POST /finance/accounts
  GET /finance/accounts/:id
  PUT /finance/accounts/:id
  DELETE /finance/accounts/:id
  GET /finance/transactions
  POST /finance/transactions
  GET /finance/transactions/:id
  PUT /finance/transactions/:id
  DELETE /finance/transactions/:id

/finance/budgets
  GET /finance/budgets
  POST /finance/budgets
  GET /finance/budgets/:id
  PUT /finance/budgets/:id
  DELETE /finance/budgets/:id

/finance/goals
  GET /finance/goals
  POST /finance/goals
  GET /finance/goals/:id
  PUT /finance/goals/:id
  POST /finance/goals/:id/contribute
  DELETE /finance/goals/:id

/finance/loans
  GET /finance/loans
  POST /finance/loans
  GET /finance/loans/:id
  PUT /finance/loans/:id
  POST /finance/loans/:id/payments
  DELETE /finance/loans/:id

/rides
  GET /rides
  POST /rides
  GET /rides/:id
  PUT /rides/:id
  DELETE /rides/:id

/listings
  GET /listings
  POST /listings
  GET /listings/:id
  PUT /listings/:id
  DELETE /listings/:id
  POST /listings/:id/favorite
  DELETE /listings/:id/favorite

/messaging
  GET /messaging/conversations
  POST /messaging/conversations
  GET /messaging/conversations/:id/messages
  POST /messaging/conversations/:id/messages
  PUT /messaging/messages/:id
  DELETE /messaging/messages/:id

/friends
  GET /friends
  POST /friends/request
  POST /friends/:id/accept
  DELETE /friends/:id
  POST /friends/invite

/trust-score
  GET /trust-score
  GET /trust-score/breakdown
  GET /trust-score/history
  GET /trust-score/insights
  GET /trust-score/compare

/notifications
  GET /notifications
  PUT /notifications/:id/read
  PUT /notifications/read-all
  GET /notifications/unread-count

/activity
  GET /activity

/analytics
  GET /analytics
```

---

## Mobile App Architecture (React Native + Expo)

### Navigation System

**Root-Level Screen Rendering:**
- All screens rendered at root level for smooth transitions
- `RootScreenRenderer manages active screen display
- `ScreenContainer` provides fade transitions (250ms)
- `SwipeableScreen` enables swipe-to-go-back
- Navigation history tracking for proper back navigation

**Screen States:**
- Current screen tracked in App.tsx
- Selected entity IDs (expenseId, groupId, etc.) stored in state
- Refresh keys for data invalidation
- Navigation params passed through state

### Key Screens

#### Authentication
- `LoginScreen`: Email/mobile + password login
- `RegisterScreen`: Registration with email/mobile

#### Main Tabs (Bottom Navigation)
- `HomeScreen`: Dashboard with quick actions
- `ExpenseListScreen`: List of expenses
- `ChoreListScreen`: List of chores
- `SpaceVListScreen`: List of listings
- `RideListScreen`: List of rides

#### Expense Management
- `ExpenseDetailScreen`: Full expense view
- `CreateExpenseScreen`: Create new expense
- `EditExpenseScreen`: Edit existing expense
- `BalanceSummaryScreen`: Who owes/owed amounts
- `SettleUpScreen`: Settlement flow
- `BillchopAnalyticsScreen`: Expense analytics
- `BillchopFriendsScreen`: Friends with expenses
- `BillchopGroupsScreen`: Groups with expenses

#### Group Management
- `GroupListScreen`: User's groups
- `GroupDetailScreen`: Group info, expenses, chores, members
- `CreateGroupScreen`: Create new group
- `GroupSettingsScreen`: Edit group, manage members
- `AddGroupMemberScreen`: Add members to group
- `GroupInvitationScreen`: Accept/decline invitations

#### Chore Management
- `ChoreDetailScreen`: Chore details, completion
- `CreateChoreScreen`: Create new chore
- `EditChoreScreen`: Edit chore
- `ChoreHistoryScreen`: Chore change history
- `ChoreStatsScreen`: Chore statistics

#### Finance Management
- `FinanceScreen`: Overview of accounts, transactions, budgets, goals, loans
- `AddTransactionScreen`: Add income/expense transaction
- `EditTransactionScreen`: Edit transaction
- `EditAccountScreen`: Edit account details
- `FinanceHistoryScreen`: Transaction history
- `BudgetScreen`: List of budgets
- `CreateBudgetScreen`: Create budget
- `EditBudgetScreen`: Edit budget
- `GoalsScreen`: List of financial goals
- `CreateGoalScreen`: Create goal
- `EditGoalScreen`: Edit goal
- `GoalDetailScreen`: Goal details, contributions
- `AddContributionScreen`: Add contribution to goal
- `LoansListScreen`: List of loans
- `CreateLoanScreen`: Create loan
- `LoanDetailScreen`: Loan details, payments
- `RecordLoanPaymentScreen`: Record loan payment
- `FinancialAdvisorScreen`: AI-powered financial insights

#### Ridesharing
- `RideDetailScreen`: Ride details, participants
- `CreateRideScreen`: Create ride (rideshare or giveRide)
- Auto-creates expense splits

#### Listings (SpaceV)
- `SpaceVDetailScreen`: Listing details, comments, favorites
- `CreateSpaceVScreen`: Create listing
- `EditSpaceVScreen`: Edit listing

#### Messaging
- `ConversationListScreen`: List of conversations
- `MessageThreadScreen`: Chat interface

#### Social
- `ProfileScreen`: User's own profile
- `UserProfileScreen`: Other user's profile
- `EditProfileScreen`: Edit own profile
- `TrustScoreInsightsScreen`: Trust score breakdown and insights
- `FriendsListScreen`: List of friends
- `FriendSearchScreen`: Search for users
- `FriendExpenseListScreen`: Expenses with specific friend

#### Settings & Account
- `SettingsScreen`: App settings
- `AccountSettingsScreen`: Account management, password change, delete account
- `NotificationsScreen`: Notification list

#### Analytics & Activity
- `AnalyticsScreen`: Overall analytics
- `ActivityFeedScreen`: System-wide activity feed

### API Integration

**API Client Structure:**
- `getApiBaseUrl.ts`: Dynamic API URL detection (handles localhost vs LAN IP)
- Separate API files per feature:
  - `authApi.ts`: Authentication
  - `expenseApi.ts`: Expenses
  - `groupApi.ts`: Groups
  - `choreApi.ts`: Chores
  - `financeApi.ts`: Finance
  - `rideApi.ts`: Rides
  - `listingApi.ts`: Listings
  - `messagingApi.ts`: Messaging
  - `friendApi.ts`: Friends
  - `profileApi.ts`: Profile
  - `trustScoreApi.ts`: Trust score
  - `notificationApi.ts`: Notifications
  - `activityApi.ts`: Activity
  - `analyticsApi.ts`: Analytics
  - `accountApi.ts`: Account management

**Authentication:**
- `AuthProvider`: Context for authentication state
- JWT token stored in AsyncStorage
- Token included in all API requests
- Auto-logout on token expiration

### Push Notifications

- Expo Notifications integration
- Device registration for push tokens
- Notification listeners for foreground/background
- Badge count management
- Deep linking to relevant screens

### Components

**Reusable Components:**
- `Header`: Standard header with back button
- `BottomNavigation`: Tab navigation
- `EmptyState`: Empty list states
- `ErrorState`: Error display
- `SkeletonLoader`: Loading states
- `TrustScoreDisplay`: Trust score visualization
- `CurrencyPicker`: Currency selection
- `DatePicker`: Date selection
- `ParticipantPicker`: User selection
- `ScreenContainer`: Transition wrapper
- `SwipeableScreen`: Swipe navigation
- `RootScreenRenderer`: Root-level screen management

---

## Key Features & Flows

### 1. Expense Splitting Flow

1. **Create Expense**
   - User selects participants (friends or group members)
   - Enters amount, description, date, category
   - Chooses split type (equal, custom, percentage)
   - Optionally attaches receipt
   - Creates expense with splits

2. **View Balances**
   - System calculates who owes whom
   - Shows net balances (simplified)
   - Displays by friend or by group

3. **Settle Up**
   - User selects person to settle with
   - System shows amount owed
   - User enters payment method
   - Creates settlement record
   - Marks expense splits as paid
   - Updates trust score

### 2. Trust Score Flow

1. **Score Calculation**
   - Triggered on expense payment, chore completion, listing activity
   - Calculates expense score (40%), chore score (30%), community score (30%)
   - Updates TrustScore record
   - Adds history entry

2. **Score Display**
   - Shown on profile (0-100 scale)
   - Breakdown available in insights screen
   - Comparison with friends
   - Improvement suggestions

3. **Score Impact**
   - Visible to other users (privacy-controlled)
   - Affects user reputation
   - Encourages good behavior

### 3. Group Management Flow

1. **Create Group**
   - User creates group with name/description
   - Optionally adds initial members
   - Creator becomes ADMIN

2. **Invite Members**
   - Admin invites by email or mobile
   - System generates invitation token
   - Sends email/SMS notification
   - Invitee accepts via token

3. **Group Activities**
   - Expenses can be group-scoped
   - Chores can be group-scoped
   - Rides can be group-scoped
   - Group balances calculated

### 4. Chore Management Flow

1. **Create Chore**
   - User creates chore with title, description, points
   - Optionally assigns to user
   - Sets due date
   - Can be group-scoped

2. **Complete Chore**
   - Assigned user marks complete
   - System checks if on-time
   - Awards points
   - Updates streak
   - Updates trust score
   - Creates completion record

3. **Chore Stats**
   - Completion rate
   - Points earned
   - Current streak
   - Achievements unlocked

### 5. Finance Management Flow

1. **Account Management**
   - User creates accounts (checking, savings, etc.)
   - Sets currency and context (local/home)
   - Tracks balance

2. **Transactions**
   - User adds income/expense transactions
   - Auto-categorization
   - Links to accounts, budgets, goals, loans

3. **Budgets**
   - User creates budgets by category/period
   - System tracks spending
   - Warns at threshold (default 80%)

4. **Goals**
   - User creates financial goals
   - Tracks progress
   - Records contributions
   - Links to transactions

5. **Loans**
   - User tracks loans
   - Records payments
   - Tracks principal/interest
   - Calculates remaining balance

### 6. Ridesharing Flow

1. **Create Ride**
   - Driver creates ride (rideshare or giveRide)
   - Sets origin, destination, distance
   - Chooses pricing (per mile or per ride)
   - Adds passengers
   - System calculates cost per person

2. **Auto-Expense Creation**
   - System automatically creates expense
   - Splits cost among participants
   - Links to ride record

### 7. Listing (SpaceV) Flow

1. **Create Listing**
   - User creates listing (item/space/service)
   - Adds title, description, price, images
   - Sets location
   - Auto-categorization

2. **Interactions**
   - Users can favorite listings
   - Users can comment
   - Users can message seller
   - Updates community trust score

### 8. Messaging Flow

1. **Start Conversation**
   - User selects another user
   - System finds or creates direct chat
   - Opens message thread

2. **Send Messages**
   - User sends message
   - System creates message record
   - Updates chat updatedAt
   - Sends push notification
   - Updates read receipts

### 9. Friend Management Flow

1. **Send Friend Request**
   - User searches for friend
   - Sends friend request
   - Creates Friend record (status: pending)

2. **Accept Request**
   - Friend receives notification
   - Accepts request
   - Status changes to accepted
   - Both users can see each other

3. **Invite User**
   - User invites by email/mobile
   - System sends invitation
   - New user registers and accepts

---

## Shared Services

### CurrencyService
- Currency conversion using exchange rates
- Multi-currency support
- Account balance conversion

### EmailService
- SendGrid integration
- Email templates
- Invitation emails
- Notification emails

### CategorizationService
- Auto-categorize expenses
- Auto-categorize listings
- Category matching logic

### NotificationService
- In-app notifications
- Push notifications (Expo)
- Email notifications (SendGrid)
- SMS notifications (Twilio)
- User preference checking

---

## Data Flow Patterns

### Expense Payment → Trust Score Update
1. User marks expense split as paid
2. ExpenseService updates split
3. TrustScoreService.updateExpenseScore() called
4. Score recalculated
5. TrustScore record updated
6. History entry created

### Chore Completion → Trust Score Update
1. User completes chore
2. ChoreService creates ChoreCompletion
3. TrustScoreService.updateChoreScore() called
4. Score recalculated
5. TrustScore record updated
6. History entry created

### Listing Creation → Trust Score Update
1. User creates listing
2. ListingService creates listing
3. TrustScoreService.updateCommunityScore() called
4. Score recalculated
5. TrustScore record updated

### Ride Creation → Expense Creation
1. User creates ride with passengers
2. RideService creates ride
3. System calculates cost per person
4. ExpenseService creates expense automatically
5. Expense splits created for participants
6. Expense linked to ride

---

## Security & Authentication

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes with JwtAuthGuard
- User context via @CurrentUser decorator
- CORS enabled for mobile app
- Input validation with class-validator
- SQL injection protection via Prisma

---

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL database
- Expo CLI (for mobile)

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `SENDGRID_API_KEY`: Email service (optional)
- `TWILIO_ACCOUNT_SID`: SMS service (optional)
- `TWILIO_AUTH_TOKEN`: SMS service (optional)

### Running
- Backend: `npm run dev:backend` (port 3001)
- Mobile: `npm run dev:mobile` (Expo on port 8081)
- Website: `npm run dev:website` (port 3000)

---

## Key Design Patterns

1. **Service Layer Pattern**: Business logic in services, controllers handle HTTP
2. **Repository Pattern**: Prisma as data access layer
3. **DTO Pattern**: Data transfer objects for validation
4. **Guard Pattern**: JWT authentication guards
5. **Provider Pattern**: React Context for state management
6. **Screen Container Pattern**: Root-level screen rendering for smooth navigation

---

## Current Status

**Progress**: 61% (67/110 days completed)
**Phase**: Phase 1 - Complete Core Features (Days 41-70)
**Next Steps**: Personal Finance CRUD Operations (Days 68-69)

---

This overview provides a comprehensive understanding of the Dream Finora codebase, its architecture, features, and how all components work together to create a unified social finance and living platform.

