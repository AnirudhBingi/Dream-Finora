# Personal Finance Feature Roadmap: Local & Home Country Finance

## Overview

This roadmap focuses on **core personal finance features** that work with **manual data entry** (no bank/credit card linking). All features support separate **Local Finance** and **Home Country Finance** contexts with currency conversion.

**⚠️ IMPORTANT: This roadmap ENHANCES existing finance implementation, not replaces it.**

See `PERSONAL_FINANCE_INTEGRATION_PLAN.md` for details on how to integrate with existing code and Billchop expenses.

## Billchop Integration

**Key Requirements:**
1. **Expense Splits → Finance Transactions**: When user is involved in a Billchop expense, their split amount is automatically added as an expense in local finance
2. **Billchop Balance → Available Balance**: If user is owed money in Billchop (positive balance), it's included in total available balance
3. **Transaction Linking**: Finance transactions from Billchop are linked to expense splits for traceability
4. **Category Sync**: Billchop expense category is used for finance transaction category

## Core Features

1. **Budget Management** - Create budgets, track spending, get warnings
2. **Financial Goals** - Set goals, track progress, sync with transactions
3. **Loan Management** - Track loans, calculate EMI, monitor payments
4. **Analytics & Insights** - Data-driven insights, predictions, AI advisor
5. **Context Separation** - Local vs Home Country finances

---

## Database Schema

### 1. Finance Account (Enhanced)

```prisma
model FinanceAccount {
  id            String   @id @default(uuid())
  userId        String
  name          String
  currency      String   @default("USD")
  balance       Float    @default(0)
  context       String   @default("local") // "local" or "home"
  accountType   String   @default("checking") // "checking", "savings", "cash", "investment", "other"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @default(now()) @updatedAt

  user         User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions FinanceTransaction[]
  budgets      Budget[]
  goals        FinancialGoal[]
  loans        Loan[]
  
  @@index([userId, context])
}
```

### 2. Budget Model

```prisma
model Budget {
  id            String   @id @default(uuid())
  userId        String
  context       String   // "local" or "home"
  name          String   // e.g., "Monthly Groceries", "Entertainment"
  category      String?  // Optional: specific category (e.g., "Food & Dining")
  amount        Float    // Budget amount
  period        String   @default("monthly") // "weekly", "monthly", "yearly"
  startDate     DateTime
  endDate       DateTime?
  accountId     String?  // Optional: budget for specific account
  warningThreshold Float @default(80) // Percentage to trigger warning (default 80%)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user    User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  account FinanceAccount? @relation(fields: [accountId], references: [id], onDelete: SetNull)
  tracking BudgetTracking[]
  
  @@index([userId, context])
  @@index([userId, context, period])
}
```

### 3. Budget Tracking Model

```prisma
model BudgetTracking {
  id            String   @id @default(uuid())
  budgetId      String
  period        String   // "2024-01" for monthly, "2024-W01" for weekly, "2024" for yearly
  spent         Float    @default(0)
  budgeted      Float
  status        String   @default("on_track") // "on_track", "warning", "exceeded"
  lastWarningAt DateTime? // When last warning was sent
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  budget Budget @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  
  @@unique([budgetId, period])
  @@index([budgetId, period])
}
```

### 4. Financial Goal Model

```prisma
model FinancialGoal {
  id            String   @id @default(uuid())
  userId        String
  context       String   // "local" or "home"
  name          String   // e.g., "Emergency Fund", "Vacation"
  targetAmount  Float
  currentAmount Float    @default(0)
  targetDate    DateTime?
  category      String   @default("savings") // "savings", "debt", "purchase", "investment"
  priority      String   @default("medium") // "low", "medium", "high"
  status        String   @default("active") // "active", "completed", "paused", "cancelled"
  accountId     String?  // Optional: linked account for goal
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  completedAt   DateTime?

  user    User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  account FinanceAccount? @relation(fields: [accountId], references: [id], onDelete: SetNull)
  contributions GoalContribution[]
  
  @@index([userId, context])
  @@index([userId, status])
}
```

### 5. Goal Contribution Model

```prisma
model GoalContribution {
  id            String   @id @default(uuid())
  goalId        String
  amount        Float
  transactionId String?  // Optional: link to transaction
  date          DateTime @default(now())
  notes         String?
  createdAt     DateTime @default(now())

  goal        FinancialGoal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  transaction FinanceTransaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  
  @@index([goalId, date])
}
```

### 6. Loan Model

