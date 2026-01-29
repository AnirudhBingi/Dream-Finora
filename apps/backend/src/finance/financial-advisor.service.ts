import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetService } from './budget.service';
import { GoalService } from './goal.service';
import { LoanService } from './loan.service';
import { AnalyticsService } from '../analytics/analytics.service';

type ContextAnalytics = Awaited<
  ReturnType<AnalyticsService['getContextAnalytics']>
>;
type CombinedAnalytics = Awaited<
  ReturnType<AnalyticsService['getCombinedAnalytics']>
>;
type AnalyticsResult = ContextAnalytics | CombinedAnalytics;

export interface FinancialRecommendation {
  id: string;
  type: 'budget' | 'goal' | 'spending' | 'savings' | 'debt' | 'emergency';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  impact?: 'high' | 'medium' | 'low';
  // Enhanced fields
  metrics?: {
    current?: number;
    target?: number;
    difference?: number;
    percentage?: number;
    trend?: 'increasing' | 'decreasing' | 'stable';
    daysRemaining?: number;
    projectedDate?: string;
  };
  details?: string[]; // Additional context
}

export interface FinancialHealthScore {
  overall: number;
  breakdown: {
    budgetAdherence: number;
    goalProgress: number;
    savingsRate: number;
    debtToIncome: number;
    emergencyFund: number;
  };
  insights: string[];
  // Enhanced fields
  trends?: {
    spendingTrend?: 'increasing' | 'decreasing' | 'stable';
    savingsTrend?: 'increasing' | 'decreasing' | 'stable';
    incomeTrend?: 'increasing' | 'decreasing' | 'stable';
  };
  projections?: {
    budgetBurnRate?: number; // Days until budget exceeded
    goalCompletionDate?: string;
    emergencyFundTargetDate?: string;
  };
}

@Injectable()
export class FinancialAdvisorService {
  constructor(
    private prisma: PrismaService,
    private budgetService: BudgetService,
    private goalService: GoalService,
    private loanService: LoanService,
    private analyticsService: AnalyticsService,
  ) {}

  /**
   * Helper to extract analytics data from either context or combined analytics
   */
  private getAnalyticsData(
    analytics: AnalyticsResult,
    context: 'local' | 'home' | 'combined',
  ): ContextAnalytics {
    if (context === 'combined' && analytics.context === 'combined') {
      return analytics.local;
    }
    return analytics as ContextAnalytics;
  }

