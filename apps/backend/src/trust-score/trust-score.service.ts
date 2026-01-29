import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

export interface TrustScoreBreakdown {
  total: number;
  expenseScore: number;
  choreScore: number;
  communityScore: number;
  reliabilityScore: number;
  responsivenessScore: number;
  accountTrustScore: number;
  breakdown: {
    expense: {
      onTimeSettlementRate: number;
      recentActivityBonus: number;
      volumeBonus: number;
      organizerCompletionRate: number;
      organizerBonus: number;
      payerCompletionRate: number;
      payerBonus: number;
      rawScore: number;
    };
    chore: {
      completionRate: number;
      onTimeRate: number;
      pointsBonus: number;
      streakBonus: number;
      achievementsBonus: number;
      organizerCompletionRate: number;
      organizerBonus: number;
      rawScore: number;
    };
    community: {
      listingSuccessRate: number;
      engagementRate: number;
      postEngagementRate: number;
      postActivityBonus: number;
      rawScore: number;
    };
    responsiveness: {
      responseRate: number;
      rawScore: number;
    };
    accountTrust: {
      emailVerified: boolean;
      profileCompletionRate: number;
      tenureScore: number;
      rawScore: number;
    };
  };
}

@Injectable()
export class TrustScoreService {
  constructor(private prisma: PrismaService) {}

  private getPublicTrustScoreWhere(): Prisma.TrustScoreWhereInput {
    return {
      OR: [
        {
          User: {
            UserProfile: {
              trustScoreVisibility: 'public',
            },
          },
        },
        {
          User: {
            UserProfile: {
              is: null,
            },
          },
        },
      ],
    };
  }