```prisma
model Loan {
  id                String   @id @default(uuid())
  userId            String
  context           String   // "local" or "home"
  name              String   // e.g., "Home Loan", "Car Loan"
  lender            String   // Bank or lender name
  principalAmount   Float    // Original loan amount
  remainingAmount   Float    // Current remaining balance
  interestRate      Float    // Annual interest rate (e.g., 5.5 for 5.5%)
  emi               Float    // Monthly EMI amount
  loanTerm          Int      // Total months
  remainingMonths   Int      // Remaining months
  startDate         DateTime
  nextPaymentDate   DateTime
  paymentFrequency  String   @default("monthly") // "monthly", "quarterly", "yearly"
  accountId         String?  // Account used for payments
  status            String   @default("active") // "active", "completed", "paused"
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  completedAt       DateTime?

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  account      FinanceAccount? @relation(fields: [accountId], references: [id], onDelete: SetNull)
  payments     LoanPayment[]
  
  @@index([userId, context])
  @@index([userId, status])
}
```

### 7. Loan Payment Model

```prisma
model LoanPayment {
  id            String   @id @default(uuid())
  loanId        String
  amount        Float
  principalPaid Float    // Principal portion of payment
  interestPaid  Float    // Interest portion of payment
  paymentDate   DateTime
  transactionId String?   // Optional: link to transaction
  notes         String?
  createdAt     DateTime @default(now())

  loan        Loan              @relation(fields: [loanId], references: [id], onDelete: Cascade)
  transaction FinanceTransaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  
  @@index([loanId, paymentDate])
}
```

### 8. Finance Transaction (Enhanced)

```prisma
model FinanceTransaction {
  id          String   @id @default(uuid())
  accountId   String
  type        String   // "income" or "expense"
  amount      Float
  category    String
  description String?
  date        DateTime @default(now())
  // Optional links
  expenseSplitId String? @unique // NEW: Link to Billchop expense split
  budgetId    String?  // Optional: linked budget
  goalId      String?  // Optional: linked goal contribution
  loanId      String?  // Optional: linked loan payment
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  account      FinanceAccount    @relation(fields: [accountId], references: [id], onDelete: Cascade)
  expenseSplit ExpenseSplit?     @relation(fields: [expenseSplitId], references: [id], onDelete: SetNull) // NEW
  budget       Budget?           @relation(fields: [budgetId], references: [id], onDelete: SetNull)
  goal         FinancialGoal?    @relation(fields: [goalId], references: [id], onDelete: SetNull)
  loan         Loan?             @relation(fields: [loanId], references: [id], onDelete: SetNull)
  goalContribution GoalContribution?
  loanPayment LoanPayment?
  
  @@index([accountId, date])
  @@index([accountId, category])
  @@index([budgetId])
  @@index([goalId])
  @@index([expenseSplitId]) // NEW
}
```

### 9. ExpenseSplit Enhancement (Add Finance Link)

```prisma
model ExpenseSplit {
  // ... existing fields ...
  financeTransaction FinanceTransaction? @relation // NEW: Optional link to finance transaction
}
```

### 9. User Settings (Finance)

```prisma
model UserSettings {
  // ... existing fields ...
  primaryCurrency     String   @default("USD")
  homeCountryCurrency String   @default("USD")
  localCurrency       String?  // Auto-detected or manually set
  budgetDefaultPeriod String   @default("monthly")
  budgetWarningThreshold Float @default(80) // Default warning threshold
  // ... rest of settings ...
}
```

---

## Backend Implementation Plan

### Phase 0: Integration with Existing Code (Day 0)

**⚠️ CRITICAL: Before starting new features, integrate with existing finance implementation.**

See `PERSONAL_FINANCE_INTEGRATION_PLAN.md` for complete details.

**Quick Summary:**
1. Add `context` field to existing `FinanceAccount` (default "local")
2. Add `accountType` field to existing `FinanceAccount` (default "checking")
3. Add optional links to existing `FinanceTransaction` (expenseSplitId, budgetId, goalId, loanId)
4. Enhance existing `FinanceService` methods to support context (backward compatible)
5. Integrate Billchop expenses → finance transactions
6. Include Billchop balance in total available balance

**Migration is non-breaking:** All new fields are optional with defaults.

### Phase 1: Database & Budget Foundation (Days 1-3)

#### Day 1: Schema & Migrations
- [ ] **Enhance existing `FinanceAccount`** (add `context`, `accountType`)
- [ ] **Enhance existing `FinanceTransaction`** (add `expenseSplitId`, `budgetId`, `goalId`, `loanId`)
- [ ] **Enhance existing `ExpenseSplit`** (add `financeTransaction` relation)
- [ ] Create `Budget` model
- [ ] Create `BudgetTracking` model
- [ ] Create `FinancialGoal` model
- [ ] Create `GoalContribution` model
- [ ] Create `Loan` model
- [ ] Create `LoanPayment` model
- [ ] Update `UserSettings` with finance preferences
- [ ] Run Prisma migrations
- [ ] **Verify:** Existing accounts/transactions still work (backward compatibility)

