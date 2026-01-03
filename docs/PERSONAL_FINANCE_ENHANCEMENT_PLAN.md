# Personal Finance Enhancement Plan

## UI/UX Standards

### Icon System
All category selection interfaces must use the custom Icon component:
- Import `Icon` from `../components/Icon`
- Import `normalizeCategoryName` from `../utils/categoryIcons`
- Include icons in all category chips/buttons
- See `docs/IMPROVEMENTS_PLAN.md` for full implementation details: Local & Home Country Finance

## Overview

This document outlines a comprehensive plan to enhance the Personal Finance feature with separate **Local Finance** and **Home Country Finance** sections, each with their own budgets, goals, analytics, insights, and predictions.

**This plan incorporates features from market-leading personal finance apps including:**
- Mint (Expense tracking, credit monitoring, subscription tracking)
- YNAB (Zero-based budgeting, envelope method)
- Personal Capital (Investment tracking, net worth)
- PocketGuard (Safe-to-spend, spending limits)
- Goodbudget (Envelope budgeting)
- And other industry leaders

## Market Research Insights

Based on analysis of leading personal finance apps, the following features are considered essential:

### Core Features (All Leading Apps)
1. **Automatic Transaction Categorization** - AI-powered categorization
2. **Multi-Account Aggregation** - Link multiple accounts from different institutions
3. **Real-Time Transaction Tracking** - Instant updates from linked accounts
4. **Bill Reminders & Payment Tracking** - Never miss a payment
5. **Subscription Tracking** - Monitor recurring subscriptions
6. **Credit Score Monitoring** - Track credit health
7. **Spending Trends & Patterns** - Identify spending habits
8. **Customizable Categories** - User-defined categories
9. **Recurring Transactions** - Auto-create recurring income/expenses
10. **Safe-to-Spend Calculation** - Know how much you can safely spend

## Current State

**What exists:**
- Basic account creation (with currency selection)
- Basic transaction creation
- Total balance display
- Account list view
- Basic finance analytics (mentioned in roadmap but not detailed)

**What's missing:**
- Separation between local and home country finances
- Budget management
- Financial goals
- Comprehensive analytics for both sections
- Insights and predictions
- Currency conversion between local and home country

## Vision

Users should be able to:
1. **Manage two separate finance ecosystems:**
   - **Local Finance**: Where they currently live (e.g., USD if in USA)
   - **Home Country Finance**: Their home country (e.g., INR if from India)

2. **Each section should have:**
   - Separate accounts
   - Separate budgets
   - Separate goals
   - Separate analytics
   - Currency conversion between the two

3. **Unified view:**
   - Combined total balance (converted to primary currency)
   - Cross-section analytics
   - Unified insights and predictions

---

## Database Schema Changes

### 1. Add Finance Context to Accounts

```prisma
model FinanceAccount {
  id            String   @id @default(uuid())
  userId        String
  name          String
  currency      String   @default("USD")
  balance       Float    @default(0)
  context       String   @default("local") // "local" or "home"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @default(now()) @updatedAt

  user         User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions FinanceTransaction[]
  budgets      Budget[]
  goals        FinancialGoal[]
}
```

### 2. Create Budget Model

```prisma
model Budget {
  id            String   @id @default(uuid())
  userId        String
  accountId     String?  // Optional: budget for specific account, or null for overall budget
  context       String   // "local" or "home"
  name          String   // e.g., "Monthly Groceries", "Entertainment"
  category      String?  // Optional category filter
  amount        Float    // Budget amount
  period        String   @default("monthly") // "weekly", "monthly", "yearly"
  startDate     DateTime
  endDate       DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user    User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  account FinanceAccount? @relation(fields: [accountId], references: [id], onDelete: SetNull)
  
  @@index([userId, context])
  @@index([userId, context, period])
}
```

### 3. Create Financial Goal Model

```prisma
model FinancialGoal {
  id            String   @id @default(uuid())
  userId        String
  context       String   // "local" or "home"
  name          String   // e.g., "Emergency Fund", "Vacation"
  targetAmount  Float
  currentAmount Float    @default(0)
  targetDate    DateTime?
  category      String?  // "savings", "debt", "purchase", "investment"
  priority      String   @default("medium") // "low", "medium", "high"
  status        String   @default("active") // "active", "completed", "paused", "cancelled"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, context])
  @@index([userId, status])
}
```

### 4. Create Budget Tracking Model

