import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChoreStatsService {
  constructor(private prisma: PrismaService) {}

  async getUserStats(userId: string) {
    // Get total points earned
    const totalPoints = await this.prisma.choreCompletion.aggregate({
      where: { userId },
      _sum: {
        pointsEarned: true,
      },
    });

    // Get total chores completed
    const totalCompleted = await this.prisma.choreCompletion.count({
      where: { userId },
    });

    // Get on-time completion count
    const onTimeCount = await this.prisma.choreCompletion.count({
      where: {
        userId,
        onTime: true,
      },
    });

    // Calculate current streak (consecutive days with at least one completion)
    const streak = await this.calculateStreak(userId);

    // Get achievements
    const achievements = await this.getAchievements(
      userId,
      totalCompleted,
      totalPoints._sum.pointsEarned || 0,
      streak,
    );

    // Get recent completions for activity feed
    const recentCompletions = await this.prisma.choreCompletion.findMany({
      where: { userId },
      include: {
        Chore: {
          select: {
            id: true,
            title: true,
            points: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    return {
      totalPoints: totalPoints._sum.pointsEarned || 0,
      totalCompleted,
      onTimeCount,
      onTimePercentage:
        totalCompleted > 0
          ? Math.round((onTimeCount / totalCompleted) * 100)
          : 0,
      currentStreak: streak,
      achievements,
      recentCompletions: recentCompletions.map((c) => ({
        id: c.id,
        choreTitle: c.Chore.title,
        pointsEarned: c.pointsEarned,
        completedAt: c.completedAt,
        onTime: c.onTime,
      })),
    };
  }

  private async calculateStreak(userId: string): Promise<number> {
    // Get all completions ordered by date (most recent first)
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

  private async getAchievements(
    userId: string,
    totalCompleted: number,
    totalPoints: number,
    streak: number,
  ): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      unlocked: boolean;
      unlockedAt?: Date;
    }>
  > {
    const achievements: Array<{
      id: string;
      name: string;
      description: string;
      unlocked: boolean;
      unlockedAt?: Date;
    }> = [];

    // First Completion - always show
    achievements.push({
      id: 'first_completion',
      name: 'First Steps',
      description: 'Complete your first chore',
      unlocked: totalCompleted >= 1,
    });

    // Milestone achievements - always show, but mark as locked if not reached
    achievements.push({
      id: 'milestone_10',
      name: 'Getting Started',
      description: 'Complete 10 chores',
      unlocked: totalCompleted >= 10,
    });
    achievements.push({
      id: 'milestone_50',
      name: 'Dedicated Helper',
      description: 'Complete 50 chores',
      unlocked: totalCompleted >= 50,
    });
    achievements.push({
      id: 'milestone_100',
      name: 'Chore Master',
      description: 'Complete 100 chores',
      unlocked: totalCompleted >= 100,
    });

    // Points achievements - always show, but mark as locked if not reached
    achievements.push({
      id: 'points_100',
      name: 'Point Collector',
      description: 'Earn 100 points',
      unlocked: totalPoints >= 100,
    });
    achievements.push({
      id: 'points_500',
      name: 'Point Champion',
      description: 'Earn 500 points',
      unlocked: totalPoints >= 500,
    });
    achievements.push({
      id: 'points_1000',
      name: 'Point Legend',
      description: 'Earn 1000 points',
      unlocked: totalPoints >= 1000,
    });

    // Streak achievements - always show, but mark as locked if not reached
    achievements.push({
      id: 'streak_3',
      name: 'On a Roll',
      description: '3-day completion streak',
      unlocked: streak >= 3,
    });
    achievements.push({
      id: 'streak_7',
      name: 'Week Warrior',
      description: '7-day completion streak',
      unlocked: streak >= 7,
    });
    achievements.push({
      id: 'streak_30',
      name: 'Monthly Master',
      description: '30-day completion streak',
      unlocked: streak >= 30,
    });

    // Perfect timing achievement - always show, but mark as locked if not reached
    const onTimeCount = await this.prisma.choreCompletion.count({
      where: {
        userId,
        onTime: true,
      },
    });

    achievements.push({
      id: 'perfect_timing',
      name: 'Perfect Timing',
      description: 'Complete 10+ chores all on time',
      unlocked: totalCompleted >= 10 && onTimeCount === totalCompleted,
    });

    return achievements;
  }

  /**
   * Get group stats with optional time filter
   */
  async getGroupStats(
    userId: string,
    groupId: string,
    period?: 'week' | 'month' | 'all-time',
  ) {
    // Verify user is member of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found or you are not a member');
    }

    // Get all group members
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        User: {
          include: {
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Calculate date filter based on period
    const now = new Date();
    let dateFilter: { gte?: Date } | undefined;
    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { gte: weekAgo };
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { gte: monthAgo };
    }

    // Get stats for each member
    const memberStats = await Promise.all(
      members.map(async (member) => {
        const completions = await this.prisma.choreCompletion.findMany({
          where: {
            userId: member.userId,
            completedAt: dateFilter,
            Chore: {
              groupId,
            },
          },
        });

        const totalPoints = completions.reduce(
          (sum, c) => sum + (c.pointsEarned || 0),
          0,
        );
        const totalCompleted = completions.length;
        const onTimeCount = completions.filter((c) => c.onTime).length;

        // Get total chores assigned to this member (for completion rate calculation)
        const totalAssigned = await this.prisma.chore.count({
          where: {
            groupId,
            OR: [
              { assignedTo: member.userId },
              {
                ChoreAssignment: {
                  some: {
                    userId: member.userId,
                  },
                },
              },
            ],
          },
        });

        // Calculate average completion time (in hours)
        let avgCompletionTime = 0;
        if (completions.length > 0) {
          const completionTimes = await Promise.all(
            completions.map(async (completion) => {
              const chore = await this.prisma.chore.findUnique({
                where: { id: completion.choreId },
                select: { createdAt: true, dueDate: true },
              });
              if (chore && chore.createdAt) {
                const timeDiff =
                  completion.completedAt.getTime() - chore.createdAt.getTime();
                return timeDiff / (1000 * 60 * 60); // Convert to hours
              }
              return null;
            }),
          );
          const validTimes = completionTimes.filter((t) => t !== null);
          if (validTimes.length > 0) {
            avgCompletionTime = Math.round(
              validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length,
            );
          }
        }

        return {
          userId: member.userId,
          displayName:
            member.User.UserProfile?.displayName ||
            member.User.email.split('@')[0],
          avatarUrl: member.User.UserProfile?.avatarUrl || null,
          totalPoints,
          totalCompleted,
          totalAssigned,
          completionRate:
            totalAssigned > 0
              ? Math.round((totalCompleted / totalAssigned) * 100)
              : 0,
          onTimeCount,
          onTimePercentage:
            totalCompleted > 0
              ? Math.round((onTimeCount / totalCompleted) * 100)
              : 0,
          avgCompletionTimeHours: avgCompletionTime,
          role: member.role,
        };
      }),
    );

    // Calculate group totals
    const groupTotalPoints = memberStats.reduce(
      (sum, m) => sum + m.totalPoints,
      0,
    );
    const groupTotalCompleted = memberStats.reduce(
      (sum, m) => sum + m.totalCompleted,
      0,
    );
    const groupTotalAssigned = memberStats.reduce(
      (sum, m) => sum + m.totalAssigned,
      0,
    );

    // Calculate fairness indicators (workload balance)
    const avgAssignedPerMember =
      memberStats.length > 0 ? groupTotalAssigned / memberStats.length : 0;
    const workloadBalance = memberStats.map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      assignedCount: m.totalAssigned,
      deviation: Math.abs(m.totalAssigned - avgAssignedPerMember),
      balanceScore:
        avgAssignedPerMember > 0
          ? Math.round(
              (1 -
                Math.abs(m.totalAssigned - avgAssignedPerMember) /
                  avgAssignedPerMember) *
                100,
            )
          : 100,
    }));

    // Sort by points descending
    memberStats.sort((a, b) => b.totalPoints - a.totalPoints);

    return {
      groupId,
      groupName: group.name,
      totalPoints: groupTotalPoints,
      totalCompleted: groupTotalCompleted,
      totalAssigned: groupTotalAssigned,
      overallCompletionRate:
        groupTotalAssigned > 0
          ? Math.round((groupTotalCompleted / groupTotalAssigned) * 100)
          : 0,
      memberCount: members.length,
      members: memberStats.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })),
      workloadBalance,
      fairnessScore:
        workloadBalance.length > 0
          ? Math.round(
              workloadBalance.reduce((sum, w) => sum + w.balanceScore, 0) /
                workloadBalance.length,
            )
          : 100,
    };
  }

  async getFriendStats(userId: string, friendId: string) {
    // Verify friendship
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
        status: 'accepted',
      },
    });

    if (!friendship) {
      throw new Error('Friendship not found');
    }

    // Get friend user info
    const friendUser = await this.prisma.user.findUnique({
      where: { id: friendId },
      include: {
        UserProfile: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!friendUser) {
      throw new Error('Friend not found');
    }

    // Get stats for current user (chores with this friend)
    const userCompletions = await this.prisma.choreCompletion.findMany({
      where: {
        userId,
        Chore: {
          OR: [
            { friendId },
            { createdBy: friendId, friendId: null },
            { createdBy: userId, friendId },
          ],
        },
      },
    });

    // Get stats for friend (chores with current user)
    const friendCompletions = await this.prisma.choreCompletion.findMany({
      where: {
        userId: friendId,
        Chore: {
          OR: [
            { friendId: userId },
            { createdBy: userId, friendId: null },
            { createdBy: friendId, friendId: userId },
          ],
        },
      },
    });

    const userStats = {
      totalPoints: userCompletions.reduce(
        (sum, c) => sum + (c.pointsEarned || 0),
        0,
      ),
      totalCompleted: userCompletions.length,
      onTimeCount: userCompletions.filter((c) => c.onTime).length,
    };

    const friendStats = {
      totalPoints: friendCompletions.reduce(
        (sum, c) => sum + (c.pointsEarned || 0),
        0,
      ),
      totalCompleted: friendCompletions.length,
      onTimeCount: friendCompletions.filter((c) => c.onTime).length,
    };

    return {
      friendId,
      friendName:
        friendUser.UserProfile?.displayName || friendUser.email.split('@')[0],
      friendAvatarUrl: friendUser.UserProfile?.avatarUrl || null,
      userStats: {
        ...userStats,
        onTimePercentage:
          userStats.totalCompleted > 0
            ? Math.round(
                (userStats.onTimeCount / userStats.totalCompleted) * 100,
              )
            : 0,
      },
      friendStats: {
        ...friendStats,
        onTimePercentage:
          friendStats.totalCompleted > 0
            ? Math.round(
                (friendStats.onTimeCount / friendStats.totalCompleted) * 100,
              )
            : 0,
      },
      combinedTotalPoints: userStats.totalPoints + friendStats.totalPoints,
      combinedTotalCompleted:
        userStats.totalCompleted + friendStats.totalCompleted,
    };
  }

  /**
   * Get group achievements
   * Simple achievements that groups unlock together
   */
  async getGroupAchievements(userId: string, groupId: string) {
    // Verify user is member of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found or you are not a member');
    }

    // Get all group completions
    const completions = await this.prisma.choreCompletion.findMany({
      where: {
        Chore: {
          groupId,
        },
      },
    });

    const totalGroupPoints = completions.reduce(
      (sum, c) => sum + (c.pointsEarned || 0),
      0,
    );
    const totalGroupCompleted = completions.length;
    const groupOnTimeCount = completions.filter((c) => c.onTime).length;

    // Get member count
    const memberCount = await this.prisma.groupMember.count({
      where: { groupId },
    });

    // Calculate achievements
    const achievements: Array<{
      id: string;
      name: string;
      description: string;
      unlocked: boolean;
      progress?: number;
      target?: number;
    }> = [];

    // First group completion
    achievements.push({
      id: 'group_first',
      name: 'Team Starter',
      description: 'Complete first chore as a group',
      unlocked: totalGroupCompleted >= 1,
    });

    // Milestone achievements
    achievements.push({
      id: 'group_10',
      name: 'Team Players',
      description: 'Complete 10 chores together',
      unlocked: totalGroupCompleted >= 10,
      progress: Math.min(totalGroupCompleted, 10),
      target: 10,
    });

    achievements.push({
      id: 'group_50',
      name: 'Power Team',
      description: 'Complete 50 chores together',
      unlocked: totalGroupCompleted >= 50,
      progress: Math.min(totalGroupCompleted, 50),
      target: 50,
    });

    achievements.push({
      id: 'group_100',
      name: 'Chore Champions',
      description: 'Complete 100 chores together',
      unlocked: totalGroupCompleted >= 100,
      progress: Math.min(totalGroupCompleted, 100),
      target: 100,
    });

    // Points achievements
    achievements.push({
      id: 'group_points_500',
      name: 'Point Powerhouse',
      description: 'Earn 500 points as a group',
      unlocked: totalGroupPoints >= 500,
      progress: Math.min(totalGroupPoints, 500),
      target: 500,
    });

    achievements.push({
      id: 'group_points_2000',
      name: 'Point Masters',
      description: 'Earn 2000 points as a group',
      unlocked: totalGroupPoints >= 2000,
      progress: Math.min(totalGroupPoints, 2000),
      target: 2000,
    });

    // On-time achievement
    achievements.push({
      id: 'group_ontime',
      name: 'Perfect Timing Team',
      description: 'Complete 20+ chores all on time',
      unlocked:
        totalGroupCompleted >= 20 && groupOnTimeCount === totalGroupCompleted,
      progress: groupOnTimeCount,
      target: 20,
    });

    // Fairness achievement (if all members have similar completion counts)
    if (memberCount > 1) {
      const memberCompletionCounts = await Promise.all(
        (await this.prisma.groupMember.findMany({ where: { groupId } })).map(
          async (member) => {
            const count = await this.prisma.choreCompletion.count({
              where: {
                userId: member.userId,
                Chore: { groupId },
              },
            });
            return count;
          },
        ),
      );

      const avgCompletions =
        memberCompletionCounts.reduce((sum, c) => sum + c, 0) / memberCount;
      const maxDeviation = Math.max(
        ...memberCompletionCounts.map((c) => Math.abs(c - avgCompletions)),
      );
      const isFair = maxDeviation <= avgCompletions * 0.3; // Within 30% deviation

      achievements.push({
        id: 'group_fair',
        name: 'Fair Play',
        description:
          'Maintain balanced workload (all members within 30% of average)',
        unlocked: isFair && totalGroupCompleted >= 10,
      });
    }

    return {
      groupId,
      groupName: group.name,
      totalPoints: totalGroupPoints,
      totalCompleted: totalGroupCompleted,
      achievements,
    };
  }

  /**
   * Get group chore history
   * History of all chore activities in a group
   */
  async getGroupChoreHistory(
    userId: string,
    groupId: string,
    limit: number = 50,
  ) {
    // Verify user is member of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found or you are not a member');
    }

    // Get all group chores
    const groupChoreIds = await this.prisma.chore.findMany({
      where: { groupId },
      select: { id: true },
    });

    const choreIds = groupChoreIds.map((c) => c.id);

    // Get history for all group chores
    const history = await this.prisma.choreHistory.findMany({
      where: {
        choreId: { in: choreIds },
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      choreId: entry.choreId,
      choreTitle: entry.Chore?.title || 'Unknown Chore',
      userId: entry.userId,
      user: {
        id: entry.User.id,
        email: entry.User.email,
        profile: entry.User.UserProfile,
      },
      changes: entry.changes,
      notes: entry.notes,
      createdAt: entry.createdAt,
    }));
  }

  /**
   * Get basic analytics for group
   * Completion trends, category breakdown
   */
  async getGroupAnalytics(userId: string, groupId: string, days: number = 30) {
    // Verify user is member of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found or you are not a member');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all completions in the period
    const completions = await this.prisma.choreCompletion.findMany({
      where: {
        Chore: {
          groupId,
        },
        completedAt: {
          gte: startDate,
        },
      },
      include: {
        Chore: {
          select: {
            category: true,
            title: true,
          },
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    // Daily completion trend
    const dailyTrend: Record<string, number> = {};
    completions.forEach((c) => {
      const dateKey = c.completedAt.toISOString().split('T')[0];
      dailyTrend[dateKey] = (dailyTrend[dateKey] || 0) + 1;
    });

    // Category breakdown
    const categoryBreakdown: Record<string, { count: number; points: number }> =
      {};
    completions.forEach((c) => {
      const category = c.Chore.category || 'Other';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { count: 0, points: 0 };
      }
      categoryBreakdown[category].count++;
      categoryBreakdown[category].points += c.pointsEarned || 0;
    });

    // Weekly summary
    const weeklySummary: Array<{
      week: string;
      completions: number;
      points: number;
    }> = [];
    const weeks = new Map<string, { completions: number; points: number }>();

    completions.forEach((c) => {
      const date = new Date(c.completedAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, { completions: 0, points: 0 });
      }
      const week = weeks.get(weekKey)!;
      week.completions++;
      week.points += c.pointsEarned || 0;
    });

    weeks.forEach((data, weekKey) => {
      weeklySummary.push({
        week: weekKey,
        ...data,
      });
    });

    weeklySummary.sort((a, b) => a.week.localeCompare(b.week));

    return {
      groupId,
      period: days,
      totalCompletions: completions.length,
      totalPoints: completions.reduce(
        (sum, c) => sum + (c.pointsEarned || 0),
        0,
      ),
      dailyTrend: Object.entries(dailyTrend).map(([date, count]) => ({
        date,
        count,
      })),
      categoryBreakdown: Object.entries(categoryBreakdown).map(
        ([category, data]) => ({
          category,
          ...data,
        }),
      ),
      weeklySummary,
    };
  }
}