#### Day 2: Billchop Integration (Expense → Finance Sync)
- [ ] Create `syncExpenseSplitToFinance()` method in `ExpenseService`:
  - For each expense split where user is involved:
    - If user owes money (split.amount > 0):
      - Create/update finance transaction (type: "expense")
      - Amount = user's split amount only
      - Category = expense.category
      - Description = expense.description
      - Link via `expenseSplitId`
      - Account = user's default local finance account
      - Context = "local" (Billchop expenses are always local)
  - If user paid for expense (paidBy === userId):
    - This is handled in balance calculation (owed to user = available balance)

- [ ] Integrate into `ExpenseService.createExpense()`:
  - After expense created, sync all splits to finance
- [ ] Integrate into `ExpenseService.updateExpense()`:
  - After expense updated, re-sync all splits
- [ ] Integrate into `ExpenseService.deleteExpense()`:
  - Delete linked finance transactions
- [ ] Integrate into `ExpenseService.markSplitAsPaid()`:
  - Update or create finance transaction

#### Day 3: Budget CRUD Endpoints
- [ ] `POST /finance/budgets` - Create budget
  - Validate context, amount, period
  - Set warning threshold
- [ ] `GET /finance/budgets` - List budgets (filter by context, period)
- [ ] `GET /finance/budgets/:id` - Get budget details with tracking
- [ ] `PUT /finance/budgets/:id` - Update budget
- [ ] `DELETE /finance/budgets/:id` - Delete budget
- [ ] `GET /finance/budgets/:id/tracking` - Get tracking data

#### Day 4: Budget Tracking Service
- [ ] Create `BudgetTrackingService`:
  - Calculate spent amount for current period
  - Auto-create tracking records for each period
  - Update tracking when transactions are created/updated/deleted
  - Handle category matching for category-based budgets
  - Calculate status (on_track, warning, exceeded)
  - Handle period transitions (monthly, weekly, yearly)

- [ ] Integrate with transaction service:
  - When transaction created with `budgetId`, update budget tracking
  - When transaction updated, recalculate budget tracking
  - When transaction deleted, update budget tracking
  - Match transactions to budgets by category if no direct link

- [ ] Budget warning logic:
  - Check if spent >= warningThreshold% of budget
  - Update status to "warning" or "exceeded"
  - Track last warning sent to avoid spam

### Phase 2: Enhanced Balance Calculation (Day 4)

#### Day 4: Include Billchop Balance in Total Available
- [ ] Enhance `FinanceService.getBalance()`:
  - Get finance account balances (existing logic)
  - Get Billchop balance from `ExpenseService.getBalances()`
  - Calculate: `totalAvailableBalance = financeBalance + billchopOwedToUser`
  - Return breakdown: finance balance, Billchop balance, total available
  - Support context filtering (local vs home)
  - Billchop balance only applies to local context

- [ ] Update `FinanceService.getAccounts()`:
  - Add optional `context` parameter
  - Filter accounts by context if provided
  - Default behavior unchanged (backward compatible)

- [ ] Update `FinanceService.getTransactions()`:
  - Add optional `context` parameter
  - Add optional `includeBillchop` parameter
  - Include `expenseSplit` relation if `includeBillchop` is true
  - Filter by account context if provided

### Phase 3: Goals & Contributions (Days 5-6)

#### Day 5: Goal CRUD Endpoints
- [ ] `POST /finance/goals` - Create goal
- [ ] `GET /finance/goals` - List goals (filter by context, status)
- [ ] `GET /finance/goals/:id` - Get goal details with contributions
- [ ] `PUT /finance/goals/:id` - Update goal
- [ ] `DELETE /finance/goals/:id` - Delete goal
- [ ] `POST /finance/goals/:id/contribute` - Add contribution
- [ ] `POST /finance/goals/:id/complete` - Mark goal as completed

#### Day 6: Goal Tracking & Sync
- [ ] Create `GoalTrackingService`:
  - Calculate progress percentage
  - Estimate completion date based on current pace
  - Track contributions over time
  - Handle goal status updates (active, completed, paused)
  - Sync goal with account balance if linked

- [ ] Goal contribution logic:
  - Manual contributions (via endpoint)
  - Link contributions to transactions (when transaction created with `goalId`)
  - Update goal `currentAmount` when contribution added
  - Update account balance if goal linked to account
  - Check if goal completed (currentAmount >= targetAmount)

