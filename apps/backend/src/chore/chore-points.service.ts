import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service for calculating chore points based on task difficulty, effort, and time
 * Enhanced with streak multipliers, category bonuses, and late penalties
 */
@Injectable()
export class ChorePointsService {
  constructor(private prisma: PrismaService) {}
  // Base points by category
  private readonly categoryBasePoints: Record<string, number> = {
    'Cleaning': 30,
    'Cooking': 25,
    'Shopping': 20,
    'Maintenance': 40,
    'Laundry': 15,
    'Trash & Recycling': 10,
    'Pet Care': 20,
    'Yard Work': 35,
    'Errands': 15,
    'Organization': 20,
    'Other': 20,
  };

  // Effort multipliers based on keywords in title/description
  private readonly effortKeywords: Record<string, number> = {
    // High effort tasks (multiplier 1.5-2.0)
    'deep clean': 2.0,
    'deep cleaning': 2.0,
    'spring cleaning': 2.0,
    'mop': 1.8,
    'mopping': 1.8,
    'scrub': 1.7,
    'scrubbing': 1.7,
    'vacuum': 1.5,
    'vacuuming': 1.5,
    'clean bathroom': 1.6,
    'clean kitchen': 1.5,
    'organize': 1.4,
    'organizing': 1.4,
    'declutter': 1.4,
    'yard work': 1.6,
    'mow': 1.7,
    'mowing': 1.7,
    'garden': 1.5,
    'gardening': 1.5,
    'cook dinner': 1.5,
    'cook meal': 1.5,
    'prepare meal': 1.4,
    'maintenance': 1.6,
    'repair': 1.7,
    'fix': 1.6,
    'install': 1.8,
    
    // Medium effort tasks (multiplier 1.2-1.4)
    'clean': 1.2,
    'cleaning': 1.2,
    'wash': 1.2,
    'washing': 1.2,
    'dust': 1.1,
    'dusting': 1.1,
    'wipe': 1.1,
    'wiping': 1.1,
    'sweep': 1.2,
    'sweeping': 1.2,
    'cook': 1.3,
    'cooking': 1.3,
    'shop': 1.2,
    'shopping': 1.2,
    'grocery': 1.2,
    'laundry': 1.1,
    'fold': 1.1,
    'folding': 1.1,
    'iron': 1.2,
    'ironing': 1.2,
    'errand': 1.2,
    'errands': 1.2,
    'pickup': 1.2,
    'delivery': 1.3,
    
    // Low effort tasks (multiplier 0.5-0.9)
    'trash': 0.6,
    'garbage': 0.6,
    'take out trash': 0.5,
    'take out garbage': 0.5,
    'recycle': 0.7,
    'recycling': 0.7,
    'quick': 0.8,
    'simple': 0.8,
    'easy': 0.8,
    'light': 0.8,
    'check': 0.7,
    'checking': 0.7,
    'remind': 0.6,
    'reminder': 0.6,
    'message': 0.5,
    'text': 0.5,
    'call': 0.6,
    'calling': 0.6,
  };

  // Time-based adjustments
  private readonly timeKeywords: Record<string, number> = {
    'quick': 0.8,
    'fast': 0.8,
    '5 min': 0.6,
    '5 minutes': 0.6,
    '10 min': 0.7,
    '10 minutes': 0.7,
    '15 min': 0.8,
    '15 minutes': 0.8,
    '30 min': 1.0,
    '30 minutes': 1.0,
    '1 hour': 1.3,
    '1hr': 1.3,
    '2 hours': 1.6,
    '2hrs': 1.6,
    'half day': 2.0,
    'full day': 2.5,
    'all day': 2.5,
  };

  /**
   * Calculate points for a chore based on category, title, and description
   */
  calculatePoints(
    category: string | null | undefined,
    title: string,
    description: string | null | undefined = null,
  ): number {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    // Start with category base points or default
    let basePoints = category && this.categoryBasePoints[category]
      ? this.categoryBasePoints[category]
      : 20; // Default base points

    // Find highest effort multiplier from keywords
    let maxEffortMultiplier = 1.0;
    for (const [keyword, multiplier] of Object.entries(this.effortKeywords)) {
      if (text.includes(keyword)) {
        maxEffortMultiplier = Math.max(maxEffortMultiplier, multiplier);
      }
    }

    // Find time-based multiplier
    let timeMultiplier = 1.0;
    for (const [keyword, multiplier] of Object.entries(this.timeKeywords)) {
      if (text.includes(keyword)) {
        timeMultiplier = Math.max(timeMultiplier, multiplier);
      }
    }

    // Calculate final points
    let calculatedPoints = Math.round(basePoints * maxEffortMultiplier * timeMultiplier);

    // Clamp points between 10 and 100
    calculatedPoints = Math.max(10, Math.min(100, calculatedPoints));

    // Round to nearest 5 for cleaner numbers
    calculatedPoints = Math.round(calculatedPoints / 5) * 5;

    return calculatedPoints;
  }