  private getPeriodStart(period: 'all-time' | 'weekly' | 'monthly') {
    const now = new Date();
    if (period === 'monthly') {
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }
    if (period === 'weekly') {
      const day = now.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      start.setUTCDate(start.getUTCDate() + diff);
      return start;
    }
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  /**
   * Calculate complete trust score based on reliability, community value,
   * responsiveness, and account trust.
   * Weights:
   * - Reliability (70%): Expense (35%) + Chore (35%)
   * - Community (15%): Listing success + engagement
   * - Responsiveness (10%): Message response rate
   * - Account trust (5%): Verification, profile completeness, tenure
   */
  async calculateTrustScore(userId: string): Promise<number> {
    const breakdown = await this.calculateTrustScoreBreakdown(userId);
    return breakdown.total;
  }

  /**
   * Calculate detailed trust score breakdown
   */
  async calculateTrustScoreBreakdown(
    userId: string,
  ): Promise<TrustScoreBreakdown> {
    const expenseScoreData = await this.calculateExpenseScore(userId);
    const choreScoreData = await this.calculateChoreScore(userId);
    const communityScoreData = await this.calculateCommunityScore(userId);
    const responsivenessScoreData =
      await this.calculateResponsivenessScore(userId);
    const accountTrustScoreData = await this.calculateAccountTrustScore(userId);

    // Calculate weighted scores
    const expenseScore = expenseScoreData.rawScore * 0.35; // 35% weight
    const choreScore = choreScoreData.rawScore * 0.35; // 35% weight
    const reliabilityScore = expenseScore + choreScore;
    const communityScore = communityScoreData.rawScore * 0.15; // 15% weight
    const responsivenessScore = responsivenessScoreData.rawScore * 0.1; // 10% weight
    const accountTrustScore = accountTrustScoreData.rawScore * 0.05; // 5% weight

    const total = Math.min(
      Math.round(
        reliabilityScore +
          communityScore +
          responsivenessScore +
          accountTrustScore,
      ),
      100,
    );

    return {
      total,
      expenseScore,
      choreScore,
      communityScore,
      reliabilityScore,
      responsivenessScore,
      accountTrustScore,
      breakdown: {
        expense: expenseScoreData,
        chore: choreScoreData,
        community: communityScoreData,
        responsiveness: responsivenessScoreData,
        accountTrust: accountTrustScoreData,
      },
    };
  }

  /**
   * Calculate expense score (max 100 points, weighted to 40%)
   * Components:
   * - On-time settlement rate (50%): Percentage of expenses paid within 7 days
   * - Recent activity bonus (30%): Activity in last 30 days
   * - Volume bonus (20%): Number of completed expense transactions
   */
  private async calculateExpenseScore(userId: string) {
    // Get all expense splits where user is involved
    const splits = await this.prisma.expenseSplit.findMany({
      where: {
        userId,
        isPaid: true, // Only count paid splits
        paidAt: { not: null },
      },
      include: {
        Expense: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    const createdExpenses = await this.prisma.expense.findMany({
      where: {
        createdBy: userId,
      },
      include: {
        ExpenseSplit: true,
      },
    });

    const paidByExpenses = await this.prisma.expense.findMany({
      where: {
        paidBy: userId,
      },
      include: {
        ExpenseSplit: true,
      },
    });

    // Calculate on-time settlement rate (paid within 7 days of expense creation)
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const onTimeSettlements = splits.filter((split) => {
      if (!split.paidAt) return false;
      const timeToPay =
        split.paidAt.getTime() - split.Expense.createdAt.getTime();
      return timeToPay <= sevenDaysInMs;
    });
    const onTimeSettlementRate =
      splits.length > 0 ? onTimeSettlements.length / splits.length : 0;

    // Calculate recent activity bonus (activity in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSplits = splits.filter(
      (split) => split.paidAt && split.paidAt >= thirtyDaysAgo,
    );
    // Bonus: 1.0 if 5+ recent payments, 0.5 if 1-4, 0 if none
    let recentActivityBonus = 0;
    if (recentSplits.length >= 5) {
      recentActivityBonus = 1.0;
    } else if (recentSplits.length >= 1) {
      recentActivityBonus = 0.5;
    }

    // Calculate volume bonus (normalized: 10+ transactions = 1.0, scaled down)
    const volumeBonus = Math.min(splits.length / 10, 1.0);

    function getSettlementRate(
      expenses: Array<{ ExpenseSplit: { isPaid: boolean }[] }>,
    ) {
      const totalSplits = expenses.reduce(
        (sum, expense) => sum + expense.ExpenseSplit.length,
        0,
      );
      const paidSplits = expenses.reduce(
        (sum, expense) =>
          sum + expense.ExpenseSplit.filter((split) => split.isPaid).length,
        0,
      );
      return totalSplits > 0 ? paidSplits / totalSplits : 0;
    }

    const organizerCompletionRate = getSettlementRate(createdExpenses);
    const organizerVolumeBonus = Math.min(createdExpenses.length / 5, 1.0);
    const organizerBonus =
      organizerCompletionRate * 0.7 + organizerVolumeBonus * 0.3;

    const payerCompletionRate = getSettlementRate(paidByExpenses);
    const payerVolumeBonus = Math.min(paidByExpenses.length / 5, 1.0);
    const payerBonus = payerCompletionRate * 0.7 + payerVolumeBonus * 0.3;

    // Calculate raw score (0-100)
    const rawScore = Math.round(
      (onTimeSettlementRate * 0.35 +
        recentActivityBonus * 0.2 +
        volumeBonus * 0.1 +
        organizerBonus * 0.2 +
        payerBonus * 0.15) *
        100,
    );

    return {
      onTimeSettlementRate,
      recentActivityBonus,
      volumeBonus,
      organizerCompletionRate,
      organizerBonus,
      payerCompletionRate,
      payerBonus,
      rawScore,
    };
  }

  /**
   * Calculate chore score (max 100 points, weighted to 30%)
   * Components:
   * - Completion rate (35%): Percentage of assigned chores completed
   * - On-time rate (25%): Percentage of chores completed on time
   * - Points bonus (20%): Normalized points earned
   * - Streak bonus (10%): Current streak normalized (30+ days = 1.0)
   * - Achievements bonus (10%): Percentage of achievements unlocked
   */
  private async calculateChoreScore(userId: string) {
    // Get all chores assigned to user (via ChoreAssignment or old assignedTo field)
    const assignedChores = await this.prisma.chore.findMany({
      where: {
        OR: [
          { assignedTo: userId }, // Legacy single assignment
          {
            ChoreAssignment: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      include: {
        ChoreCompletion: {
          where: {
            userId,
          },
        },
        ChoreAssignment: {
          where: {
            userId,
          },
        },
      },
    });

    // Get all completions for streak and points calculation
    const allCompletions = await this.prisma.choreCompletion.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    if (assignedChores.length === 0 && allCompletions.length === 0) {
      return {
        completionRate: 0,
        onTimeRate: 0,
        pointsBonus: 0,
        streakBonus: 0,
        achievementsBonus: 0,
        organizerCompletionRate: 0,
        organizerBonus: 0,
        rawScore: 0,
      };
    }

    // Calculate completion rate (only for assigned chores)
    const completedChores = assignedChores.filter(
      (chore) => chore.ChoreCompletion.length > 0,
    );
    const completionRate =
      assignedChores.length > 0
        ? completedChores.length / assignedChores.length
        : 0;

    // Calculate on-time rate (from completed chores)
    const completedChoresWithCompletions = assignedChores.filter(
      (chore) => chore.ChoreCompletion.length > 0,
    );
    let onTimeCount = 0;
    for (const chore of completedChoresWithCompletions) {
      const completion = chore.ChoreCompletion[0]; // Most recent completion
      if (completion.onTime) {
        onTimeCount++;
      }
    }
    const onTimeRate =
      completedChoresWithCompletions.length > 0
        ? onTimeCount / completedChoresWithCompletions.length
        : 0;

    // Calculate points bonus (normalized: 1000+ points = 1.0)
    const totalPoints = allCompletions.reduce(
      (sum, completion) => sum + completion.pointsEarned,
      0,
    );
    const pointsBonus = Math.min(totalPoints / 1000, 1.0);

    // Calculate streak bonus (normalized: 30+ days = 1.0)
    const streak = await this.calculateStreak(userId);
    const streakBonus = Math.min(streak / 30, 1.0);

    // Calculate achievements bonus (percentage of achievements unlocked)
    const achievementsBonus = await this.calculateAchievementsBonus(
      userId,
      allCompletions.length,
      totalPoints,
      streak,
    );

    const createdChores = await this.prisma.chore.findMany({
      where: { createdBy: userId },
      include: { ChoreCompletion: true },
    });
    const organizerCompletions = createdChores.filter((chore) =>
      chore.ChoreCompletion.some((completion) => completion.userId !== userId),
    );
    const organizerCompletionRate =
      createdChores.length > 0
        ? organizerCompletions.length / createdChores.length
        : 0;
    const organizerVolumeBonus = Math.min(createdChores.length / 5, 1.0);
    const organizerBonus =
      organizerCompletionRate * 0.7 + organizerVolumeBonus * 0.3;

    // Calculate raw score (0-100)
    const rawScore = Math.round(
      (completionRate * 0.3 +
        onTimeRate * 0.2 +
        pointsBonus * 0.15 +
        streakBonus * 0.1 +
        achievementsBonus * 0.1 +
        organizerBonus * 0.15) *
        100,
    );

    return {
      completionRate,
      onTimeRate,
      pointsBonus,
      streakBonus,
      achievementsBonus,
      organizerCompletionRate,
      organizerBonus,
      rawScore,
    };
  }

  /**
   * Calculate streak (consecutive days with at least one completion)
   */
  private async calculateStreak(userId: string): Promise<number> {
    const completions = await this.prisma.choreCompletion.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    if (completions.length === 0) {
      return 0;
    }

    // Group completions by date (ignoring time)
    const completionsByDate = new Map<string, number>();
    for (const completion of completions) {
      const dateKey = completion.completedAt.toISOString().split('T')[0];
      completionsByDate.set(dateKey, (completionsByDate.get(dateKey) || 0) + 1);
    }

    // Calculate streak (consecutive days with at least one completion)
    const sortedDates = Array.from(completionsByDate.keys()).sort().reverse();
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      date.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (date.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate achievements bonus (percentage of achievements unlocked)
   * Total achievements: 12
   * - First Steps (1 completion)
   * - Getting Started (10 completions)
   * - Dedicated Helper (50 completions)
   * - Chore Master (100 completions)
   * - Point Collector (100 points)
   * - Point Champion (500 points)
   * - Point Legend (1000 points)
   * - On a Roll (3-day streak)
   * - Week Warrior (7-day streak)
   * - Monthly Master (30-day streak)
   * - Perfect Timing (10+ chores all on time)
   */
  private async calculateAchievementsBonus(
    userId: string,
    totalCompleted: number,
    totalPoints: number,
    streak: number,
  ): Promise<number> {
    let unlockedCount = 0;
    const totalAchievements = 12;

    // First Steps
    if (totalCompleted >= 1) unlockedCount++;

    // Milestone achievements
    if (totalCompleted >= 10) unlockedCount++;
    if (totalCompleted >= 50) unlockedCount++;
    if (totalCompleted >= 100) unlockedCount++;

    // Points achievements
    if (totalPoints >= 100) unlockedCount++;
    if (totalPoints >= 500) unlockedCount++;
    if (totalPoints >= 1000) unlockedCount++;

    // Streak achievements
    if (streak >= 3) unlockedCount++;
    if (streak >= 7) unlockedCount++;
    if (streak >= 30) unlockedCount++;

    // Perfect timing achievement
    const onTimeCount = await this.prisma.choreCompletion.count({
      where: {
        userId,
        onTime: true,
      },
    });
    if (totalCompleted >= 10 && onTimeCount === totalCompleted) {
      unlockedCount++;
    }

    return unlockedCount / totalAchievements;
  }

  /**
   * Calculate community score (max 100 points, weighted to 30%)
   * Components:
   * - Listing success rate (60%): Percentage of listings marked as completed/closed
   * - Engagement rate (40%): Number of listings created (normalized)
   */
  private async calculateCommunityScore(userId: string) {
    // Get all listings by user
    const listings = await this.prisma.listing.findMany({
      where: {
        userId,
      },
    });

    const posts = await this.prisma.post.findMany({
      where: {
        userId,
      },
      select: {
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        createdAt: true,
      },
    });

    // Calculate listing success rate (status = "completed" or "closed")
    const successfulListings = listings.filter(
      (listing) =>
        listing.status === 'completed' || listing.status === 'closed',
    );
    const listingSuccessRate =
      listings.length > 0 ? successfulListings.length / listings.length : 0;

    // Calculate engagement rate (normalized: 10+ listings = 1.0)
    const engagementRate = Math.min(listings.length / 10, 1.0);

    const postEngagementTotal = posts.reduce(
      (sum, post) =>
        sum + post.likesCount + post.commentsCount * 2 + post.sharesCount * 3,
      0,
    );
    const postEngagementRate =
      posts.length > 0
        ? Math.min(postEngagementTotal / (posts.length * 10), 1.0)
        : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPosts = posts.filter((post) => post.createdAt >= thirtyDaysAgo);
    let postActivityBonus = 0;
    if (recentPosts.length >= 5) {
      postActivityBonus = 1.0;
    } else if (recentPosts.length >= 1) {
      postActivityBonus = 0.5;
    }

    // Calculate raw score (0-100)
    // Multiply by 100 first, then round to avoid rounding small decimals to 0
    const rawScore = Math.round(
      (listingSuccessRate * 0.4 +
        engagementRate * 0.2 +
        postEngagementRate * 0.3 +
        postActivityBonus * 0.1) *
        100,
    );

    return {
      listingSuccessRate,
      engagementRate,
      postEngagementRate,
      postActivityBonus,
      rawScore,
    };
  }

  /**
   * Calculate responsiveness score (max 100 points)
   * Components:
   * - Response rate (100%): Percentage of messages responded to within 24 hours
   */
  private async calculateResponsivenessScore(userId: string) {
    const chatParticipants = await this.prisma.chatParticipant.findMany({
      where: {
        userId,
      },
      include: {
        Chat: {
          include: {
            Message: {
              orderBy: {
                sentAt: 'asc',
              },
            },
          },
        },
      },
    });

    let messagesReceived = 0;
    let responsesWithin24h = 0;
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

    for (const participant of chatParticipants) {
      const messages = participant.Chat.Message;
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        if (message.senderId !== userId) {
          messagesReceived++;
          for (let j = i + 1; j < messages.length; j++) {
            const nextMessage = messages[j];
            if (nextMessage.senderId === userId) {
              const timeToRespond =
                nextMessage.sentAt.getTime() - message.sentAt.getTime();
              if (timeToRespond <= twentyFourHoursInMs) {
                responsesWithin24h++;
              }
              break;
            }
          }
        }
      }
    }

    const responseRate =
      messagesReceived > 0 ? responsesWithin24h / messagesReceived : 0.5;
    const rawScore = Math.round(responseRate * 100);

    return {
      responseRate,
      rawScore,
    };
  }

  /**
   * Calculate account trust score (max 100 points)
   * Components:
   * - Email verified (40%)
   * - Profile completeness (30%)
   * - Account tenure (30%)
   */
  private async calculateAccountTrustScore(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserProfile: true,
      },
    });

    if (!user) {
      return {
        emailVerified: false,
        profileCompletionRate: 0,
        tenureScore: 0,
        rawScore: 0,
      };
    }

    const emailVerified = Boolean(user.emailVerified);
    const profileFields = [
      user.UserProfile?.displayName,
      user.UserProfile?.avatarUrl,
      user.UserProfile?.bio,
    ];
    const completedFields = profileFields.filter(
      (field) => field != null && field !== '',
    ).length;
    const profileCompletionRate = completedFields / profileFields.length;

    const accountAgeDays = Math.max(
      0,
      Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const tenureScore = Math.min(accountAgeDays / 180, 1);

    const rawScore = Math.round(
      (Number(emailVerified) * 0.4 +
        profileCompletionRate * 0.3 +
        tenureScore * 0.3) *
        100,
    );

    return {
      emailVerified,
      profileCompletionRate,
      tenureScore,
      rawScore,
    };
  }

  /**
   * Get or create trust score for a user with breakdown
   */
  async getOrCreateTrustScore(userId: string) {
    let trustScore = await this.prisma.trustScore.findUnique({
      where: { userId },
      include: {
        TrustScoreHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!trustScore) {
      // Calculate initial score
      const breakdown = await this.calculateTrustScoreBreakdown(userId);
      const score = breakdown.total;

      // Create trust score - handle race condition where another request might have created it
      try {
        const newTrustScore = await this.prisma.trustScore.create({
          data: {
            id: randomUUID(),
            userId,
            score,
            verified: false,
          },
        });

        // Add initial history entry
        await this.addHistoryEntry(
          newTrustScore.id,
          score,
          'Initial score calculation',
        );

        // Fetch with history
        trustScore = await this.prisma.trustScore.findUnique({
          where: { id: newTrustScore.id },
          include: {
            TrustScoreHistory: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });

        if (!trustScore) {
          throw new Error('Failed to create trust score');
        }
      } catch (error: unknown) {
        // If unique constraint error (race condition), just fetch the existing one
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          error.meta &&
          Array.isArray(error.meta.target) &&
          error.meta.target.includes('userId')
        ) {
          trustScore = await this.prisma.trustScore.findUnique({
            where: { userId },
            include: {
              TrustScoreHistory: {
                orderBy: { createdAt: 'desc' },
                take: 10,
              },
            },
          });
          // If still null after fetching, something is wrong
          if (!trustScore) {
            throw new Error(
              'Failed to retrieve trust score after race condition',
            );
          }
        } else {
          // Re-throw if it's a different error
          throw error;
        }
      }
    } else {
      // Recalculate and update if needed
      const breakdown = await this.calculateTrustScoreBreakdown(userId);
      const calculatedScore = breakdown.total;

      if (trustScore.score !== calculatedScore) {
        trustScore = await this.prisma.trustScore.update({
          where: { id: trustScore.id },
          data: {
            score: calculatedScore,
            updatedAt: new Date(),
          },
          include: {
            TrustScoreHistory: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });

        // Add history entry for the change
        await this.addHistoryEntry(
          trustScore.id,
          calculatedScore,
          'Score recalculation',
        );
      }
    }

    // Final check - trustScore should never be null at this point
    if (!trustScore) {
      throw new Error('Failed to get or create trust score');
    }

    return trustScore;
  }

  /**
   * Get trust score with breakdown
   */
  async getTrustScoreWithBreakdown(userId: string) {
    const trustScore = await this.getOrCreateTrustScore(userId);
    const breakdownData = await this.calculateTrustScoreBreakdown(userId);

    return {
      ...trustScore,
      breakdown: breakdownData.breakdown,
      expenseScore: breakdownData.expenseScore,
      choreScore: breakdownData.choreScore,
      communityScore: breakdownData.communityScore,
      reliabilityScore: breakdownData.reliabilityScore,
      responsivenessScore: breakdownData.responsivenessScore,
      accountTrustScore: breakdownData.accountTrustScore,
    };
  }

  /**
   * Add a history entry for trust score changes
   */
  private async addHistoryEntry(
    trustScoreId: string,
    score: number,
    reason: string,
  ) {
    await this.prisma.trustScoreHistory.create({
      data: {
        id: randomUUID(),
        trustScoreId,
        score,
        reason,
      },
    });
  }

  /**
   * Get trust score history for a user (detailed)
   */
  async getTrustScoreHistory(userId: string, limit: number = 50) {
    const trustScore = await this.prisma.trustScore.findUnique({
      where: { userId },
      include: {
        TrustScoreHistory: {
          orderBy: { createdAt: 'desc' },
          take: limit,
        },
      },
    });

    return trustScore?.TrustScoreHistory || [];
  }

  /**
   * Compare trust score with friends
   */
  async compareTrustScoreWithFriends(userId: string) {
    // Get user's trust score
    const userTrustScore = await this.getOrCreateTrustScore(userId);
    const userBreakdown = await this.calculateTrustScoreBreakdown(userId);

    // Get user's friends
    const friendships = await this.prisma.friend.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
      include: {
        User_Friend_userIdToUser: {
          include: {
            UserProfile: true,
          },
        },
        User_Friend_friendIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
    });

    // Get trust scores for friends
    const friendScores = await Promise.all(
      friendships.map(async (friendship) => {
        const friendId =
          friendship.userId === userId
            ? friendship.friendId
            : friendship.userId;
        const friend =
          friendship.userId === userId
            ? friendship.User_Friend_friendIdToUser
            : friendship.User_Friend_userIdToUser;

        // Check privacy settings
        if (friend.UserProfile?.trustScoreVisibility === 'private') {
          return null;
        }

        const friendTrustScore = await this.getOrCreateTrustScore(
          friendId,
        ).catch(() => null);
        if (!friendTrustScore) return null;

        // If visibility is 'friends', show score; if 'public', show score
        // If visibility is 'private', we already returned null above
        return {
          userId: friendId,
          displayName: friend.UserProfile?.displayName || friend.email,
          avatarUrl: friend.UserProfile?.avatarUrl,
          score: friendTrustScore.score,
          rank: 0, // Will be calculated below
        };
      }),
    );

    // Filter out nulls and sort by score
    const validFriendScores = friendScores.filter((f) => f !== null) as Array<{
      userId: string;
      displayName: string;
      avatarUrl: string | null;
      score: number;
      rank: number;
    }>;

    // Add user's own score
    const allScores = [
      {
        userId,
        displayName: 'You',
        avatarUrl: null,
        score: userTrustScore.score,
        rank: 0,
      },
      ...validFriendScores,
    ];

    // Sort by score descending and assign ranks
    allScores.sort((a, b) => b.score - a.score);
    allScores.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return {
      userScore: userTrustScore.score,
      userRank: allScores.find((e) => e.userId === userId)?.rank || 0,
      totalFriends: validFriendScores.length,
      breakdown: userBreakdown,
      friends: validFriendScores.map((f) => ({
        userId: f.userId,
        displayName: f.displayName,
        avatarUrl: f.avatarUrl,
        score: f.score,
        rank: f.rank,
      })),
    };
  }

  /**
   * Get trust score insights (what affects score, how to improve, trends)
   */
  async getTrustScoreInsights(userId: string) {
    const breakdown = await this.calculateTrustScoreBreakdown(userId);
    const history = await this.getTrustScoreHistory(userId, 30); // Last 30 entries for trends

    // Calculate trends (last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentHistory = history.filter(
      (h) => new Date(h.createdAt) >= sevenDaysAgo,
    );
    const previousHistory = history.filter(
      (h) =>
        new Date(h.createdAt) >= fourteenDaysAgo &&
        new Date(h.createdAt) < sevenDaysAgo,
    );

    const recentAvg =
      recentHistory.length > 0
        ? recentHistory.reduce((sum, h) => sum + h.score, 0) /
          recentHistory.length
        : breakdown.total;
    const previousAvg =
      previousHistory.length > 0
        ? previousHistory.reduce((sum, h) => sum + h.score, 0) /
          previousHistory.length
        : breakdown.total;

    const trend = recentAvg - previousAvg;
    const trendDirection = trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable';

    // Generate improvement suggestions
    const suggestions: string[] = [];

    // Expense suggestions
    if (breakdown.breakdown.expense.rawScore < 70) {
      if (breakdown.breakdown.expense.onTimeSettlementRate < 0.8) {
        suggestions.push('Pay expenses on time to improve your expense score');
      }
      if (breakdown.breakdown.expense.recentActivityBonus < 0.5) {
        suggestions.push(
          'Complete more expense transactions to boost your activity bonus',
        );
      }
      if (breakdown.breakdown.expense.volumeBonus < 0.5) {
        suggestions.push(
          'Engage in more expense transactions to increase your volume bonus',
        );
      }
      if (breakdown.breakdown.expense.organizerBonus < 0.5) {
        suggestions.push(
          'Create shared bills and track settlements to improve your reliability score',
        );
      }
      if (breakdown.breakdown.expense.payerBonus < 0.5) {
        suggestions.push(
          'Covering group bills and getting them settled boosts your reliability score',
        );
      }
    }

    // Chore suggestions
    if (breakdown.breakdown.chore.rawScore < 70) {
      if (breakdown.breakdown.chore.completionRate < 0.8) {
        suggestions.push(
          'Complete more assigned chores to improve your completion rate',
        );
      }
      if (breakdown.breakdown.chore.onTimeRate < 0.8) {
        suggestions.push('Complete chores on time to boost your on-time rate');
      }
      if (breakdown.breakdown.chore.pointsBonus < 0.5) {
        suggestions.push(
          'Earn more points by completing chores to increase your points bonus',
        );
      }
      if (breakdown.breakdown.chore.streakBonus < 0.5) {
        suggestions.push(
          'Maintain a daily chore completion streak to boost your streak bonus',
        );
      }
      if (breakdown.breakdown.chore.organizerBonus < 0.5) {
        suggestions.push(
          'Create and organize chores so others complete them on time',
        );
      }
    }

    // Community suggestions
    if (breakdown.breakdown.community.rawScore < 70) {
      if (breakdown.breakdown.community.listingSuccessRate < 0.7) {
        suggestions.push(
          'Complete or close more listings to improve your listing success rate',
        );
      }
      if (breakdown.breakdown.community.engagementRate < 0.5) {
        suggestions.push(
          'Create more listings to increase your engagement rate',
        );
      }
      if (breakdown.breakdown.community.postEngagementRate < 0.4) {
        suggestions.push(
          'Engage more on posts to boost your community contribution',
        );
      }
      if (breakdown.breakdown.community.postActivityBonus < 0.5) {
        suggestions.push(
          'Post more consistently to improve your activity score',
        );
      }
    }

    // Responsiveness suggestions
    if (breakdown.breakdown.responsiveness.rawScore < 70) {
      if (breakdown.breakdown.responsiveness.responseRate < 0.7) {
        suggestions.push(
          'Respond to messages within 24 hours to improve your responsiveness score',
        );
      }
    }

    // Account trust suggestions
    if (!breakdown.breakdown.accountTrust.emailVerified) {
      suggestions.push('Verify your email to boost your account trust score');
    }
    if (breakdown.breakdown.accountTrust.profileCompletionRate < 0.7) {
      suggestions.push('Complete your profile to improve account trust');
    }

    // What affects score breakdown
    const affectsScore = {
      expense: {
        weight: 35,
        components: [
          {
            name: 'On-time settlement rate',
            impact: breakdown.breakdown.expense.onTimeSettlementRate * 50,
          },
          {
            name: 'Recent activity',
            impact: breakdown.breakdown.expense.recentActivityBonus * 30,
          },
          {
            name: 'Transaction volume',
            impact: breakdown.breakdown.expense.volumeBonus * 20,
          },
          {
            name: 'Shared bill organization',
            impact: breakdown.breakdown.expense.organizerBonus * 20,
          },
          {
            name: 'Primary payer reliability',
            impact: breakdown.breakdown.expense.payerBonus * 15,
          },
        ],
      },
      chore: {
        weight: 35,
        components: [
          {
            name: 'Completion rate',
            impact: breakdown.breakdown.chore.completionRate * 35,
          },
          {
            name: 'On-time rate',
            impact: breakdown.breakdown.chore.onTimeRate * 25,
          },
          {
            name: 'Points earned',
            impact: breakdown.breakdown.chore.pointsBonus * 20,
          },
          {
            name: 'Streak bonus',
            impact: breakdown.breakdown.chore.streakBonus * 10,
          },
          {
            name: 'Achievements',
            impact: breakdown.breakdown.chore.achievementsBonus * 10,
          },
          {
            name: 'Chore organizer reliability',
            impact: breakdown.breakdown.chore.organizerBonus * 15,
          },
        ],
      },
      community: {
        weight: 15,
        components: [
          {
            name: 'Listing success rate',
            impact: breakdown.breakdown.community.listingSuccessRate * 40,
          },
          {
            name: 'Engagement rate',
            impact: breakdown.breakdown.community.engagementRate * 20,
          },
          {
            name: 'Post engagement',
            impact: breakdown.breakdown.community.postEngagementRate * 30,
          },
          {
            name: 'Post activity',
            impact: breakdown.breakdown.community.postActivityBonus * 10,
          },
        ],
      },
      responsiveness: {
        weight: 10,
        components: [
          {
            name: 'Message response rate',
            impact: breakdown.breakdown.responsiveness.responseRate * 100,
          },
        ],
      },
      accountTrust: {
        weight: 5,
        components: [
          {
            name: 'Email verification',
            impact: breakdown.breakdown.accountTrust.emailVerified ? 40 : 0,
          },
          {
            name: 'Profile completeness',
            impact: breakdown.breakdown.accountTrust.profileCompletionRate * 30,
          },
          {
            name: 'Account tenure',
            impact: breakdown.breakdown.accountTrust.tenureScore * 30,
          },
        ],
      },
    };

    const historyByDay = new Map<
      string,
      { score: number; createdAt: Date; reason: string | null }
    >();
    const historyAscending = [...history].reverse();
    historyAscending.forEach((entry) => {
      const dayKey = entry.createdAt.toISOString().slice(0, 10);
      historyByDay.set(dayKey, {
        score: entry.score,
        createdAt: entry.createdAt,
        reason: entry.reason,
      });
    });
    const dailyHistory = Array.from(historyByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([, entry]) => ({
        score: entry.score,
        timestamp: entry.createdAt,
        reason: entry.reason,
      }));

    return {
      currentScore: breakdown.total,
      trend: {
        direction: trendDirection,
        change: Math.abs(trend),
        recentAverage: Math.round(recentAvg),
        previousAverage: Math.round(previousAvg),
      },
      breakdown: breakdown.breakdown,
      affectsScore,
      suggestions,
      history: dailyHistory,
    };
  }

  /**
   * Update trust score based on chore completion
   */
  async updateChoreScore(userId: string) {
    const breakdown = await this.calculateTrustScoreBreakdown(userId);
    const calculatedScore = breakdown.total;

    const trustScore = await this.getOrCreateTrustScore(userId);

    if (trustScore.score !== calculatedScore) {
      await this.prisma.trustScore.update({
        where: { id: trustScore.id },
        data: {
          score: calculatedScore,
          updatedAt: new Date(),
        },
      });

      await this.addHistoryEntry(
        trustScore.id,
        calculatedScore,
        'Chore completed',
      );
    }
  }

  /**
   * Update trust score based on expense payment
   */
  async updateExpenseScore(userId: string) {
    const breakdown = await this.calculateTrustScoreBreakdown(userId);
    const calculatedScore = breakdown.total;

    const trustScore = await this.getOrCreateTrustScore(userId);
    if (!trustScore) {
      throw new Error('Failed to get or create trust score');
    }

    if (trustScore.score !== calculatedScore) {
      await this.prisma.trustScore.update({
        where: { id: trustScore.id },
        data: {
          score: calculatedScore,
          updatedAt: new Date(),
        },
      });

      await this.addHistoryEntry(
        trustScore.id,
        calculatedScore,
        'Expense paid',
      );
    }
  }

  /**
   * Update trust score based on community activity (listing, message)
   */
  async updateCommunityScore(userId: string) {
    const breakdown = await this.calculateTrustScoreBreakdown(userId);
    const calculatedScore = breakdown.total;

    const trustScore = await this.getOrCreateTrustScore(userId);
    if (!trustScore) {
      throw new Error('Failed to get or create trust score');
    }

    if (trustScore.score !== calculatedScore) {
      await this.prisma.trustScore.update({
        where: { id: trustScore.id },
        data: {
          score: calculatedScore,
          updatedAt: new Date(),
        },
      });

      await this.addHistoryEntry(
        trustScore.id,
        calculatedScore,
        'Community activity',
      );
    }
  }

  /**
   * Get global leaderboard (top users by FinScore)
   * Only includes users with public trust score visibility
   */
  async getLeaderboard(options?: {
    limit?: number;
    offset?: number;
    category?: 'overall' | 'expense' | 'chore' | 'community';
  }): Promise<{
    users: Array<{
      userId: string;
      displayName: string;
      avatarUrl: string | null;
      finscore: number;
      rank: number;
      badge?: string;
    }>;
    total: number;
    userRank: number | null;
  }> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    // Calculate category-specific scores if needed
    let rankedUsers: Array<{
      userId: string;
      displayName: string;
      avatarUrl: string | null;
      finscore: number;
      rank: number;
      badge?: string;
    }> = [];

    if (options?.category && options.category !== 'overall') {
      const publicScores = await this.prisma.trustScore.findMany({
        where: this.getPublicTrustScoreWhere(),
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
          score: 'desc',
        },
      });

      // For category-specific leaderboards, need to calculate breakdowns
      const scoresWithBreakdowns = await Promise.all(
        publicScores.map(async (ts) => {
          const breakdown = await this.calculateTrustScoreBreakdown(ts.userId);
          let categoryScore = 0;

          if (options.category === 'expense') {
            categoryScore = breakdown.expenseScore;
          } else if (options.category === 'chore') {
            categoryScore = breakdown.choreScore;
          } else if (options.category === 'community') {
            categoryScore = breakdown.communityScore;
          }

          return {
            userId: ts.userId,
            displayName: ts.User.UserProfile?.displayName || ts.User.email,
            avatarUrl: ts.User.UserProfile?.avatarUrl || null,
            finscore: Math.round(categoryScore),
          };
        }),
      );

      // Sort by category score
      scoresWithBreakdowns.sort((a, b) => b.finscore - a.finscore);

      rankedUsers = scoresWithBreakdowns.map((user, index) => ({
        ...user,
        rank: index + 1,
        badge: this.getRankBadge(index + 1),
      }));
    } else {
      const [total, trustScores] = await Promise.all([
        this.prisma.trustScore.count({
          where: this.getPublicTrustScoreWhere(),
        }),
        this.prisma.trustScore.findMany({
          where: this.getPublicTrustScoreWhere(),
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
            score: 'desc',
          },
          skip: offset,
          take: limit,
        }),
      ]);

      // Overall leaderboard (use existing score)
      rankedUsers = trustScores.map((ts, index) => ({
        userId: ts.userId,
        displayName: ts.User.UserProfile?.displayName || ts.User.email,
        avatarUrl: ts.User.UserProfile?.avatarUrl || null,
        finscore: ts.score,
        rank: offset + index + 1,
        badge: this.getRankBadge(offset + index + 1),
      }));
      return {
        users: rankedUsers,
        total,
        userRank: null,
      };
    }

    const total = rankedUsers.length;
    const paginatedUsers = rankedUsers.slice(offset, offset + limit);

    return {
      users: paginatedUsers,
      total,
      userRank: null, // Will be set by caller if userId provided
    };
  }

  /**
   * Get user's rank in leaderboard
   */
  async getUserRank(
    userId: string,
    category?: 'overall' | 'expense' | 'chore' | 'community',
  ): Promise<number | null> {
    // Check if user's trust score is public
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserProfile: {
          select: {
            trustScoreVisibility: true,
          },
        },
      },
    });

    if (!user || user.UserProfile?.trustScoreVisibility === 'private') {
      return null;
    }

    if (category && category !== 'overall') {
      const publicScores = await this.prisma.trustScore.findMany({
        where: this.getPublicTrustScoreWhere(),
        include: {
          User: {
            select: {
              UserProfile: {
                select: {
                  trustScoreVisibility: true,
                },
              },
            },
          },
        },
        orderBy: {
          score: 'desc',
        },
      });

      // For category-specific, need to calculate breakdowns
      const scoresWithBreakdowns = await Promise.all(
        publicScores.map(async (ts) => {
          const breakdown = await this.calculateTrustScoreBreakdown(ts.userId);
          let categoryScore = 0;

          if (category === 'expense') {
            categoryScore = breakdown.expenseScore;
          } else if (category === 'chore') {
            categoryScore = breakdown.choreScore;
          } else if (category === 'community') {
            categoryScore = breakdown.communityScore;
          }

          return {
            userId: ts.userId,
            score: Math.round(categoryScore),
          };
        }),
      );

      scoresWithBreakdowns.sort((a, b) => b.score - a.score);
      const userIndex = scoresWithBreakdowns.findIndex(
        (u) => u.userId === userId,
      );
      return userIndex >= 0 ? userIndex + 1 : null;
    } else {
      const trustScore = await this.prisma.trustScore.findUnique({
        where: { userId },
      });
      if (!trustScore) {
        return null;
      }

      const higherCount = await this.prisma.trustScore.count({
        where: {
          ...this.getPublicTrustScoreWhere(),
          score: {
            gt: trustScore.score,
          },
        },
      });

      return higherCount + 1;
    }
  }

