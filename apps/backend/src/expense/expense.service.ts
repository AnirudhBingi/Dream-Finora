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

  private transformExpense(expense: any) {
    const { ExpenseSplit, User_Expense_createdByToUser, User_Expense_paidByToUser, Group, ...expenseBase } = expense;
    
    return {
      ...expenseBase,
      date: expense.date.toISOString(),
      createdAt: expense.createdAt.toISOString(),
      amount: expense.amount,
      splits: (ExpenseSplit || []).map((split: any) => ({
        id: split.id,
        expenseId: split.expenseId,
        userId: split.userId,
        amount: split.amount,
        isPaid: split.isPaid,
        paidAt: split.paidAt?.toISOString(),
        createdAt: split.createdAt.toISOString(),
        user: {
          id: split.User.id,
          email: split.User.email,
          profile: split.User.UserProfile
            ? {
                displayName: split.User.UserProfile.displayName,
                avatarUrl: split.User.UserProfile.avatarUrl,
              }
            : null,
        },
      })),
      createdByUser: User_Expense_createdByToUser
        ? {
            id: User_Expense_createdByToUser.id,
            email: User_Expense_createdByToUser.email,
            profile: User_Expense_createdByToUser.UserProfile
              ? {
                  displayName: User_Expense_createdByToUser.UserProfile.displayName,
                  avatarUrl: User_Expense_createdByToUser.UserProfile.avatarUrl,
                }
              : null,
          }
        : {
            id: expense.createdBy || '',
            email: 'Unknown',
            profile: null,
          },
      paidByUser: User_Expense_paidByToUser
        ? {
            id: User_Expense_paidByToUser.id,
            email: User_Expense_paidByToUser.email,
            profile: User_Expense_paidByToUser.UserProfile
              ? {
                  displayName: User_Expense_paidByToUser.UserProfile.displayName,
                  avatarUrl: User_Expense_paidByToUser.UserProfile.avatarUrl,
                }
              : null,
          }
        : null,
      group: Group
        ? {
            id: Group.id,
            name: Group.name,
            description: Group.description,
            avatarUrl: Group.avatarUrl,
          }
        : null,
    };
  }

  async createExpense(userId: string, createExpenseDto: CreateExpenseDto) {
    console.log('[ExpenseService] Creating expense with groupId:', createExpenseDto.groupId);
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
            avatarUrl: true,
          },
        },
      },
    });

    console.log('[ExpenseService] Expense created with groupId:', expense.groupId, 'Group:', expense.Group);

    // Create notifications for all participants (except creator)
    const creatorName = expense.User_Expense_createdByToUser?.UserProfile?.displayName || expense.User_Expense_createdByToUser?.email;
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

    return this.transformExpense(expense);
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
            avatarUrl: true,
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

    // Transform expenses to match frontend interface
    const transformedExpenses = expenses.map(expense => this.transformExpense(expense));

    return {
      expenses: transformedExpenses,
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
            avatarUrl: true,
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.transformExpense(expense);
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
            avatarUrl: true,
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
            avatarUrl: true,
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

    // Check if this expense is linked to a ride
    const linkedRide = await this.prisma.ride.findFirst({
      where: { expenseId: expenseId },
    });

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

    // If expense was linked to a ride, unlink it (ride will still exist but without expense)
    if (linkedRide) {
      await this.prisma.ride.update({
        where: { id: linkedRide.id },
        data: { expenseId: null },
      }).catch(err => {
        console.error(`[ExpenseService] Failed to unlink ride ${linkedRide.id} from deleted expense:`, err);
      });
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

    // Get settlements linked to this expense through splits
    const expenseSplits = await this.prisma.expenseSplit.findMany({
      where: {
        expenseId: expenseId,
      },
      select: {
        id: true,
      },
    });

    const splitIds = expenseSplits.map(split => split.id);

    if (splitIds.length > 0) {
      const settlements = await this.prisma.settlement.findMany({
        where: {
          SettlementSplit: {
            some: {
              splitId: {
                in: splitIds,
              },
            },
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Convert settlements to history format
      for (const settlement of settlements) {
        const payerName = settlement.User_Settlement_payerIdToUser.UserProfile?.displayName || 
                          settlement.User_Settlement_payerIdToUser.email;
        const payeeName = settlement.User_Settlement_payeeIdToUser.UserProfile?.displayName || 
                          settlement.User_Settlement_payeeIdToUser.email;
        
        history.push({
          id: `settlement-${settlement.id}`,
          expenseId: expenseId,
          action: 'settled',
          userId: settlement.payerId,
          notes: `${payerName} settled ${settlement.amount} ${settlement.currency} with ${payeeName}${settlement.notes ? ` - ${settlement.notes}` : ''}`,
          createdAt: settlement.createdAt,
          User: settlement.User_Settlement_payerIdToUser,
          changes: {
            settlementId: settlement.id,
            amount: settlement.amount,
            currency: settlement.currency,
            paymentMethod: settlement.paymentMethod,
            payerId: settlement.payerId,
            payeeId: settlement.payeeId,
          },
        } as any);
      }
    }

    // Sort by createdAt descending
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return history;
  }

  async getBalances(userId: string, primaryCurrency: string = 'USD') {
    try {
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
              Group: {
                select: {
                  id: true,
                  name: true,
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
            Group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Convert all amounts to primary currency
    // Filter out splits with missing expenses (orphaned splits)
    const convertSplits = async (splits: any[]) => {
      const validSplits = splits.filter(split => {
        if (!split.Expense) {
          console.warn(`[ExpenseService] Skipping orphaned split ${split.id} - expense not found`);
          return false;
        }
        return true;
      });

      return Promise.all(
        validSplits.map(async (split) => {
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

    // Log if we filtered out any orphaned splits
    const filteredOwedCount = owedSplits.length - convertedOwedSplits.length;
    const filteredOwedToCount = owedToUser.length - convertedOwedToUser.length;
    if (filteredOwedCount > 0 || filteredOwedToCount > 0) {
      console.warn(`[ExpenseService] Filtered out ${filteredOwedCount + filteredOwedToCount} orphaned splits (missing expenses)`);
    }

    // Calculate totals in primary currency (exclude splits where user owes themselves)
    // Use paidBy if available, otherwise fallback to createdBy for backward compatibility
    // Filter out any splits that lost their expense during conversion
    const totalOwed = convertedOwedSplits
      .filter((split) => {
        if (!split.Expense) return false; // Skip if expense is missing
        const payerId = split.Expense.paidBy || split.Expense.createdBy;
        return payerId !== userId; // Skip if user owes themselves
      })
      .reduce((sum, split) => sum + split.convertedAmount, 0);
    const totalOwedToUser = convertedOwedToUser
      .filter((split) => !!split.Expense) // Skip if expense is missing
      .reduce((sum, split) => sum + split.convertedAmount, 0);
    const netBalance = totalOwedToUser - totalOwed;

    // Check if expense is linked to a ride
    // Filter out any splits that might have lost their expense during conversion
    const validOwedSplits = convertedOwedSplits.filter(s => s.Expense);
    const validOwedToUserSplits = convertedOwedToUser.filter(s => s.Expense);
    const expenseIds = [...new Set([...validOwedSplits, ...validOwedToUserSplits].map(s => s.Expense.id))];
    const ridesByExpenseId = new Map<string, any>();
    if (expenseIds.length > 0) {
      const rides = await this.prisma.ride.findMany({
        where: { expenseId: { in: expenseIds } },
        select: { id: true, expenseId: true },
      });
      rides.forEach(ride => {
        if (ride.expenseId) {
          ridesByExpenseId.set(ride.expenseId, ride);
        }
      });
    }

    // Group by user (exclude cases where user owes themselves)
    // Breakdown structure: { byGroup: { [groupId]: { groupName, amount } }, rideshare: number, individual: number }
    const owedByUser = new Map<string, { user: any; amount: number; originalAmount: number; originalCurrency: string; splits: any[]; breakdown: { byGroup: Map<string, { groupName: string; amount: number }>; rideshare: number; individual: number } }>();
    convertedOwedSplits.forEach((split) => {
      // Skip if expense is missing (shouldn't happen after filtering, but defensive check)
      if (!split.Expense) {
        console.warn('[ExpenseService] Skipping split with missing expense:', split.id);
        return;
      }
      // Use paidBy if available, otherwise fallback to createdBy for backward compatibility
      const creditorId = split.Expense.paidBy || split.Expense.createdBy;
      // Skip if user owes themselves
      if (creditorId === userId) {
        return;
      }
      if (!owedByUser.has(creditorId)) {
        // Use paidByUser if available, otherwise use createdByUser
        const creditorUser = split.Expense.User_Expense_paidByToUser || split.Expense.User_Expense_createdByToUser;
        if (!creditorUser) {
          console.error('[ExpenseService] Missing creditor user for expense:', split.Expense.id, 'creditorId:', creditorId);
          return; // Skip if user data is missing
        }
        owedByUser.set(creditorId, {
          user: creditorUser,
          amount: 0,
          originalAmount: 0,
          originalCurrency: split.originalCurrency,
          splits: [],
          breakdown: { byGroup: new Map(), rideshare: 0, individual: 0 },
        });
      }
      const entry = owedByUser.get(creditorId)!;
      entry.amount += split.convertedAmount;
      entry.originalAmount += split.originalAmount;
      entry.splits.push(split);
      
      // Categorize by source with actual group names
      const isRideshare = ridesByExpenseId.has(split.Expense.id);
      const groupId = split.Expense.groupId;
      const groupName = split.Expense.Group?.name;
      
      if (isRideshare) {
        entry.breakdown.rideshare += split.convertedAmount;
      } else if (groupId && groupName) {
        // Group expense - track by group ID and name
        if (!entry.breakdown.byGroup.has(groupId)) {
          entry.breakdown.byGroup.set(groupId, { groupName, amount: 0 });
        }
        const groupEntry = entry.breakdown.byGroup.get(groupId)!;
        groupEntry.amount += split.convertedAmount;
      } else {
        // Individual (non-group) expense
        entry.breakdown.individual += split.convertedAmount;
      }
    });

    const owedToUserByUser = new Map<string, { user: any; amount: number; originalAmount: number; originalCurrency: string; splits: any[]; breakdown: { byGroup: Map<string, { groupName: string; amount: number }>; rideshare: number; individual: number } }>();
    convertedOwedToUser.forEach((split) => {
      // Skip if expense is missing (shouldn't happen after filtering, but defensive check)
      if (!split.Expense) {
        console.warn('[ExpenseService] Skipping split with missing expense:', split.id);
        return;
      }
      const debtorId = split.userId;
      if (!debtorId) {
        console.warn('[ExpenseService] Missing debtorId for split:', split.id);
        return; // Skip if debtorId is missing
      }
      if (!owedToUserByUser.has(debtorId)) {
        if (!split.User) {
          console.error('[ExpenseService] Missing User for split:', split.id, 'debtorId:', debtorId);
          return; // Skip if user data is missing
        }
        owedToUserByUser.set(debtorId, {
          user: split.User,
          amount: 0,
          originalAmount: 0,
          originalCurrency: split.originalCurrency,
          splits: [],
          breakdown: { byGroup: new Map(), rideshare: 0, individual: 0 },
        });
      }
      const entry = owedToUserByUser.get(debtorId)!;
      entry.amount += split.convertedAmount;
      entry.originalAmount += split.originalAmount;
      entry.splits.push(split);
      
      // Categorize by source with actual group names
      const isRideshare = ridesByExpenseId.has(split.Expense.id);
      const groupId = split.Expense.groupId;
      const groupName = split.Expense.Group?.name;
      
      if (isRideshare) {
        entry.breakdown.rideshare += split.convertedAmount;
      } else if (groupId && groupName) {
        // Group expense - track by group ID and name
        if (!entry.breakdown.byGroup.has(groupId)) {
          entry.breakdown.byGroup.set(groupId, { groupName, amount: 0 });
        }
        const groupEntry = entry.breakdown.byGroup.get(groupId)!;
        groupEntry.amount += split.convertedAmount;
      } else {
        // Individual (non-group) expense
        entry.breakdown.individual += split.convertedAmount;
      }
      
      // Debug logging for duplicate amounts
      if (split.convertedAmount === 60.833333333333336) {
        console.log('[ExpenseService] Found 60.83 split:', {
          splitId: split.id,
          expenseId: split.Expense?.id,
          expenseDescription: split.Expense?.description,
          debtorId,
          debtorEmail: split.User?.email,
          amount: split.convertedAmount,
          originalAmount: split.originalAmount,
        });
      }
    });

    // Log detailed balance information for debugging
    console.log('[ExpenseService] Balance results:', {
      totalOwed,
      totalOwedToUser,
      netBalance,
      primaryCurrency,
      owedByUserCount: owedByUser.size,
      owedToUserCount: owedToUserByUser.size,
      owedByUserDetails: Array.from(owedByUser.entries()).map(([id, data]) => ({
        userId: id,
        userName: data.user?.UserProfile?.displayName || data.user?.email || 'Unknown',
        amount: data.amount,
        splitCount: data.splits.length,
        splitIds: data.splits.map(s => s.id),
      })),
      owedToUserDetails: Array.from(owedToUserByUser.entries()).map(([id, data]) => ({
        userId: id,
        userName: data.user?.UserProfile?.displayName || data.user?.email || 'Unknown',
        amount: data.amount,
        splitCount: data.splits.length,
        splitIds: data.splits.map(s => s.id),
      })),
    });

    // Round all amounts to 2 decimal places before returning
    return {
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalOwedToUser: Math.round(totalOwedToUser * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
      primaryCurrency,
      owedByUser: Array.from(owedByUser.values()).map(item => ({
        ...item,
        user: {
          id: item.user.id,
          email: item.user.email,
          profile: item.user.UserProfile
            ? {
                displayName: item.user.UserProfile.displayName,
                avatarUrl: item.user.UserProfile.avatarUrl,
              }
            : null,
        },
        amount: Math.round(item.amount * 100) / 100,
        originalAmount: Math.round(item.originalAmount * 100) / 100,
        breakdown: {
          byGroup: Array.from(item.breakdown.byGroup.entries()).map(([groupId, groupData]) => ({
            groupId,
            groupName: groupData.groupName,
            amount: Math.round(groupData.amount * 100) / 100,
          })),
          rideshare: Math.round(item.breakdown.rideshare * 100) / 100,
          individual: Math.round(item.breakdown.individual * 100) / 100,
        },
      })),
      owedToUser: Array.from(owedToUserByUser.values()).map(item => ({
        ...item,
        user: {
          id: item.user.id,
          email: item.user.email,
          profile: item.user.UserProfile
            ? {
                displayName: item.user.UserProfile.displayName,
                avatarUrl: item.user.UserProfile.avatarUrl,
              }
            : null,
        },
        amount: Math.round(item.amount * 100) / 100,
        originalAmount: Math.round(item.originalAmount * 100) / 100,
        breakdown: {
          byGroup: Array.from(item.breakdown.byGroup.entries()).map(([groupId, groupData]) => ({
            groupId,
            groupName: groupData.groupName,
            amount: Math.round(groupData.amount * 100) / 100,
          })),
          rideshare: Math.round(item.breakdown.rideshare * 100) / 100,
          individual: Math.round(item.breakdown.individual * 100) / 100,
        },
      })),
    };
    } catch (error) {
      console.error('[ExpenseService] Error in getBalances:', error);
      // If it's a known error, re-throw it
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      // For unexpected errors, wrap them to avoid exposing internal details
      throw new BadRequestException('Failed to calculate balances. Please try again later.');
    }
  }

  async createSettlement(userId: string, createSettlementDto: CreateSettlementDto) {
    const payeeId = createSettlementDto.payeeId;
    
    // Determine payer: use provided payerId, or default to current user
    // If payeeId is current user (user is receiving), payerId must be provided (the friend paying)
    // If payeeId is someone else (user is paying), payerId defaults to current user
    let payerId: string;
    
    if (createSettlementDto.payerId) {
      payerId = createSettlementDto.payerId;
    } else {
      // Default to current user as payer
      payerId = userId;
    }

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
    // payeeId = the person receiving payment (the one who is owed)
    // payerId = the current user (the one making the payment)
    // 
    // Settlement direction: If payee is receiving payment, it means payer owes payee
    // So we need to find splits where:
    // - payer (current user) is the debtor (userId = payerId)
    // - payee paid for the expense (paidBy = payeeId)
    //
    // OR if the settlement is in the opposite direction (payee owes payer):
    // - payee is the debtor (userId = payeeId)  
    // - payer paid for the expense (paidBy = payerId)
    
    // Get current balances to determine which direction has outstanding debt
    const balances = await this.getBalances(payerId);
    const owedToPayee = balances.owedToUser.find(item => item?.user?.id === payeeId);
    const owedByPayee = balances.owedByUser.find(item => item?.user?.id === payeeId);
    
    // Build base where clause for expense filtering
    const expenseWhereClause: any = {
      OR: [
        { paidBy: payeeId }, // Payee paid for the expense
        { 
          AND: [
            { paidBy: null },
            { createdBy: payeeId },
          ],
        },
      ],
    };

    // If groupId is provided, filter to only expenses within that group
    if (createSettlementDto.groupId) {
      expenseWhereClause.groupId = createSettlementDto.groupId;
    }

    // Find splits in BOTH directions - we'll settle the direction that has outstanding debt
    const splitsPayerOwesPayee = await this.prisma.expenseSplit.findMany({
      where: {
        userId: payerId, // Payer is the debtor
        isPaid: false,
        Expense: expenseWhereClause,
      },
      include: {
        Expense: true,
      },
    });

    // Build base where clause for the opposite direction
    const expenseWhereClauseOpposite: any = {
      OR: [
        { paidBy: payerId }, // Payer paid for the expense
        { 
          AND: [
            { paidBy: null },
            { createdBy: payerId },
          ],
        },
      ],
    };

    // If groupId is provided, filter to only expenses within that group
    if (createSettlementDto.groupId) {
      expenseWhereClauseOpposite.groupId = createSettlementDto.groupId;
    }

    const splitsPayeeOwesPayer = await this.prisma.expenseSplit.findMany({
      where: {
        userId: payeeId, // Payee is the debtor
        isPaid: false,
        Expense: expenseWhereClauseOpposite,
      },
      include: {
        Expense: true,
      },
    });

    // Determine which direction to settle based on which has outstanding debt
    // If payee is receiving payment, we settle payer's debt to payee
    // If payer is receiving payment (negative net), we settle payee's debt to payer
    const netBalance = (owedToPayee?.amount || 0) - (owedByPayee?.amount || 0);
    
    // If net balance is negative, payer owes payee (settle payer's debt)
    // If net balance is positive, payee owes payer (settle payee's debt)
    // But since payeeId is "the one receiving payment", we should settle in the direction where payee is owed
    // So we settle payer's debt to payee (splitsPayerOwesPayee)
    // UNLESS the amount is negative or the net balance suggests the opposite direction
    
    // Actually, let's use the split direction that matches the settlement amount
    // If we're settling with payee as receiver, we settle what payer owes payee
    let outstandingSplits = splitsPayerOwesPayee;
    
    // But if there are no splits in that direction, check the other direction
    // This handles edge cases where the balance calculation might be off
    if (splitsPayerOwesPayee.length === 0 && splitsPayeeOwesPayer.length > 0) {
      // If payer has no debt to payee, but payee has debt to payer,
      // this might be a reverse settlement (payee paying payer)
      // But since payeeId is the receiver, this shouldn't happen unless there's a bug
      console.warn('[ExpenseService] Settlement direction mismatch: payeeId is receiver but no splits found in that direction');
      outstandingSplits = splitsPayeeOwesPayer;
    }

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

    // Calculate total amount owed (round to 2 decimal places to avoid floating point issues)
    const totalOwed = Math.round(splitsToSettle.reduce((sum, split) => sum + split.amount, 0) * 100) / 100;
    const settlementAmount = Math.round(createSettlementDto.amount * 100) / 100;

    // Validate settlement amount (should be <= total owed, but allow partial settlements)
    if (settlementAmount > totalOwed + 0.01) { // Add small tolerance for floating point errors
      throw new BadRequestException(
        `Settlement amount (${settlementAmount.toFixed(2)}) exceeds total owed (${totalOwed.toFixed(2)})`,
      );
    }
    
    if (totalOwed === 0) {
      throw new BadRequestException(
        'No outstanding balance found with this user. The balance may have already been settled.',
      );
    }

    // Handle partial settlements: settle splits proportionally until we reach the amount
    let remainingAmount = settlementAmount;
    const splitsToFullyPay: string[] = []; // Splits that will be fully paid
    const splitsToPartiallyPay: Array<{ splitId: string; paidAmount: number; remainingAmount: number }> = []; // Splits with partial payment

    for (const split of splitsToSettle) {
      if (remainingAmount <= 0.01) break; // Small tolerance for floating point errors

      const amountToSettle = Math.min(split.amount, remainingAmount);
      // Round to 2 decimal places
      const roundedAmount = Math.round(amountToSettle * 100) / 100;
      const splitAmount = Math.round(split.amount * 100) / 100;
      
      if (roundedAmount >= splitAmount - 0.01) {
        // Split is fully covered
        splitsToFullyPay.push(split.id);
        remainingAmount -= splitAmount;
      } else {
        // Split is partially covered - we'll create a new split with the remaining amount
        const remainingSplitAmount = Math.round((splitAmount - roundedAmount) * 100) / 100;
        splitsToPartiallyPay.push({
          splitId: split.id,
          paidAmount: roundedAmount,
          remainingAmount: remainingSplitAmount,
        });
        remainingAmount -= roundedAmount;
      }
    }

    // Create settlement record and handle splits (fully paid, partially paid, or create new splits) in a transaction
    const settlement = await this.prisma.$transaction(async (tx) => {
      // For partially paid splits, create new splits with the remaining amount
      const newSplitIds: string[] = [];
      for (const partialSplit of splitsToPartiallyPay) {
        const originalSplit = await tx.expenseSplit.findUnique({
          where: { id: partialSplit.splitId },
          include: { Expense: true },
        });
        
        if (originalSplit) {
          // Create a new split with the remaining amount
          const newSplit = await tx.expenseSplit.create({
            data: {
              id: randomUUID(),
              expenseId: originalSplit.expenseId,
              userId: originalSplit.userId,
              amount: partialSplit.remainingAmount,
              isPaid: false,
            },
          });
          newSplitIds.push(newSplit.id);
        }
      }

      // Create settlement with all splits that were paid (fully or partially)
      const allPaidSplitIds = [...splitsToFullyPay, ...splitsToPartiallyPay.map(s => s.splitId)];
      const settlement = await tx.settlement.create({
        data: {
          id: randomUUID(),
          payerId,
          payeeId,
          amount: settlementAmount, // Use rounded amount
          currency: createSettlementDto.currency || 'USD',
          paymentMethod: createSettlementDto.paymentMethod,
          notes: createSettlementDto.notes,
          SettlementSplit: {
            create: allPaidSplitIds.map((splitId) => ({
              id: randomUUID(),
              splitId: splitId,
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

      // Mark fully paid splits as paid
      if (splitsToFullyPay.length > 0) {
        await tx.expenseSplit.updateMany({
          where: {
            id: { in: splitsToFullyPay },
          },
          data: {
            isPaid: true,
            paidAt: new Date(),
          },
        });
      }

      // For partially paid splits, mark the original split as paid (the remaining amount is in the new split)
      if (splitsToPartiallyPay.length > 0) {
        await tx.expenseSplit.updateMany({
          where: {
            id: { in: splitsToPartiallyPay.map(s => s.splitId) },
          },
          data: {
            isPaid: true,
            paidAt: new Date(),
          },
        });
      }

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

