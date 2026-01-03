# Personal Finance Integration Plan: Enhancing Existing Implementation

## Overview

This plan outlines how to **enhance the existing finance implementation** (not replace it) and integrate it with Billchop expenses. The goal is to add new features (budgets, goals, loans) while preserving existing functionality and avoiding duplicates.

## Current State Analysis

### What Exists (Keep & Enhance)

**Backend:**
- ✅ `FinanceAccount` model (basic: id, userId, name, currency, balance)
- ✅ `FinanceTransaction` model (basic: id, accountId, type, amount, category, description, date)
- ✅ `FinanceService` with:
  - `createAccount()`
  - `getAccounts()`
  - `getAccountById()`
  - `createTransaction()`
  - `getTransactions()`
  - `getBalance()`
  - `deleteTransaction()`
- ✅ `FinanceController` with all endpoints
- ✅ `CategorizationService` integration

**Mobile:**
- ✅ `FinanceScreen` (basic account list and balance)
- ✅ `financeApi.ts` (all API functions)
- ✅ `CreateAccountScreen` (if exists)
- ✅ `AccountDetailScreen` (if exists)

### What Needs to Be Added

1. **Context Support** - Add `context` field to existing models
2. **Budget System** - New models and services
3. **Goals System** - New models and services
4. **Loan System** - New models and services
5. **Billchop Integration** - Sync expense splits to finance transactions
6. **Billchop Balance** - Include owed amounts in total balance

---

## Migration Strategy: Enhance, Don't Replace

### Principle: Backward Compatibility

All changes will be **additive** - existing functionality continues to work, new features are added.

### Step 1: Database Schema Migration (Non-Breaking)

#### 1.1 Add Context to FinanceAccount (Optional Field)

```prisma
model FinanceAccount {
  id            String   @id @default(uuid())
  userId        String
  name          String
  currency      String   @default("USD")
  balance       Float    @default(0)
  context       String   @default("local") // NEW: Optional, defaults to "local"
  accountType   String   @default("checking") // NEW: Optional
  createdAt     DateTime @default(now())
  updatedAt     DateTime @default(now()) @updatedAt

  user         User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions FinanceTransaction[]
  budgets      Budget[]             // NEW
  goals        FinancialGoal[]      // NEW
  loans        Loan[]               // NEW
  
  @@index([userId, context]) // NEW
}
```

**Migration Strategy:**
- Add `context` with default "local" (existing accounts become "local")
- Add `accountType` with default "checking" (existing accounts become "checking")
- No data loss, no breaking changes

#### 1.2 Enhance FinanceTransaction (Add Optional Links)

```prisma
model FinanceTransaction {
  id          String   @id @default(uuid())
  accountId   String
  type        String   // "income" or "expense"
  amount      Float
  category    String
  description String?
  date        DateTime @default(now())
  // NEW: Optional links
  expenseSplitId String? @unique // Link to Billchop expense split
  budgetId    String?  // Optional: linked budget
  goalId      String?  // Optional: linked goal contribution
  loanId      String?  // Optional: linked loan payment
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  account      FinanceAccount    @relation(fields: [accountId], references: [id], onDelete: Cascade)
  expenseSplit ExpenseSplit?     @relation(fields: [expenseSplitId], references: [id], onDelete: SetNull) // NEW
  budget       Budget?           @relation(fields: [budgetId], references: [id], onDelete: SetNull) // NEW
  goal         FinancialGoal?    @relation(fields: [goalId], references: [id], onDelete: SetNull) // NEW
  loan         Loan?             @relation(fields: [loanId], references: [id], onDelete: SetNull) // NEW
  
  @@index([accountId, date])
  @@index([accountId, category])
  @@index([budgetId]) // NEW
  @@index([goalId]) // NEW
  @@index([expenseSplitId]) // NEW
}
```

**Migration Strategy:**
- All new fields are optional (nullable)
- Existing transactions remain unchanged
- No breaking changes

#### 1.3 Add ExpenseSplit Link (One-Way)

```prisma
model ExpenseSplit {
  // ... existing fields ...
  financeTransaction FinanceTransaction? @relation // NEW: Optional link
}
```