- [ ] Goal completion handling:
  - Mark goal as "completed" when target reached
  - Set `completedAt` timestamp
  - Trigger success notification

### Phase 4: Loan Management (Days 7-8)

#### Day 7: Loan CRUD & EMI Calculation
- [ ] `POST /finance/loans` - Create loan
  - Calculate EMI using formula: `EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)`
    - P = Principal amount
    - r = Monthly interest rate (annual rate / 12 / 100)
    - n = Number of months
  - Calculate remaining months
  - Set next payment date
- [ ] `GET /finance/loans` - List loans (filter by context, status)
- [ ] `GET /finance/loans/:id` - Get loan details with payment history
- [ ] `PUT /finance/loans/:id` - Update loan
- [ ] `DELETE /finance/loans/:id` - Delete loan
- [ ] `GET /finance/loans/:id/emi-breakdown` - Get EMI breakdown (principal vs interest)

#### Day 8: Loan Payment Tracking
- [ ] `POST /finance/loans/:id/payment` - Record loan payment
  - Calculate principal and interest portions
  - Update `remainingAmount`
  - Update `remainingMonths`
  - Update `nextPaymentDate`
  - Link to transaction if provided
- [ ] Create `LoanTrackingService`:
  - Track payment history
  - Calculate total paid vs remaining
  - Calculate interest paid vs principal paid
  - Handle loan completion (remainingAmount <= 0)
  - Update loan status

- [ ] Loan payment sync:
  - When transaction created with `loanId`, create loan payment
  - Update loan remaining amount and months
  - Update account balance (deduct payment amount)

### Phase 5: Analytics & Insights (Days 9-11)

#### Day 9: Context-Based Analytics
- [ ] `GET /finance/analytics/local` - Local finance analytics
- [ ] `GET /finance/analytics/home` - Home country finance analytics
- [ ] `GET /finance/analytics/combined` - Combined analytics (converted to primary currency)

- [ ] Analytics calculations:
  - **Income vs Expenses**: Total income, total expenses, net (by period)
  - **Category Breakdown**: Spending by category (pie/bar chart data)
  - **Trends**: Daily, weekly, monthly, yearly trends
  - **Account Balances**: Balance over time, balance by account
  - **Budget Performance**: Budget adherence rate, budgets exceeded
  - **Goals Progress**: Total goals, completed goals, progress percentage
  - **Loan Summary**: Total loans, total remaining, total paid

#### Day 10: Insights & Predictions
- [ ] Create `FinanceInsightsService`:
  - **Spending Patterns**: Identify recurring expenses, spending habits
  - **Anomaly Detection**: Unusual spending (spike detection)
  - **Budget Insights**: Budgets frequently exceeded, categories to watch
  - **Goal Insights**: Goals on track, goals behind schedule
  - **Savings Rate**: Calculate savings rate (income - expenses) / income
  - **Financial Health Score**: Composite score (0-100) based on:
    - Budget adherence
    - Goal progress
    - Savings rate
    - Debt-to-income ratio (if loans exist)
    - Emergency fund status

- [ ] Create `FinancePredictionsService`:
  - **Projected Spending**: Based on historical trends, predict next month spending
  - **Projected Savings**: Based on current pace, predict savings amount
  - **Goal Completion Date**: Predict when goal will be completed
  - **Budget Burn Rate**: Predict if budget will be exceeded before period end
  - **Cash Flow Projections**: Project future cash flow based on income/expenses

#### Day 11: AI-Powered Financial Advisor
- [ ] Create `FinancialAdvisorService`:
  - Analyze user's financial data (budgets, goals, loans, transactions)
  - Generate personalized recommendations:
    - Budget optimization suggestions
    - Goal prioritization advice
    - Spending reduction opportunities
    - Savings strategies
    - Debt payoff strategies
    - Emergency fund recommendations
  - Context-aware advice (local vs home country)
  - Currency-aware recommendations

- [ ] `GET /finance/advisor/recommendations` - Get AI recommendations
- [ ] `GET /finance/advisor/health-score` - Get financial health score with breakdown

### Phase 6: Notifications & Alerts (Day 12)

#### Day 12: Comprehensive Notifications
- [ ] **Budget Alerts:**
  - Budget approaching limit (warningThreshold reached)
  - Budget exceeded
  - Budget reset (new period started)
  - Budget status changed (on_track → warning → exceeded)

- [ ] **Goal Alerts:**
  - Goal milestone reached (25%, 50%, 75%)
  - Goal completed (success notification)
  - Goal deadline approaching
  - Goal behind schedule (pace too slow)