```prisma
model BudgetTracking {
  id            String   @id @default(uuid())
  budgetId      String
  period        String   // "2024-01" for monthly, "2024-W01" for weekly
  spent         Float    @default(0)
  budgeted      Float
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  budget Budget @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  
  @@unique([budgetId, period])
  @@index([budgetId, period])
}
```

### 5. Add User Settings for Finance Contexts

```prisma
model UserSettings {
  // ... existing fields ...
  primaryCurrency     String   @default("USD")
  homeCountryCurrency String   @default("USD") // NEW
  localCurrency       String?  // NEW: Auto-detected or manually set
  // ... rest of settings ...
}
```

---

## Backend Implementation Plan

### Phase 1: Database & Basic Structure (Days 1-3)

#### Day 1: Schema & Migrations

#### Day 1: Schema & Migrations
- [ ] Add `context` field to `FinanceAccount`
- [ ] Create `Budget` model
- [ ] Create `FinancialGoal` model
- [ ] Create `BudgetTracking` model
- [ ] Add `homeCountryCurrency` and `localCurrency` to `UserSettings`
- [ ] Run Prisma migrations
- [ ] Update existing accounts (default to "local" context)

#### Day 2: Enhanced Transaction Features
- [ ] **Transaction Categorization:**
  - Auto-categorize transactions using AI/ML (enhance existing categorization)
  - Custom categories per context
  - Category rules (e.g., "Starbucks" → "Dining Out")
  - Category icons and colors
  - Subcategories support

- [ ] **Recurring Transactions:**
  - `POST /finance/recurring-transactions` - Create recurring transaction
  - `GET /finance/recurring-transactions` - List recurring transactions
  - `PUT /finance/recurring-transactions/:id` - Update recurring transaction
  - `DELETE /finance/recurring-transactions/:id` - Delete recurring transaction
  - Auto-create transactions based on recurring schedule
  - Handle missed recurring transactions

- [ ] **Transaction Enhancements:**
  - Add tags/labels to transactions
  - Add notes/attachments to transactions
  - Split transactions (one transaction, multiple categories)
  - Duplicate transaction detection
  - Transaction search and filters

#### Day 3: Bills & Subscriptions
- [ ] **Bill Management Endpoints:**
  - `POST /finance/bills` - Create bill/subscription
  - `GET /finance/bills` - List bills (filter by context, paid/unpaid)
  - `GET /finance/bills/:id` - Get bill details
  - `PUT /finance/bills/:id` - Update bill
  - `DELETE /finance/bills/:id` - Delete bill
  - `POST /finance/bills/:id/mark-paid` - Mark bill as paid
  - `GET /finance/bills/upcoming` - Get upcoming bills

- [ ] **Bill Reminders:**
  - Calculate reminder dates based on `reminderDays`
  - Send notifications for upcoming bills
  - Track payment history
  - Auto-pay support (future: integration with payment providers)

#### Day 4: Basic CRUD Endpoints
- [ ] **Budget Endpoints:**
  - `POST /finance/budgets` - Create budget
  - `GET /finance/budgets` - List budgets (filter by context)
  - `GET /finance/budgets/:id` - Get budget details
  - `PUT /finance/budgets/:id` - Update budget
  - `DELETE /finance/budgets/:id` - Delete budget
  - `GET /finance/budgets/:id/tracking` - Get budget tracking data

- [ ] **Goal Endpoints:**
  - `POST /finance/goals` - Create goal
  - `GET /finance/goals` - List goals (filter by context)
  - `GET /finance/goals/:id` - Get goal details
  - `PUT /finance/goals/:id` - Update goal
  - `DELETE /finance/goals/:id` - Delete goal
  - `POST /finance/goals/:id/contribute` - Add contribution to goal

- [ ] **Account Context Updates:**
  - Update `POST /finance/accounts` to accept `context` field
  - Update `GET /finance/accounts` to filter by context
  - Update account balance calculations to consider context

### Phase 2: Budget Tracking & Calculations (Days 3-4)

#### Day 3: Budget Tracking Service
- [ ] Create `BudgetTrackingService`:
  - Calculate spent amount for each budget period
  - Auto-create tracking records for each period
  - Update tracking when transactions are created/updated/deleted
  - Handle period transitions (monthly, weekly, yearly)

- [ ] Integrate with transaction service:
  - Update budget tracking when transaction created
  - Update budget tracking when transaction updated
  - Update budget tracking when transaction deleted
  - Handle category matching for category-based budgets

