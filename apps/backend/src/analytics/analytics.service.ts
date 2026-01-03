import { Injectable } from '@nestjs/common';
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
    const where: any = {
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
    const result: SpendingByCategory[] = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
      percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 10000) / 100 : 0, // Round to 2 decimal places
    }));

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
    const transactionsBeforeStart = await this.prisma.financeTransaction.findMany({
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
      const change = transaction.type === 'income' ? transaction.amount : -transaction.amount;
      initialBalance += change;
    });

    // Group transactions by date
    const dailyTransactions: { date: string; change: number }[] = [];

    transactions.forEach((transaction) => {
      const dateKey = transaction.date.toISOString().substring(0, 10); // "YYYY-MM-DD"
      const change = transaction.type === 'income' ? transaction.amount : -transaction.amount;
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
    const where: any = {
      userId, // Expense splits for this user
      expense: {
        // Filter by expense date if provided
      },
    };

    if (startDate || endDate) {
      where.expense.date = {};
      if (startDate) where.expense.date.gte = startDate;
      if (endDate) where.expense.date.lte = endDate;
    }

    // Get all expense splits for this user
    const splits = await this.prisma.expenseSplit.findMany({
      where,
      include: {
        expense: {
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
      const category = split.expense.category || 'Uncategorized';
      const currentAmount = categoryMap.get(category) || 0;
      categoryMap.set(category, currentAmount + split.amount);
      totalAmount += split.amount;
    });

    // Convert to array and calculate percentages
    const result: ExpenseSpendingByCategory[] = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 10000) / 100 : 0,
      }),
    );

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
        expense: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        expense: {
          select: {
            date: true,
          },
        },
      },
    });

    // Group by month
    const monthlyMap = new Map<string, number>();

    splits.forEach((split) => {
      const monthKey = split.expense.date.toISOString().substring(0, 7); // "YYYY-MM"
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
  async getTopSpendersInGroup(groupId: string, limit: number = 10): Promise<TopSpender[]> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        groupId,
      },
      include: {
        createdByUser: {
          include: {
            profile: {
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
    const userMap = new Map<string, { user: any; total: number }>();

    expenses.forEach((expense) => {
      const userId = expense.createdBy;
      const current = userMap.get(userId) || {
        user: expense.createdByUser,
        total: 0,
      };
      current.total += expense.amount;
      userMap.set(userId, current);
    });

    // Convert to array and sort
    const result: TopSpender[] = Array.from(userMap.values())
      .map(({ user, total }) => ({
        userId: user.id,
        displayName: user.profile?.displayName || user.email.split('@')[0],
        email: user.email,
        avatarUrl: user.profile?.avatarUrl || null,
        totalSpent: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);

    return result;
  }
}

