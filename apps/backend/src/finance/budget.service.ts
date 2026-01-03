import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get period string for a given date based on period type
   */
  private getPeriodString(date: Date, period: 'weekly' | 'monthly' | 'yearly'): string {
    const year = date.getFullYear();
    
    if (period === 'yearly') {
      return year.toString();
    } else if (period === 'monthly') {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    } else {
      // Weekly: Use ISO week format (YYYY-W##)
      const week = this.getISOWeek(date);
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
  }

  /**
   * Get ISO week number for a date
   */
  private getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Get start and end dates for a period
   */
  private getPeriodDates(date: Date, period: 'weekly' | 'monthly' | 'yearly'): { start: Date; end: Date } {
    if (period === 'yearly') {
      return {
        start: new Date(date.getFullYear(), 0, 1),
        end: new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    } else if (period === 'monthly') {
      return {
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    } else {
      // Weekly: ISO week
      const dayOfWeek = date.getDay() || 7; // Convert Sunday (0) to 7
      const start = new Date(date);
      start.setDate(date.getDate() - dayOfWeek + 1); // Monday of the week
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Sunday of the week
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }

  /**
   * Calculate spent amount for a budget in a specific period
   */
  private async calculateSpentAmount(
    budgetId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      select: {
        category: true,
        accountId: true,
        context: true,
        userId: true,
      },
    });

    if (!budget) {
      return 0;
    }

    // Build query conditions
    const where: any = {
      userId: budget.userId,
      context: budget.context,
      type: 'expense',
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    // If budget has a category, filter by category
    if (budget.category) {
      where.category = budget.category;
    }

    // If budget has an account, filter by account
    if (budget.accountId) {
      where.accountId = budget.accountId;
    }

    // Calculate total spent
    const transactions = await this.prisma.financeTransaction.findMany({
      where,
      select: {
        amount: true,
      },
    });

    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  /**
   * Update or create budget tracking for a period
   */
  private async updateBudgetTracking(
    budgetId: string,
    period: string,
    periodStart: Date,
    periodEnd: Date,
    budgetedAmount: number,
  ): Promise<void> {
    const spent = await this.calculateSpentAmount(budgetId, periodStart, periodEnd);

    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      select: {
        warningThreshold: true,
      },
    });

    if (!budget) {
      return;
    }

    // Calculate status
    const percentageUsed = budgetedAmount > 0 ? (spent / budgetedAmount) * 100 : 0;
    let status = 'on_track';
    if (percentageUsed >= 100) {
      status = 'exceeded';
    } else if (percentageUsed >= budget.warningThreshold) {
      status = 'warning';
    }

    // Upsert tracking record
    await this.prisma.budgetTracking.upsert({
      where: {
        budgetId_period: {
          budgetId,
          period,
        },
      },
      create: {
        budgetId,
        period,
        spent,
        budgeted: budgetedAmount,
        status,
      },
      update: {
        spent,
        budgeted: budgetedAmount,
        status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Create a new budget
   */
  async createBudget(userId: string, createBudgetDto: CreateBudgetDto) {
    // Validate account if provided
    if (createBudgetDto.accountId) {
      const account = await this.prisma.financeAccount.findFirst({
        where: {
          id: createBudgetDto.accountId,
          userId,
        },
      });

      if (!account) {
        throw new BadRequestException('Account not found');
      }

      // Validate context matches
      if (createBudgetDto.context && account.context !== createBudgetDto.context) {
        throw new BadRequestException('Account context does not match budget context');
      }
    }

    const budget = await this.prisma.budget.create({
      data: {
        userId,
        name: createBudgetDto.name,
        category: createBudgetDto.category,
        amount: createBudgetDto.amount,
        period: createBudgetDto.period || 'monthly',
        startDate: new Date(createBudgetDto.startDate),
        endDate: createBudgetDto.endDate ? new Date(createBudgetDto.endDate) : null,
        accountId: createBudgetDto.accountId,
        warningThreshold: createBudgetDto.warningThreshold || 80,
        context: createBudgetDto.context || 'local',
      },
    });

    // Calculate initial tracking for current period
    const now = new Date();
    const periodDates = this.getPeriodDates(now, budget.period as 'weekly' | 'monthly' | 'yearly');
    const period = this.getPeriodString(now, budget.period as 'weekly' | 'monthly' | 'yearly');
    await this.updateBudgetTracking(budget.id, period, periodDates.start, periodDates.end, budget.amount);

    return this.getBudgetById(userId, budget.id);
  }

  /**
   * Get budgets for a user, optionally filtered by context
   */
  async getBudgets(userId: string, context?: 'local' | 'home') {
    const where: any = { userId };
    if (context) {
      where.context = context;
    }

    const budgets = await this.prisma.budget.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        tracking: {
          orderBy: { period: 'desc' },
          take: 12, // Last 12 periods
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add current period tracking to each budget
    const now = new Date();
    const budgetsWithTracking = await Promise.all(
      budgets.map(async (budget) => {
        const periodDates = this.getPeriodDates(now, budget.period as 'weekly' | 'monthly' | 'yearly');
        const period = this.getPeriodString(now, budget.period as 'weekly' | 'monthly' | 'yearly');
        
        // Update current period tracking
        await this.updateBudgetTracking(
          budget.id,
          period,
          periodDates.start,
          periodDates.end,
          budget.amount,
        );

        // Get current tracking
        const currentTracking = await this.prisma.budgetTracking.findUnique({
          where: {
            budgetId_period: {
              budgetId: budget.id,
              period,
            },
          },
        });

        return {
          ...budget,
          currentTracking: currentTracking || {
            period,
            spent: 0,
            budgeted: budget.amount,
            status: 'on_track',
          },
        };
      }),
    );

    return budgetsWithTracking;
  }

  /**
   * Get a budget by ID with full details and tracking
   */
  async getBudgetById(userId: string, budgetId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        tracking: {
          orderBy: { period: 'desc' },
          take: 24, // Last 24 periods for history
        },
        transactions: {
          orderBy: { date: 'desc' },
          take: 50, // Recent transactions
        },
      },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // Update current period tracking
    const now = new Date();
    const periodDates = this.getPeriodDates(now, budget.period as 'weekly' | 'monthly' | 'yearly');
    const period = this.getPeriodString(now, budget.period as 'weekly' | 'monthly' | 'yearly');
    
    await this.updateBudgetTracking(
      budget.id,
      period,
      periodDates.start,
      periodDates.end,
      budget.amount,
    );

    // Get updated current tracking
    const currentTracking = await this.prisma.budgetTracking.findUnique({
      where: {
        budgetId_period: {
          budgetId: budget.id,
          period,
        },
      },
    });

    return {
      ...budget,
      currentTracking: currentTracking || {
        period,
        spent: 0,
        budgeted: budget.amount,
        status: 'on_track',
      },
    };
  }

  /**
   * Update a budget
   */
  async updateBudget(userId: string, budgetId: string, updateBudgetDto: UpdateBudgetDto) {
    // Verify budget belongs to user
    const existingBudget = await this.prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
    });

    if (!existingBudget) {
      throw new NotFoundException('Budget not found');
    }

    // Validate account if provided
    if (updateBudgetDto.accountId) {
      const account = await this.prisma.financeAccount.findFirst({
        where: {
          id: updateBudgetDto.accountId,
          userId,
        },
      });

      if (!account) {
        throw new BadRequestException('Account not found');
      }

      // Validate context matches
      if (account.context !== existingBudget.context) {
        throw new BadRequestException('Account context does not match budget context');
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (updateBudgetDto.name !== undefined) updateData.name = updateBudgetDto.name;
    if (updateBudgetDto.category !== undefined) updateData.category = updateBudgetDto.category;
    if (updateBudgetDto.amount !== undefined) updateData.amount = updateBudgetDto.amount;
    if (updateBudgetDto.period !== undefined) updateData.period = updateBudgetDto.period;
    if (updateBudgetDto.startDate !== undefined) updateData.startDate = new Date(updateBudgetDto.startDate);
    if (updateBudgetDto.endDate !== undefined) {
      updateData.endDate = updateBudgetDto.endDate ? new Date(updateBudgetDto.endDate) : null;
    }
    if (updateBudgetDto.accountId !== undefined) updateData.accountId = updateBudgetDto.accountId;
    if (updateBudgetDto.warningThreshold !== undefined) updateData.warningThreshold = updateBudgetDto.warningThreshold;

    const updatedBudget = await this.prisma.budget.update({
      where: { id: budgetId },
      data: updateData,
    });

    // Update current period tracking if amount or period changed
    if (updateBudgetDto.amount !== undefined || updateBudgetDto.period !== undefined) {
      const now = new Date();
      const periodDates = this.getPeriodDates(
        now,
        updatedBudget.period as 'weekly' | 'monthly' | 'yearly',
      );
      const period = this.getPeriodString(now, updatedBudget.period as 'weekly' | 'monthly' | 'yearly');
      await this.updateBudgetTracking(
        updatedBudget.id,
        period,
        periodDates.start,
        periodDates.end,
        updatedBudget.amount,
      );
    }

    return this.getBudgetById(userId, budgetId);
  }

  /**
   * Delete a budget
   */
  async deleteBudget(userId: string, budgetId: string) {
    // Verify budget belongs to user
    const budget = await this.prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // Delete budget (tracking records will be cascade deleted)
    await this.prisma.budget.delete({
      where: { id: budgetId },
    });

    // Unlink transactions from this budget
    await this.prisma.financeTransaction.updateMany({
      where: { budgetId },
      data: { budgetId: null },
    });

    return { success: true };
  }

  /**
   * Get budget tracking data for a specific period
   */
  async getBudgetTracking(userId: string, budgetId: string, period?: string) {
    const budget = await this.prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    const targetPeriod = period || this.getPeriodString(new Date(), budget.period as 'weekly' | 'monthly' | 'yearly');
    const now = new Date();
    const periodDates = this.getPeriodDates(now, budget.period as 'weekly' | 'monthly' | 'yearly');

    // Update tracking for the requested period
    await this.updateBudgetTracking(budget.id, targetPeriod, periodDates.start, periodDates.end, budget.amount);

    const tracking = await this.prisma.budgetTracking.findUnique({
      where: {
        budgetId_period: {
          budgetId,
          period: targetPeriod,
        },
      },
    });

    if (!tracking) {
      // Return default tracking if not found
      return {
        period: targetPeriod,
        spent: 0,
        budgeted: budget.amount,
        status: 'on_track',
      };
    }

    return tracking;
  }

  /**
   * Update budget tracking when a transaction is created/updated/deleted
   * This should be called from FinanceService when transactions change
   */
  async updateBudgetsForTransaction(
    userId: string,
    transaction: {
      type: string;
      amount: number;
      category?: string;
      context: string;
      accountId?: string;
      date: Date;
    },
  ): Promise<void> {
    // Only update budgets for expenses
    if (transaction.type !== 'expense') {
      return;
    }

    // Find matching budgets
    // A budget matches if:
    // 1. Category-based: category matches AND (budget has no accountId OR accountId matches)
    // 2. Account-based: no category AND accountId matches
    // 3. Overall: no category AND no accountId
    const whereConditions: any[] = [];

    if (transaction.category) {
      // Category-based budgets that match this category
      whereConditions.push({
        category: transaction.category,
        OR: transaction.accountId
          ? [{ accountId: transaction.accountId }, { accountId: null }]
          : [{ accountId: null }],
      });
    }

    // Account-based or overall budgets (no category)
    whereConditions.push({
      category: null,
      OR: transaction.accountId
        ? [{ accountId: transaction.accountId }, { accountId: null }]
        : [{ accountId: null }],
    });

    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        context: transaction.context,
        OR: whereConditions,
      },
    });

    // Update tracking for each matching budget
    for (const budget of budgets) {
      const periodDates = this.getPeriodDates(
        transaction.date,
        budget.period as 'weekly' | 'monthly' | 'yearly',
      );
      const period = this.getPeriodString(transaction.date, budget.period as 'weekly' | 'monthly' | 'yearly');
      await this.updateBudgetTracking(budget.id, period, periodDates.start, periodDates.end, budget.amount);
    }
  }
}