#### Day 4: Budget Analytics
- [ ] Create budget analytics endpoints:
  - `GET /finance/budgets/analytics` - Overall budget performance
  - `GET /finance/budgets/:id/analytics` - Specific budget analytics
  - Calculate:
    - Total spent vs budgeted
    - Remaining budget
    - Percentage used
    - Trends over time
    - Category breakdown

### Phase 3: Goals & Progress Tracking (Days 5-6)

#### Day 5: Goal Progress Service
- [ ] Create `GoalProgressService`:
  - Calculate progress percentage
  - Estimate completion date based on current pace
  - Track contributions over time
  - Handle goal status updates (active, completed, paused)

- [ ] Goal contribution logic:
  - Link contributions to transactions (optional)
  - Manual contributions
  - Automatic contributions from income (future feature)

#### Day 6: Goal Analytics
- [ ] Create goal analytics endpoints:
  - `GET /finance/goals/analytics` - Overall goals progress
  - `GET /finance/goals/:id/analytics` - Specific goal analytics
  - Calculate:
    - Total progress across all goals
    - Time to completion estimates
    - Contribution trends
    - Priority-based insights

### Phase 4: Finance Analytics & Insights (Days 7-9)

#### Day 9: Context-Based Analytics
- [ ] Update finance analytics to support context:
  - `GET /finance/analytics/local` - Local finance analytics
  - `GET /finance/analytics/home` - Home country finance analytics
  - `GET /finance/analytics/combined` - Combined analytics (converted to primary currency)

- [ ] Analytics include:
  - Income vs expenses
  - Category breakdown
  - Trends over time (daily, weekly, monthly, yearly)
  - Account balances
  - Budget performance summary
  - Goals progress summary

#### Day 10: Insights & Predictions
- [ ] Create insights service:
  - Spending patterns detection
  - Anomaly detection (unusual spending)
  - Budget alerts (approaching limit, exceeded)
  - Goal progress insights
  - Savings rate calculation
  - Financial health score

- [ ] Create predictions service:
  - Projected spending based on trends
  - Projected savings based on current pace
  - Goal completion date predictions
  - Budget burn rate predictions
  - Cash flow projections

#### Day 11: Currency Conversion & Unified View
- [ ] Enhance currency conversion:
  - Convert local finance totals to home country currency
  - Convert home country finance totals to local currency
  - Show both original and converted amounts
  - Use real-time exchange rates (from existing CurrencyService)

- [ ] Unified analytics:
  - Combined total balance (converted to primary currency)
  - Cross-context spending patterns
  - Currency conversion impact on goals
  - Multi-currency budget tracking

#### Day 12: Advanced Analytics Features
- [ ] **Spending Trends:**
  - Month-over-month comparison
  - Year-over-year comparison
  - Category trends
  - Spending velocity (spending rate)

- [ ] **Income Analysis:**
  - Income sources breakdown
  - Income trends
  - Irregular income handling
  - Income vs expenses ratio

- [ ] **Net Worth Calculation:**
  - Total assets (all accounts)
  - Total liabilities (debts, if tracked)
  - Net worth over time
  - Net worth by context

- [ ] **Financial Health Score:**
  - Calculate health score based on:
    - Savings rate
    - Budget adherence
    - Goal progress
    - Bill payment history
    - Spending patterns
  - Provide recommendations for improvement

### Phase 6: Notifications & Alerts (Day 13)

#### Day 13: Comprehensive Notifications
- [ ] Budget alerts:
  - Approaching budget limit (80%, 90%, 100%)
  - Budget exceeded
  - Budget reset (new period started)

- [ ] Goal alerts:
  - Goal milestone reached (25%, 50%, 75%)
  - Goal completed
  - Goal deadline approaching
  - Goal behind schedule

- [ ] Integrate with existing notification system

---

## Mobile Implementation Plan

### Phase 1: UI Structure & Navigation (Days 1-2)

#### Day 1: Finance Screen Restructure
- [ ] Update `FinanceScreen` to show:
  - Tabs or segmented control: "Local Finance" | "Home Country Finance" | "Combined"
  - Context switcher at top
  - Total balance card (context-specific or combined)
  - Quick stats (accounts count, budgets, goals)

- [ ] Create `FinanceContextTabs` component:
  - Three tabs: Local, Home, Combined
  - Active tab highlighting
  - Tab-specific content

