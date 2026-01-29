import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SpendingByCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string; // Format: "YYYY-MM"
  income: number;
  expense: number;
  net: number; // income - expense
}

export interface BalanceOverTime {
  date: string; // Format: "YYYY-MM-DD"
  balance: number;
}

export interface ExpenseSpendingByCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface ExpenseMonthlyTrend {
  month: string; // Format: "YYYY-MM"
  amount: number; // Total split expenses for this user in this month
}

export interface TopSpender {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  totalSpent: number;
}

type ExpenseWithCreator = Prisma.ExpenseGetPayload<{
  include: {
    User_Expense_createdByToUser: {
      include: {
        UserProfile: {
          select: {
            displayName: true;
            avatarUrl: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get personal finance spending by category
   * Returns pie chart data grouped by category (from FinanceTransaction)
   */
  async getSpendingByCategory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SpendingByCategory[]> {
    const where: Prisma.FinanceTransactionWhereInput = {
      userId,
      type: 'expense', // Only expenses for spending analysis
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    // Get all expense transactions
    const transactions = await this.prisma.financeTransaction.findMany({
      where,
      select: {
        amount: true,
        category: true,
      },
    });

    // Group by category and sum amounts
    const categoryMap = new Map<string, number>();
    let totalAmount = 0;

    transactions.forEach((transaction) => {
      const category = transaction.category || 'Uncategorized';
      const currentAmount = categoryMap.get(category) || 0;
      categoryMap.set(category, currentAmount + transaction.amount);
      totalAmount += transaction.amount;
    });

    // Convert to array and calculate percentages
    const result: SpendingByCategory[] = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
        percentage:
          totalAmount > 0
            ? Math.round((amount / totalAmount) * 10000) / 100
            : 0, // Round to 2 decimal places
      }),
    );

    // Sort by amount descending
    return result.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get personal finance monthly spending trends
   * Returns income, expense, and net for each month (from FinanceTransaction)
   */
  async getMonthlyTrends(
    userId: string,
    months: number = 6, // Default: last 6 months
  ): Promise<MonthlyTrend[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.prisma.financeTransaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        type: true,
        amount: true,
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Group by month
    const monthlyMap = new Map<string, { income: number; expense: number }>();

    transactions.forEach((transaction) => {
      const monthKey = transaction.date.toISOString().substring(0, 7); // "YYYY-MM"
      const monthData = monthlyMap.get(monthKey) || { income: 0, expense: 0 };

      if (transaction.type === 'income') {
        monthData.income += transaction.amount;
      } else {
        monthData.expense += transaction.amount;
      }

      monthlyMap.set(monthKey, monthData);
    });

    // Convert to array and calculate net
    const result: MonthlyTrend[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income * 100) / 100,
        expense: Math.round(data.expense * 100) / 100,
        net: Math.round((data.income - data.expense) * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)); // Sort by month ascending

    return result;
  }

  /**
   * Get personal finance balance over time
   * Calculates account balance at different points in time (from FinanceAccount)
   */
  async getBalanceOverTime(
    userId: string,
    days: number = 30, // Default: last 30 days
  ): Promise<BalanceOverTime[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all transactions within the date range
    const transactions = await this.prisma.financeTransaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        type: true,
        amount: true,
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calculate initial balance (balance before startDate)
    // Calculate from all transactions before startDate
    const transactionsBeforeStart =
      await this.prisma.financeTransaction.findMany({
        where: {
          userId,
          date: {
            lt: startDate,
          },
        },
        select: {
          type: true,
          amount: true,
        },
      });

    // Calculate initial balance from transactions (no accounts needed)
    let initialBalance = 0;
    transactionsBeforeStart.forEach((transaction) => {
      const change =
        transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount;
      initialBalance += change;
    });

    // Group transactions by date
    const dailyTransactions: { date: string; change: number }[] = [];

    transactions.forEach((transaction) => {
      const dateKey = transaction.date.toISOString().substring(0, 10); // "YYYY-MM-DD"
      const change =
        transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount;
      dailyTransactions.push({ date: dateKey, change });
    });

    // Calculate balance for each day
    const balanceMap = new Map<string, number>();
    let currentBalance = initialBalance;

    // Include start date
    const startDateKey = startDate.toISOString().substring(0, 10);
    balanceMap.set(startDateKey, currentBalance);

    // Process each day's transactions
    dailyTransactions.forEach(({ date, change }) => {
      currentBalance = Math.round((currentBalance + change) * 100) / 100;
      balanceMap.set(date, currentBalance);
    });

    // Convert to array
    const result: BalanceOverTime[] = Array.from(balanceMap.entries())
      .map(([date, balance]) => ({
        date,
        balance: Math.round(balance * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending

    // If no data points, calculate current balance from all transactions
    if (result.length === 0) {
      const allTransactions = await this.prisma.financeTransaction.findMany({
        where: { userId },
        select: { type: true, amount: true },
      });
      const currentTotalBalance = allTransactions.reduce((sum, t) => {
        return sum + (t.type === 'income' ? t.amount : -t.amount);
      }, 0);
      result.push({
        date: endDate.toISOString().substring(0, 10),
        balance: Math.round(currentTotalBalance * 100) / 100,
      });
    }

    return result;
  }

  /**
   * Get expense spending by category (for split expenses)
   * Based on ExpenseSplit amounts (what the user owes in split expenses)
   */
  async getExpenseSpendingByCategory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ExpenseSpendingByCategory[]> {
    const where: Prisma.ExpenseSplitWhereInput = {
      userId, // Expense splits for this user
    };

    if (startDate || endDate) {
      const expenseDate: Prisma.DateTimeFilter = {};
      if (startDate) expenseDate.gte = startDate;
      if (endDate) expenseDate.lte = endDate;
      where.Expense = { date: expenseDate };
    }

    // Get all expense splits for this user
    const splits = await this.prisma.expenseSplit.findMany({
      where,
      include: {
        Expense: {
          select: {
            category: true,
          },
        },
      },
    });

    // Group by category and sum amounts
    const categoryMap = new Map<string, number>();
    let totalAmount = 0;

    splits.forEach((split) => {
      const category = split.Expense.category || 'Uncategorized';
      const currentAmount = categoryMap.get(category) || 0;
      categoryMap.set(category, currentAmount + split.amount);
      totalAmount += split.amount;
    });

    // Convert to array and calculate percentages
    const result: ExpenseSpendingByCategory[] = Array.from(
      categoryMap.entries(),
    ).map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage:
        totalAmount > 0 ? Math.round((amount / totalAmount) * 10000) / 100 : 0,
    }));

    // Sort by amount descending
    return result.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get monthly expense trends (for split expenses)
   * Based on ExpenseSplit amounts over time
   */
  async getExpenseMonthlyTrends(
    userId: string,
    months: number = 6,
  ): Promise<ExpenseMonthlyTrend[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const splits = await this.prisma.expenseSplit.findMany({
      where: {
        userId,
        Expense: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        Expense: {
          select: {
            date: true,
          },
        },
      },
    });

    // Group by month
    const monthlyMap = new Map<string, number>();

    splits.forEach((split) => {
      const monthKey = split.Expense.date.toISOString().substring(0, 7); // "YYYY-MM"
      const currentAmount = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, currentAmount + split.amount);
    });

    // Convert to array
    const result: ExpenseMonthlyTrend[] = Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({
        month,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)); // Sort by month ascending

    return result;
  }

  /**
   * Get top spenders in a group (based on total expense amounts they've created)
   */
  async getTopSpendersInGroup(
    groupId: string,
    limit: number = 10,
  ): Promise<TopSpender[]> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        groupId,
      },
      include: {
        User_Expense_createdByToUser: {
          include: {
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Group by user and sum expense amounts
    const userMap = new Map<
      string,
      {
        user: ExpenseWithCreator['User_Expense_createdByToUser'];
        total: number;
      }
    >();

    expenses.forEach((expense) => {
      const userId = expense.createdBy;
      const current = userMap.get(userId) || {
        user: expense.User_Expense_createdByToUser,
        total: 0,
      };
      current.total += expense.amount;
      userMap.set(userId, current);
    });

    // Convert to array and sort
    const result: TopSpender[] = Array.from(userMap.values())
      .map(({ user, total }) => ({
        userId: user.id,
        displayName: user.UserProfile?.displayName || user.email.split('@')[0],
        email: user.email,
        avatarUrl: user.UserProfile?.avatarUrl || null,
        totalSpent: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);

    return result;
  }

  /**
   * Get comprehensive analytics for a specific context (local or home)
   */
  async getContextAnalytics(
    userId: string,
    context: 'local' | 'home',
    months: number = 6,
    days: number = 30,
  ) {
    const [
      spendingByCategory,
      monthlyTrends,
      balanceOverTime,
      budgetPerformance,
      goalsProgress,
      loanSummary,
    ] = await Promise.all([
      this.getSpendingByCategoryWithContext(userId, context),
      this.getMonthlyTrendsWithContext(userId, context, months),
      this.getBalanceOverTimeWithContext(userId, context, days),
      this.getBudgetPerformance(userId, context),
      this.getGoalsProgress(userId, context),
      this.getLoanSummary(userId, context),
    ]);

    // Calculate income vs expenses summary
    const incomeVsExpenses = this.calculateIncomeVsExpenses(monthlyTrends);

    return {
      context,
      spendingByCategory,
      monthlyTrends,
      balanceOverTime,
      incomeVsExpenses,
      budgetPerformance,
      goalsProgress,
      loanSummary,
    };
  }

  /**
   * Get combined analytics (local + home) with currency conversion
   */
  async getCombinedAnalytics(
    userId: string,
    months: number = 6,
    days: number = 30,
    primaryCurrency: string = 'USD',
  ) {
    const [localAnalytics, homeAnalytics] = await Promise.all([
      this.getContextAnalytics(userId, 'local', months, days),
      this.getContextAnalytics(userId, 'home', months, days),
    ]);

    // TODO: Convert home analytics to primary currency using CurrencyService
    // For now, we'll combine them as-is (assuming same currency or manual conversion needed)

    // Combine spending by category
    const categoryMap = new Map<string, number>();
    let totalSpending = 0;

    [
      ...localAnalytics.spendingByCategory,
      ...homeAnalytics.spendingByCategory,
    ].forEach((item) => {
      const current = categoryMap.get(item.category) || 0;
      categoryMap.set(item.category, current + item.amount);
      totalSpending += item.amount;
    });

    const combinedSpendingByCategory: SpendingByCategory[] = Array.from(
      categoryMap.entries(),
    )
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percentage:
          totalSpending > 0
            ? Math.round((amount / totalSpending) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Combine monthly trends
    const monthlyMap = new Map<string, { income: number; expense: number }>();

    [...localAnalytics.monthlyTrends, ...homeAnalytics.monthlyTrends].forEach(
      (trend) => {
        const existing = monthlyMap.get(trend.month) || {
          income: 0,
          expense: 0,
        };
        monthlyMap.set(trend.month, {
          income: existing.income + trend.income,
          expense: existing.expense + trend.expense,
        });
      },
    );

    const combinedMonthlyTrends: MonthlyTrend[] = Array.from(
      monthlyMap.entries(),
    )
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income * 100) / 100,
        expense: Math.round(data.expense * 100) / 100,
        net: Math.round((data.income - data.expense) * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Combine balance over time
    const balanceMap = new Map<string, number>();

    [
      ...localAnalytics.balanceOverTime,
      ...homeAnalytics.balanceOverTime,
    ].forEach((balance) => {
      const existing = balanceMap.get(balance.date) || 0;
      balanceMap.set(balance.date, existing + balance.balance);
    });

    const combinedBalanceOverTime: BalanceOverTime[] = Array.from(
      balanceMap.entries(),
    )
      .map(([date, balance]) => ({
        date,
        balance: Math.round(balance * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Combine budget performance
    const combinedBudgetPerformance = {
      totalBudgets:
        localAnalytics.budgetPerformance.totalBudgets +
        homeAnalytics.budgetPerformance.totalBudgets,
      budgetsOnTrack:
        localAnalytics.budgetPerformance.budgetsOnTrack +
        homeAnalytics.budgetPerformance.budgetsOnTrack,
      budgetsWarning:
        localAnalytics.budgetPerformance.budgetsWarning +
        homeAnalytics.budgetPerformance.budgetsWarning,
      budgetsExceeded:
        localAnalytics.budgetPerformance.budgetsExceeded +
        homeAnalytics.budgetPerformance.budgetsExceeded,
      totalBudgeted:
        Math.round(
          (localAnalytics.budgetPerformance.totalBudgeted +
            homeAnalytics.budgetPerformance.totalBudgeted) *
            100,
        ) / 100,
      totalSpent:
        Math.round(
          (localAnalytics.budgetPerformance.totalSpent +
            homeAnalytics.budgetPerformance.totalSpent) *
            100,
        ) / 100,
      adherenceRate: 0, // Will calculate below
      averageAdherence: 0, // Will calculate below
    };

    const totalBudgeted = combinedBudgetPerformance.totalBudgeted;
    combinedBudgetPerformance.adherenceRate =
      totalBudgeted > 0
        ? Math.round(
            (1 - combinedBudgetPerformance.totalSpent / totalBudgeted) * 10000,
          ) / 100
        : 100;

    const totalBudgets = combinedBudgetPerformance.totalBudgets;
    combinedBudgetPerformance.averageAdherence =
      totalBudgets > 0
        ? Math.round(
            (combinedBudgetPerformance.budgetsOnTrack / totalBudgets) * 10000,
          ) / 100
        : 100;

    // Combine goals progress
    const combinedGoalsProgress = {
      totalGoals:
        localAnalytics.goalsProgress.totalGoals +
        homeAnalytics.goalsProgress.totalGoals,
      activeGoals:
        localAnalytics.goalsProgress.activeGoals +
        homeAnalytics.goalsProgress.activeGoals,
      completedGoals:
        localAnalytics.goalsProgress.completedGoals +
        homeAnalytics.goalsProgress.completedGoals,
      totalTargetAmount:
        Math.round(
          (localAnalytics.goalsProgress.totalTargetAmount +
            homeAnalytics.goalsProgress.totalTargetAmount) *
            100,
        ) / 100,
      totalCurrentAmount:
        Math.round(
          (localAnalytics.goalsProgress.totalCurrentAmount +
            homeAnalytics.goalsProgress.totalCurrentAmount) *
            100,
        ) / 100,
      overallProgress: 0, // Will calculate below
      averageProgress: 0, // Will calculate below
    };

    const totalTarget = combinedGoalsProgress.totalTargetAmount;
    combinedGoalsProgress.overallProgress =
      totalTarget > 0
        ? Math.round(
            (combinedGoalsProgress.totalCurrentAmount / totalTarget) * 10000,
          ) / 100
        : 0;

    // Calculate average progress (simplified - would need individual goal progress for accurate average)
    const localProgress =
      localAnalytics.goalsProgress.totalGoals > 0
        ? localAnalytics.goalsProgress.overallProgress
        : 0;
    const homeProgress =
      homeAnalytics.goalsProgress.totalGoals > 0
        ? homeAnalytics.goalsProgress.overallProgress
        : 0;
    const totalGoals = combinedGoalsProgress.totalGoals;
    combinedGoalsProgress.averageProgress =
      totalGoals > 0
        ? Math.round(
            ((localProgress * localAnalytics.goalsProgress.totalGoals +
              homeProgress * homeAnalytics.goalsProgress.totalGoals) /
              totalGoals) *
              100,
          ) / 100
        : 0;

    // Combine loan summary
    const combinedLoanSummary = {
      totalLoans:
        localAnalytics.loanSummary.totalLoans +
        homeAnalytics.loanSummary.totalLoans,
      activeLoans:
        localAnalytics.loanSummary.activeLoans +
        homeAnalytics.loanSummary.activeLoans,
      completedLoans:
        localAnalytics.loanSummary.completedLoans +
        homeAnalytics.loanSummary.completedLoans,
      totalPrincipal:
        Math.round(
          (localAnalytics.loanSummary.totalPrincipal +
            homeAnalytics.loanSummary.totalPrincipal) *
            100,
        ) / 100,
      totalRemaining:
        Math.round(
          (localAnalytics.loanSummary.totalRemaining +
            homeAnalytics.loanSummary.totalRemaining) *
            100,
        ) / 100,
      totalPaid:
        Math.round(
          (localAnalytics.loanSummary.totalPaid +
            homeAnalytics.loanSummary.totalPaid) *
            100,
        ) / 100,
      totalInterestPaid:
        Math.round(
          (localAnalytics.loanSummary.totalInterestPaid +
            homeAnalytics.loanSummary.totalInterestPaid) *
            100,
        ) / 100,
      progressPercentage: 0, // Will calculate below
    };

    const totalPrincipal = combinedLoanSummary.totalPrincipal;
    combinedLoanSummary.progressPercentage =
      totalPrincipal > 0
        ? Math.round((combinedLoanSummary.totalPaid / totalPrincipal) * 10000) /
          100
        : 0;

    // Calculate combined income vs expenses
    const combinedIncomeVsExpenses = this.calculateIncomeVsExpenses(
      combinedMonthlyTrends,
    );

    // Create combined analytics object (using Omit to allow 'combined' context)
    const combinedAnalytics = {
      context: 'combined' as const,
      spendingByCategory: combinedSpendingByCategory,
      monthlyTrends: combinedMonthlyTrends,
      balanceOverTime: combinedBalanceOverTime,
      incomeVsExpenses: combinedIncomeVsExpenses,
      budgetPerformance: combinedBudgetPerformance,
      goalsProgress: combinedGoalsProgress,
      loanSummary: combinedLoanSummary,
    };

    return {
      context: 'combined',
      primaryCurrency,
      local: localAnalytics,
      home: homeAnalytics,
      combined: combinedAnalytics,
    };
  }

  /**
   * Get spending by category filtered by context
   */
  private async getSpendingByCategoryWithContext(
    userId: string,
    context: 'local' | 'home',
    startDate?: Date,
    endDate?: Date,
  ): Promise<SpendingByCategory[]> {
    const where: Prisma.FinanceTransactionWhereInput = {
      userId,
      type: 'expense',
      context,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const transactions = await this.prisma.financeTransaction.findMany({
      where,
      select: {
        amount: true,
        category: true,
      },
    });

    const categoryMap = new Map<string, number>();
    let totalAmount = 0;

    transactions.forEach((transaction) => {
      const category = transaction.category || 'Uncategorized';
      const currentAmount = categoryMap.get(category) || 0;
      categoryMap.set(category, currentAmount + transaction.amount);
      totalAmount += transaction.amount;
    });

    const result: SpendingByCategory[] = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percentage:
          totalAmount > 0
            ? Math.round((amount / totalAmount) * 10000) / 100
            : 0,
      }),
    );

    return result.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get monthly trends filtered by context
   */
  private async getMonthlyTrendsWithContext(
    userId: string,
    context: 'local' | 'home',
    months: number = 6,
  ): Promise<MonthlyTrend[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.prisma.financeTransaction.findMany({
      where: {
        userId,
        context,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        type: true,
        amount: true,
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const monthlyMap = new Map<string, { income: number; expense: number }>();

    transactions.forEach((transaction) => {
      const monthKey = transaction.date.toISOString().substring(0, 7);
      const monthData = monthlyMap.get(monthKey) || { income: 0, expense: 0 };

      if (transaction.type === 'income') {
        monthData.income += transaction.amount;
      } else {
        monthData.expense += transaction.amount;
      }

      monthlyMap.set(monthKey, monthData);
    });

    const result: MonthlyTrend[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income * 100) / 100,
        expense: Math.round(data.expense * 100) / 100,
        net: Math.round((data.income - data.expense) * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return result;
  }

  /**
   * Get balance over time filtered by context
   */
  private async getBalanceOverTimeWithContext(
    userId: string,
    context: 'local' | 'home',
    days: number = 30,
  ): Promise<BalanceOverTime[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await this.prisma.financeTransaction.findMany({
      where: {
        userId,
        context,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        type: true,
        amount: true,
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calculate initial balance
    const transactionsBeforeStart =
      await this.prisma.financeTransaction.findMany({
        where: {
          userId,
          context,
          date: {
            lt: startDate,
          },
        },
        select: {
          type: true,
          amount: true,
        },
      });

    let initialBalance = 0;
    transactionsBeforeStart.forEach((transaction) => {
      const change =
        transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount;
      initialBalance += change;
    });

    const dailyTransactions: { date: string; change: number }[] = [];
    transactions.forEach((transaction) => {
      const dateKey = transaction.date.toISOString().substring(0, 10);
      const change =
        transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount;
      dailyTransactions.push({ date: dateKey, change });
    });

    const balanceMap = new Map<string, number>();
    let currentBalance = initialBalance;

    const startDateKey = startDate.toISOString().substring(0, 10);
    balanceMap.set(startDateKey, currentBalance);

    dailyTransactions.forEach(({ date, change }) => {
      currentBalance = Math.round((currentBalance + change) * 100) / 100;
      balanceMap.set(date, currentBalance);
    });

    const result: BalanceOverTime[] = Array.from(balanceMap.entries())
      .map(([date, balance]) => ({
        date,
        balance: Math.round(balance * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (result.length === 0) {
      const allTransactions = await this.prisma.financeTransaction.findMany({
        where: { userId, context },
        select: { type: true, amount: true },
      });
      const currentTotalBalance = allTransactions.reduce((sum, t) => {
        return sum + (t.type === 'income' ? t.amount : -t.amount);
      }, 0);
      result.push({
        date: endDate.toISOString().substring(0, 10),
        balance: Math.round(currentTotalBalance * 100) / 100,
      });
    }

    return result;
  }

  /**
   * Calculate income vs expenses summary from monthly trends
   */
  private calculateIncomeVsExpenses(trends: MonthlyTrend[]) {
    const totalIncome = trends.reduce((sum, t) => sum + t.income, 0);
    const totalExpenses = trends.reduce((sum, t) => sum + t.expense, 0);
    const net = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      net: Math.round(net * 100) / 100,
      savingsRate: Math.round(savingsRate * 100) / 100,
      periodCount: trends.length,
    };
  }

  /**
   * Get budget performance analytics
   */
  async getBudgetPerformance(userId: string, context?: 'local' | 'home') {
    const where: Prisma.BudgetWhereInput = { userId };
    if (context) {
      where.context = context;
    }

    const budgets = await this.prisma.budget.findMany({
      where,
      include: {
        BudgetTracking: {
          orderBy: { period: 'desc' },
          take: 1, // Current period
        },
      },
    });

    const totalBudgets = budgets.length;
    let budgetsOnTrack = 0;
    let budgetsWarning = 0;
    let budgetsExceeded = 0;
    let totalBudgeted = 0;
    let totalSpent = 0;

    budgets.forEach((budget) => {
      totalBudgeted += budget.amount;
      const currentTracking = budget.BudgetTracking?.[0];
      if (currentTracking) {
        totalSpent += currentTracking.spent;
        if (currentTracking.status === 'on_track') {
          budgetsOnTrack++;
        } else if (currentTracking.status === 'warning') {
          budgetsWarning++;
        } else if (currentTracking.status === 'exceeded') {
          budgetsExceeded++;
        }
      }
    });

    const adherenceRate =
      totalBudgeted > 0 ? (1 - totalSpent / totalBudgeted) * 100 : 100;
    const averageAdherence =
      totalBudgets > 0 ? (budgetsOnTrack / totalBudgets) * 100 : 100;

    return {
      totalBudgets,
      budgetsOnTrack,
      budgetsWarning,
      budgetsExceeded,
      totalBudgeted: Math.round(totalBudgeted * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      adherenceRate: Math.round(adherenceRate * 100) / 100,
      averageAdherence: Math.round(averageAdherence * 100) / 100,
    };
  }

  /**
   * Get goals progress analytics
   */
  async getGoalsProgress(userId: string, context?: 'local' | 'home') {
    const where: Prisma.FinancialGoalWhereInput = { userId };
    if (context) {
      where.context = context;
    }

    const goals = await this.prisma.financialGoal.findMany({
      where,
      select: {
        id: true,
        targetAmount: true,
        currentAmount: true,
        status: true,
      },
    });

    const totalGoals = goals.length;
    const activeGoals = goals.filter((g) => g.status === 'active').length;
    const completedGoals = goals.filter((g) => g.status === 'completed').length;
    const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrentAmount = goals.reduce(
      (sum, g) => sum + g.currentAmount,
      0,
    );
    const overallProgress =
      totalTargetAmount > 0
        ? (totalCurrentAmount / totalTargetAmount) * 100
        : 0;

    // Calculate average progress per goal
    const progressPerGoal = goals.map((g) =>
      g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0,
    );
    const averageProgress =
      progressPerGoal.length > 0
        ? progressPerGoal.reduce((sum, p) => sum + p, 0) /
          progressPerGoal.length
        : 0;

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      totalTargetAmount: Math.round(totalTargetAmount * 100) / 100,
      totalCurrentAmount: Math.round(totalCurrentAmount * 100) / 100,
      overallProgress: Math.round(overallProgress * 100) / 100,
      averageProgress: Math.round(averageProgress * 100) / 100,
    };
  }

  /**
   * Get loan summary analytics
   */
  async getLoanSummary(userId: string, context?: 'local' | 'home') {
    const where: Prisma.LoanWhereInput = { userId };
    if (context) {
      where.context = context;
    }

    const loans = await this.prisma.loan.findMany({
      where,
    });

    // Get all loan IDs
    const loanIds = loans.map((l) => l.id);

    // Fetch payments for all loans
    const payments = await this.prisma.loanPayment.findMany({
      where: {
        loanId: { in: loanIds },
      },
      select: {
        loanId: true,
        interestPaid: true,
      },
    });

    // Group payments by loanId
    const paymentsByLoan = new Map<string, number>();
    payments.forEach((p) => {
      const current = paymentsByLoan.get(p.loanId) || 0;
      paymentsByLoan.set(p.loanId, current + p.interestPaid);
    });

    const totalLoans = loans.length;
    const activeLoans = loans.filter((l) => l.status === 'active').length;
    const completedLoans = loans.filter((l) => l.status === 'completed').length;
    const totalPrincipal = loans.reduce((sum, l) => sum + l.principalAmount, 0);
    const totalRemaining = loans.reduce((sum, l) => sum + l.remainingAmount, 0);
    const totalPaid = totalPrincipal - totalRemaining;

    // Calculate total interest paid
    const totalInterestPaid = loans.reduce((sum, l) => {
      return sum + (paymentsByLoan.get(l.id) || 0);
    }, 0);

    return {
      totalLoans,
      activeLoans,
      completedLoans,
      totalPrincipal: Math.round(totalPrincipal * 100) / 100,
      totalRemaining: Math.round(totalRemaining * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
      progressPercentage:
        totalPrincipal > 0
          ? Math.round((totalPaid / totalPrincipal) * 10000) / 100
          : 0,
    };
  }

  /**
   * Get ride analytics for a user
   * Includes: total rides, as driver vs passenger, spending trends, top routes, top companions
   */
  async getRideAnalytics(
    userId: string,
    months: number = 6,
    startDate?: Date,
    endDate?: Date,
  ) {
    const end = endDate || new Date();
    const start =
      startDate ||
      (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - months);
        return date;
      })();

    // Get all rides where user is involved (as driver or participant)
    const [ridesAsDriver, ridesAsParticipant] = await Promise.all([
      // Rides where user is the driver
      this.prisma.ride.findMany({
        where: {
          driverId: userId,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          RideParticipant: {
            include: {
              User: {
                select: {
                  id: true,
                  email: true,
                  UserProfile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      // Rides where user is a participant (not driver)
      this.prisma.ride.findMany({
        where: {
          RideParticipant: {
            some: {
              userId,
              isDriver: false,
            },
          },
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          RideParticipant: {
            include: {
              User: {
                select: {
                  id: true,
                  email: true,
                  UserProfile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
          User: {
            select: {
              id: true,
              email: true,
              UserProfile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Calculate statistics
    const totalRides = ridesAsDriver.length + ridesAsParticipant.length;
    const ridesAsDriverCount = ridesAsDriver.length;
    const ridesAsPassengerCount = ridesAsParticipant.length;

    // Calculate total spending (from ride expenses via ExpenseSplit)
    const allRideIds = [
      ...ridesAsDriver.map((r) => r.id),
      ...ridesAsParticipant.map((r) => r.id),
    ];
    let totalSpent = 0;
    let monthlySpending: Array<{
      month: string;
      amount: number;
      rides: number;
    }> = [];
    let spendingByType: Array<{
      type: 'giveRide' | 'rideshare';
      amount: number;
      count: number;
    }> = [];

    if (allRideIds.length > 0) {
      // Get expenses for these rides and user's splits
      const rideExpenses = await this.prisma.expense.findMany({
        where: {
          rideId: { in: allRideIds },
        },
        include: {
          ExpenseSplit: {
            where: { userId },
          },
        },
      });

      totalSpent = rideExpenses.reduce((sum, expense) => {
        const userSplit = expense.ExpenseSplit.find((s) => s.userId === userId);
        return sum + (userSplit?.amount || 0);
      }, 0);

      // Monthly spending trends
      const monthlyMap = new Map<string, { amount: number; rides: number }>();
      rideExpenses.forEach((expense) => {
        const monthKey = expense.date.toISOString().substring(0, 7); // "YYYY-MM"
        const userSplit = expense.ExpenseSplit.find((s) => s.userId === userId);
        const existing = monthlyMap.get(monthKey) || { amount: 0, rides: 0 };
        existing.amount += userSplit?.amount || 0;
        existing.rides += 1;
        monthlyMap.set(monthKey, existing);
      });
      monthlySpending = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Spending by ride type (use rideId from expense to find the ride)
      const typeMap = new Map<
        'giveRide' | 'rideshare',
        { amount: number; count: number }
      >();
      for (const expense of rideExpenses) {
        if (expense.rideId) {
          const ride = [...ridesAsDriver, ...ridesAsParticipant].find(
            (r) => r.id === expense.rideId,
          );
          if (ride) {
            const userSplit = expense.ExpenseSplit.find(
              (s) => s.userId === userId,
            );
            const existing = typeMap.get(
              ride.type as 'giveRide' | 'rideshare',
            ) || { amount: 0, count: 0 };
            existing.amount += userSplit?.amount || 0;
            existing.count += 1;
            typeMap.set(ride.type as 'giveRide' | 'rideshare', existing);
          }
        }
      }
      spendingByType = Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        ...data,
      }));
    }

    // Top routes (most frequent origin → destination)
    const routeMap = new Map<
      string,
      { route: string; origin: string; destination: string; count: number }
    >();
    [...ridesAsDriver, ...ridesAsParticipant].forEach((ride) => {
      const routeKey = `${ride.origin} → ${ride.destination}`;
      const existing = routeMap.get(routeKey) || {
        route: routeKey,
        origin: ride.origin,
        destination: ride.destination,
        count: 0,
      };
      existing.count += 1;
      routeMap.set(routeKey, existing);
    });
    const topRoutes = Array.from(routeMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top companions (users most frequently ridden with)
    const companionMap = new Map<
      string,
      {
        userId: string;
        displayName: string;
        avatarUrl: string | null;
        rides: number;
        totalSpent: number;
      }
    >();
    [...ridesAsDriver, ...ridesAsParticipant].forEach((ride) => {
      ride.RideParticipant.forEach((participant) => {
        if (participant.userId !== userId) {
          const existing = companionMap.get(participant.userId) || {
            userId: participant.userId,
            displayName:
              participant.User.UserProfile?.displayName ||
              participant.User.email,
            avatarUrl: participant.User.UserProfile?.avatarUrl || null,
            rides: 0,
            totalSpent: 0,
          };
          existing.rides += 1;
          companionMap.set(participant.userId, existing);
        }
      });
    });

    // Calculate total spent per companion (from ride expenses with that companion)
    for (const companionId of companionMap.keys()) {
      const ridesWithCompanion = [
        ...ridesAsDriver,
        ...ridesAsParticipant,
      ].filter((ride) =>
        ride.RideParticipant.some((p) => p.userId === companionId),
      );
      const rideIds = ridesWithCompanion.map((r) => r.id);
      if (rideIds.length > 0) {
        const expenses = await this.prisma.expense.findMany({
          where: {
            rideId: { in: rideIds },
          },
          include: {
            ExpenseSplit: {
              where: { userId },
            },
          },
        });
        const total = expenses.reduce((sum, expense) => {
          const userSplit = expense.ExpenseSplit.find(
            (s) => s.userId === userId,
          );
          return sum + (userSplit?.amount || 0);
        }, 0);
        const companion = companionMap.get(companionId);
        if (companion) {
          companion.totalSpent = total;
        }
      }
    }

    const topCompanions = Array.from(companionMap.values())
      .sort((a, b) => b.rides - a.rides)
      .slice(0, 10);

    // Spending by group (ride expenses grouped by groupId)
    const groupMap = new Map<
      string,
      { groupId: string; groupName: string; amount: number; rides: number }
    >();
    if (allRideIds.length > 0) {
      const expenses = await this.prisma.expense.findMany({
        where: {
          rideId: { in: allRideIds },
          groupId: { not: null },
        },
        include: {
          ExpenseSplit: {
            where: { userId },
          },
          Group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expenses.forEach((expense) => {
        if (expense.groupId && expense.Group) {
          const userSplit = expense.ExpenseSplit.find(
            (s) => s.userId === userId,
          );
          const existing = groupMap.get(expense.groupId) || {
            groupId: expense.groupId,
            groupName: expense.Group.name,
            amount: 0,
            rides: 0,
          };
          existing.amount += userSplit?.amount || 0;
          existing.rides += 1;
          groupMap.set(expense.groupId, existing);
        }
      });
    }

    const spendingByGroup = Array.from(groupMap.values()).sort(
      (a, b) => b.amount - a.amount,
    );

    return {
      summary: {
        totalRides,
        ridesAsDriver: ridesAsDriverCount,
        ridesAsPassenger: ridesAsPassengerCount,
        totalSpent: Math.round(totalSpent * 100) / 100,
      },
      monthlyTrends: monthlySpending.map((t) => ({
        ...t,
        amount: Math.round(t.amount * 100) / 100,
      })),
      spendingByType,
      topRoutes,
      topCompanions: topCompanions.map((c) => ({
        ...c,
        totalSpent: Math.round(c.totalSpent * 100) / 100,
      })),
      spendingByGroup: spendingByGroup.map((g) => ({
        ...g,
        amount: Math.round(g.amount * 100) / 100,
      })),
    };
  }
}
