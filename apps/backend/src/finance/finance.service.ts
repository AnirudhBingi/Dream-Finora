import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CategorizationService } from '../shared/categorization.service';
import { ExpenseService } from '../expense/expense.service';
import { BudgetService } from './budget.service';
import { CurrencyService } from '../shared/currency.service';
import { randomUUID } from 'crypto';

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private categorizationService: CategorizationService,
    @Inject(forwardRef(() => ExpenseService))
    private expenseService: ExpenseService,
    private budgetService: BudgetService,
    private currencyService: CurrencyService,
  ) {}

  async createAccount(userId: string, createAccountDto: CreateAccountDto) {
    const account = await this.prisma.financeAccount.create({
      data: {
        id: randomUUID(),
        userId,
        name: createAccountDto.name,
        currency: createAccountDto.currency || 'USD',
        balance: 0,
        context: createAccountDto.context || 'local', // Default to local
        accountType: createAccountDto.accountType || 'checking', // Default to checking
      },
    });

    return account;
  }

  async getAccounts(userId: string, context?: 'local' | 'home') {
    const where: Prisma.FinanceAccountWhereInput = { userId };
    if (context) {
      where.context = context; // Filter by context if provided
    }

    const accounts = await this.prisma.financeAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return accounts;
  }

  async getAccountById(userId: string, accountId: string) {
    const account = await this.prisma.financeAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async updateAccount(
    userId: string,
    accountId: string,
    updateDto: UpdateAccountDto,
  ) {
    // Verify account belongs to user
    const account = await this.prisma.financeAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Prepare update data
    const updateData: Prisma.FinanceAccountUpdateInput = {};
    if (updateDto.name !== undefined) updateData.name = updateDto.name;
    if (updateDto.context !== undefined) updateData.context = updateDto.context;
    if (updateDto.accountType !== undefined)
      updateData.accountType = updateDto.accountType;

    // Handle currency change with conversion
    if (
      updateDto.currency !== undefined &&
      updateDto.currency !== account.currency
    ) {
      // If account has a balance and currency is changing, convert the balance
      if (account.balance !== 0) {
        try {
          const convertedBalance = await this.currencyService.convertAmount(
            account.balance,
            account.currency,
            updateDto.currency,
          );
          updateData.balance = convertedBalance;
        } catch (err) {
          // If conversion fails, keep the old balance (user should be warned in UI)
          console.error(
            '[FinanceService] Failed to convert account balance:',
            err,
          );
        }
      }
      updateData.currency = updateDto.currency;
    }

    // Update account
    const updatedAccount = await this.prisma.financeAccount.update({
      where: { id: accountId },
      data: updateData,
    });

    return updatedAccount;
  }

  async deleteAccount(userId: string, accountId: string) {
    // Verify account belongs to user
    const account = await this.prisma.financeAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Check if account has transactions
    const transactionCount = await this.prisma.financeTransaction.count({
      where: {
        accountId: accountId,
      },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        `Cannot delete account with ${transactionCount} transaction(s). Please delete or move transactions first.`,
      );
    }

    // Delete account
    await this.prisma.financeAccount.delete({
      where: { id: accountId },
    });

    return { success: true };
  }

  async createTransaction(
    userId: string,
    createTransactionDto: CreateTransactionDto,
  ) {
    // Auto-populate category for expenses if not provided
    let category = createTransactionDto.category;
    if (
      createTransactionDto.type === 'expense' &&
      !category &&
      createTransactionDto.description
    ) {
      const categoryMatch = this.categorizationService.categorizeFinance(
        createTransactionDto.description,
        'expense',
      );
      if (categoryMatch) {
        category = categoryMatch.category;
      }
    }

    // Convert date string to Date object if provided
    let transactionDate: Date;
    if (createTransactionDto.date) {
      // If it's already a Date object, use it; otherwise parse the string
      if (createTransactionDto.date instanceof Date) {
        transactionDate = createTransactionDto.date;
      } else {
        // Handle date-only strings (YYYY-MM-DD) by appending time to make it a valid DateTime
        const dateStr = createTransactionDto.date;
        // If it's just a date (YYYY-MM-DD), append time to make it a valid DateTime
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Append midnight UTC time to make it a valid ISO-8601 DateTime
          transactionDate = new Date(dateStr + 'T00:00:00.000Z');
        } else {
          // Try parsing as-is (might be a full ISO string)
          transactionDate = new Date(dateStr);
        }
        // Validate the date
        if (isNaN(transactionDate.getTime())) {
          throw new BadRequestException(`Invalid date format: ${dateStr}`);
        }
      }
    } else {
      transactionDate = new Date();
    }

    // Create transaction directly (no account needed)
    const transaction = await this.prisma.financeTransaction.create({
      data: {
        id: randomUUID(),
        userId,
        type: createTransactionDto.type,
        amount: createTransactionDto.amount,
        context: createTransactionDto.context,
        source: createTransactionDto.source, // For income
        category: category, // For expense (auto-populated if not provided)
        description: createTransactionDto.description,
        date: transactionDate,
      },
    });

    // Update budget tracking if this is an expense
    if (transaction.type === 'expense') {
      this.budgetService
        .updateBudgetsForTransaction(userId, {
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category || undefined,
          context: transaction.context,
          accountId: transaction.accountId || undefined,
          date: transaction.date,
        })
        .catch((err) => {
          console.error(
            '[FinanceService] Failed to update budget tracking:',
            err,
          );
        });
    }

    return transaction;
  }

  async getTransactions(
    userId: string,
    context?: 'local' | 'home',
    includeBillchop: boolean = true,
  ) {
    const where: Prisma.FinanceTransactionWhereInput = { userId };

    if (context) {
      where.context = context; // Filter by context
    }
    if (!includeBillchop) {
      where.expenseSplitId = null;
    }

    const transactions = await this.prisma.financeTransaction.findMany({
      where,
      select: {
        id: true,
        userId: true,
        accountId: true,
        type: true,
        amount: true,
        context: true,
        source: true,
        category: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        expenseSplitId: true,
      },
      orderBy: { date: 'desc' },
    });

    return transactions;
  }

  async getTransactionById(userId: string, transactionId: string) {
    const transaction = await this.prisma.financeTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      select: {
        id: true,
        userId: true,
        accountId: true,
        type: true,
        amount: true,
        context: true,
        source: true,
        category: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        expenseSplitId: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async getBalance(
    userId: string,
    context?: 'local' | 'home',
    includeBillchop: boolean = true,
    primaryCurrency: string = 'USD',
  ) {
    // Get user profile to determine currencies
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { primaryCurrency: true, homeCountryCurrency: true },
    });

    const localCurrency = profile?.primaryCurrency || 'USD';
    const homeCurrency = profile?.homeCountryCurrency || 'USD';

    // Calculate balance from transactions (no accounts needed)
    const where: Prisma.FinanceTransactionWhereInput = { userId };
    if (context) {
      where.context = context;
    }

    const transactions = await this.prisma.financeTransaction.findMany({
      where,
      select: {
        type: true,
        amount: true,
        context: true,
      },
    });

    // Calculate balance by context
    const balancesByContext: { local: number; home: number } = {
      local: 0,
      home: 0,
    };

    transactions.forEach((transaction) => {
      const amount =
        transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount;
      if (transaction.context === 'local') {
        balancesByContext.local += amount;
      } else {
        balancesByContext.home += amount;
      }
    });

    // Calculate total balance (without conversion - this is for individual context)
    const totalBalance = balancesByContext.local + balancesByContext.home;

    let billchopBalance = 0;
    let billchopOwedToUser = 0;

    if (includeBillchop && (!context || context === 'local')) {
      // Billchop only applies to local context
      try {
        // Get Billchop balance (money owed to user)
        const billchopBalances = await this.expenseService.getBalances(
          userId,
          primaryCurrency,
        );

        // totalOwedToUser = money others owe to user (positive = available)
        billchopOwedToUser = billchopBalances.totalOwedToUser || 0;

        // Only positive balances count as available (owed to user)
        billchopBalance = billchopOwedToUser > 0 ? billchopOwedToUser : 0;
      } catch (err) {
        console.error('[FinanceService] Failed to get Billchop balance:', err);
        // Continue without Billchop balance if there's an error
      }
    }

    // Calculate context-specific balance
    const contextBalance = context ? balancesByContext[context] : totalBalance;

    return {
      totalBalance: contextBalance,
      totalAvailableBalance: contextBalance + billchopBalance, // Includes Billchop for local
      balancesByContext,
      billchopBalance, // Only for local context
      billchopOwedToUser, // Only for local context
      localCurrency,
      homeCurrency,
    };
  }

  async getCombinedBalance(userId: string, primaryCurrency: string = 'USD') {
    // Get user profile to determine currencies
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { primaryCurrency: true, homeCountryCurrency: true },
    });

    const localCurrency = profile?.primaryCurrency || 'USD';
    const homeCurrency = profile?.homeCountryCurrency || 'USD';
    const targetCurrency = primaryCurrency || localCurrency;

    // Get balances for both contexts
    const [localBalanceData, homeBalanceData] = await Promise.all([
      this.getBalance(userId, 'local', true, targetCurrency),
      this.getBalance(userId, 'home', false, homeCurrency),
    ]);

    const localBalance =
      localBalanceData.totalAvailableBalance ||
      localBalanceData.totalBalance ||
      0;
    const homeBalance = homeBalanceData.totalBalance || 0;

    // Convert balances to target currency
    let localBalanceConverted = localBalance;
    if (localCurrency !== targetCurrency) {
      try {
        localBalanceConverted = await this.currencyService.convertAmount(
          localBalance,
          localCurrency,
          targetCurrency,
        );
      } catch (err) {
        console.error('[FinanceService] Failed to convert local balance:', err);
      }
    }

    let homeBalanceConverted = homeBalance;
    if (homeCurrency !== targetCurrency) {
      try {
        homeBalanceConverted = await this.currencyService.convertAmount(
          homeBalance,
          homeCurrency,
          targetCurrency,
        );
      } catch (err) {
        console.error('[FinanceService] Failed to convert home balance:', err);
        // Use original balance if conversion fails
      }
    }

    // Calculate combined total in primary currency
    const combinedTotal = localBalanceConverted + homeBalanceConverted;

    return {
      combinedTotal,
      localBalance: {
        amount: localBalanceConverted,
        currency: targetCurrency,
        originalAmount: localBalance,
        originalCurrency: localCurrency,
      },
      homeBalance: {
        amount: homeBalance,
        currency: homeCurrency,
        convertedAmount: homeBalanceConverted,
        convertedCurrency: targetCurrency,
      },
      billchopBalance: localBalanceData.billchopBalance || 0,
      primaryCurrency: targetCurrency,
    };
  }

  getCategories() {
    // Return predefined categories for MVP
    return {
      income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other Income'],
      expense: [
        // Food & Dining
        'Groceries',
        'Restaurants & Dining',
        'Coffee & Drinks',
        'Food Delivery',
        // Transportation
        'Gas & Fuel',
        'Public Transit',
        'Rideshare',
        'Parking & Tolls',
        'Car Maintenance',
        // Bills & Utilities
        'Gas & Electric',
        'Internet & Cable',
        'Phone & Mobile',
        'Water & Sewer',
        'Rent & Mortgage',
        'Insurance',
        // Shopping
        'Clothing & Accessories',
        'Electronics',
        'Home & Garden',
        'General Shopping',
        // Entertainment
        'Movies & Shows',
        'Streaming Services',
        'Sports & Recreation',
        'Bars & Nightlife',
        'Games & Hobbies',
        // Health & Fitness
        'Pharmacy & Medications',
        'Doctor & Medical',
        'Gym & Fitness',
        'Personal Care',
        // Education
        'Tuition',
        'Books & Supplies',
        'Courses & Training',
        'Software & Tools',
        // Travel
        'Flights',
        'Hotels',
        'Car Rentals',
        'Travel Insurance',
        // Personal
        'Gifts & Donations',
        'Pets',
        'Childcare',
        'Subscriptions',
        // Business
        'Office Supplies',
        'Professional Services',
        // Other
        'Bank Fees',
        'Cash Withdrawal',
        'Transfer',
        'Other',
      ],
    };
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    updateDto: UpdateTransactionDto,
  ) {
    // Verify transaction belongs to user
    const transaction = await this.prisma.financeTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Auto-populate category for expenses if description is provided and category not set
    let category = updateDto.category;
    if (
      transaction.type === 'expense' &&
      !category &&
      updateDto.description &&
      updateDto.description !== transaction.description
    ) {
      const categoryMatch = this.categorizationService.categorizeFinance(
        updateDto.description,
        'expense',
      );
      if (categoryMatch) {
        category = categoryMatch.category;
      }
    }

    // Handle date conversion
    let transactionDate: Date | undefined;
    if (updateDto.date) {
      if (updateDto.date instanceof Date) {
        transactionDate = updateDto.date;
      } else {
        const dateStr = updateDto.date;
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          transactionDate = new Date(dateStr + 'T00:00:00.000Z');
        } else {
          transactionDate = new Date(dateStr);
        }
        if (isNaN(transactionDate.getTime())) {
          throw new BadRequestException(`Invalid date format: ${dateStr}`);
        }
      }
    }

    // Prepare update data
    const updateData: Prisma.FinanceTransactionUpdateInput = {};
    if (updateDto.amount !== undefined) updateData.amount = updateDto.amount;
    if (updateDto.context !== undefined) updateData.context = updateDto.context;
    if (updateDto.source !== undefined) updateData.source = updateDto.source;
    if (category !== undefined) updateData.category = category;
    if (updateDto.description !== undefined)
      updateData.description = updateDto.description;
    if (transactionDate !== undefined) updateData.date = transactionDate;

    // Update transaction
    const updatedTransaction = await this.prisma.financeTransaction.update({
      where: { id: transactionId },
      data: updateData,
    });

    // Update budget tracking if this is an expense (recalculate budgets)
    if (updatedTransaction.type === 'expense') {
      this.budgetService
        .updateBudgetsForTransaction(userId, {
          type: updatedTransaction.type,
          amount: updatedTransaction.amount,
          category: updatedTransaction.category || undefined,
          context: updatedTransaction.context,
          accountId: updatedTransaction.accountId || undefined,
          date: updatedTransaction.date,
        })
        .catch((err) => {
          console.error(
            '[FinanceService] Failed to update budget tracking after update:',
            err,
          );
        });
    }

    return updatedTransaction;
  }

  async deleteTransaction(userId: string, transactionId: string) {
    // Verify transaction belongs to user
    const transaction = await this.prisma.financeTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Store transaction data for budget update
    const transactionData = {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category || undefined,
      context: transaction.context,
      accountId: transaction.accountId || undefined,
      date: transaction.date,
    };

    // Delete transaction (balance is calculated from transactions, no account update needed)
    await this.prisma.financeTransaction.delete({
      where: { id: transactionId },
    });

    // Update budget tracking if this was an expense
    // Note: We recalculate budgets, which will exclude this deleted transaction
    if (transaction.type === 'expense') {
      this.budgetService
        .updateBudgetsForTransaction(userId, transactionData)
        .catch((err) => {
          console.error(
            '[FinanceService] Failed to update budget tracking after delete:',
            err,
          );
        });
    }

    return { success: true };
  }

  /**
   * Sync an expense split to finance transaction
   * Called from ExpenseService when an expense is created/updated
   */
  async syncExpenseSplitToFinance(
    splitId: string,
    userId: string,
    expenseData: {
      amount: number;
      category: string;
      description: string;
      date: Date;
      currency: string;
    },
  ) {
    // Auto-populate category if not provided
    let category = expenseData.category;
    if (!category && expenseData.description) {
      const categoryMatch = this.categorizationService.categorizeFinance(
        expenseData.description,
        'expense',
      );
      if (categoryMatch) {
        category = categoryMatch.category;
      }
    }

    // Check if transaction already exists for this split
    const existing = await this.prisma.financeTransaction.findFirst({
      where: { expenseSplitId: splitId },
    });

    if (existing) {
      // Update existing transaction
      const updated = await this.prisma.financeTransaction.update({
        where: { id: existing.id },
        data: {
          amount: expenseData.amount,
          category: category,
          description: expenseData.description,
          date: expenseData.date,
          type: 'expense',
          context: 'local', // Billchop expenses are always local
        },
      });

      // Update budget tracking
      this.budgetService
        .updateBudgetsForTransaction(existing.userId, {
          type: 'expense',
          amount: updated.amount,
          category: updated.category || undefined,
          context: updated.context,
          accountId: updated.accountId || undefined,
          date: updated.date,
        })
        .catch((err) => {
          console.error(
            '[FinanceService] Failed to update budget tracking after update:',
            err,
          );
        });

      return updated;
    } else {
      // Create new transaction (no account needed)
      const transaction = await this.prisma.financeTransaction.create({
        data: {
          id: randomUUID(),
          userId,
          type: 'expense',
          amount: expenseData.amount,
          category: category,
          description: expenseData.description,
          date: expenseData.date,
          context: 'local', // Billchop expenses are always local
          expenseSplitId: splitId,
        },
      });

      // Update budget tracking
      this.budgetService
        .updateBudgetsForTransaction(userId, {
          type: 'expense',
          amount: transaction.amount,
          category: transaction.category || undefined,
          context: transaction.context,
          accountId: transaction.accountId || undefined,
          date: transaction.date,
        })
        .catch((err) => {
          console.error(
            '[FinanceService] Failed to update budget tracking after sync:',
            err,
          );
        });

      return transaction;
    }
  }

  /**
   * Delete finance transaction linked to an expense split
   * Called from ExpenseService when an expense is deleted
   */
  async deleteExpenseSplitFinanceTransaction(splitId: string) {
    const transaction = await this.prisma.financeTransaction.findFirst({
      where: { expenseSplitId: splitId },
    });

    if (!transaction) {
      return; // No linked transaction, nothing to delete
    }

    // Store transaction data for budget update
    const transactionData = {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category || undefined,
      context: transaction.context,
      accountId: transaction.accountId || undefined,
      date: transaction.date,
    };

    // Delete transaction (balance is calculated from transactions, no account update needed)
    await this.prisma.financeTransaction.delete({
      where: { id: transaction.id },
    });

    // Update budget tracking
    if (transaction.type === 'expense') {
      this.budgetService
        .updateBudgetsForTransaction(transaction.userId, transactionData)
        .catch((err) => {
          console.error(
            '[FinanceService] Failed to update budget tracking after split delete:',
            err,
          );
        });
    }
  }

  /**
   * Get finance history (transactions with changes, account history)
   */
  async getFinanceHistory(
    userId: string,
    context?: 'local' | 'home',
    accountId?: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    // Build where clause
    const where: Prisma.FinanceTransactionWhereInput = { userId };
    if (context) {
      where.context = context;
    }
    if (accountId) {
      where.accountId = accountId;
    }

    // Get transactions with pagination
    const transactions = await this.prisma.financeTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        amount: true,
        context: true,
        source: true,
        category: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        accountId: true,
      },
    });

    // Get total count
    const totalCount = await this.prisma.financeTransaction.count({ where });

    // Get accounts with their creation/update timestamps
    const accountsWhere: Prisma.FinanceAccountWhereInput = { userId };
    if (context) {
      accountsWhere.context = context;
    }

    const accounts = await this.prisma.financeAccount.findMany({
      where: accountsWhere,
      select: {
        id: true,
        name: true,
        currency: true,
        balance: true,
        context: true,
        accountType: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      transactions,
      accounts,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    };
  }
}