  /**
   * Calculate trend from monthly data
   */
  private calculateTrend(
    values: number[],
  ): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    const recent = values.slice(-3); // Last 3 months
    const earlier = values.slice(0, -3); // Earlier months
    if (recent.length === 0 || earlier.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Get personalized financial recommendations with detailed insights
   */
  async getRecommendations(
    userId: string,
    context: 'local' | 'home' | 'combined' = 'local',
  ): Promise<FinancialRecommendation[]> {
    const recommendations: FinancialRecommendation[] = [];

    const actualContext = context === 'combined' ? 'local' : context;
    const [budgets, goals, loans, analyticsRaw] = await Promise.all([
      this.budgetService.getBudgets(userId, actualContext),
      this.goalService.getGoals(userId, actualContext),
      this.loanService.getLoans(userId, actualContext),
      context === 'combined'
        ? this.analyticsService.getCombinedAnalytics(userId, 6, 30)
        : this.analyticsService.getContextAnalytics(
            userId,
            actualContext,
            6,
            30,
          ),
    ]);

    const analytics = this.getAnalyticsData(analyticsRaw, context);
    const monthlyTrends = analytics.monthlyTrends || [];
    const spendingTrend = this.calculateTrend(
      monthlyTrends.map((t) => t.expense),
    );

    // Enhanced Budget Recommendations
    if (analytics.budgetPerformance && budgets.length > 0) {
      const { totalBudgets, averageAdherence } = analytics.budgetPerformance;
      const now = new Date();

      // Detailed exceeded budgets
      const exceededBudgets = budgets.filter((budget) => {
        const tracking = budget.BudgetTracking?.[0];
        if (!tracking) return false;
        return tracking.spent > budget.amount;
      });

      exceededBudgets.forEach((budget) => {
        const tracking = budget.BudgetTracking?.[0];
        const overage = tracking.spent - budget.amount;
        const overagePercentage = ((overage / budget.amount) * 100).toFixed(1);

        recommendations.push({
          id: `budget-exceeded-${budget.id}`,
          type: 'budget',
          priority: 'high',
          title: `"${budget.name}" Budget Exceeded by ${this.formatCurrency(overage)}`,
          description: `You've spent ${this.formatCurrency(tracking.spent)} out of ${this.formatCurrency(budget.amount)} budget, exceeding by ${overagePercentage}%.`,
          action: `Reduce spending in ${budget.category || 'this category'} by at least ${this.formatCurrency(overage)} to get back on track.`,
          impact: 'high',
          metrics: {
            current: tracking.spent,
            target: budget.amount,
            difference: overage,
            percentage: parseFloat(overagePercentage),
            trend: spendingTrend,
          },
          details: [
            `Current spending: ${this.formatCurrency(tracking.spent)}`,
            `Budget limit: ${this.formatCurrency(budget.amount)}`,
            `Overage: ${this.formatCurrency(overage)} (${overagePercentage}%)`,
          ],
        });
      });

      // Budgets approaching limit with projections
      const approachingBudgets = budgets.filter((budget) => {
        const tracking = budget.BudgetTracking?.[0];
        if (!tracking) return false;
        const percentage = (tracking.spent / budget.amount) * 100;
        return (
          percentage >= (budget.warningThreshold || 80) && percentage < 100
        );
      });

      approachingBudgets.forEach((budget) => {
        const tracking = budget.BudgetTracking?.[0];
        const remaining = budget.amount - tracking.spent;
        const percentage = (tracking.spent / budget.amount) * 100;

        // Calculate days until budget exceeded (based on current spending rate)
        const periodStart = new Date(budget.startDate);
        const daysElapsed = Math.max(
          1,
          Math.ceil(
            (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        const dailySpendingRate = tracking.spent / daysElapsed;
        const daysUntilExceeded =
          dailySpendingRate > 0
            ? Math.ceil(remaining / dailySpendingRate)
            : null;

        recommendations.push({
          id: `budget-approaching-${budget.id}`,
          type: 'budget',
          priority: 'medium',
          title: `"${budget.name}" Budget at ${percentage.toFixed(0)}%`,
          description: `You've used ${percentage.toFixed(1)}% of your ${this.formatCurrency(budget.amount)} budget with ${this.formatCurrency(remaining)} remaining.${daysUntilExceeded ? ` At current spending rate, you'll exceed it in ${daysUntilExceeded} days.` : ''}`,
          action: `Reduce daily spending in ${budget.category || 'this category'} by ${this.formatCurrency(dailySpendingRate * 0.2)} to stay within budget.`,
          impact: 'medium',
          metrics: {
            current: tracking.spent,
            target: budget.amount,
            difference: remaining,
            percentage: percentage,
            daysRemaining: daysUntilExceeded || undefined,
            trend: spendingTrend,
          },
          details: [
            `Spent: ${this.formatCurrency(tracking.spent)} / ${this.formatCurrency(budget.amount)}`,
            `Remaining: ${this.formatCurrency(remaining)}`,
            `Daily spending rate: ${this.formatCurrency(dailySpendingRate)}`,
            daysUntilExceeded
              ? `Projected exceed date: ${new Date(now.getTime() + daysUntilExceeded * 24 * 60 * 60 * 1000).toLocaleDateString()}`
              : '',
          ].filter(Boolean),
        });
      });

      // Overall budget adherence
      if (averageAdherence < 80 && totalBudgets > 0) {
        const budgetsWithOverage = budgets.filter((b) => {
          const tracking = b.BudgetTracking?.[0];
          return tracking && tracking.spent > b.amount;
        });

        const totalOverageAll = budgets.reduce((sum, b) => {
          const tracking = b.BudgetTracking?.[0];
          if (!tracking) return sum;
          return sum + Math.max(0, tracking.spent - b.amount);
        }, 0);

        if (totalOverageAll > 0 || budgetsWithOverage.length === 0) {
          recommendations.push({
            id: 'budget-adherence-low',
            type: 'budget',
            priority: 'medium',
            title: `Average Budget Adherence: ${averageAdherence.toFixed(0)}%`,
            description: `Your budgets are ${(100 - averageAdherence).toFixed(0)}% off target on average.${totalOverageAll > 0 ? ` You're overspending by ${this.formatCurrency(totalOverageAll)} total across all budgets.` : ' Consider reviewing your budget amounts to better match your spending patterns.'}`,
            action: `Review and adjust ${totalBudgets} budget${totalBudgets > 1 ? 's' : ''}${totalOverageAll > 0 ? ` or reduce spending by ${this.formatCurrency(totalOverageAll)} total.` : ' to better align with your spending.'}`,
            impact: 'medium',
            metrics: {
              current: averageAdherence,
              target: 100,
              difference: 100 - averageAdherence,
              percentage: averageAdherence,
              trend: spendingTrend,
            },
          });
        }
      }
    }

    // Enhanced Goal Recommendations
    if (analytics.goalsProgress && goals.length > 0) {
      const activeGoals = goals.filter((g) => g.status === 'active');
      const now = new Date();

      activeGoals.forEach((goal) => {
        const progress = (goal.currentAmount / goal.targetAmount) * 100;
        const remaining = goal.targetAmount - goal.currentAmount;

        if (goal.targetDate) {
          const targetDate = new Date(goal.targetDate);
          const daysRemaining = Math.ceil(
            (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          const daysElapsed = Math.max(
            1,
            Math.ceil(
              (now.getTime() - new Date(goal.createdAt).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );

          const expectedProgress =
            (daysElapsed / (daysElapsed + daysRemaining)) * 100;
          const progressGap = expectedProgress - progress;

          if (progressGap > 10) {
            // Behind schedule
            const requiredMonthlyContribution =
              remaining / Math.max(1, daysRemaining / 30);
            const currentMonthlyContribution =
              goal.currentAmount / Math.max(1, daysElapsed / 30);
            const increaseNeeded =
              requiredMonthlyContribution - currentMonthlyContribution;

            recommendations.push({
              id: `goal-behind-${goal.id}`,
              type: 'goal',
              priority: 'high',
              title: `"${goal.name}" Goal Behind Schedule`,
              description: `You're at ${progress.toFixed(0)}% progress but should be at ${expectedProgress.toFixed(0)}% to meet your ${goal.targetDate.toLocaleDateString()} deadline. You need to increase monthly contributions by ${this.formatCurrency(increaseNeeded)}.`,
              action: `Increase monthly contributions from ${this.formatCurrency(currentMonthlyContribution)} to ${this.formatCurrency(requiredMonthlyContribution)} to reach ${this.formatCurrency(goal.targetAmount)} by ${goal.targetDate.toLocaleDateString()}.`,
              impact: 'high',
              metrics: {
                current: goal.currentAmount,
                target: goal.targetAmount,
                difference: remaining,
                percentage: progress,
                daysRemaining: daysRemaining,
                projectedDate: goal.targetDate.toISOString(),
                trend: 'decreasing',
              },
              details: [
                `Current: ${this.formatCurrency(goal.currentAmount)} / ${this.formatCurrency(goal.targetAmount)}`,
                `Remaining: ${this.formatCurrency(remaining)}`,
                `Days remaining: ${daysRemaining}`,
                `Current monthly rate: ${this.formatCurrency(currentMonthlyContribution)}`,
                `Required monthly rate: ${this.formatCurrency(requiredMonthlyContribution)}`,
              ],
            });
          } else if (progressGap < -10) {
            // Ahead of schedule
            const projectedCompletionDate = new Date(
              now.getTime() +
                (remaining / (goal.currentAmount / daysElapsed)) *
                  24 *
                  60 *
                  60 *
                  1000,
            );

            recommendations.push({
              id: `goal-ahead-${goal.id}`,
              type: 'goal',
              priority: 'low',
              title: `"${goal.name}" Goal Ahead of Schedule`,
              description: `Great progress! You're at ${progress.toFixed(0)}% and ahead of schedule. At this rate, you'll reach your goal by ${projectedCompletionDate.toLocaleDateString()}, ${Math.ceil((targetDate.getTime() - projectedCompletionDate.getTime()) / (1000 * 60 * 60 * 24))} days early.`,
              action: `Consider increasing your target to ${this.formatCurrency(goal.targetAmount * 1.2)} or reaching your goal early.`,
              impact: 'low',
              metrics: {
                current: goal.currentAmount,
                target: goal.targetAmount,
                difference: remaining,
                percentage: progress,
                daysRemaining: daysRemaining,
                projectedDate: projectedCompletionDate.toISOString(),
                trend: 'increasing',
              },
            });
          }
        } else {
          // No target date - check if progress is slow
          if (progress < 25 && goal.currentAmount > 0) {
            const daysSinceCreation = Math.ceil(
              (now.getTime() - new Date(goal.createdAt).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            const currentRate =
              goal.currentAmount / Math.max(1, daysSinceCreation);
            const estimatedDaysToComplete = remaining / currentRate;

            recommendations.push({
              id: `goal-slow-${goal.id}`,
              type: 'goal',
              priority: 'medium',
              title: `"${goal.name}" Goal Progress Slow`,
              description: `You've saved ${this.formatCurrency(goal.currentAmount)} (${progress.toFixed(0)}%) toward ${this.formatCurrency(goal.targetAmount)}. At current rate of ${this.formatCurrency(currentRate)} per day, you'll reach your goal in ${Math.ceil(estimatedDaysToComplete)} days.`,
              action: `Increase daily contributions to ${this.formatCurrency(currentRate * 1.5)} to reach your goal ${Math.ceil(estimatedDaysToComplete * 0.33)} days sooner.`,
              impact: 'medium',
              metrics: {
                current: goal.currentAmount,
                target: goal.targetAmount,
                difference: remaining,
                percentage: progress,
                projectedDate: new Date(
                  now.getTime() + estimatedDaysToComplete * 24 * 60 * 60 * 1000,
                ).toISOString(),
                trend: 'stable',
              },
            });
          }
        }
      });
    }

    // Enhanced Spending & Savings Recommendations
    if (analytics.incomeVsExpenses) {
      const { totalIncome, totalExpenses, net, savingsRate } =
        analytics.incomeVsExpenses;
      const monthlyIncome = totalIncome / 6;
      const monthlyExpenses = totalExpenses / 6;
      const monthlyNet = net / 6;

      if (savingsRate < 0) {
        const monthlyDeficit = Math.abs(monthlyNet);
        const recommendedReduction = monthlyDeficit * 0.3; // Suggest reducing by 30% of deficit

        recommendations.push({
          id: 'spending-negative',
          type: 'spending',
          priority: 'high',
          title: `Spending Exceeds Income by ${this.formatCurrency(monthlyDeficit)}/Month`,
          description: `You're spending ${this.formatCurrency(monthlyExpenses)} per month but earning ${this.formatCurrency(monthlyIncome)}. This creates a ${this.formatCurrency(monthlyDeficit)} monthly deficit that's unsustainable.`,
          action: `Reduce monthly expenses by at least ${this.formatCurrency(recommendedReduction)} (${((recommendedReduction / monthlyExpenses) * 100).toFixed(0)}%) to break even. Focus on your top spending categories first.`,
          impact: 'high',
          metrics: {
            current: monthlyExpenses,
            target: monthlyIncome,
            difference: monthlyDeficit,
            percentage: savingsRate,
            trend: spendingTrend,
          },
          details: [
            `Monthly income: ${this.formatCurrency(monthlyIncome)}`,
            `Monthly expenses: ${this.formatCurrency(monthlyExpenses)}`,
            `Monthly deficit: ${this.formatCurrency(monthlyDeficit)}`,
            `Spending trend: ${spendingTrend}`,
          ],
        });
      } else if (savingsRate < 10) {
        const targetSavings = monthlyIncome * 0.2; // 20% target
        const currentSavings = monthlyNet;
        const gap = targetSavings - currentSavings;
        const reductionNeeded = gap / monthlyExpenses;

        recommendations.push({
          id: 'savings-rate-low',
          type: 'savings',
          priority: 'medium',
          title: `Savings Rate: ${savingsRate.toFixed(1)}% (Target: 20%)`,
          description: `You're saving ${this.formatCurrency(currentSavings)} per month (${savingsRate.toFixed(1)}% of income). To reach the recommended 20% savings rate, you need to save an additional ${this.formatCurrency(gap)} per month.`,
          action: `Reduce expenses by ${this.formatCurrency(gap)} (${(reductionNeeded * 100).toFixed(0)}%) or increase income to reach 20% savings rate. This would save you ${this.formatCurrency(targetSavings)} monthly.`,
          impact: 'medium',
          metrics: {
            current: currentSavings,
            target: targetSavings,
            difference: gap,
            percentage: savingsRate,
            trend: spendingTrend,
          },
          details: [
            `Current monthly savings: ${this.formatCurrency(currentSavings)}`,
            `Target monthly savings: ${this.formatCurrency(targetSavings)}`,
            `Gap to close: ${this.formatCurrency(gap)}`,
            `Current savings rate: ${savingsRate.toFixed(1)}%`,
          ],
        });
      }

      // Category-specific spending insights
      if (
        analytics.spendingByCategory &&
        analytics.spendingByCategory.length > 0
      ) {
        const topCategory = analytics.spendingByCategory[0];
        const monthlyTopCategorySpending = topCategory.amount / 6;

        if (topCategory.percentage > 40) {
          const recommendedReduction = monthlyTopCategorySpending * 0.15; // Suggest 15% reduction

          recommendations.push({
            id: 'spending-concentrated',
            type: 'spending',
            priority: 'medium',
            title: `${topCategory.category} Accounts for ${topCategory.percentage.toFixed(1)}% of Spending`,
            description: `You're spending ${this.formatCurrency(monthlyTopCategorySpending)} per month on ${topCategory.category}, which is ${topCategory.percentage.toFixed(1)}% of your total expenses. This is highly concentrated.`,
            action: `Review ${topCategory.category} expenses and aim to reduce by ${this.formatCurrency(recommendedReduction)} (15%) per month. This would free up ${this.formatCurrency(recommendedReduction * 12)} annually.`,
            impact: 'medium',
            metrics: {
              current: monthlyTopCategorySpending,
              percentage: topCategory.percentage,
              trend: spendingTrend,
            },
            details: [
              `Monthly spending: ${this.formatCurrency(monthlyTopCategorySpending)}`,
              `Percentage of total: ${topCategory.percentage.toFixed(1)}%`,
              `Annual spending: ${this.formatCurrency(monthlyTopCategorySpending * 12)}`,
            ],
          });
        }

        // Compare current month vs average
        if (monthlyTrends.length >= 2) {
          const currentMonth = monthlyTrends[monthlyTrends.length - 1];
          const previousMonths = monthlyTrends.slice(0, -1);
          const avgPreviousExpenses =
            previousMonths.reduce((sum, m) => sum + m.expense, 0) /
            previousMonths.length;
          const change = currentMonth.expense - avgPreviousExpenses;
          const changePercent = (change / avgPreviousExpenses) * 100;

          if (Math.abs(changePercent) > 15) {
            recommendations.push({
              id: 'spending-trend-significant',
              type: 'spending',
              priority: changePercent > 0 ? 'high' : 'low',
              title: `Spending ${changePercent > 0 ? 'Increased' : 'Decreased'} by ${Math.abs(changePercent).toFixed(0)}% This Month`,
              description: `Your spending this month is ${this.formatCurrency(currentMonth.expense)}, ${changePercent > 0 ? 'up' : 'down'} ${this.formatCurrency(Math.abs(change))} from your ${this.formatCurrency(avgPreviousExpenses)} average.${changePercent > 0 ? ' This significant increase may impact your savings goals.' : ' Great job reducing expenses!'}`,
              action:
                changePercent > 0
                  ? `Identify what caused the ${this.formatCurrency(change)} increase and determine if it's a one-time expense or a new spending pattern.`
                  : `Maintain this lower spending level to boost your savings rate.`,
              impact: changePercent > 0 ? 'high' : 'low',
              metrics: {
                current: currentMonth.expense,
                target: avgPreviousExpenses,
                difference: change,
                percentage: changePercent,
                trend: changePercent > 0 ? 'increasing' : 'decreasing',
              },
            });
          }
        }
      }
    }

    // Enhanced Debt Recommendations
    if (analytics.loanSummary && loans.length > 0) {
      const { totalRemaining, totalPaid } = analytics.loanSummary;
      const activeLoanList = loans.filter((l) => l.status === 'active');
      const monthlyIncome = analytics.incomeVsExpenses
        ? analytics.incomeVsExpenses.totalIncome / 6
        : 0;
      const monthlyDebtPayment = activeLoanList.reduce(
        (sum, loan) => sum + loan.emi,
        0,
      );

      if (monthlyIncome > 0) {
        const debtToIncomeRatio = (monthlyDebtPayment / monthlyIncome) * 100;

        if (debtToIncomeRatio > 40) {
          const recommendedReduction = monthlyDebtPayment - monthlyIncome * 0.3;

          recommendations.push({
            id: 'debt-to-income-high',
            type: 'debt',
            priority: 'high',
            title: `Debt Payments: ${debtToIncomeRatio.toFixed(0)}% of Income (Target: <30%)`,
            description: `You're paying ${this.formatCurrency(monthlyDebtPayment)} monthly toward debt, which is ${debtToIncomeRatio.toFixed(0)}% of your ${this.formatCurrency(monthlyIncome)} income. The recommended maximum is 30%.`,
            action: `Reduce debt payments by ${this.formatCurrency(recommendedReduction)} to reach 30% ratio. Consider debt consolidation, refinancing, or increasing income.`,
            impact: 'high',
            metrics: {
              current: monthlyDebtPayment,
              target: monthlyIncome * 0.3,
              difference: recommendedReduction,
              percentage: debtToIncomeRatio,
            },
            details: [
              `Monthly debt payments: ${this.formatCurrency(monthlyDebtPayment)}`,
              `Monthly income: ${this.formatCurrency(monthlyIncome)}`,
              `Current ratio: ${debtToIncomeRatio.toFixed(0)}%`,
              `Recommended maximum: 30% (${this.formatCurrency(monthlyIncome * 0.3)})`,
            ],
          });
        }
      }

      // High-interest debt analysis
      const highInterestLoans = activeLoanList.filter(
        (loan) => loan.interestRate > 10,
      );
      if (highInterestLoans.length > 0) {
        const totalHighInterestDebt = highInterestLoans.reduce(
          (sum, loan) => sum + loan.remainingAmount,
          0,
        );
        const avgHighInterestRate =
          highInterestLoans.reduce((sum, loan) => sum + loan.interestRate, 0) /
          highInterestLoans.length;
        const annualInterestCost = highInterestLoans.reduce(
          (sum, loan) => sum + (loan.remainingAmount * loan.interestRate) / 100,
          0,
        );

        recommendations.push({
          id: 'high-interest-debt',
          type: 'debt',
          priority: 'high',
          title: `${highInterestLoans.length} High-Interest Loan${highInterestLoans.length > 1 ? 's' : ''} (${avgHighInterestRate.toFixed(1)}% avg)`,
          description: `You have ${this.formatCurrency(totalHighInterestDebt)} in high-interest debt at an average rate of ${avgHighInterestRate.toFixed(1)}%. This costs you approximately ${this.formatCurrency(annualInterestCost)} in interest annually.`,
          action: `Prioritize paying off these ${highInterestLoans.length} loan${highInterestLoans.length > 1 ? 's' : ''} first. Consider paying an extra ${this.formatCurrency(monthlyDebtPayment * 0.1)} monthly to save ${this.formatCurrency(annualInterestCost * 0.3)} in interest over the next year.`,
          impact: 'high',
          metrics: {
            current: totalHighInterestDebt,
            percentage: avgHighInterestRate,
          },
          details: [
            `Total high-interest debt: ${this.formatCurrency(totalHighInterestDebt)}`,
            `Average interest rate: ${avgHighInterestRate.toFixed(1)}%`,
            `Annual interest cost: ${this.formatCurrency(annualInterestCost)}`,
            `Loans: ${highInterestLoans.map((l) => l.name).join(', ')}`,
          ],
        });
      }

      // Debt payoff strategy
      if (activeLoanList.length > 1) {
        const totalDebt = activeLoanList.reduce(
          (sum, loan) => sum + loan.remainingAmount,
          0,
        );
        const currentPayoffTime =
          activeLoanList.reduce((sum, loan) => sum + loan.remainingMonths, 0) /
          activeLoanList.length;
        const recommendedExtraPayment = monthlyDebtPayment * 0.1; // 10% extra
        const estimatedPayoffReduction = currentPayoffTime * 0.15; // Rough estimate: 15% reduction

        recommendations.push({
          id: 'debt-payoff-strategy',
          type: 'debt',
          priority: 'medium',
          title: `Debt Payoff Strategy: ${this.formatCurrency(totalDebt)} Remaining`,
          description: `You have ${activeLoanList.length} active loan${activeLoanList.length > 1 ? 's' : ''} with ${this.formatCurrency(totalDebt)} remaining. Average payoff time is ${currentPayoffTime.toFixed(0)} months.`,
          action: `Add ${this.formatCurrency(recommendedExtraPayment)} extra payment monthly to reduce payoff time by approximately ${estimatedPayoffReduction.toFixed(0)} months and save on interest. Focus extra payments on highest interest loans first.`,
          impact: 'medium',
          metrics: {
            current: totalDebt,
            percentage: (totalPaid / (totalPaid + totalRemaining)) * 100,
          },
          details: [
            `Total remaining: ${this.formatCurrency(totalDebt)}`,
            `Monthly payments: ${this.formatCurrency(monthlyDebtPayment)}`,
            `Average months remaining: ${currentPayoffTime.toFixed(0)}`,
          ],
        });
      }
    }

    // Enhanced Emergency Fund Recommendations
    const totalBalance = await this.getTotalBalance(userId, actualContext);
    const monthlyExpenses = analytics.incomeVsExpenses
      ? analytics.incomeVsExpenses.totalExpenses / 6
      : 0;

    if (monthlyExpenses > 0) {
      const emergencyFundMonths = totalBalance / monthlyExpenses;
      const targetMonths = 6;
      const targetAmount = monthlyExpenses * targetMonths;
      const gap = targetAmount - totalBalance;

      if (emergencyFundMonths < 3) {
        const monthlySavingsNeeded = gap / 12; // To reach 6 months in 1 year

        recommendations.push({
          id: 'emergency-fund-low',
          type: 'emergency',
          priority: 'high',
          title: `Emergency Fund: ${emergencyFundMonths.toFixed(1)} Months (Target: 6 Months)`,
          description: `You have ${this.formatCurrency(totalBalance)} saved, covering ${emergencyFundMonths.toFixed(1)} months of expenses. Experts recommend 3-6 months. You need ${this.formatCurrency(gap)} more to reach 6 months.`,
          action: `Save ${this.formatCurrency(monthlySavingsNeeded)} monthly for 12 months to build a ${this.formatCurrency(targetAmount)} emergency fund (6 months of expenses). This provides financial security for unexpected events.`,
          impact: 'high',
          metrics: {
            current: totalBalance,
            target: targetAmount,
            difference: gap,
            percentage: (emergencyFundMonths / targetMonths) * 100,
            projectedDate: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
          details: [
            `Current fund: ${this.formatCurrency(totalBalance)}`,
            `Target fund: ${this.formatCurrency(targetAmount)}`,
            `Gap: ${this.formatCurrency(gap)}`,
            `Monthly savings needed: ${this.formatCurrency(monthlySavingsNeeded)}`,
            `Current coverage: ${emergencyFundMonths.toFixed(1)} months`,
          ],
        });
      } else if (emergencyFundMonths < 6) {
        const remainingMonths = 6 - emergencyFundMonths;
        const monthlySavingsNeeded =
          (targetAmount - totalBalance) / (remainingMonths * 3); // Reach in 3 months

        recommendations.push({
          id: 'emergency-fund-building',
          type: 'emergency',
          priority: 'medium',
          title: `Emergency Fund: ${emergencyFundMonths.toFixed(1)} Months (Building to 6)`,
          description: `Good progress! You have ${emergencyFundMonths.toFixed(1)} months saved. You need ${this.formatCurrency(gap)} more to reach the recommended 6 months.`,
          action: `Save ${this.formatCurrency(monthlySavingsNeeded)} monthly for the next ${(remainingMonths * 3).toFixed(0)} months to reach 6 months coverage.`,
          impact: 'medium',
          metrics: {
            current: totalBalance,
            target: targetAmount,
            difference: gap,
            percentage: (emergencyFundMonths / targetMonths) * 100,
          },
        });
      }
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const impactOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return impactOrder[b.impact || 'low'] - impactOrder[a.impact || 'low'];
    });
  }

  /**
   * Calculate enhanced financial health score with trends and projections
   */
  async getHealthScore(
    userId: string,
    context: 'local' | 'home' | 'combined' = 'local',
  ): Promise<FinancialHealthScore> {
    const actualContext = context === 'combined' ? 'local' : context;
    const [analyticsRaw, totalBalance] = await Promise.all([
      context === 'combined'
        ? this.analyticsService.getCombinedAnalytics(userId, 6, 30)
        : this.analyticsService.getContextAnalytics(
            userId,
            actualContext,
            6,
            30,
          ),
      this.getTotalBalance(userId, actualContext),
    ]);

    const analytics = this.getAnalyticsData(analyticsRaw, context);
    const monthlyTrends = analytics.monthlyTrends || [];

    const breakdown = {
      budgetAdherence: 0,
      goalProgress: 0,
      savingsRate: 0,
      debtToIncome: 0,
      emergencyFund: 0,
    };

    const insights: string[] = [];
    const trends: NonNullable<FinancialHealthScore['trends']> = {};
    const projections: NonNullable<FinancialHealthScore['projections']> = {};

    // Calculate trends
    if (monthlyTrends.length >= 2) {
      trends.spendingTrend = this.calculateTrend(
        monthlyTrends.map((t) => t.expense),
      );
      trends.incomeTrend = this.calculateTrend(
        monthlyTrends.map((t) => t.income),
      );
      trends.savingsTrend = this.calculateTrend(
        monthlyTrends.map((t) => t.net),
      );
    }

    // Budget adherence score
    if (
      analytics.budgetPerformance &&
      analytics.budgetPerformance.totalBudgets > 0
    ) {
      breakdown.budgetAdherence = Math.max(
        0,
        Math.min(100, analytics.budgetPerformance.averageAdherence),
      );
      if (breakdown.budgetAdherence < 70) {
        insights.push(
          `Budget adherence is ${breakdown.budgetAdherence.toFixed(0)}%, below the 70% target. ${analytics.budgetPerformance.budgetsExceeded} budget${analytics.budgetPerformance.budgetsExceeded > 1 ? 's are' : ' is'} currently exceeded.`,
        );
      } else {
        insights.push(
          `Excellent budget adherence at ${breakdown.budgetAdherence.toFixed(0)}%! ${analytics.budgetPerformance.budgetsOnTrack} of ${analytics.budgetPerformance.totalBudgets} budget${analytics.budgetPerformance.totalBudgets > 1 ? 's are' : ' is'} on track.`,
        );
      }
    } else {
      breakdown.budgetAdherence = 50;
      insights.push(
        'Create budgets to track and control your spending effectively.',
      );
    }

    // Goal progress score
    if (analytics.goalsProgress && analytics.goalsProgress.totalGoals > 0) {
      breakdown.goalProgress = Math.max(
        0,
        Math.min(100, analytics.goalsProgress.overallProgress),
      );
      if (breakdown.goalProgress < 50) {
        insights.push(
          `Overall goal progress is ${breakdown.goalProgress.toFixed(0)}%. ${analytics.goalsProgress.completedGoals} of ${analytics.goalsProgress.totalGoals} goal${analytics.goalsProgress.totalGoals > 1 ? 's are' : ' is'} completed. Consider increasing contributions.`,
        );
      } else {
        insights.push(
          `Great goal progress at ${breakdown.goalProgress.toFixed(0)}%! ${analytics.goalsProgress.completedGoals} goal${analytics.goalsProgress.completedGoals > 1 ? 's completed' : ' completed'}. Keep up the momentum!`,
        );
      }
    } else {
      breakdown.goalProgress = 50;
      insights.push(
        'Set financial goals to give your savings purpose and track progress.',
      );
    }

    // Savings rate score
    if (analytics.incomeVsExpenses) {
      const { savingsRate, totalIncome, totalExpenses } =
        analytics.incomeVsExpenses;
      const monthlyIncome = totalIncome / 6;
      const monthlyExpenses = totalExpenses / 6;

      if (savingsRate < 0) {
        breakdown.savingsRate = 0;
        insights.push(
          `Critical: Spending exceeds income by ${this.formatCurrency(Math.abs(monthlyIncome - monthlyExpenses))} monthly. This is unsustainable and needs immediate attention.`,
        );
      } else if (savingsRate >= 20) {
        breakdown.savingsRate = 100;
        insights.push(
          `Excellent savings rate of ${savingsRate.toFixed(1)}%! You're saving ${this.formatCurrency(monthlyIncome - monthlyExpenses)} monthly, exceeding the 20% recommendation.`,
        );
      } else {
        breakdown.savingsRate = 50 + savingsRate * 2.5;
        const targetSavings = monthlyIncome * 0.2;
        const gap = targetSavings - (monthlyIncome - monthlyExpenses);
        insights.push(
          `Savings rate is ${savingsRate.toFixed(1)}%. To reach 20%, increase savings by ${this.formatCurrency(gap)} monthly.`,
        );
      }
    } else {
      breakdown.savingsRate = 50;
    }

    // Debt-to-income score
    if (analytics.loanSummary && analytics.loanSummary.activeLoans > 0) {
      const monthlyIncome = analytics.incomeVsExpenses
        ? analytics.incomeVsExpenses.totalIncome / 6
        : 0;
      const loans = await this.loanService.getLoans(userId, actualContext);
      const monthlyDebtPayment = loans
        .filter((l) => l.status === 'active')
        .reduce((sum, loan) => sum + loan.emi, 0);

      if (monthlyIncome > 0) {
        const debtToIncomeRatio = (monthlyDebtPayment / monthlyIncome) * 100;
        if (debtToIncomeRatio >= 50) {
          breakdown.debtToIncome = 0;
          insights.push(
            `Debt-to-income ratio is ${debtToIncomeRatio.toFixed(0)}%, very high. Debt payments of ${this.formatCurrency(monthlyDebtPayment)} consume half your income.`,
          );
        } else if (debtToIncomeRatio >= 30) {
          breakdown.debtToIncome = 70 - debtToIncomeRatio;
          insights.push(
            `Debt-to-income ratio is ${debtToIncomeRatio.toFixed(0)}%, above the 30% recommendation. Consider debt reduction strategies.`,
          );
        } else {
          breakdown.debtToIncome = 100 - debtToIncomeRatio * 2;
          insights.push(
            `Good debt management: ${debtToIncomeRatio.toFixed(0)}% debt-to-income ratio, within recommended limits.`,
          );
        }
      } else {
        breakdown.debtToIncome = 50;
      }
    } else {
      breakdown.debtToIncome = 100;
      insights.push('No active debt. Excellent financial position!');
    }

    // Emergency fund score
    const monthlyExpenses = analytics.incomeVsExpenses
      ? analytics.incomeVsExpenses.totalExpenses / 6
      : 0;
    if (monthlyExpenses > 0) {
      const emergencyFundMonths = totalBalance / monthlyExpenses;
      if (emergencyFundMonths >= 6) {
        breakdown.emergencyFund = 100;
        insights.push(
          `Excellent emergency fund: ${emergencyFundMonths.toFixed(1)} months (${this.formatCurrency(totalBalance)}) saved. You're well protected.`,
        );
      } else if (emergencyFundMonths >= 3) {
        breakdown.emergencyFund = 70 + (emergencyFundMonths - 3) * 10;
        const gap = monthlyExpenses * 6 - totalBalance;
        insights.push(
          `Good emergency fund: ${emergencyFundMonths.toFixed(1)} months saved. Add ${this.formatCurrency(gap)} to reach 6 months coverage.`,
        );
      } else {
        breakdown.emergencyFund = (emergencyFundMonths / 3) * 70;
        const target = monthlyExpenses * 3;
        insights.push(
          `Emergency fund is ${emergencyFundMonths.toFixed(1)} months. Build to 3 months minimum (${this.formatCurrency(target)}) for basic security.`,
        );
      }
    } else {
      breakdown.emergencyFund = 50;
    }

    // Calculate projections
    if (
      analytics.budgetPerformance &&
      analytics.budgetPerformance.totalBudgets > 0
    ) {
      // Simple projection: if spending trend is increasing, estimate days until budget exceeded
      if (trends.spendingTrend === 'increasing' && monthlyTrends.length >= 2) {
        const recentExpenses = monthlyTrends.slice(-2).map((t) => t.expense);
        const expenseGrowth =
          (recentExpenses[1] - recentExpenses[0]) / recentExpenses[0];
        // Rough estimate
        projections.budgetBurnRate = Math.ceil(30 / (1 + expenseGrowth));
      }
    }

    // Calculate overall score
    const overall = Math.round(
      breakdown.budgetAdherence * 0.2 +
        breakdown.goalProgress * 0.2 +
        breakdown.savingsRate * 0.25 +
        breakdown.debtToIncome * 0.15 +
        breakdown.emergencyFund * 0.2,
    );

    return {
      overall,
      breakdown,
      insights,
      trends: Object.keys(trends).length > 0 ? trends : undefined,
      projections:
        Object.keys(projections).length > 0 ? projections : undefined,
    };
  }

  /**
   * Get total balance for a user in a context
   */
  private async getTotalBalance(
    userId: string,
    context: 'local' | 'home' | 'combined',
  ): Promise<number> {
    if (context === 'combined') {
      const [localBalance, homeBalance] = await Promise.all([
        this.getTotalBalance(userId, 'local'),
        this.getTotalBalance(userId, 'home'),
      ]);
      return localBalance + homeBalance;
    }

    const accounts = await this.prisma.financeAccount.findMany({
      where: {
        userId,
        context,
      },
    });

    return accounts.reduce((sum, account) => sum + account.balance, 0);
  }
}
