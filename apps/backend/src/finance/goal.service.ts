import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AddContributionDto } from './dto/add-contribution.dto';

@Injectable()
export class GoalService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new financial goal
   */
  async createGoal(userId: string, createGoalDto: CreateGoalDto) {
    // Validate account if provided
    if (createGoalDto.accountId) {
      const account = await this.prisma.financeAccount.findFirst({
        where: {
          id: createGoalDto.accountId,
          userId,
        },
      });

      if (!account) {
        throw new BadRequestException('Account not found');
      }

      // Validate context matches
      if (createGoalDto.context && account.context !== createGoalDto.context) {
        throw new BadRequestException('Account context does not match goal context');
      }
    }

    const goal = await this.prisma.financialGoal.create({
      data: {
        userId,
        name: createGoalDto.name,
        targetAmount: createGoalDto.targetAmount,
        currentAmount: createGoalDto.currentAmount || 0,
        targetDate: createGoalDto.targetDate ? new Date(createGoalDto.targetDate) : null,
        category: createGoalDto.category || 'savings',
        priority: createGoalDto.priority || 'medium',
        status: 'active',
        accountId: createGoalDto.accountId,
        context: createGoalDto.context || 'local',
      },
    });

    return this.getGoalById(userId, goal.id);
  }

  /**
   * Get goals for a user, optionally filtered by context
   */
  async getGoals(userId: string, context?: 'local' | 'home', status?: string) {
    const where: any = { userId };
    if (context) {
      where.context = context;
    }
    if (status) {
      where.status = status;
    }

    const goals = await this.prisma.financialGoal.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        contributions: {
          orderBy: { date: 'desc' },
          take: 10, // Recent contributions
        },
      },
      orderBy: [
        { priority: 'desc' }, // High priority first
        { createdAt: 'desc' },
      ],
    });

    return goals;
  }

  /**
   * Get a goal by ID with full details
   */
  async getGoalById(userId: string, goalId: string) {
    const goal = await this.prisma.financialGoal.findFirst({
      where: {
        id: goalId,
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
        contributions: {
          orderBy: { date: 'desc' },
          include: {
            transaction: {
              select: {
                id: true,
                type: true,
                amount: true,
                description: true,
                date: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { date: 'desc' },
          take: 20, // Recent transactions
        },
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return goal;
  }

  /**
   * Update a goal
   */
  async updateGoal(userId: string, goalId: string, updateGoalDto: UpdateGoalDto) {
    // Verify goal belongs to user
    const existingGoal = await this.prisma.financialGoal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });

    if (!existingGoal) {
      throw new NotFoundException('Goal not found');
    }

    // Validate account if provided
    if (updateGoalDto.accountId) {
      const account = await this.prisma.financeAccount.findFirst({
        where: {
          id: updateGoalDto.accountId,
          userId,
        },
      });

      if (!account) {
        throw new BadRequestException('Account not found');
      }

      // Validate context matches
      if (account.context !== existingGoal.context) {
        throw new BadRequestException('Account context does not match goal context');
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (updateGoalDto.name !== undefined) updateData.name = updateGoalDto.name;
    if (updateGoalDto.targetAmount !== undefined) updateData.targetAmount = updateGoalDto.targetAmount;
    if (updateGoalDto.currentAmount !== undefined) updateData.currentAmount = updateGoalDto.currentAmount;
    if (updateGoalDto.targetDate !== undefined) {
      updateData.targetDate = updateGoalDto.targetDate ? new Date(updateGoalDto.targetDate) : null;
    }
    if (updateGoalDto.category !== undefined) updateData.category = updateGoalDto.category;
    if (updateGoalDto.priority !== undefined) updateData.priority = updateGoalDto.priority;
    if (updateGoalDto.accountId !== undefined) updateData.accountId = updateGoalDto.accountId;
    if (updateGoalDto.status !== undefined) {
      updateData.status = updateGoalDto.status;
      // Set completedAt if status is completed
      if (updateGoalDto.status === 'completed' && existingGoal.status !== 'completed') {
        updateData.completedAt = new Date();
      } else if (updateGoalDto.status !== 'completed') {
        updateData.completedAt = null;
      }
    }

    await this.prisma.financialGoal.update({
      where: { id: goalId },
      data: updateData,
    });

    return this.getGoalById(userId, goalId);
  }

  /**
   * Delete a goal
   */
  async deleteGoal(userId: string, goalId: string) {
    // Verify goal belongs to user
    const goal = await this.prisma.financialGoal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Delete goal (contributions will be cascade deleted)
    await this.prisma.financialGoal.delete({
      where: { id: goalId },
    });

    // Unlink transactions from this goal
    await this.prisma.financeTransaction.updateMany({
      where: { goalId },
      data: { goalId: null },
    });

    return { success: true };
  }

  /**
   * Add a contribution to a goal
   */
  async addContribution(
    userId: string,
    goalId: string,
    addContributionDto: AddContributionDto,
  ) {
    // Verify goal belongs to user
    const goal = await this.prisma.financialGoal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (goal.status !== 'active') {
      throw new BadRequestException('Cannot add contributions to a non-active goal');
    }

    // Validate transaction if provided
    if (addContributionDto.transactionId) {
      const transaction = await this.prisma.financeTransaction.findFirst({
        where: {
          id: addContributionDto.transactionId,
          userId,
        },
      });

      if (!transaction) {
        throw new BadRequestException('Transaction not found');
      }

      // Check if transaction is already linked to a contribution
      const existingContribution = await this.prisma.goalContribution.findUnique({
        where: { transactionId: addContributionDto.transactionId },
      });

      if (existingContribution) {
        throw new BadRequestException('Transaction is already linked to a contribution');
      }
    }

    const contributionDate = addContributionDto.date
      ? new Date(addContributionDto.date)
      : new Date();

    // Create contribution
    const contribution = await this.prisma.goalContribution.create({
      data: {
        goalId,
        amount: addContributionDto.amount,
        date: contributionDate,
        transactionId: addContributionDto.transactionId || null,
        notes: addContributionDto.notes || null,
      },
    });

    // Update goal's current amount
    const newCurrentAmount = goal.currentAmount + addContributionDto.amount;
    const updateData: any = {
      currentAmount: newCurrentAmount,
    };

    // Auto-complete goal if target reached
    if (newCurrentAmount >= goal.targetAmount && goal.status === 'active') {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    }

    await this.prisma.financialGoal.update({
      where: { id: goalId },
      data: updateData,
    });

    // Link transaction to goal if provided
    if (addContributionDto.transactionId) {
      await this.prisma.financeTransaction.update({
        where: { id: addContributionDto.transactionId },
        data: { goalId },
      });
    }

    return this.getGoalById(userId, goalId);
  }

  /**
   * Delete a contribution
   */
  async deleteContribution(userId: string, goalId: string, contributionId: string) {
    // Verify goal belongs to user
    const goal = await this.prisma.financialGoal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Get contribution
    const contribution = await this.prisma.goalContribution.findFirst({
      where: {
        id: contributionId,
        goalId,
      },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    // Delete contribution
    await this.prisma.goalContribution.delete({
      where: { id: contributionId },
    });

    // Update goal's current amount
    const newCurrentAmount = Math.max(0, goal.currentAmount - contribution.amount);
    const updateData: any = {
      currentAmount: newCurrentAmount,
    };

    // If goal was completed but now below target, reactivate it
    if (goal.status === 'completed' && newCurrentAmount < goal.targetAmount) {
      updateData.status = 'active';
      updateData.completedAt = null;
    }

    await this.prisma.financialGoal.update({
      where: { id: goalId },
      data: updateData,
    });

    // Unlink transaction if it was linked
    if (contribution.transactionId) {
      await this.prisma.financeTransaction.update({
        where: { id: contribution.transactionId },
        data: { goalId: null },
      });
    }

    return this.getGoalById(userId, goalId);
  }

  /**
   * Calculate days remaining until target date
   */
  calculateDaysRemaining(targetDate: Date | null): number | null {
    if (!targetDate) return null;
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress(currentAmount: number, targetAmount: number): number {
    if (targetAmount <= 0) return 0;
    return Math.min((currentAmount / targetAmount) * 100, 100);
  }
}