- [ ] **Loan Alerts:**
  - Loan payment due soon
  - Loan payment overdue
  - Loan completed (paid off)
  - Loan interest vs principal insights

- [ ] **Financial Health Alerts:**
  - Savings rate low
  - Multiple budgets exceeded
  - Goals behind schedule
  - Emergency fund low

- [ ] Integrate with existing notification system

---

## Mobile Implementation Plan

### Phase 1: UI Structure & Navigation (Days 1-2)

#### Day 1: Finance Screen Restructure
- [ ] Update existing `FinanceScreen` to show:
  - Tabs: "Local Finance" | "Home Country Finance" | "Combined"
  - Context switcher at top
  - Total balance card (context-specific or combined)
    - **Show breakdown:** "Finance: $X + Billchop: $Y = Total Available: $Z"
    - **Billchop balance:** Only show if positive (owed to user)
  - Quick stats cards:
    - Total Budgets (active count)
    - Total Goals (active count)
    - Total Loans (active count)
    - Safe to Spend (calculated)
  - Quick actions: Add Transaction, Create Budget, Create Goal, Add Loan

- [ ] Create `FinanceContextTabs` component:
  - Three tabs: Local, Home, Combined
  - Active tab highlighting (Primary Blue)
  - Tab-specific content loading
  - Currency indicators per tab

#### Day 2: Account Management by Context
- [ ] Update existing account list to filter by context
- [ ] Update existing `CreateAccountScreen` to include:
  - Context selector (Local/Home) - defaults to "local"
  - Account type selector
  - Currency picker (auto-set based on context)
- [ ] Update account cards to show:
  - Context badge (Local/Home)
  - Account type icon
  - Balance with currency
- [ ] Add context filter to account list

#### Day 3: Billchop Integration UI
- [ ] Update transaction list to show Billchop transactions:
  - Badge/icon indicating "From Billchop"
  - Link to expense detail if tapped
  - Show expense description and category
  - Indicate it's synced (read-only in finance)
- [ ] Add filter: "Show Billchop Transactions" toggle
- [ ] Update balance display:
  - Show: "Total Available: $X"
  - Breakdown: "Finance Accounts: $Y" + "Billchop Owed: $Z"
  - Only show Billchop if positive (owed to user)
- [ ] Add info tooltip explaining Billchop integration

#### Day 2: Account Management by Context
- [ ] Update account list to filter by context
- [ ] Update `CreateAccountScreen` to include:
  - Context selector (Local/Home)
  - Account type selector
  - Currency picker (auto-set based on context)
- [ ] Update account cards to show:
  - Context badge (Local/Home)
  - Account type icon
  - Balance with currency
- [ ] Add context filter to account list

### Phase 2: Budget Management UI (Days 3-5)

#### Day 4: Budget List & Creation
- [ ] Create `BudgetListScreen`:
  - List of budgets for current context
  - Budget cards showing:
    - Name, amount, period
    - Spent vs budgeted (progress bar with color coding)
    - Remaining amount
    - Status badge (On Track/Warning/Exceeded)
    - Warning indicator if approaching limit
  - "Create Budget" FAB button
  - Filter by period (weekly, monthly, yearly)
  - Empty state with helpful message

- [ ] Create `CreateBudgetScreen`:
  - Form fields:
    - Name (required)
    - Amount (required, number input)
    - Period (segmented control: Weekly/Monthly/Yearly)
    - Start date (date picker)
    - End date (optional, date picker)
    - Category (optional, category picker)
    - Account (optional, account picker)
    - Warning threshold (slider, default 80%)
  - Context automatically set based on current tab
  - Validation (amount > 0, dates valid)
  - Save button

#### Day 5: Budget Detail & Tracking
- [ ] Create `BudgetDetailScreen`:
  - Budget information header
  - Current period tracking card:
    - Spent amount (large, prominent)
    - Budgeted amount
    - Remaining amount (color-coded: green/amber/red)
    - Progress bar (color-coded by status)
    - Percentage used
    - Status badge
  - Historical tracking chart (line/bar chart)
  - Recent transactions contributing to budget (list)
  - Edit/Delete buttons (in header)
  - Warning banner if exceeded or approaching limit

- [ ] Create `BudgetTrackingChart` component:
  - Line or bar chart showing spending over time
  - Budget limit line (horizontal)
  - Period markers
  - Color-coded by status
  - Interactive (tap to see period details)

