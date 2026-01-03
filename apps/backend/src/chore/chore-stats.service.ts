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
    const achievements = await this.getAchievements(userId, totalCompleted, totalPoints._sum.pointsEarned || 0, streak);

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
      onTimePercentage: totalCompleted > 0 ? Math.round((onTimeCount / totalCompleted) * 100) : 0,
      currentStreak: streak,
      achievements,
      recentCompletions: recentCompletions.map(c => ({
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
  ): Promise<Array<{ id: string; name: string; description: string; unlocked: boolean; unlockedAt?: Date }>> {
    const achievements: Array<{ id: string; name: string; description: string; unlocked: boolean; unlockedAt?: Date }> = [];

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
}