**Migration Strategy:**
- One-way relation (ExpenseSplit → FinanceTransaction)
- Optional, so existing splits are unaffected

#### 1.4 Add New Models (Budget, Goal, Loan)

These are completely new, no migration needed.

---

## Billchop Integration: Expense Splits → Finance Transactions

### Business Logic

**When an expense is created/updated:**
1. For each `ExpenseSplit` where `userId` matches current user:
   - If split amount > 0 (user owes money):
     - Create/update `FinanceTransaction` with:
       - `type: "expense"`
       - `amount: split.amount` (user's portion only)
       - `category: expense.category` (from Billchop expense)
       - `description: expense.description` (from Billchop expense)
       - `date: expense.date`
       - `expenseSplitId: split.id` (link to Billchop)
       - `accountId: user's default local finance account` (or prompt user)
       - `context: "local"` (Billchop expenses are always local)
   - If user is `paidBy` and others owe them:
     - This is handled separately (see balance integration)

**When an expense is deleted:**
- Find linked `FinanceTransaction` by `expenseSplitId`
- Delete the finance transaction (or mark as deleted)

**When a split is marked as paid:**
- Update linked `FinanceTransaction` if exists
- Or create transaction if doesn't exist yet

### Implementation Plan

#### Backend: ExpenseService Integration

**Add to `ExpenseService.createExpense()`:**

```typescript
// After expense is created successfully
// For each split where userId matches current user
for (const split of createdExpense.splits) {
  if (split.userId === userId && split.amount > 0) {
    // User owes money - create expense transaction
    await this.syncExpenseSplitToFinance(split.id, userId, {
      amount: split.amount,
      category: createdExpense.category,
      description: createdExpense.description,
      date: createdExpense.date,
    });
  }
}

// If user paid for expense (paidBy === userId)
if (createdExpense.paidBy === userId) {
  // User paid - this will be handled in balance calculation
  // (owed to user = available balance)
}
```

**New Method: `syncExpenseSplitToFinance()`**

```typescript
async syncExpenseSplitToFinance(
  splitId: string,
  userId: string,
  expenseData: { amount: number; category: string; description: string; date: Date }
) {
  // Get user's default local finance account
  const defaultAccount = await this.prisma.financeAccount.findFirst({
    where: {
      userId,
      context: 'local',
    },
    orderBy: { createdAt: 'asc' }, // First account as default
  });

  if (!defaultAccount) {
    // No local account - skip sync (or create one?)
    console.warn(`No local finance account found for user ${userId}, skipping Billchop sync`);
    return;
  }

  // Check if transaction already exists for this split
  const existing = await this.prisma.financeTransaction.findUnique({
    where: { expenseSplitId: splitId },
  });

  if (existing) {
    // Update existing transaction
    const amountChange = existing.type === 'expense' 
      ? existing.amount - expenseData.amount 
      : -expenseData.amount;
    
    await this.prisma.$transaction(async (tx) => {
      await tx.financeTransaction.update({
        where: { id: existing.id },
        data: {
          amount: expenseData.amount,
          category: expenseData.category,
          description: expenseData.description,
          date: expenseData.date,
          type: 'expense',
        },
      });

      await tx.financeAccount.update({
        where: { id: defaultAccount.id },
        data: {
          balance: defaultAccount.balance + amountChange,
        },
      });
    });
  } else {
    // Create new transaction
    const amountChange = -expenseData.amount; // Expense reduces balance
    
    await this.prisma.$transaction(async (tx) => {
      await tx.financeTransaction.create({
        data: {
          accountId: defaultAccount.id,
          type: 'expense',
          amount: expenseData.amount,
          category: expenseData.category,
          description: expenseData.description,
          date: expenseData.date,
          expenseSplitId: splitId,
        },
      });

      await tx.financeAccount.update({
        where: { id: defaultAccount.id },
        data: {
          balance: defaultAccount.balance + amountChange,
        },
      });
    });
  }
}
```

**Add to `ExpenseService.updateExpense()`:**
- Re-sync all splits after update

**Add to `ExpenseService.deleteExpense()`:**
- Delete linked finance transactions

**Add to `ExpenseService.markSplitAsPaid()`:**
- Update or create finance transaction

---

## Billchop Balance → Available Balance

### Business Logic

**Total Available Balance = Finance Account Balances + Billchop Owed To User**

- If user is owed money in Billchop (positive balance), add it to available balance
- If user owes money (negative balance), it's already reflected in expenses

### Implementation

#### Enhance `FinanceService.getBalance()`

```typescript
async getBalance(userId: string, includeBillchop: boolean = true) {
  // Get finance account balances (existing logic)
  const accounts = await this.prisma.financeAccount.findMany({
    where: { userId },
    select: {
      currency: true,
      balance: true,
      context: true,
    },
  });

  // Group by currency and context
  const balancesByCurrency = accounts.reduce((acc, account) => {
    const key = `${account.currency}_${account.context}`;
    if (!acc[key]) {
      acc[key] = { local: 0, home: 0, currency: account.currency };
    }
    if (account.context === 'local') {
      acc[key].local += account.balance;
    } else {
      acc[key].home += account.balance;
    }
    return acc;
  }, {} as Record<string, { local: number; home: number; currency: string }>);

  // Calculate total (existing logic)
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  let billchopBalance = 0;
  let billchopOwedToUser = 0;

  if (includeBillchop) {
    // Get Billchop balance (from ExpenseService)
    const expenseService = this.moduleRef.get(ExpenseService);
    const billchopBalances = await expenseService.getBalances(userId, 'USD'); // Use primary currency
    
    // totalOwedToUser = money others owe to user (positive = available)
    billchopOwedToUser = billchopBalances.totalOwedToUser || 0;
    
    // Add to total available balance
    billchopBalance = billchopOwedToUser; // Only positive balances count as available
  }

  return {
    totalBalance,
    totalAvailableBalance: totalBalance + billchopBalance, // NEW
    balancesByCurrency,
    accounts: accounts.length,
    billchopBalance, // NEW
    billchopOwedToUser, // NEW
  };
}
```

**Note:** Need to inject `ExpenseService` or create a shared balance service.

---

## Enhanced FinanceService Methods

### Update Existing Methods (Backward Compatible)

#### `createAccount()` - Add Context Support

```typescript
async createAccount(userId: string, createAccountDto: CreateAccountDto) {
  const account = await this.prisma.financeAccount.create({
    data: {
      userId,
      name: createAccountDto.name,
      currency: createAccountDto.currency || 'USD',
      balance: 0,
      context: createAccountDto.context || 'local', // NEW: Default to local
      accountType: createAccountDto.accountType || 'checking', // NEW
    },
  });

  return account;
}
```

**DTO Update:**
```typescript
export class CreateAccountDto {
  name: string;
  currency?: string;
  context?: 'local' | 'home'; // NEW: Optional
  accountType?: string; // NEW: Optional
}
```

#### `getAccounts()` - Filter by Context

```typescript
async getAccounts(userId: string, context?: 'local' | 'home') {
  const where: any = { userId };
  if (context) {
    where.context = context; // NEW: Filter by context
  }

  const accounts = await this.prisma.financeAccount.findMany({
    where,
    include: {
      transactions: {
        orderBy: { date: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return accounts;
}
```

#### `getTransactions()` - Filter by Context, Include Billchop

```typescript
async getTransactions(
  userId: string, 
  accountId?: string,
  context?: 'local' | 'home',
  includeBillchop?: boolean // NEW
) {
  const where: any = {
    account: { userId },
  };

  if (accountId) {
    where.accountId = accountId;
  }

  if (context) {
    where.account = { ...where.account, context }; // NEW: Filter by context
  }

  const transactions = await this.prisma.financeTransaction.findMany({
    where,
    include: {
      account: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },
      expenseSplit: includeBillchop ? { // NEW: Include Billchop link
        include: {
          expense: {
            select: {
              id: true,
              description: true,
              category: true,
            },
          },
        },
      } : undefined,
    },
    orderBy: { date: 'desc' },
  });

  return transactions;
}
```

---

## Mobile UI Updates

### FinanceScreen Enhancements

**Add Context Tabs:**
```typescript
// Add tabs: Local | Home | Combined
// Filter accounts by context
// Show context-specific balance
// Include Billchop balance in total
```

**Show Billchop Transactions:**
- Display Billchop-synced transactions with badge/icon
- Show "From Billchop" indicator
- Link to expense detail if tapped

**Balance Display:**
- Show: "Total Available: $X (Finance: $Y + Billchop: $Z)"
- Breakdown card showing sources

---

## Implementation Order (No Breaking Changes)

### Phase 1: Database Migration (Day 1)
1. Add `context` to `FinanceAccount` (default "local")
2. Add `accountType` to `FinanceAccount` (default "checking")
3. Add optional links to `FinanceTransaction` (expenseSplitId, budgetId, goalId, loanId)
4. Add relation to `ExpenseSplit`
5. Run migration
6. **Test:** Existing accounts/transactions still work

### Phase 2: Enhance Existing Services (Day 2)
1. Update `FinanceService.createAccount()` to accept context
2. Update `FinanceService.getAccounts()` to filter by context
3. Update `FinanceService.getBalance()` to include Billchop balance
4. Update DTOs (make new fields optional)
5. **Test:** Existing API calls still work, new features work

### Phase 3: Billchop Integration (Day 3)
1. Add `syncExpenseSplitToFinance()` to `ExpenseService`
2. Integrate into `createExpense()`, `updateExpense()`, `deleteExpense()`
3. Handle split payment updates
4. **Test:** Billchop expenses create finance transactions

### Phase 4: Mobile UI Updates (Day 4)
1. Add context tabs to `FinanceScreen`
2. Update `financeApi.ts` with context parameters
3. Show Billchop transactions with indicators
4. Display combined balance (Finance + Billchop)
5. **Test:** UI shows both finance and Billchop data

### Phase 5: New Features (Days 5-14)
- Follow roadmap for budgets, goals, loans
- All new features respect context
- All new features integrate with existing code

---

## Code Cleanup Strategy

### What to Keep
- ✅ All existing `FinanceService` methods
- ✅ All existing `FinanceController` endpoints
- ✅ All existing mobile screens and API functions
- ✅ Existing transaction creation/update logic

### What to Enhance (Not Replace)
- ✅ Add context support to existing methods
- ✅ Add Billchop integration to existing methods
- ✅ Add optional parameters (backward compatible)

### What to Add (New)
- ✅ Budget models, services, controllers
- ✅ Goal models, services, controllers
- ✅ Loan models, services, controllers
- ✅ New endpoints for new features
- ✅ New mobile screens for new features

### What NOT to Do
- ❌ Don't create duplicate account/transaction models
- ❌ Don't replace existing services
- ❌ Don't break existing API contracts
- ❌ Don't remove existing functionality

---

## Testing Strategy

### Backward Compatibility Tests
1. ✅ Existing accounts still work
2. ✅ Existing transactions still work
3. ✅ Existing API endpoints still work
4. ✅ Existing mobile screens still work
5. ✅ No data loss after migration

### New Feature Tests
1. ✅ Context filtering works
2. ✅ Billchop expenses sync to finance
3. ✅ Billchop balance included in total
4. ✅ Budgets track Billchop expenses
5. ✅ Goals can use Billchop transactions

---

## Success Criteria

- [ ] Existing finance features continue to work
- [ ] No breaking changes to existing API
- [ ] Billchop expenses automatically appear in finance
- [ ] Billchop balance included in total available balance
- [ ] Context separation works (local vs home)
- [ ] New features (budgets, goals, loans) integrate seamlessly
- [ ] No duplicate code or models
- [ ] Clean, maintainable codebase

---

## Notes

- **Migration is non-breaking:** All new fields are optional with defaults
- **Existing code is enhanced, not replaced:** Add features, don't remove
- **Billchop integration is one-way:** Expense splits → Finance transactions
- **Balance calculation is additive:** Finance balance + Billchop owed to user
- **Context is optional:** Defaults to "local" for backward compatibility
- **All changes are additive:** No removal of existing functionality

---

*This plan ensures we enhance existing implementation without breaking anything, integrate Billchop seamlessly, and add new features cleanly.*