#### Day 6: Budget Warnings & Alerts UI
- [ ] Create `BudgetWarningsScreen`:
  - List of budgets with warnings
  - Grouped by severity (Exceeded, Warning, On Track)
  - Quick actions (view budget, adjust budget)
  - Dismiss warnings option

- [ ] Add budget warning indicators:
  - Badge on budget cards
  - Notification badge on budget tab
  - Toast notifications when budget status changes

### Phase 3: Goals Management UI (Days 7-9)

#### Day 7: Goals List & Creation
- [ ] Create `GoalsListScreen`:
  - List of goals for current context
  - Goal cards showing:
    - Name, target amount
    - Current progress (circular progress indicator)
    - Percentage complete
    - Amount remaining
    - Target date countdown (if set)
    - Status badge (Active/Completed/Paused)
    - Priority indicator (low/medium/high)
  - "Create Goal" FAB button
  - Filter by status (active, completed, paused)
  - Empty state with helpful message

- [ ] Create `CreateGoalScreen`:
  - Form fields:
    - Name (required)
    - Target amount (required)
    - Current amount (default 0, can be pre-filled)
    - Target date (optional, date picker)
    - Category (picker: Savings/Debt/Purchase/Investment)
    - Priority (segmented: Low/Medium/High)
    - Account (optional, account picker for linked goal)
  - Context automatically set
  - Validation
  - Save button

#### Day 8: Goal Detail & Contributions
- [ ] Create `GoalDetailScreen`:
  - Goal information header
  - Progress visualization:
    - Large circular progress indicator
    - Percentage complete (center)
    - Target amount vs current amount
    - Amount remaining
    - Days remaining (if target date set)
    - Progress trend (up/down arrow)
  - Contribution history (list with dates, amounts)
  - "Add Contribution" button
  - Quick contribution buttons (common amounts)
  - Edit/Delete buttons
  - Mark as completed/paused actions
  - Success celebration animation when completed

- [ ] Create `AddContributionScreen`:
  - Amount input (number pad)
  - Date picker (default today)
  - Link to transaction (optional, transaction picker)
  - Notes (optional, text input)
  - Save button
  - Preview: Shows updated progress after contribution

#### Day 9: Goal Sync & Success Toasts
- [ ] Implement goal sync with transactions:
  - When creating transaction, show "Add to Goal" option
  - Link transaction to goal
  - Update goal progress automatically
  - Show success toast: "Added $X to [Goal Name]"

- [ ] Implement goal sync with account balance:
  - If goal linked to account, show account balance
  - Sync goal currentAmount with account balance (optional toggle)
  - Update goal when account balance changes

- [ ] Success toasts:
  - Goal milestone reached (25%, 50%, 75%)
  - Goal completed (celebratory animation)
  - Contribution added successfully
  - Goal on track / behind schedule notifications

### Phase 4: Loan Management UI (Days 10-11)

#### Day 10: Loan List & Creation
- [ ] Create `LoansListScreen`:
  - List of loans for current context
  - Loan cards showing:
    - Name, lender
    - Remaining amount (large)
    - EMI amount
    - Remaining months
    - Next payment date
    - Status badge (Active/Completed)
    - Progress indicator (paid vs remaining)
  - "Add Loan" FAB button
  - Filter by status
  - Empty state

- [ ] Create `CreateLoanScreen`:
  - Form fields:
    - Name (required)
    - Lender (required)
    - Principal amount (required)
    - Interest rate (required, percentage)
    - Loan term (required, months)
    - Start date (date picker)
    - Payment frequency (segmented: Monthly/Quarterly/Yearly)
    - Account (optional, account picker)
  - Auto-calculate EMI (display in real-time)
  - Auto-calculate remaining months
  - Validation
  - Save button

#### Day 11: Loan Detail & Payment Tracking
- [ ] Create `LoanDetailScreen`:
  - Loan information header
  - EMI breakdown card:
    - EMI amount (large)
    - Principal portion
    - Interest portion
    - Remaining amount
    - Remaining months
    - Next payment date
  - Payment history (list with dates, amounts, principal/interest breakdown)
  - "Record Payment" button
  - Progress chart (paid vs remaining over time)
  - Edit/Delete buttons
  - Completion celebration when paid off

- [ ] Create `RecordLoanPaymentScreen`:
  - Amount input (pre-filled with EMI, editable)
  - Payment date (date picker)
  - Link to transaction (optional)
  - Notes (optional)
  - Auto-calculate principal and interest portions
  - Preview: Shows updated remaining amount and months
  - Save button

### Phase 5: Analytics & Insights UI (Days 12-14)

#### Day 12: Context-Specific Analytics
- [ ] Create `FinanceAnalyticsScreen`:
  - Tabs for Local, Home, Combined
  - Context-specific charts and metrics
  - Currency conversion display (for combined view)

