import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/spending-by-category
   * Get personal finance spending breakdown by category (pie chart data)
   * Optional query params: startDate, endDate (ISO date strings)
   */
  @Get('spending-by-category')
  async getSpendingByCategory(
    @CurrentUser() user: { userId: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getSpendingByCategory(user.userId, start, end);
  }

  /**
   * GET /analytics/monthly-trends
   * Get personal finance monthly income, expense, and net trends
   * Optional query param: months (default: 6)
   */
  @Get('monthly-trends')
  async getMonthlyTrends(
    @CurrentUser() user: { userId: string },
    @Query('months') months?: string,
  ) {
    const monthsCount = months ? parseInt(months, 10) : 6;
    return this.analyticsService.getMonthlyTrends(user.userId, monthsCount);
  }

  /**
   * GET /analytics/balance-over-time
   * Get personal finance balance over time (line chart data)
   * Optional query param: days (default: 30)
   */
  @Get('balance-over-time')
  async getBalanceOverTime(
    @CurrentUser() user: { userId: string },
    @Query('days') days?: string,
  ) {
    const daysCount = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getBalanceOverTime(user.userId, daysCount);
  }

  /**
   * GET /analytics/expense-spending-by-category
   * Get split expense spending breakdown by category (pie chart data)
   * Based on ExpenseSplit amounts (what user owes in split expenses)
   * Optional query params: startDate, endDate (ISO date strings)
   */
  @Get('expense-spending-by-category')
  async getExpenseSpendingByCategory(
    @CurrentUser() user: { userId: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getExpenseSpendingByCategory(
      user.userId,
      start,
      end,
    );
  }

  /**
   * GET /analytics/expense-monthly-trends
   * Get split expense monthly trends
   * Optional query param: months (default: 6)
   */
  @Get('expense-monthly-trends')
  async getExpenseMonthlyTrends(
    @CurrentUser() user: { userId: string },
    @Query('months') months?: string,
  ) {
    const monthsCount = months ? parseInt(months, 10) : 6;
    return this.analyticsService.getExpenseMonthlyTrends(
      user.userId,
      monthsCount,
    );
  }

  /**
   * GET /analytics/top-spenders/:groupId
   * Get top spenders in a group (based on expenses they created)
   * Optional query param: limit (default: 10)
   */
  @Get('top-spenders/:groupId')
  async getTopSpendersInGroup(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Query('limit') limit?: string,
  ) {
    const limitCount = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getTopSpendersInGroup(groupId, limitCount);
  }

  /**
   * GET /analytics/rides
   * Get personal ride analytics (trends, top routes, top companions, spending breakdown)
   * Optional query params: months (default: 6), startDate, endDate (ISO date strings)
   */
  @Get('rides')
  async getRideAnalytics(
    @CurrentUser() user: { userId: string },
    @Query('months') months?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const monthsCount = months ? parseInt(months, 10) : 6;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getRideAnalytics(
      user.userId,
      monthsCount,
      start,
      end,
    );
  }
}
