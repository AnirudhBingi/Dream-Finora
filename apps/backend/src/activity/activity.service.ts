import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ActivityItem {
  id: string;
  type: string;
  timestamp: Date;
  description: string;
  user: {
    id: string;
    email: string;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
  data?: Record<string, any>;
}

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async getActivityFeed(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filter?: string,
  ): Promise<{ activities: ActivityItem[]; total: number; hasMore: boolean }> {
    const activities: ActivityItem[] = [];

    // Get expenses user is involved in
    if (!filter || filter === 'expenses' || filter === 'all') {
      const expenses = await this.prisma.expense.findMany({
        where: {
          OR: [
            { createdBy: userId },
            {
              ExpenseSplit: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
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
        },
        orderBy: { createdAt: 'desc' },
        take: filter === 'expenses' ? limit : Math.floor(limit / 4),
        skip: filter === 'expenses' ? offset : 0,
      });

      for (const expense of expenses) {
        activities.push({
          id: `expense-${expense.id}`,
          type: 'expense_created',
          timestamp: expense.createdAt,
          description: `Expense "${expense.description}" was created`,
          user: expense.User_Expense_createdByToUser
            ? {
                id: expense.User_Expense_createdByToUser.id,
                email: expense.User_Expense_createdByToUser.email,
                profile: expense.User_Expense_createdByToUser.UserProfile,
              }
            : null,
          data: {
            expenseId: expense.id,
            amount: expense.amount,
            currency: expense.currency,
          },
        });
      }

      // Get settlements user is involved in (as payer or payee)
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
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filter === 'expenses' ? limit : Math.floor(limit / 4),
        skip: filter === 'expenses' ? offset : 0,
      });

      for (const settlement of settlements) {
        const payerName =
          settlement.User_Settlement_payerIdToUser.UserProfile?.displayName ||
          settlement.User_Settlement_payerIdToUser.email;
        const payeeName =
          settlement.User_Settlement_payeeIdToUser.UserProfile?.displayName ||
          settlement.User_Settlement_payeeIdToUser.email;
        const isUserPayer = settlement.payerId === userId;
        const otherUser = isUserPayer
          ? settlement.User_Settlement_payeeIdToUser
          : settlement.User_Settlement_payerIdToUser;

        // Check if settlement is linked to a single expense or multiple expenses
        const linkedExpenses = settlement.SettlementSplit.map(
          (ss) => ss.ExpenseSplit?.Expense,
        ).filter((e) => e !== null && e !== undefined);

        // If settlement covers multiple expenses or no specific expense, show as overall settlement
        const isOverallSettlement = linkedExpenses.length !== 1;
        const expense = linkedExpenses.length === 1 ? linkedExpenses[0] : null;

        // Build description
        let description: string;
        if (isOverallSettlement) {
          // Overall settlement - don't link to specific expense
          description = isUserPayer
            ? `You paid ${payeeName} ${settlement.amount} ${settlement.currency}`
            : `${payerName} paid you ${settlement.amount} ${settlement.currency}`;
        } else {
          // Settlement for specific expense
          description = isUserPayer
            ? `You paid ${payeeName} ${settlement.amount} ${settlement.currency} for "${expense?.description || 'expense'}"`
            : `${payerName} paid you ${settlement.amount} ${settlement.currency} for "${expense?.description || 'expense'}"`;
        }

        activities.push({
          id: `settlement-${settlement.id}`,
          type: 'settlement_created',
          timestamp: settlement.createdAt,
          description,
          user: otherUser
            ? {
                id: otherUser.id,
                email: otherUser.email,
                profile: otherUser.UserProfile,
              }
            : null,
          data: {
            settlementId: settlement.id,
            expenseId: isOverallSettlement ? null : expense?.id, // Only link if single expense
            amount: settlement.amount,
            currency: settlement.currency,
            paymentMethod: settlement.paymentMethod,
            isOverallSettlement,
          },
        });
      }
    }

    // Get chores user is involved in
    if (!filter || filter === 'chores' || filter === 'all') {
      const chores = await this.prisma.chore.findMany({
        where: {
          OR: [
            { createdBy: userId },
            { assignedTo: userId },
            {
              Group: {
                GroupMember: {
                  some: {
                    userId,
                  },
                },
              },
            },
          ],
        },
        include: {
          User_Chore_createdByToUser: {
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
        orderBy: { createdAt: 'desc' },
        take: filter === 'chores' ? limit : Math.floor(limit / 4),
        skip: filter === 'chores' ? offset : 0,
      });

      for (const chore of chores) {
        activities.push({
          id: `chore-${chore.id}`,
          type: 'chore_created',
          timestamp: chore.createdAt,
          description: `Chore "${chore.title}" was created`,
          user: chore.User_Chore_createdByToUser
            ? {
                id: chore.User_Chore_createdByToUser.id,
                email: chore.User_Chore_createdByToUser.email,
                profile: chore.User_Chore_createdByToUser.UserProfile,
              }
            : null,
          data: { choreId: chore.id },
        });
      }

      // Get chore completions
      const completions = await this.prisma.choreCompletion.findMany({
        where: {
          Chore: {
            OR: [
              { createdBy: userId },
              { assignedTo: userId },
              {
                Group: {
                  GroupMember: {
                    some: {
                      userId,
                    },
                  },
                },
              },
            ],
          },
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
          Chore: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: filter === 'chores' ? limit : Math.floor(limit / 4),
        skip: filter === 'chores' ? offset : 0,
      });

      for (const completion of completions) {
        activities.push({
          id: `completion-${completion.id}`,
          type: 'chore_completed',
          timestamp: completion.completedAt,
          description: `${completion.User.UserProfile?.displayName || completion.User.email} completed chore "${completion.Chore.title}"`,
          user: completion.User
            ? {
                id: completion.User.id,
                email: completion.User.email,
                profile: completion.User.UserProfile,
              }
            : null,
          data: {
            choreId: completion.Chore.id,
            pointsEarned: completion.pointsEarned,
          },
        });
      }
    }

    // Get groups user is member of
    if (!filter || filter === 'groups' || filter === 'all') {
      const groups = await this.prisma.group.findMany({
        where: {
          GroupMember: {
            some: {
              userId,
            },
          },
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
        orderBy: { createdAt: 'desc' },
        take: filter === 'groups' ? limit : Math.floor(limit / 4),
        skip: filter === 'groups' ? offset : 0,
      });

      for (const group of groups) {
        activities.push({
          id: `group-${group.id}`,
          type: 'group_created',
          timestamp: group.createdAt,
          description: `Group "${group.name}" was created`,
          user: group.User
            ? {
                id: group.User.id,
                email: group.User.email,
                profile: group.User.UserProfile,
              }
            : null,
          data: { groupId: group.id },
        });
      }
    }

    // Get listings user created or interacted with
    if (!filter || filter === 'listings' || filter === 'all') {
      const listings = await this.prisma.listing.findMany({
        where: {
          userId,
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
        orderBy: { createdAt: 'desc' },
        take: filter === 'listings' ? limit : Math.floor(limit / 4),
        skip: filter === 'listings' ? offset : 0,
      });

      for (const listing of listings) {
        activities.push({
          id: `listing-${listing.id}`,
          type: 'listing_created',
          timestamp: listing.createdAt,
          description: `Listing "${listing.title}" was created`,
          user: listing.User
            ? {
                id: listing.User.id,
                email: listing.User.email,
                profile: listing.User.UserProfile,
              }
            : null,
          data: { listingId: listing.id },
        });
      }
    }

    // Get rides user is involved in
    if (!filter || filter === 'rides' || filter === 'all') {
      const rides = await this.prisma.ride.findMany({
        where: {
          OR: [
            { driverId: userId },
            {
              RideParticipant: {
                some: {
                  userId,
                },
              },
            },
          ],
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
        orderBy: { createdAt: 'desc' },
        take: filter === 'rides' ? limit : Math.floor(limit / 4),
        skip: filter === 'rides' ? offset : 0,
      });

      for (const ride of rides) {
        activities.push({
          id: `ride-${ride.id}`,
          type: 'ride_created',
          timestamp: ride.createdAt,
          description: `Ride from ${ride.origin} to ${ride.destination} was created`,
          user: ride.User
            ? {
                id: ride.User.id,
                email: ride.User.email,
                profile: ride.User.UserProfile,
              }
            : null,
          data: { rideId: ride.id },
        });
      }
    }

    // Sort by timestamp (most recent first)
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Apply pagination
    const total = activities.length;
    const paginatedActivities = activities.slice(offset, offset + limit);
    const hasMore = offset + paginatedActivities.length < total;

    return {
      activities: paginatedActivities,
      total,
      hasMore,
    };
  }
}