- [ ] Analytics components:
  - **Income vs Expenses Chart**: Bar chart comparing income and expenses
  - **Category Breakdown**: Pie chart or horizontal bar chart
  - **Spending Trends**: Line chart showing spending over time
  - **Account Balances**: Line chart showing balance trends
  - **Budget Performance**: Summary cards (on track, warning, exceeded counts)
  - **Goals Progress**: Summary cards (active, completed, progress %)
  - **Loan Summary**: Cards showing total loans, remaining, paid

#### Day 13: Insights & Predictions Screen
- [ ] Create `FinanceInsightsScreen`:
  - **Spending Patterns**:
    - Recurring expenses identified
    - Top spending categories
    - Spending habits summary
  - **Anomaly Alerts**:
    - Unusual spending detected
    - Spike alerts
  - **Budget Insights**:
    - Budgets frequently exceeded
    - Categories to watch
    - Budget recommendations
  - **Goal Insights**:
    - Goals on track
    - Goals behind schedule
    - Goal recommendations
  - **Savings Rate**: Display with trend
  - **Financial Health Score**: Large display with breakdown

- [ ] Create `FinancePredictionsScreen`:
  - **Projected Spending**: Next month prediction with confidence
  - **Projected Savings**: Based on current pace
  - **Goal Completion Dates**: Timeline view
  - **Budget Burn Rate**: Will budget be exceeded?
  - **Cash Flow Projections**: Future cash flow chart

#### Day 14: AI Financial Advisor UI
- [ ] Create `FinancialAdvisorScreen`:
  - **Health Score Dashboard**:
    - Large health score display (0-100)
    - Color-coded (green/yellow/red)
    - Score breakdown (expandable)
  - **Personalized Recommendations**:
    - Budget optimization suggestions
    - Goal prioritization advice
    - Spending reduction opportunities
    - Savings strategies
    - Debt payoff strategies
    - Emergency fund recommendations
  - **Context-Aware Advice**: Tabs for Local/Home recommendations
  - **Action Buttons**: Quick actions from recommendations

### Phase 6: Notifications & Alerts UI (Day 15)

#### Day 15: Finance Notifications
- [ ] Update `NotificationsScreen` to show finance notifications:
  - Budget warnings and exceeded alerts
  - Goal milestones and completions
  - Loan payment reminders
  - Financial health alerts
  - AI advisor recommendations

- [ ] Notification cards:
  - Icon per notification type
  - Color-coded by severity
  - Action buttons (view budget, add contribution, etc.)
  - Dismiss option

- [ ] In-app notification badges:
  - Budget tab badge (if warnings)
  - Goals tab badge (if milestones)
  - Loans tab badge (if payments due)

---

## UI/UX Design Guidelines

### Navigation Structure

