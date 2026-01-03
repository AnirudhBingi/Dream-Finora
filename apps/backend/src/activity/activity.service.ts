import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ActivityItem {
  id: string;
  type: 'expense' | 'settlement' | 'chore' | 'group' | 'listing' | 'friend' | 'finance';
  action: string; // 'created', 'updated', 'deleted', 'settled', 'completed', etc.
  title: string;
  description: string;
  userId: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  createdAt: Date;
  metadata?: any; // Additional data (amount, group name, etc.)
}

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async getAllActivities(userId: string, limit: number = 50): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];

    // Get expense activities (from ExpenseHistory)
    const expenseHistories = await this.prisma.expenseHistory.findMany({
      where: {
        OR: [
          { userId }, // User performed the action
          {
            expense: {
              OR: [
                { createdBy: userId }, // User created the expense
                {
                  splits: {
                    some: {
                      userId, // User is part of the expense
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        expense: {
          select: {
            id: true,
            description: true,
            amount: true,
            currency: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    expenseHistories.forEach((history) => {
      // Only make tappable if expense still exists (expenseId is not null)
      const isTappable = history.expenseId !== null && history.expense !== null;
      
      activities.push({
        id: history.id,
        type: 'expense',
        action: history.action,
        title: `Expense ${history.action}`,
        description: history.notes || (history.expense 
          ? `Expense ${history.action}: ${history.expense.description}`
          : `Expense ${history.action}`),
        userId: history.userId,
        user: history.user,
        createdAt: history.createdAt,
        metadata: {
          expenseId: history.expenseId,
          expenseDescription: history.expense?.description,
          amount: history.expense?.amount,
          currency: history.expense?.currency,
          isTappable,
        },
      });
    });

    // Get settlement activities
    const settlements = await this.prisma.settlement.findMany({
      where: {
        OR: [
          { payerId: userId },
          { payeeId: userId },
        ],
      },
      include: {
        payer: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        payee: {
          select: {
            id: true,
            email: true,
            profile: {
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
      take: limit,
    });

    settlements.forEach((settlement) => {
      const isPayer = settlement.payerId === userId;
      activities.push({
        id: settlement.id,
        type: 'settlement',
        action: 'settled',
        title: 'Settlement',
        description: isPayer
          ? `You paid ${settlement.payee.profile?.displayName || settlement.payee.email} ${settlement.amount} ${settlement.currency}`
          : `${settlement.payer.profile?.displayName || settlement.payer.email} paid you ${settlement.amount} ${settlement.currency}`,
        userId: isPayer ? settlement.payerId : settlement.payeeId,
        user: isPayer ? settlement.payer : settlement.payee,
        createdAt: settlement.createdAt,
        metadata: {
          settlementId: settlement.id,
          amount: settlement.amount,
          currency: settlement.currency,
          paymentMethod: settlement.paymentMethod,
        },
      });
    });

    // TODO: Add chore activities when chore history is implemented
    // TODO: Add group activities when group history is implemented
    // TODO: Add listing activities when listing history is implemented
    // TODO: Add friend activities when friend system is implemented
    // TODO: Add finance transaction activities when finance history is implemented

    // Sort all activities by date (most recent first)
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Return limited results
    return activities.slice(0, limit);
  }
}

