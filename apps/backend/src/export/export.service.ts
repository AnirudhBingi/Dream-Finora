import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Export expenses as CSV
   */
  async exportExpensesCSV(userId: string): Promise<string> {
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
            email: true,
            UserProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
        ExpenseSplit: {
          include: {
            User: {
              select: {
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
        Group: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // CSV Header
    const headers = [
      'Date',
      'Description',
      'Amount',
      'Currency',
      'Created By',
      'Group',
      'Split Type',
      'Your Share',
      'Your Status',
      'Paid At',
    ];

    // CSV Rows
    const rows = expenses.map((expense) => {
      const userSplit = expense.ExpenseSplit.find((split) => split.userId === userId);
      const createdByName =
        expense.User_Expense_createdByToUser.UserProfile?.displayName || expense.User_Expense_createdByToUser.email;

      return [
        expense.createdAt.toISOString().split('T')[0],
        this.escapeCSV(expense.description),
        expense.amount.toString(),
        expense.currency,
        this.escapeCSV(createdByName),
        expense.Group ? this.escapeCSV(expense.Group.name) : '',
        expense.splitType || 'EQUAL',
        userSplit ? userSplit.amount.toString() : '0',
        userSplit?.isPaid ? 'Paid' : 'Unpaid',
        userSplit?.paidAt ? userSplit.paidAt.toISOString().split('T')[0] : '',
      ];
    });

    // Combine header and rows
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return csvContent;
  }

  /**
   * Export finance transactions as CSV
   */
  async exportTransactionsCSV(userId: string): Promise<string> {
    const transactions = await this.prisma.financeTransaction.findMany({
      where: {
        userId,
      },
      include: {
        Budget: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // CSV Header
    const headers = [
      'Date',
      'Type',
      'Amount',
      'Category',
      'Description',
      'Budget',
      'Goal',
      'Loan',
      'Context',
    ];

    // CSV Rows
    const rows = transactions.map((transaction) => {
      return [
        transaction.date.toISOString().split('T')[0],
        transaction.type,
        transaction.amount.toString(),
        this.escapeCSV(transaction.category || ''),
        this.escapeCSV(transaction.description || ''),
        transaction.Budget ? this.escapeCSV(transaction.Budget.name) : '',
        '',
        '',
        transaction.context,
      ];
    });

    // Combine header and rows
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return csvContent;
  }

  /**
   * Export all user data as JSON
   */
  async exportAllDataJSON(userId: string): Promise<any> {
    const [
      expenses,
      transactions,
      chores,
      groups,
      listings,
      rides,
      friends,
      profile,
      trustScore,
    ] = await Promise.all([
      // Expenses
      this.prisma.expense.findMany({
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
          ExpenseSplit: true,
          Group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Transactions
      this.prisma.financeTransaction.findMany({
        where: { userId },
        include: {
          Budget: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Chores
      this.prisma.chore.findMany({
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
          ChoreCompletion: {
            where: { userId },
          },
        },
      }),

      // Groups
      this.prisma.group.findMany({
        where: {
          GroupMember: {
            some: {
              userId,
            },
          },
        },
        include: {
          GroupMember: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      }),

      // Listings
      this.prisma.listing.findMany({
        where: { userId },
      }),

      // Rides
      this.prisma.ride.findMany({
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
          RideParticipant: {
            select: {
              userId: true,
            },
          },
        },
      }),

      // Friends
      this.prisma.friend.findMany({
        where: {
          OR: [
            { userId, status: 'accepted' },
            { friendId: userId, status: 'accepted' },
          ],
        },
      }),

      // Profile
      this.prisma.userProfile.findUnique({
        where: { userId },
      }),

      // Trust Score
      this.prisma.trustScore.findUnique({
        where: { userId },
        include: {
          TrustScoreHistory: {
            take: 100,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      user: {
        profile,
        trustScore,
      },
      data: {
        expenses,
        transactions,
        chores,
        groups,
        listings,
        rides,
        friends,
      },
    };
  }

  /**
   * Escape CSV field (handle commas, quotes, newlines)
   */
  private escapeCSV(field: string): string {
    if (!field) return '';
    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}