```
Finance Screen
├── Tabs: [Local Finance | Home Country Finance | Combined]
│
├── Local Finance Tab
│   ├── Total Balance Card (Local Currency)
│   ├── Quick Stats (Budgets, Goals, Loans)
│   ├── Safe to Spend
│   ├── Accounts Section
│   ├── Budgets Section (with warnings)
│   ├── Goals Section (with progress)
│   ├── Loans Section (with next payment)
│   └── Analytics Button
│
├── Home Country Finance Tab
│   └── (Same structure as Local)
│
└── Combined Tab
    ├── Total Balance (Primary Currency, converted)
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
- **Loan Status**:
  - Active: Blue (#2563EB)
  - Completed: Green (#10B981)

### Icons (MaterialIcons)

- Local Finance: `location-on`
- Home Country Finance: `home`
- Combined: `account-balance-wallet`
- Budget: `account-balance`
- Goal: `flag` or `savings`
- Loan: `credit-card` or `money`
- Analytics: `insights`
- Insights: `lightbulb`
- Predictions: `trending-up`
- Advisor: `psychology` or `auto-awesome`
- Warning: `warning`
- Success: `check-circle`

### Component Patterns

#### Budget Card
```
┌─────────────────────────────┐
│ Groceries Budget            │
│ $500 / $600 (83%)           │
│ [████████████░░] Warning     │
│ Remaining: $100              │
└─────────────────────────────┘
```

#### Goal Card
```
┌─────────────────────────────┐
│ Emergency Fund              │
│        ┌─────┐              │
│        │ 65% │              │
│        └─────┘              │
│ $6,500 / $10,000            │
│ 3 months remaining          │
└─────────────────────────────┘
```

#### Loan Card
```
┌─────────────────────────────┐
│ Home Loan - Bank ABC        │
│ Remaining: $150,000         │
│ EMI: $1,200/month           │
│ 120 months left             │
│ Next payment: Jan 15        │
└─────────────────────────────┘
```

---

## Implementation Timeline

**Total Estimated Time: 15 days** (includes integration with existing code)

### Backend: 12 days
- Day 0: Integration with Existing Code (see Integration Plan)
- Days 1-3: Database & Budget Foundation
- Day 4: Enhanced Balance Calculation (Billchop integration)
- Days 5-6: Goals & Contributions
- Days 7-8: Loan Management
- Days 9-11: Analytics & Insights
- Day 12: Notifications

### Mobile: 15 days
- Days 1-2: UI Structure & Context Tabs
- Day 3: Billchop Integration UI (show synced transactions)
- Days 4-6: Budget Management
- Days 7-9: Goals Management
- Days 10-11: Loan Management
- Days 12-14: Analytics & Insights
- Day 15: Notifications

---

## Success Criteria

### Integration with Existing Code
- [ ] Existing finance features continue to work (backward compatibility)
- [ ] No breaking changes to existing API endpoints
- [ ] Existing accounts/transactions remain functional
- [ ] Migration is non-breaking (all new fields optional with defaults)

### Billchop Integration
- [ ] Billchop expense splits automatically create finance transactions
- [ ] Only user's split amount is added (not full expense)
- [ ] Billchop transactions are linked and traceable
- [ ] Billchop balance (owed to user) included in total available balance
- [ ] Billchop transactions show in finance with badge/indicator
- [ ] Category and description sync from Billchop expense

### Budget Management
- [ ] Users can create budgets for both local and home country finances
- [ ] Budget tracking automatically updates when transactions are added
- [ ] Budget warnings trigger at configured threshold (default 80%)
- [ ] Budget exceeded alerts are sent
- [ ] Budget status is accurately calculated (on_track/warning/exceeded)
- [ ] Budgets sync with spending in real-time

### Goals Management
- [ ] Users can create goals for both contexts
- [ ] Goals can be linked to accounts for balance sync
- [ ] Contributions can be added manually or via transactions
- [ ] Goal progress updates automatically when contributions added
- [ ] Success toasts appear when goals reach milestones
- [ ] Goal completion is celebrated with animation
- [ ] Goals sync with account balances if linked

### Loan Management
- [ ] Users can create loans with EMI calculation
- [ ] EMI is calculated correctly using standard formula
- [ ] Loan payments are tracked with principal/interest breakdown
- [ ] Remaining amount and months update automatically
- [ ] Loan completion is detected and celebrated
- [ ] Loan payments can be linked to transactions

### Analytics & Insights
- [ ] Analytics work for both local and home country separately
- [ ] Combined analytics show converted amounts correctly
- [ ] Insights identify spending patterns and anomalies
- [ ] Predictions are based on historical data
- [ ] Financial health score is calculated accurately
- [ ] AI advisor provides context-aware recommendations

### Context Separation
- [ ] Local and home country finances are completely separate
- [ ] Currency conversion works correctly between contexts
- [ ] Combined view provides unified insights
- [ ] All features respect context boundaries

---

## Notes

### Integration Principles
- **Enhance, don't replace:** All changes are additive to existing code
- **Backward compatible:** Existing API endpoints and functionality remain unchanged
- **No duplicates:** Reuse existing models, services, and controllers
- **Clean migration:** All new fields are optional with sensible defaults

### Feature Notes
- All features work with **manual data entry** (no bank linking)
- Currency conversion uses existing `CurrencyService`
- Budget tracking updates in real-time when transactions are created (including Billchop)
- Goals sync with transactions and account balances
- Loans calculate EMI using standard financial formulas
- Analytics are based on available data (transactions, budgets, goals, loans, Billchop)
- AI advisor provides recommendations based on user's financial data
- All notifications integrate with existing notification system
- UI follows design guide (MaterialIcons, color palette, spacing)

### Billchop Integration Notes
- Billchop expenses are **always** in local context
- Only user's split amount is added (not full expense amount)
- Billchop transactions are read-only in finance (edit in Billchop)
- Billchop balance only counts if positive (owed to user)
- Billchop transactions are clearly marked with badge/icon
- Category and description sync from Billchop expense

---

*This roadmap provides a focused, realistic plan for implementing core personal finance features with local and home country separation. All features work with manual data entry and provide intelligent insights based on available data. The plan enhances existing implementation without breaking changes.*

**See `PERSONAL_FINANCE_INTEGRATION_PLAN.md` for detailed integration strategy with existing code.**