  async getRankHistory(
    userId: string,
    options?: {
      limit?: number;
      category?: 'overall' | 'expense' | 'chore' | 'community';
      period?: 'all-time' | 'weekly' | 'monthly';
    },
  ) {
    const category = options?.category || 'overall';
    const period = options?.period || 'all-time';
    const date = this.getPeriodStart(period);

    const [rank, totalUsers] = await Promise.all([
      this.getUserRank(userId, category),
      this.prisma.trustScore.count({ where: this.getPublicTrustScoreWhere() }),
    ]);

    if (rank) {
      await this.prisma.trustScoreRankHistory.upsert({
        where: {
          userId_category_period_date: {
            userId,
            category,
            period,
            date,
          },
        },
        update: {
          rank,
          totalUsers,
        },
        create: {
          id: randomUUID(),
          userId,
          category,
          period,
          date,
          rank,
          totalUsers,
        },
      });
    }

    return this.prisma.trustScoreRankHistory.findMany({
      where: {
        userId,
        category,
        period,
      },
      orderBy: {
        date: 'desc',
      },
      take: options?.limit || 30,
    });
  }

  /**
   * Get friends leaderboard
   */
  async getFriendsLeaderboard(userId: string): Promise<
    Array<{
      userId: string;
      displayName: string;
      avatarUrl: string | null;
      finscore: number;
      rank: number;
    }>
  > {
    // Get user's friends
    const friendships = await this.prisma.friend.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
      include: {
        User_Friend_userIdToUser: {
          include: {
            UserProfile: true,
          },
        },
        User_Friend_friendIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
    });

