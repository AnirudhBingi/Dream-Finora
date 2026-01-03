import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

export interface TrustScoreBreakdown {
  total: number;
  expenseScore: number;
  choreScore: number;
  communityScore: number;
  breakdown: {
    expense: {
      onTimeSettlementRate: number;
      recentActivityBonus: number;
      volumeBonus: number;
      rawScore: number;
    };
    chore: {
      completionRate: number;
      onTimeRate: number;
      pointsBonus: number;
      streakBonus: number;
      achievementsBonus: number;
      rawScore: number;
    };
    community: {
      listingSuccessRate: number;
      engagementRate: number;
      responseRate: number;
      rawScore: number;
    };
  };
}

@Injectable()
export class TrustScoreService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate complete trust score based on expense, chore, and community metrics
   * Formula:
   * - Expense Score (40%): onTimeSettlementRate * 0.5 + recentActivityBonus * 0.3 + volumeBonus * 0.2
   * - Chore Score (30%): completionRate * 0.4 + onTimeRate * 0.3 + pointsBonus * 0.3
   * - Community Score (30%): listingSuccessRate * 0.5 + engagementRate * 0.3 + responseRate * 0.2
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

    // Calculate weighted scores
    const expenseScore = expenseScoreData.rawScore * 0.4; // 40% weight
    const choreScore = choreScoreData.rawScore * 0.3; // 30% weight
    const communityScore = communityScoreData.rawScore * 0.3; // 30% weight

    const total = Math.min(
      Math.round(expenseScore + choreScore + communityScore),
      100,
    );

    return {
      total,
      expenseScore,
      choreScore,
      communityScore,
      breakdown: {
        expense: expenseScoreData,
        chore: choreScoreData,
        community: communityScoreData,
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

    if (splits.length === 0) {
      return {
        onTimeSettlementRate: 0,
        recentActivityBonus: 0,
        volumeBonus: 0,
        rawScore: 0,
      };
    }

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

    // Calculate raw score (0-100)
    const rawScore = Math.round(
      (onTimeSettlementRate * 0.5 +
        recentActivityBonus * 0.3 +
        volumeBonus * 0.2) *
        100,
    );

    return {
      onTimeSettlementRate,
      recentActivityBonus,
      volumeBonus,
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
    // Get all chores assigned to user
    const assignedChores = await this.prisma.chore.findMany({
      where: {
        assignedTo: userId,
      },
      include: {
        ChoreCompletion: {
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

    // Calculate raw score (0-100)
    // Weights: completionRate (35%), onTimeRate (25%), pointsBonus (20%), streakBonus (10%), achievementsBonus (10%)
    const rawScore = Math.round(
      (completionRate * 0.35 +
        onTimeRate * 0.25 +
        pointsBonus * 0.2 +
        streakBonus * 0.1 +
        achievementsBonus * 0.1) *
        100,
    );

    return {
      completionRate,
      onTimeRate,
      pointsBonus,
      streakBonus,
      achievementsBonus,
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
   * - Listing success rate (50%): Percentage of listings marked as completed/closed
   * - Engagement rate (30%): Number of listings created (normalized)
   * - Response rate (20%): Percentage of messages responded to within 24 hours
   */
  private async calculateCommunityScore(userId: string) {
    // Get all listings by user
    const listings = await this.prisma.listing.findMany({
      where: {
        userId,
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

    // Calculate response rate (messages responded to within 24 hours)
    // Get all chats where user is a participant
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

    // Count messages received (from others) and check if user responded within 24 hours
    let messagesReceived = 0;
    let responsesWithin24h = 0;
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

    for (const participant of chatParticipants) {
      const messages = participant.Chat.Message;

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];

        // If message is from someone else, count it as received
        if (message.senderId !== userId) {
          messagesReceived++;

          // Check if user responded within 24 hours (look for next message from user)
          for (let j = i + 1; j < messages.length; j++) {
            const nextMessage = messages[j];
            if (nextMessage.senderId === userId) {
              const timeToRespond =
                nextMessage.sentAt.getTime() - message.sentAt.getTime();
              if (timeToRespond <= twentyFourHoursInMs) {
                responsesWithin24h++;
              }
              break; // Only count the first response
            }
          }
        }
      }
    }

    const responseRate =
      messagesReceived > 0 ? responsesWithin24h / messagesReceived : 0;

    // Calculate raw score (0-100)
    // Multiply by 100 first, then round to avoid rounding small decimals to 0
    const rawScore = Math.round(
      (listingSuccessRate * 0.5 + engagementRate * 0.3 + responseRate * 0.2) *
        100,
    );

    return {
      listingSuccessRate,
      engagementRate,
      responseRate,
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
      if (breakdown.breakdown.community.responseRate < 0.8) {
        suggestions.push(
          'Respond to messages within 24 hours to improve your response rate',
        );
      }
    }

    // What affects score breakdown
    const affectsScore = {
      expense: {
        weight: 40,
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
        ],
      },
      chore: {
        weight: 30,
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
        ],
      },
      community: {
        weight: 30,
        components: [
          {
            name: 'Listing success rate',
            impact: breakdown.breakdown.community.listingSuccessRate * 50,
          },
          {
            name: 'Engagement rate',
            impact: breakdown.breakdown.community.engagementRate * 30,
          },
          {
            name: 'Message response rate',
            impact: breakdown.breakdown.community.responseRate * 20,
          },
        ],
      },
    };

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
      history: history.slice(0, 30).map((h) => ({
        score: h.score,
        timestamp: h.createdAt,
        reason: h.reason,
      })),
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
}