#### Day 2: Account Management by Context
- [ ] Update account list to filter by context
- [ ] Update `CreateAccountScreen` to include context selection
- [ ] Update account cards to show context badge
- [ ] Add context filter to account list
- [ ] Show safe-to-spend amount per account (if calculated)

#### Day 3: Enhanced Transaction Features UI
- [ ] **Transaction Categorization:**
  - Auto-categorization with manual override
  - Category picker with icons and colors
  - Custom category creation
  - Category rules management
  - Subcategory support

- [ ] **Recurring Transactions:**
  - Create `RecurringTransactionsScreen`
  - List of recurring transactions
  - Create/edit recurring transaction
  - Frequency selector (daily, weekly, monthly, etc.)
  - Next due date display
  - Enable/disable recurring transactions

- [ ] **Transaction Enhancements:**
  - Add tags to transactions
  - Add notes/attachments
  - Split transaction feature
  - Duplicate transaction detection
  - Transaction search and advanced filters
- [ ] Update account list to filter by context
- [ ] Update `CreateAccountScreen` to include context selection
- [ ] Update account cards to show context badge
- [ ] Add context filter to account list

### Phase 2: Budget Management UI (Days 3-5)

#### Day 6: Budget List & Creation
- [ ] Create `BudgetListScreen`:
  - List of budgets for current context
  - Budget cards showing:
    - Name, amount, period
    - Spent vs budgeted (progress bar)
    - Remaining amount
    - Status (on track, warning, exceeded)
  - "Create Budget" button
  - Filter by period (weekly, monthly, yearly)

- [ ] Create `CreateBudgetScreen`:
  - Form fields:
    - Name
    - Amount
    - Period (weekly, monthly, yearly)
    - Start date
    - End date (optional)
    - Category (optional, for category-based budgets)
    - Account (optional, for account-specific budgets)
  - Context automatically set based on current tab
  - Validation and save

#### Day 7: Budget Detail & Tracking
- [ ] Create `BudgetDetailScreen`:
  - Budget information
  - Current period tracking:
    - Spent amount
    - Budgeted amount
    - Remaining amount
    - Progress bar
    - Percentage used
  - Historical tracking (chart/graph)
  - Recent transactions contributing to budget
  - Edit/Delete buttons

- [ ] Create `BudgetTrackingChart` component:
  - Line or bar chart showing spending over time
  - Budget limit line
  - Period markers

#### Day 8: Budget Analytics View
- [ ] Create `BudgetAnalyticsScreen`:
  - Overall budget performance
  - Category breakdown (if category-based budgets)
  - Trends over time
  - Budget success rate
  - Top spending categories
  - Budget recommendations

### Phase 4: Goals Management UI (Days 9-11)

#### Day 9: Goals List & Creation
- [ ] Create `GoalsListScreen`:
  - List of goals for current context
  - Goal cards showing:
    - Name, target amount
    - Current progress (progress bar)
    - Percentage complete
    - Target date countdown
    - Status badge
  - "Create Goal" button
  - Filter by status (active, completed, paused)

- [ ] Create `CreateGoalScreen`:
  - Form fields:
    - Name
    - Target amount
    - Current amount (default 0)
    - Target date (optional)
    - Category (savings, debt, purchase, investment)
    - Priority (low, medium, high)
  - Context automatically set
  - Validation and save

#### Day 10: Goal Detail & Contributions
- [ ] Create `GoalDetailScreen`:
  - Goal information
  - Progress visualization:
    - Progress bar
    - Percentage complete
    - Amount remaining
    - Days remaining (if target date set)
  - Contribution history (list)
  - "Add Contribution" button
  - Edit/Delete buttons
  - Mark as completed/paused

- [ ] Create `AddContributionScreen`:
  - Amount input
  - Date picker
  - Link to transaction (optional)
  - Notes (optional)
  - Save contribution

#### Day 11: Goals Analytics View
- [ ] Create `GoalsAnalyticsScreen`:
  - Overall goals progress
  - Goals by category
  - Completion timeline
  - Contribution trends
  - Priority insights
  - Goal recommendations

### Phase 5: Safe-to-Spend & Spending Limits UI (Days 12-13)

#### Day 12: Safe-to-Spend Display
- [ ] Create `SafeToSpendCard` component:
  - Large, prominent display of safe-to-spend amount
  - Breakdown button (shows calculation)
  - Context-specific (local vs home)
  - Color-coded (green if healthy, amber if low, red if negative)

