import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { CategorizationService } from '../shared/categorization.service';
import { CurrencyService } from '../shared/currency.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationService } from '../notification/notification.service';
import { FinanceService } from '../finance/finance.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ExpenseService {
  constructor(
    private prisma: PrismaService,
    private categorizationService: CategorizationService,
    private currencyService: CurrencyService,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => TrustScoreService))
    private trustScoreService: TrustScoreService,
    @Inject(forwardRef(() => FinanceService))
    private financeService: FinanceService,
  ) {}

  async createExpense(userId: string, createExpenseDto: CreateExpenseDto) {
    const splitType = createExpenseDto.splitType || 'EQUAL';
    const paidBy = createExpenseDto.paidBy || userId; // Default to creator if not specified

    // Validate split type and amounts
    if (splitType === 'CUSTOM') {
      // For custom splits, validate that amounts sum to total
      const totalSplitAmount = createExpenseDto.splits.reduce(
        (sum, split) => sum + split.amount,
        0,
      );
      if (Math.abs(totalSplitAmount - createExpenseDto.amount) > 0.01) {
        throw new BadRequestException(
          `Split amounts (${totalSplitAmount}) must equal total amount (${createExpenseDto.amount})`,
        );
      }
    } else if (splitType === 'PERCENTAGE') {
      // For percentage splits, validate that percentages sum to 100
      const totalPercentage = createExpenseDto.splits.reduce(
        (sum, split) => sum + (split.percentage || 0),
        0,
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new BadRequestException(
          `Split percentages (${totalPercentage}%) must equal 100%`,
        );
      }
      // Calculate amounts from percentages
      createExpenseDto.splits.forEach(split => {
        if (split.percentage !== undefined) {
          split.amount = (createExpenseDto.amount * split.percentage) / 100;
        }
      });
    } else {
      // EQUAL split - validate amounts sum to total (already calculated by frontend)
      const totalSplitAmount = createExpenseDto.splits.reduce(
        (sum, split) => sum + split.amount,
        0,
      );
      if (Math.abs(totalSplitAmount - createExpenseDto.amount) > 0.01) {
        throw new BadRequestException(
          `Split amounts (${totalSplitAmount}) must equal total amount (${createExpenseDto.amount})`,
        );
      }
    }

    // Validate that paidBy is a participant
    const expenseParticipantIds = createExpenseDto.splits.map(s => s.userId);
    if (!expenseParticipantIds.includes(paidBy)) {
      throw new BadRequestException('PaidBy user must be a participant in the expense');
    }

    // Debug: Log splits being created
    console.log('[ExpenseService] Creating expense with splits:', {
      userId,
      amount: createExpenseDto.amount,
      splits: createExpenseDto.splits.map(s => ({ userId: s.userId, amount: s.amount })),
    });

    // Verify all user IDs exist
    const userIds = createExpenseDto.splits.map((split) => split.userId);
    const uniqueUserIds = [...new Set(userIds)];
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true },
    });

    if (users.length !== uniqueUserIds.length) {
      throw new BadRequestException('One or more user IDs are invalid');
    }

    // If groupId is provided, verify user is member of group
    if (createExpenseDto.groupId) {
      const group = await this.prisma.group.findFirst({
        where: {
          id: createExpenseDto.groupId,
          GroupMember: {
            some: {
              userId,
            },
          },
        },
      });

      if (!group) {
        throw new BadRequestException('Group not found or you are not a member');
      }
    }

    // Auto-categorize expense if category not provided
    let category = createExpenseDto.category;
    if (!category && createExpenseDto.description) {
      const categoryMatch = this.categorizationService.categorizeFinance(
        createExpenseDto.description,
        'expense',
      );
      if (categoryMatch) {
        category = categoryMatch.category;
      }
    }

    // Create expense with splits and history
    const expense = await this.prisma.expense.create({
      data: {
        id: randomUUID(),
        createdBy: userId,
        description: createExpenseDto.description,
        amount: createExpenseDto.amount,
        currency: createExpenseDto.currency || 'USD',
        category: category || null,
        groupId: createExpenseDto.groupId,
        receiptUrl: createExpenseDto.receiptUrl,
        paidBy: paidBy,
        splitType: splitType,
        ExpenseSplit: {
          create: createExpenseDto.splits.map((split) => ({
            id: randomUUID(),
            userId: split.userId,
            amount: split.amount,
            isPaid: false,
          })),
        },
        ExpenseHistory: {
          create: {
            id: randomUUID(),
            action: 'created',
            userId: userId,
            notes: 'Expense created',
          },
        },
      },
      include: {
        ExpenseSplit: {
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
        User_Expense_createdByToUser: {
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
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Create notifications for all participants (except creator)
    const creatorName = expense.User_Expense_createdByToUser.UserProfile?.displayName || expense.User_Expense_createdByToUser.email;
    const participantIds = expense.ExpenseSplit
      .map(split => split.userId)
      .filter(id => id !== userId); // Exclude creator

    // Notify all participants about the new expense
    await Promise.all(
      participantIds.map(participantId =>
        this.notificationService.notifyExpenseAdded(
          participantId,
          expense.id,
          expense.description,
          creatorName,
        ).catch(err => {
          console.error(`Failed to create notification for user ${participantId}:`, err);
        }),
      ),
    );

    // Sync expense splits to finance transactions (Billchop integration)
    // For each split where user is involved and owes money, create finance transaction
    await Promise.all(
      expense.ExpenseSplit.map(async (split) => {
        if (split.amount > 0) {
          // User owes money - create expense transaction in local finance
          try {
            await this.financeService.syncExpenseSplitToFinance(
              split.id,
              split.userId,
              {
                amount: split.amount,
                category: expense.category || 'Other Expense',
                description: expense.description,
                date: expense.date,
                currency: expense.currency,
              },
            );
          } catch (err) {
            console.error(`[ExpenseService] Failed to sync split ${split.id} to finance:`, err);
            // Don't fail expense creation if finance sync fails
          }
        }
      }),
    );

    return expense;
  }

  async getExpenses(userId: string, limit: number = 50, offset: number = 0) {
    // Get all expenses where user is involved (either creator or has a split)
    console.log('[ExpenseService] Getting expenses for user:', userId);
    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          OR: [
            { createdBy: userId },
            { ExpenseSplit: { some: { userId } } },
          ],
        },
        include: {
          ExpenseSplit: {
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
        User_Expense_createdByToUser: {
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
        User_Expense_paidByToUser: {
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
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
        orderBy: {
          date: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.expense.count({
        where: {
          OR: [
            { createdBy: userId },
            { ExpenseSplit: { some: { userId } } },
          ],
        },
      }),
    ]);

    console.log('[ExpenseService] Found expenses:', expenses.length, 'for user:', userId);

    return {
      expenses,
      total,
      limit,
      offset,
      hasMore: offset + expenses.length < total,
    };
  }

  async getExpenseById(userId: string, expenseId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        OR: [
          { createdBy: userId },
          { ExpenseSplit: { some: { userId } } },
        ],
      },
      include: {
        ExpenseSplit: {
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
        User_Expense_createdByToUser: {
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
        User_Expense_paidByToUser: {
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
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async markSplitAsPaid(userId: string, expenseId: string, splitId: string) {
    // Verify the split belongs to the expense and user
    const split = await this.prisma.expenseSplit.findFirst({
      where: {
        id: splitId,
        expenseId,
        userId,
      },
    });

    if (!split) {
      throw new NotFoundException('Expense split not found');
    }

    const updated = await this.prisma.expenseSplit.update({
      where: { id: splitId },
      data: { isPaid: true, paidAt: new Date() },
      include: {
        Expense: {
          include: {
            ExpenseSplit: {
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
            User_Expense_createdByToUser: {
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
            User_Expense_paidByToUser: {
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
            Group: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    // Update trust score for the user who paid
    await this.trustScoreService.updateExpenseScore(userId).catch((err) => {
      console.error('Failed to update trust score after expense payment:', err);
      // Don't throw - trust score update failure shouldn't break the payment
    });

    // Notify expense creator when a split is marked as paid (if creator is different from payer)
    if (updated.Expense.createdBy !== userId) {
      // Get payer info from the split's user relation
      const payer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          UserProfile: { select: { displayName: true } },
        },
      });
      const paidByName = payer?.UserProfile?.displayName || payer?.email || 'Someone';
      await this.notificationService.notifySplitPaid(
        updated.Expense.createdBy,
        updated.Expense.id,
        updated.Expense.description,
        updated.amount,
        updated.Expense.currency,
        paidByName,
      ).catch(err => {
        console.error(`Failed to create notification for expense creator:`, err);
      });
    }

    return updated.Expense;
  }

  async updateReceipt(userId: string, expenseId: string, receiptUrl: string) {
    // Verify expense exists and user has permission
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        OR: [
          { createdBy: userId },
          { ExpenseSplit: { some: { userId } } },
        ],
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found or you do not have permission');
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: { receiptUrl },
      include: {
        ExpenseSplit: {
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
        User_Expense_createdByToUser: {
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
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return updated;
  }

  async updateExpense(userId: string, expenseId: string, updateExpenseDto: UpdateExpenseDto) {
    // Verify expense exists and user has permission (creator only)
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        createdBy: userId,
      },
      include: {
        ExpenseSplit: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found or you do not have permission to edit it');
    }

    // If amount or splits are being updated, validate and recalculate splits
    let recalculatedSplits: { userId: string; amount: number }[] | undefined;
    if (updateExpenseDto.amount !== undefined || updateExpenseDto.splits) {
      const newAmount = updateExpenseDto.amount ?? expense.amount;
      
      if (updateExpenseDto.splits) {
        // User provided new splits - use them
        recalculatedSplits = updateExpenseDto.splits;
      } else if (updateExpenseDto.amount !== undefined && updateExpenseDto.amount !== expense.amount) {
        // Amount changed but splits not provided - recalculate splits proportionally
        const oldTotal = expense.ExpenseSplit.reduce((sum, split) => sum + split.amount, 0);
        if (oldTotal > 0) {
          const ratio = newAmount / oldTotal;
          recalculatedSplits = expense.ExpenseSplit.map((split) => ({
            userId: split.userId,
            amount: Math.round(split.amount * ratio * 100) / 100, // Round to 2 decimals
          }));
          
          // Adjust for rounding errors - add/subtract difference to first split
          const totalRecalculated = recalculatedSplits.reduce((sum, split) => sum + split.amount, 0);
          const difference = newAmount - totalRecalculated;
          if (Math.abs(difference) > 0.01) {
            recalculatedSplits[0].amount = Math.round((recalculatedSplits[0].amount + difference) * 100) / 100;
          }
        } else {
          // No existing splits - can't recalculate
          throw new BadRequestException('Cannot update amount: expense has no splits to recalculate');
        }
      } else {
        // Amount not changed, splits not provided - use existing splits
        recalculatedSplits = expense.ExpenseSplit.map((s) => ({
          userId: s.userId,
          amount: s.amount,
        }));
      }

      // Validate that splits sum equals total amount
      const totalSplitAmount = recalculatedSplits.reduce((sum, split) => sum + split.amount, 0);
      if (Math.abs(totalSplitAmount - newAmount) > 0.01) {
        throw new BadRequestException(
          `Split amounts (${totalSplitAmount}) must equal total amount (${newAmount})`,
        );
      }

      // Verify all user IDs exist
      const userIds = recalculatedSplits.map((split) => split.userId);
      const uniqueUserIds = [...new Set(userIds)];
      const users = await this.prisma.user.findMany({
        where: { id: { in: uniqueUserIds } },
        select: { id: true },
      });

      if (users.length !== uniqueUserIds.length) {
        throw new BadRequestException('One or more user IDs are invalid');
      }
    }

    // Auto-categorize if description changed and category not provided
    let category = updateExpenseDto.category;
    if (!category && updateExpenseDto.description) {
      const categoryMatch = this.categorizationService.categorizeFinance(
        updateExpenseDto.description,
        'expense',
      );
      if (categoryMatch) {
        category = categoryMatch.category;
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (updateExpenseDto.description !== undefined) {
      updateData.description = updateExpenseDto.description;
    }
    if (updateExpenseDto.amount !== undefined) {
      updateData.amount = updateExpenseDto.amount;
    }
    if (updateExpenseDto.currency !== undefined) {
      updateData.currency = updateExpenseDto.currency;
    }
    if (category !== undefined) {
      updateData.category = category;
    }
    if (updateExpenseDto.date !== undefined) {
      updateData.date = new Date(updateExpenseDto.date);
    }
    if (updateExpenseDto.receiptUrl !== undefined) {
      updateData.receiptUrl = updateExpenseDto.receiptUrl;
    }
    if (updateExpenseDto.paidBy !== undefined) {
      // Validate that paidBy is a participant
      const participantIds = expense.ExpenseSplit.map(s => s.userId);
      if (!participantIds.includes(updateExpenseDto.paidBy)) {
        throw new BadRequestException('PaidBy user must be a participant in the expense');
      }
      updateData.paidBy = updateExpenseDto.paidBy;
    }
    if (updateExpenseDto.splitType !== undefined) {
      updateData.splitType = updateExpenseDto.splitType;
    }
    // Note: updatedAt is automatically managed by Prisma (@updatedAt), don't set it manually

    // Track changes for history
    const changes: any = {};
    if (updateExpenseDto.description !== undefined && updateExpenseDto.description !== expense.description) {
      changes.description = { before: expense.description, after: updateExpenseDto.description };
    }
    if (updateExpenseDto.amount !== undefined && updateExpenseDto.amount !== expense.amount) {
      changes.amount = { before: expense.amount, after: updateExpenseDto.amount };
    }
    if (updateExpenseDto.currency !== undefined && updateExpenseDto.currency !== expense.currency) {
      changes.currency = { before: expense.currency, after: updateExpenseDto.currency };
    }
    if (category !== undefined && category !== expense.category) {
      changes.category = { before: expense.category, after: category };
    }
    if (updateExpenseDto.date !== undefined) {
      changes.date = { before: expense.date, after: new Date(updateExpenseDto.date) };
    }
    if (recalculatedSplits) {
      changes.splits = { before: expense.ExpenseSplit.map(s => ({ userId: s.userId, amount: s.amount })), after: recalculatedSplits };
    }

    // If splits need to be updated (either provided or recalculated), delete old splits and create new ones
    if (recalculatedSplits) {
      // Use transaction to ensure atomicity
      return await this.prisma.$transaction(async (tx) => {
        // Delete old splits
        await tx.expenseSplit.deleteMany({
          where: { expenseId },
        });

        // Update expense
        const updated = await tx.expense.update({
          where: { id: expenseId },
          data: {
            ...updateData,
            ExpenseSplit: {
              create: recalculatedSplits.map((split) => ({
                id: randomUUID(),
                userId: split.userId,
                amount: split.amount,
                isPaid: false, // Reset payment status when splits change
              })),
            },
            ExpenseHistory: {
              create: {
                id: randomUUID(),
                action: 'updated',
                userId: userId,
                changes: Object.keys(changes).length > 0 ? changes : undefined,
                notes: Object.keys(changes).length > 0 ? `Updated: ${Object.keys(changes).join(', ')}` : 'Expense updated',
              },
            },
          },
          include: {
            ExpenseSplit: {
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
            User_Expense_createdByToUser: {
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
            User_Expense_paidByToUser: {
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
            Group: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        });

        // Sync updated splits to finance transactions
        await Promise.all(
          updated.ExpenseSplit.map(async (split) => {
            if (split.amount > 0) {
              try {
                await this.financeService.syncExpenseSplitToFinance(
                  split.id,
                  split.userId,
                  {
                    amount: split.amount,
                    category: updated.category || 'Other Expense',
                    description: updated.description,
                    date: updated.date,
                    currency: updated.currency,
                  },
                );
              } catch (err) {
                console.error(`[ExpenseService] Failed to sync split ${split.id} to finance:`, err);
              }
            }
          }),
        );

        return updated;
      });
    }

    // Update expense without changing splits
    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...updateData,
        ExpenseHistory: {
          create: {
            id: randomUUID(),
            action: 'updated',
            userId: userId,
            changes: Object.keys(changes).length > 0 ? changes : undefined,
            notes: Object.keys(changes).length > 0 ? `Updated: ${Object.keys(changes).join(', ')}` : 'Expense updated',
          },
        },
      },
      include: {
        ExpenseSplit: {
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
        User_Expense_createdByToUser: {
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
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Sync splits to finance transactions (in case amount/category/description changed)
    await Promise.all(
      updated.ExpenseSplit.map(async (split) => {
        if (split.amount > 0) {
          try {
            await this.financeService.syncExpenseSplitToFinance(
              split.id,
              split.userId,
              {
                amount: split.amount,
                category: updated.category || 'Other Expense',
                description: updated.description,
                date: updated.date,
                currency: updated.currency,
              },
            );
          } catch (err) {
            console.error(`[ExpenseService] Failed to sync split ${split.id} to finance:`, err);
          }
        }
      }),
    );

    return updated;
  }

  async deleteExpense(userId: string, expenseId: string) {
    // Verify expense exists and user has permission (creator only)
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        createdBy: userId,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found or you do not have permission to delete it');
    }

    // Get expense with splits to notify participants
    const expenseWithSplits = await this.prisma.expense.findFirst({
      where: { id: expenseId },
      include: {
        ExpenseSplit: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                UserProfile: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
        User_Expense_createdByToUser: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Create history entry before deletion (expenseId will be set to null on cascade)
    await this.prisma.expenseHistory.create({
      data: {
        id: randomUUID(),
        expenseId: expenseId,
        action: 'deleted',
        userId: userId,
        notes: `Expense deleted: ${expense.description} (${expense.amount} ${expense.currency})`,
      },
    });

    // Create notifications for all participants (except deleter)
    if (expenseWithSplits) {
      const deleterName = expenseWithSplits.User_Expense_createdByToUser.UserProfile?.displayName || expenseWithSplits.User_Expense_createdByToUser.email;
      const participantIds = expenseWithSplits.ExpenseSplit
        .map(split => split.userId)
        .filter(id => id !== userId); // Exclude deleter

      // Notify all participants about the expense deletion
      await Promise.all(
        participantIds.map(participantId =>
          this.notificationService.notifyExpenseDeleted(
            participantId,
            expense.description,
            deleterName,
          ).catch(err => {
            console.error(`Failed to create notification for user ${participantId}:`, err);
          }),
        ),
      );
    }

    // Delete linked finance transactions before deleting expense
    if (expenseWithSplits && expenseWithSplits.ExpenseSplit) {
      await Promise.all(
        expenseWithSplits.ExpenseSplit.map(async (split) => {
          try {
            await this.financeService.deleteExpenseSplitFinanceTransaction(split.id);
          } catch (err) {
            console.error(`[ExpenseService] Failed to delete finance transaction for split ${split.id}:`, err);
            // Continue deletion even if finance sync fails
          }
        }),
      );
    }

    // Delete expense (cascade will handle splits and settlements)
    // Note: We use deleteMany to ensure we only delete if user is creator
    const result = await this.prisma.expense.deleteMany({
      where: {
        id: expenseId,
        createdBy: userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Expense not found or you do not have permission to delete it');
    }

    return { message: 'Expense deleted successfully' };
  }

  async getExpenseHistory(userId: string, expenseId: string) {
    // Verify user has access to this expense (either creator or participant)
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        OR: [
          { createdBy: userId },
          {
            ExpenseSplit: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found or you do not have access to it');
    }

    // Get history entries
    const history = await this.prisma.expenseHistory.findMany({
      where: {
        expenseId: expenseId,
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return history;
  }

  async getBalances(userId: string, primaryCurrency: string = 'USD') {
    // Get all unpaid splits where user owes money
    const owedSplits = await this.prisma.expenseSplit.findMany({
      where: {
        userId,
        isPaid: false,
      },
      include: {
        Expense: {
          include: {
            User_Expense_createdByToUser: {
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
            User_Expense_paidByToUser: {
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
    });

    // Get all unpaid splits where others owe the user (user paid for the expense)
    const owedToUser = await this.prisma.expenseSplit.findMany({
      where: {
        Expense: {
          OR: [
            { paidBy: userId }, // User paid for the expense
            { 
              AND: [
                { paidBy: null }, // Fallback: if paidBy is null, use createdBy (backward compatibility)
                { createdBy: userId },
              ],
            },
          ],
        },
        userId: { not: userId },
        isPaid: false,
      },
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
        Expense: {
          include: {
            User_Expense_paidByToUser: {
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
    });

    // Convert all amounts to primary currency
    const convertSplits = async (splits: any[]) => {
      return Promise.all(
        splits.map(async (split) => {
          const expenseCurrency = split.Expense.currency || 'USD';
          const convertedAmount = await this.currencyService.convertAmount(
            split.amount,
            expenseCurrency,
            primaryCurrency,
          );
          return {
            ...split,
            originalAmount: split.amount,
            originalCurrency: expenseCurrency,
            convertedAmount,
            convertedCurrency: primaryCurrency,
          };
        }),
      );
    };

    const convertedOwedSplits = await convertSplits(owedSplits);
    const convertedOwedToUser = await convertSplits(owedToUser);

    // Calculate totals in primary currency (exclude splits where user owes themselves)
    // Use paidBy if available, otherwise fallback to createdBy for backward compatibility
    const totalOwed = convertedOwedSplits
      .filter((split) => {
        const payerId = split.Expense.paidBy || split.Expense.createdBy;
        return payerId !== userId; // Skip if user owes themselves
      })
      .reduce((sum, split) => sum + split.convertedAmount, 0);
    const totalOwedToUser = convertedOwedToUser.reduce((sum, split) => sum + split.convertedAmount, 0);
    const netBalance = totalOwedToUser - totalOwed;

    // Group by user (exclude cases where user owes themselves)
    const owedByUser = new Map<string, { user: any; amount: number; originalAmount: number; originalCurrency: string; splits: any[] }>();
    convertedOwedSplits.forEach((split) => {
      // Use paidBy if available, otherwise fallback to createdBy for backward compatibility
      const creditorId = split.Expense.paidBy || split.Expense.createdBy;
      // Skip if user owes themselves
      if (creditorId === userId) {
        return;
      }
      if (!owedByUser.has(creditorId)) {
        // Use paidByUser if available, otherwise use createdByUser
        const creditorUser = split.Expense.User_Expense_paidByToUser || split.Expense.User_Expense_createdByToUser;
        owedByUser.set(creditorId, {
          user: creditorUser,
          amount: 0,
          originalAmount: 0,
          originalCurrency: split.originalCurrency,
          splits: [],
        });
      }
      const entry = owedByUser.get(creditorId)!;
      entry.amount += split.convertedAmount;
      entry.originalAmount += split.originalAmount;
      entry.splits.push(split);
    });

    const owedToUserByUser = new Map<string, { user: any; amount: number; originalAmount: number; originalCurrency: string; splits: any[] }>();
    convertedOwedToUser.forEach((split) => {
      const debtorId = split.userId;
      if (!owedToUserByUser.has(debtorId)) {
        owedToUserByUser.set(debtorId, {
          user: split.User,
          amount: 0,
          originalAmount: 0,
          originalCurrency: split.originalCurrency,
          splits: [],
        });
      }
      const entry = owedToUserByUser.get(debtorId)!;
      entry.amount += split.convertedAmount;
      entry.originalAmount += split.originalAmount;
      entry.splits.push(split);
    });

    console.log('[ExpenseService] Balance results:', {
      totalOwed,
      totalOwedToUser,
      netBalance,
      primaryCurrency,
      owedByUserCount: owedByUser.size,
      owedToUserCount: owedToUserByUser.size,
    });

    return {
      totalOwed,
      totalOwedToUser,
      netBalance,
      primaryCurrency,
      owedByUser: Array.from(owedByUser.values()),
      owedToUser: Array.from(owedToUserByUser.values()),
    };
  }

  async createSettlement(userId: string, createSettlementDto: CreateSettlementDto) {
    // Validate payer is the current user
    const payerId = userId;
    const payeeId = createSettlementDto.payeeId;

    if (payerId === payeeId) {
      throw new BadRequestException('Cannot settle with yourself');
    }

    // Validate payee exists
    const payee = await this.prisma.user.findUnique({
      where: { id: payeeId },
      select: { id: true },
    });

    if (!payee) {
      throw new NotFoundException('Payee not found');
    }

    // Find outstanding splits between payer and payee
    // Payer owes payee: splits where payer is the user and payee created the expense
    const outstandingSplits = await this.prisma.expenseSplit.findMany({
      where: {
        userId: payerId,
        isPaid: false,
        Expense: {
          createdBy: payeeId,
        },
      },
        include: {
          Expense: true,
        },
    });

    // If specific split IDs are provided, filter to only those
    let splitsToSettle = outstandingSplits;
    if (createSettlementDto.splitIds && createSettlementDto.splitIds.length > 0) {
      splitsToSettle = outstandingSplits.filter((split) =>
        createSettlementDto.splitIds!.includes(split.id),
      );
      if (splitsToSettle.length === 0) {
        throw new BadRequestException('No valid splits found to settle');
      }
    }

    // Calculate total amount owed
    const totalOwed = splitsToSettle.reduce((sum, split) => sum + split.amount, 0);

    // Validate settlement amount (should be <= total owed, but allow partial settlements)
    if (createSettlementDto.amount > totalOwed) {
      throw new BadRequestException(
        `Settlement amount (${createSettlementDto.amount}) exceeds total owed (${totalOwed})`,
      );
    }

    // If amount is less than total, we need to settle splits proportionally
    // For simplicity, we'll settle splits in order until we reach the amount
    let remainingAmount = createSettlementDto.amount;
    const splitsToMarkAsPaid: { splitId: string; amount: number }[] = [];

    for (const split of splitsToSettle) {
      if (remainingAmount <= 0) break;

      const amountToSettle = Math.min(split.amount, remainingAmount);
      splitsToMarkAsPaid.push({
        splitId: split.id,
        amount: amountToSettle,
      });
      remainingAmount -= amountToSettle;
    }

    // For now, we'll only mark splits as fully paid if the settlement covers the full amount
    // TODO: Handle partial settlements (requires adding partial payment tracking)
    if (createSettlementDto.amount < totalOwed) {
      throw new BadRequestException(
        'Partial settlements are not yet supported. Please settle the full amount.',
      );
    }

    // Create settlement record and mark splits as paid in a transaction
    const settlement = await this.prisma.$transaction(async (tx) => {
      // Create settlement
      const settlement = await tx.settlement.create({
        data: {
          id: randomUUID(),
          payerId,
          payeeId,
          amount: createSettlementDto.amount,
          currency: createSettlementDto.currency || 'USD',
          paymentMethod: createSettlementDto.paymentMethod,
          notes: createSettlementDto.notes,
          SettlementSplit: {
            create: splitsToSettle.map((split) => ({
              id: randomUUID(),
              splitId: split.id,
            })),
          },
        },
        include: {
          User_Settlement_payerIdToUser: {
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
          User_Settlement_payeeIdToUser: {
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
          SettlementSplit: {
            include: {
              ExpenseSplit: {
                include: {
                  Expense: true,
                },
              },
            },
          },
        },
      });

      // Mark all splits as paid
      await tx.expenseSplit.updateMany({
        where: {
          id: { in: splitsToSettle.map((s) => s.id) },
        },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
      });

      return settlement;
    });

    // Update trust scores for both users
    await this.trustScoreService.updateExpenseScore(payerId).catch((err) => {
      console.error('Failed to update trust score for payer after settlement:', err);
    });
    await this.trustScoreService.updateExpenseScore(payeeId).catch((err) => {
      console.error('Failed to update trust score for payee after settlement:', err);
    });

    // Notify payee about the settlement
    const payerName = settlement.User_Settlement_payerIdToUser.UserProfile?.displayName || settlement.User_Settlement_payerIdToUser.email;
    const expenseId = settlement.SettlementSplit[0]?.ExpenseSplit?.Expense?.id || '';
    await this.notificationService.notifyExpenseSettled(
      payeeId,
      expenseId,
      settlement.amount,
      settlement.currency,
      payerName,
    ).catch(err => {
      console.error(`Failed to create notification for payee:`, err);
    });

    return settlement;
  }

  async getSettlements(userId: string) {
    // Get all settlements where user is payer or payee
    const settlements = await this.prisma.settlement.findMany({
      where: {
        OR: [{ payerId: userId }, { payeeId: userId }],
      },
      include: {
        User_Settlement_payerIdToUser: {
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
        User_Settlement_payeeIdToUser: {
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
        SettlementSplit: {
          include: {
            ExpenseSplit: {
              include: {
                Expense: {
                  select: {
                    id: true,
                    description: true,
                    amount: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        settledAt: 'desc',
      },
    });

    return settlements;
  }

  /**
   * Debt Simplification Algorithm (Splitwise-style)
   * Minimizes the number of transactions needed to settle all debts
   * Uses a graph-based approach to find the minimum number of transactions
   */
  async simplifyDebts(userId: string) {
    // Get all balances for the user (who they owe and who owes them)
    const balances = await this.getBalances(userId);

    // Build a debt graph: map of userId -> net amount (positive = they owe, negative = they owe you)
    const debtGraph = new Map<string, number>();

    // Add debts where user owes others (positive amounts)
    balances.owedByUser.forEach((entry) => {
      debtGraph.set(entry.user.id, (debtGraph.get(entry.user.id) || 0) + entry.amount);
    });

    // Add debts where others owe user (negative amounts)
    balances.owedToUser.forEach((entry) => {
      debtGraph.set(entry.user.id, (debtGraph.get(entry.user.id) || 0) - entry.amount);
    });

    // Convert to array of [userId, netAmount] pairs
    const debts = Array.from(debtGraph.entries()).map(([userId, amount]) => ({
      userId,
      amount,
    }));

    // Filter out zero balances
    const nonZeroDebts = debts.filter((d) => Math.abs(d.amount) > 0.01);

    // Sort: creditors first (negative amounts, people who owe you), then debtors (positive amounts, you owe them)
    nonZeroDebts.sort((a, b) => a.amount - b.amount);

    // Simplified transactions
    const transactions: { fromUserId: string; toUserId: string; amount: number }[] = [];

    let i = 0;
    let j = nonZeroDebts.length - 1;

    while (i < j) {
      const creditor = nonZeroDebts[i]; // Negative amount (owes you)
      const debtor = nonZeroDebts[j]; // Positive amount (you owe)

      if (Math.abs(creditor.amount) < 0.01) {
        i++;
        continue;
      }
      if (Math.abs(debtor.amount) < 0.01) {
        j--;
        continue;
      }

      // Calculate transaction amount
      const transactionAmount = Math.min(Math.abs(creditor.amount), debtor.amount);

      // Create transaction: from debtor to creditor
      transactions.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: transactionAmount,
      });

      // Update balances
      creditor.amount += transactionAmount; // Make less negative (reduce debt owed to you)
      debtor.amount -= transactionAmount; // Reduce debt you owe

      // Move pointers if balance is zero
      if (Math.abs(creditor.amount) < 0.01) {
        i++;
      }
      if (Math.abs(debtor.amount) < 0.01) {
        j--;
      }
    }

    // Fetch user details for the simplified transactions
    const userIds = new Set<string>();
    transactions.forEach((t) => {
      userIds.add(t.fromUserId);
      userIds.add(t.toUserId);
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
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
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      originalCount: nonZeroDebts.length,
      simplifiedCount: transactions.length,
      simplifiedDebts: transactions.map((t) => {
        const fromUser = userMap.get(t.fromUserId);
        const toUser = userMap.get(t.toUserId);
        if (!fromUser || !toUser) {
          throw new NotFoundException('User not found in simplified debt calculation');
        }
        return {
          fromUserId: t.fromUserId,
          toUserId: t.toUserId,
        amount: t.amount,
          fromUser,
          toUser,
        };
      }),
    };
  }
}