  /**
   * Get point explanation for a chore
   */
  getPointExplanation(
    category: string | null | undefined,
    title: string,
    description: string | null | undefined = null,
    calculatedPoints: number,
  ): string {
    const text = `${title} ${description || ''}`.toLowerCase();
    const explanations: string[] = [];

    // Category explanation
    if (category && this.categoryBasePoints[category]) {
      explanations.push(`Base: ${this.categoryBasePoints[category]} pts (${category})`);
    }

    // Effort explanation
    const effortKeywords = Object.entries(this.effortKeywords)
      .filter(([keyword]) => text.includes(keyword))
      .sort((a, b) => b[1] - a[1]);
    
    if (effortKeywords.length > 0) {
      const [keyword, multiplier] = effortKeywords[0];
      if (multiplier > 1.2) {
        explanations.push(`High effort: ${keyword} (${(multiplier * 100).toFixed(0)}%)`);
      } else if (multiplier < 0.9) {
        explanations.push(`Low effort: ${keyword} (${(multiplier * 100).toFixed(0)}%)`);
      }
    }

    // Time explanation
    const timeKeywords = Object.entries(this.timeKeywords)
      .filter(([keyword]) => text.includes(keyword))
      .sort((a, b) => b[1] - a[1]);
    
    if (timeKeywords.length > 0) {
      const [keyword, multiplier] = timeKeywords[0];
      if (multiplier !== 1.0) {
        explanations.push(`Time: ${keyword} (${(multiplier * 100).toFixed(0)}%)`);
      }
    }

    return explanations.length > 0 
      ? explanations.join(' • ')
      : `Standard task: ${calculatedPoints} points`;
  }

  /**
   * Calculate streak multiplier based on user's consecutive completion days
   */
  calculateStreakMultiplier(streak: number): number {
    if (streak >= 30) return 1.5; // 50% bonus for 30+ day streak
    if (streak >= 14) return 1.3; // 30% bonus for 14+ day streak
    if (streak >= 7) return 1.2;  // 20% bonus for 7+ day streak
    if (streak >= 3) return 1.1;  // 10% bonus for 3+ day streak
    return 1.0; // No bonus
  }

  /**
   * Calculate simple late completion penalty
   * Small penalty if significantly late (over 24 hours)
   */
  calculateLatePenalty(dueDate: Date | null | undefined, completedAt: Date): number {
    if (!dueDate) return 1.0; // No penalty if no due date

    const due = new Date(dueDate);
    const completed = new Date(completedAt);
    const hoursLate = (completed.getTime() - due.getTime()) / (1000 * 60 * 60);

    if (hoursLate <= 0) return 1.0; // On time or early

    // Simple penalty: 10% reduction if more than 24 hours late
    if (hoursLate > 24) return 0.9; // 10% penalty
    
    return 1.0; // No penalty for minor delays
  }

  /**
   * Calculate final points earned when completing a chore
   * Takes into account: base points, streak multiplier, category bonus, late penalty, unassigned bonus
   */
  async calculatePointsEarned(
    userId: string,
    basePoints: number,
    category: string | null | undefined,
    dueDate: Date | null | undefined,
    completedAt: Date,
    wasUnassigned: boolean = false,
    groupId: string | null | undefined = null,
  ): Promise<{
    pointsEarned: number;
    breakdown: {
      basePoints: number;
      unassignedBonus?: number;
      streakMultiplier?: number;
      streakBonus?: number;
      streak?: number;
      latePenalty?: number;
      penaltyAmount?: number;
      finalPoints: number;
    };
  }> {
    let currentPoints = basePoints;
    const breakdown: any = { basePoints };

    // Unassigned bonus (50% bonus) - motivates users to grab unassigned tasks
    if (wasUnassigned) {
      const bonus = Math.round(currentPoints * 0.5);
      currentPoints += bonus;
      breakdown.unassignedBonus = bonus;
    }

    // Get user's current streak and apply multiplier (gamification)
    const streak = await this.getUserStreak(userId);
    if (streak > 0) {
      const streakMultiplier = this.calculateStreakMultiplier(streak);
      const streakBonus = Math.round(currentPoints * (streakMultiplier - 1));
      currentPoints = Math.round(currentPoints * streakMultiplier);
      breakdown.streakMultiplier = streakMultiplier;
      breakdown.streak = streak;
      breakdown.streakBonus = streakBonus;
    }

    // Simple late completion penalty (only if significantly late)
    const latePenalty = this.calculateLatePenalty(dueDate, completedAt);
    if (latePenalty < 1.0) {
      const penaltyAmount = Math.round(currentPoints * (1 - latePenalty));
      currentPoints = Math.round(currentPoints * latePenalty);
      breakdown.latePenalty = latePenalty;
      breakdown.penaltyAmount = penaltyAmount;
    }

    // Ensure minimum of 1 point
    currentPoints = Math.max(1, currentPoints);

    breakdown.finalPoints = currentPoints;

    return {
      pointsEarned: currentPoints,
      breakdown,
    };
  }

  /**
   * Get user's current completion streak (consecutive days with at least one completion)
   */
  private async getUserStreak(userId: string): Promise<number> {
    const completions = await this.prisma.choreCompletion.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 50, // Check last 50 completions for streak
    });

    if (completions.length === 0) return 0;

    // Group completions by date
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
   * Get simple, user-friendly explanation of points calculation
   */
  getPointsBreakdownExplanation(breakdown: {
    basePoints: number;
    unassignedBonus?: number;
    streakMultiplier?: number;
    streak?: number;
    streakBonus?: number;
    latePenalty?: number;
    penaltyAmount?: number;
    finalPoints: number;
  }): string {
    const parts: string[] = [];

    parts.push(`${breakdown.basePoints} base points`);

    if (breakdown.unassignedBonus) {
      parts.push(`+${breakdown.unassignedBonus} unassigned bonus`);
    }

    if (breakdown.streakMultiplier && breakdown.streak && breakdown.streakBonus) {
      parts.push(`+${breakdown.streakBonus} (${breakdown.streak}-day streak)`);
    }

    if (breakdown.latePenalty && breakdown.penaltyAmount) {
      parts.push(`-${breakdown.penaltyAmount} (late)`);
    }

    parts.push(`= ${breakdown.finalPoints} total`);

    return parts.join(' ');
  }
}