- [ ] Create `SafeToSpendBreakdownScreen`:
  - Income breakdown
  - Committed expenses (bills, subscriptions)
  - Savings goals contributions
  - Budgeted amounts
  - Final safe-to-spend calculation

#### Day 13: Spending Limits UI
- [ ] Create `SpendingLimitsScreen`:
  - Set daily/weekly/monthly limits
  - Category-specific limits
  - Context-specific limits
  - Current spending vs limit (progress bars)
  - Alerts configuration

- [ ] Add spending limit indicators:
  - Progress bars in transaction list
  - Warnings when approaching limit
  - Visual indicators in main finance screen

### Phase 6: Enhanced Analytics & Insights UI (Days 14-16)

#### Day 14: Context-Specific Analytics
- [ ] Update `FinanceAnalyticsScreen` to support context:
  - Tabs for Local, Home, Combined
  - Context-specific charts and metrics
  - Currency conversion display

- [ ] Create analytics components:
  - Income vs Expenses chart
  - Category breakdown (pie/bar chart)
  - Spending trends (line chart)
  - Account balances chart
  - Budget performance summary
  - Goals progress summary

#### Day 15: Insights & Predictions Screen
- [ ] Create `FinanceInsightsScreen`:
  - Spending patterns
  - Anomaly alerts
  - Budget alerts
  - Goal insights
  - Savings rate
  - Financial health score

- [ ] Create `FinancePredictionsScreen`:
  - Projected spending
  - Projected savings
  - Goal completion predictions
  - Budget burn rate
  - Cash flow projections

#### Day 16: Advanced Analytics Features
- [ ] **Spending Trends View:**
  - Month-over-month comparison chart
  - Year-over-year comparison
  - Category trends over time
  - Spending velocity indicator

- [ ] **Income Analysis View:**
  - Income sources breakdown (pie chart)
  - Income trends (line chart)
  - Income vs expenses ratio
  - Irregular income handling

- [ ] **Net Worth View:**
  - Net worth over time (line chart)
  - Assets breakdown
  - Liabilities (if tracked)
  - Net worth by context
  - Combined net worth (converted)

- [ ] **Financial Health Dashboard:**
  - Health score display (0-100)
  - Score breakdown (savings rate, budget adherence, etc.)
  - Recommendations for improvement
  - Historical health score trend

### Phase 7: Unified Combined View (Day 17)
- [ ] Create `CombinedFinanceView`:
  - Combined total balance (converted to primary currency)
  - Breakdown by context (local vs home)
  - Currency conversion rates displayed
  - Combined analytics
  - Cross-context insights

#### Day 17: Unified Combined View

### Phase 8: Settings & Currency Management (Day 18)

#### Day 18: Finance Settings
- [ ] Update `SettingsScreen` finance section:
  - Home country currency selector
  - Local currency selector (or auto-detect)
  - Currency conversion preferences
  - Budget default period
  - Goal default settings

---

## Feature Specifications

### 1. Budget Management

**Features:**
- Create budgets for specific periods (weekly, monthly, yearly)
- Category-based budgets (e.g., "Groceries", "Entertainment")
- Account-specific budgets (e.g., "Checking Account Budget")
- Overall budgets (all accounts combined)
- Budget tracking with automatic spending calculation
- Budget alerts (approaching limit, exceeded)
- Budget analytics and insights

**User Flow:**
1. Navigate to Finance → Local Finance (or Home Country Finance)
2. Tap "Budgets" tab
3. View list of budgets
4. Tap "Create Budget"
5. Fill form and save
6. View budget detail to see tracking
7. Receive alerts when approaching/exceeding budget

### 2. Financial Goals

**Features:**
- Create savings goals (e.g., "Emergency Fund $10,000")
- Create debt payoff goals (e.g., "Pay off credit card")
- Create purchase goals (e.g., "New laptop $2,000")
- Track progress with contributions
- Set target dates
- Priority levels (low, medium, high)
- Goal status (active, completed, paused, cancelled)
- Goal analytics and predictions

**User Flow:**
1. Navigate to Finance → Local Finance (or Home Country Finance)
2. Tap "Goals" tab
3. View list of goals
4. Tap "Create Goal"
5. Fill form and save
6. Add contributions over time
7. View progress and predictions
8. Mark as completed when reached

### 3. Context Separation

**Local Finance:**
- Accounts in local currency (where user currently lives)
- Budgets for local expenses
- Goals for local savings/purchases
- Analytics for local spending patterns

