import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  async calculateTrustScoreBreakdown(userId: string): Promise<TrustScoreBreakdown> {
    const expenseScoreData = await this.calculateExpenseScore(userId);
    const choreScoreData = await this.calculateChoreScore(userId);
    const communityScoreData = await this.calculateCommunityScore(userId);

    // Calculate weighted scores
    const expenseScore = expenseScoreData.rawScore * 0.4; // 40% weight
    const choreScore = choreScoreData.rawScore * 0.3; // 30% weight
    const communityScore = communityScoreData.rawScore * 0.3; // 30% weight

    const total = Math.min(Math.round(expenseScore + choreScore + communityScore), 100);

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
        expense: {
          select: {
            createdAt: true,
          },
        },
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
      const timeToPay = split.paidAt.getTime() - split.expense.createdAt.getTime();
      return timeToPay <= sevenDaysInMs;
    });
    const onTimeSettlementRate = splits.length > 0 ? onTimeSettlements.length / splits.length : 0;

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
      (onTimeSettlementRate * 0.5 + recentActivityBonus * 0.3 + volumeBonus * 0.2) * 100,
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
   * - Completion rate (40%): Percentage of assigned chores completed
   * - On-time rate (30%): Percentage of chores completed on time
   * - Points bonus (30%): Normalized points earned
   */
  private async calculateChoreScore(userId: string) {
    // Get all chores assigned to user
    const assignedChores = await this.prisma.chore.findMany({
      where: {
        assignedTo: userId,
      },
      include: {
        completions: {
          where: {
            userId,
          },
        },
      },
    });

    if (assignedChores.length === 0) {
      return {
        completionRate: 0,
        onTimeRate: 0,
        pointsBonus: 0,
        rawScore: 0,
      };
    }

    // Calculate completion rate
    const completedChores = assignedChores.filter((chore) => chore.completions.length > 0);
    const completionRate = completedChores.length / assignedChores.length;

    // Calculate on-time rate (from completed chores)
    const completedChoresWithCompletions = assignedChores.filter(
      (chore) => chore.completions.length > 0,
    );
    let onTimeCount = 0;
    for (const chore of completedChoresWithCompletions) {
      const completion = chore.completions[0]; // Most recent completion
      if (completion.onTime) {
        onTimeCount++;
      }
    }
    const onTimeRate =
      completedChoresWithCompletions.length > 0
        ? onTimeCount / completedChoresWithCompletions.length
        : 0;

    // Calculate points bonus (normalized: 1000+ points = 1.0)
    const totalPoints = completedChores.reduce(
      (sum, chore) => sum + (chore.completions[0]?.pointsEarned || 0),
      0,
    );
    const pointsBonus = Math.min(totalPoints / 1000, 1.0);

    // Calculate raw score (0-100)
    // Multiply by 100 first, then round to avoid rounding small decimals to 0
    const rawScore = Math.round(
      (completionRate * 0.4 + onTimeRate * 0.3 + pointsBonus * 0.3) * 100,
    );

    return {
      completionRate,
      onTimeRate,
      pointsBonus,
      rawScore,
    };
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
      (listing) => listing.status === 'completed' || listing.status === 'closed',
    );
    const listingSuccessRate = listings.length > 0 ? successfulListings.length / listings.length : 0;

    // Calculate engagement rate (normalized: 10+ listings = 1.0)
    const engagementRate = Math.min(listings.length / 10, 1.0);

    // Calculate response rate (messages responded to within 24 hours)
    // Get all chats where user is a participant
    const chatParticipants = await this.prisma.chatParticipant.findMany({
      where: {
        userId,
      },
      include: {
        chat: {
          include: {
            messages: {
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
      const messages = participant.chat.messages;
      
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        // If message is from someone else, count it as received
        if (message.senderId !== userId) {
          messagesReceived++;
          
          // Check if user responded within 24 hours (look for next message from user)
          for (let j = i + 1; j < messages.length; j++) {
            const nextMessage = messages[j];
            if (nextMessage.senderId === userId) {
              const timeToRespond = nextMessage.sentAt.getTime() - message.sentAt.getTime();
              if (timeToRespond <= twentyFourHoursInMs) {
                responsesWithin24h++;
              }
              break; // Only count the first response
            }
          }
        }
      }
    }

    const responseRate = messagesReceived > 0 ? responsesWithin24h / messagesReceived : 0;

    // Calculate raw score (0-100)
    // Multiply by 100 first, then round to avoid rounding small decimals to 0
    const rawScore = Math.round(
      (listingSuccessRate * 0.5 + engagementRate * 0.3 + responseRate * 0.2) * 100,
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
        history: {
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
            userId,
            score,
            verified: false,
          },
        });

        // Add initial history entry
        await this.addHistoryEntry(newTrustScore.id, score, 'Initial score calculation');

        // Fetch with history
        trustScore = await this.prisma.trustScore.findUnique({
          where: { id: newTrustScore.id },
          include: {
            history: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });

        if (!trustScore) {
          throw new Error('Failed to create trust score');
        }
      } catch (error: any) {
        // If unique constraint error (race condition), just fetch the existing one
        if (error.code === 'P2002' && error.meta?.target?.includes('userId')) {
          trustScore = await this.prisma.trustScore.findUnique({
            where: { userId },
            include: {
              history: {
                orderBy: { createdAt: 'desc' },
                take: 10,
              },
            },
          });
          // If still null after fetching, something is wrong
          if (!trustScore) {
            throw new Error('Failed to retrieve trust score after race condition');
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
            history: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });

        // Add history entry for the change
        await this.addHistoryEntry(trustScore.id, calculatedScore, 'Score recalculation');
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
        trustScoreId,
        score,
        reason,
      },
    });
  }

  /**
   * Get trust score history for a user
   */
  async getTrustScoreHistory(userId: string, limit: number = 20) {
    const trustScore = await this.prisma.trustScore.findUnique({
      where: { userId },
      include: {
        history: {
          orderBy: { createdAt: 'desc' },
          take: limit,
        },
      },
    });

    return trustScore?.history || [];
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

      await this.addHistoryEntry(trustScore.id, calculatedScore, 'Chore completed');
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

      await this.addHistoryEntry(trustScore.id, calculatedScore, 'Expense paid');
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

      await this.addHistoryEntry(trustScore.id, calculatedScore, 'Community activity');
    }
  }
}