    // Get trust scores for friends (and user)
    const friendIds = friendships.map((f) =>
      f.userId === userId ? f.friendId : f.userId,
    );
    const allUserIds = [userId, ...friendIds];

    const trustScores = await Promise.all(
      allUserIds.map(async (id) => {
        const trustScore = await this.getOrCreateTrustScore(id);
        const user = await this.prisma.user.findUnique({
          where: { id },
          include: {
            UserProfile: true,
          },
        });

        // Check visibility
        if (
          user?.UserProfile?.trustScoreVisibility === 'private' &&
          id !== userId
        ) {
          return null;
        }

        return {
          userId: id,
          displayName:
            user?.UserProfile?.displayName || user?.email || 'Unknown',
          avatarUrl: user?.UserProfile?.avatarUrl || null,
          finscore: trustScore.score,
          isCurrentUser: id === userId,
        };
      }),
    );

    // Filter out nulls and sort
    const validScores = trustScores.filter((s) => s !== null) as Array<{
      userId: string;
      displayName: string;
      avatarUrl: string | null;
      finscore: number;
      isCurrentUser: boolean;
    }>;

    validScores.sort((a, b) => b.finscore - a.finscore);

    // Assign ranks
    return validScores.map((user, index) => ({
      userId: user.userId,
      displayName: user.isCurrentUser ? 'You' : user.displayName,
      avatarUrl: user.avatarUrl,
      finscore: user.finscore,
      rank: index + 1,
    }));
  }

  /**
   * Get rank badge (e.g., "#1", "Top 10", "Top 50")
   */
  private getRankBadge(rank: number): string | undefined {
    if (rank === 1) return '#1';
    if (rank === 2) return '#2';
    if (rank === 3) return '#3';
    if (rank <= 10) return 'Top 10';
    if (rank <= 50) return 'Top 50';
    if (rank <= 100) return 'Top 100';
    return undefined;
  }

  async getShareRank(
    userId: string,
    category?: 'overall' | 'expense' | 'chore' | 'community',
  ) {
    const rank = await this.getUserRank(userId, category);
    if (!rank) {
      return {
        rank: null,
        totalUsers: 0,
        percentile: null,
        shareText: null,
      };
    }

    const totalUsers = await this.prisma.trustScore.count({
      where: this.getPublicTrustScoreWhere(),
    });
    const percentile =
      totalUsers > 0 ? Math.round((1 - rank / totalUsers) * 100) : null;

    const trustScore = await this.getOrCreateTrustScore(userId);
    const badge = this.getRankBadge(rank);
    const label =
      category && category !== 'overall' ? `${category} FinScore` : 'FinScore';

    const shareText = badge
      ? `I'm ${badge} (#${rank}) on ${label} with a score of ${trustScore.score}.`
      : `I'm ranked #${rank} on ${label} with a score of ${trustScore.score}.`;

    return {
      rank,
      totalUsers,
      percentile,
      shareText,
    };
  }
}