**Home Country Finance:**
- Accounts in home country currency
- Budgets for home country expenses
- Goals for home country savings/purchases
- Analytics for home country spending patterns

**Combined View:**
- Total balance converted to primary currency
- Combined analytics
- Cross-context insights
- Currency conversion rates

### 7. Advanced Analytics & Insights

**Analytics:**
- Income vs expenses (by context)
- Category breakdown
- Spending trends (daily, weekly, monthly, yearly)
- Account balances over time
- Budget performance
- Goals progress

**Insights:**
- Spending patterns
- Anomaly detection
- Budget alerts
- Goal insights
- Savings rate
- Financial health score

**Predictions:**
- Projected spending
- Projected savings
- Goal completion dates
- Budget burn rate
- Cash flow projections

---

## UI/UX Design Guidelines

### Navigation Structure

```
Finance Screen
├── Tabs: [Local Finance | Home Country Finance | Combined]
│
├── Local Finance Tab
│   ├── Total Balance (Local Currency)
│   ├── Quick Stats
│   ├── Accounts (Local)
│   ├── Budgets (Local)
│   ├── Goals (Local)
│   └── Analytics (Local)
│
├── Home Country Finance Tab
│   ├── Total Balance (Home Currency)
│   ├── Quick Stats
│   ├── Accounts (Home)
│   ├── Budgets (Home)
│   ├── Goals (Home)
│   └── Analytics (Home)
│
└── Combined Tab
    ├── Total Balance (Primary Currency)
    ├── Breakdown by Context
    ├── Combined Analytics
    └── Cross-Context Insights
```

### Color Coding

- **Local Finance**: Primary Blue (#2563EB)
- **Home Country Finance**: Purple (#8B5CF6)
- **Combined**: Gray (#6B7280)
- **Budget Status**:
  - On Track: Green (#10B981)
  - Warning (80-99%): Amber (#F59E0B)
  - Exceeded: Red (#EF4444)
- **Goal Progress**: Green gradient based on percentage

### Icons (MaterialIcons)

- Local Finance: `location-on`
- Home Country Finance: `home`
- Combined: `account-balance-wallet`
- Budget: `account-balance`
- Goal: `flag`
- Analytics: `insights`
- Insights: `lightbulb`
- Predictions: `trending-up`

---

## Implementation Timeline

**Total Estimated Time: 12-15 days**

### Backend: 10 days
- Days 1-2: Database & Basic CRUD
- Days 3-4: Budget Tracking
- Days 5-6: Goals & Progress
- Days 7-9: Analytics & Insights
- Day 10: Notifications

### Mobile: 12 days
- Days 1-2: UI Structure
- Days 3-5: Budget Management
- Days 6-8: Goals Management
- Days 9-11: Analytics & Insights
- Day 12: Settings

---

## Success Criteria

- [ ] Users can create and manage budgets for both local and home country finances
- [ ] Users can create and track goals for both contexts
- [ ] Budget tracking automatically updates based on transactions
- [ ] Analytics and insights work for both contexts separately and combined
- [ ] Currency conversion works correctly between contexts
- [ ] Notifications and alerts work for budgets and goals
- [ ] UI clearly distinguishes between local and home country finances
- [ ] Combined view provides unified insights

---

## Future Enhancements (Post-MVP)

1. **Automatic Budget Creation**: AI suggests budgets based on spending patterns
2. **Recurring Budgets**: Auto-create budgets for each period
3. **Goal Templates**: Pre-defined goal templates (emergency fund, vacation, etc.)
4. **Budget vs Actual Reports**: Detailed reports comparing budgeted vs actual
5. **Goal Contribution Automation**: Automatic contributions from income
6. **Multi-Currency Budgets**: Budgets that span multiple currencies
7. **Budget Sharing**: Share budgets with family members (future feature)
8. **Advanced Predictions**: ML-based spending predictions
9. **Financial Planning**: Long-term financial planning tools
10. **Investment Tracking**: Track investments in both contexts

---

## Notes

- This enhancement significantly expands the Personal Finance feature
- It should be implemented after basic CRUD operations are complete (Day 68-69)
- Consider this as a major feature addition, not just a polish
- Currency conversion should use the existing `CurrencyService`
- All analytics should respect user privacy settings
- Budget and goal data should be exportable (CSV/JSON)

---

*This plan provides a comprehensive roadmap for implementing local and home country finance management with budgets, goals, and analytics. Adjust timeline based on team velocity and priorities.*

