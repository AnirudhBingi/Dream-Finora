import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CategorizationService } from '../shared/categorization.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { FinancialAdvisorService } from './financial-advisor.service';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly categorizationService: CategorizationService,
    private readonly analyticsService: AnalyticsService,
    private readonly financialAdvisorService: FinancialAdvisorService,
  ) {}

  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  async createAccount(
    @CurrentUser() user: { userId: string },
    @Body() createAccountDto: CreateAccountDto,
  ) {
    return this.financeService.createAccount(user.userId, createAccountDto);
  }

  @Get('accounts')
  async getAccounts(
    @CurrentUser() user: { userId: string },
    @Query('context') context?: 'local' | 'home',
  ) {
    return this.financeService.getAccounts(user.userId, context);
  }

  @Get('accounts/:id')
  async getAccountById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.financeService.getAccountById(user.userId, id);
  }

  @Patch('accounts/:id')
  @HttpCode(HttpStatus.OK)
  async updateAccount(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.financeService.updateAccount(user.userId, id, updateAccountDto);
  }

  @Delete('accounts/:id')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.financeService.deleteAccount(user.userId, id);
  }

  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  async createTransaction(
    @CurrentUser() user: { userId: string },
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.financeService.createTransaction(user.userId, createTransactionDto);
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: { userId: string },
    @Query('context') context?: 'local' | 'home',
    @Query('includeBillchop') includeBillchop?: string,
  ) {
    return this.financeService.getTransactions(
      user.userId,
      context,
      includeBillchop === 'true',
    );
  }

  @Get('transactions/:id')
  async getTransactionById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.financeService.getTransactionById(user.userId, id);
  }

  @Patch('transactions/:id')
  @HttpCode(HttpStatus.OK)
  async updateTransaction(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.financeService.updateTransaction(user.userId, id, updateTransactionDto);
  }

  @Delete('transactions/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTransaction(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.financeService.deleteTransaction(user.userId, id);
  }

  @Get('balance')
  async getBalance(
    @CurrentUser() user: { userId: string },
    @Query('context') context?: 'local' | 'home',
    @Query('includeBillchop') includeBillchop?: string,
    @Query('primaryCurrency') primaryCurrency?: string,
    @Query('combined') combined?: string,
  ) {
    // If combined=true, return combined balance with currency conversion
    if (combined === 'true') {
      return this.financeService.getCombinedBalance(
        user.userId,
        primaryCurrency || 'USD',
      );
    }

    return this.financeService.getBalance(
      user.userId,
      context,
      includeBillchop !== 'false', // Default to true
      primaryCurrency || 'USD',
    );
  }

  @Get('categories')
  async getCategories() {
    return this.financeService.getCategories();
  }

  @Get('suggest-category')
  async suggestCategory(
    @Query('description') description: string,
    @Query('type') type: 'income' | 'expense',
  ) {
    if (!description || !type) {
      return { category: null };
    }
    const match = this.categorizationService.categorizeFinance(description, type);
    return { category: match?.category || null };
  }

  /**
   * GET /finance/analytics/local
   * Get comprehensive analytics for local finance context
   */
  @Get('analytics/local')
  async getLocalAnalytics(
    @CurrentUser() user: { userId: string },
    @Query('months') months?: string,
    @Query('days') days?: string,
  ) {
    const monthsCount = months ? parseInt(months, 10) : 6;
    const daysCount = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getContextAnalytics(user.userId, 'local', monthsCount, daysCount);
  }

  /**
   * GET /finance/analytics/home
   * Get comprehensive analytics for home country finance context
   */
  @Get('analytics/home')
  async getHomeAnalytics(
    @CurrentUser() user: { userId: string },
    @Query('months') months?: string,
    @Query('days') days?: string,
  ) {
    const monthsCount = months ? parseInt(months, 10) : 6;
    const daysCount = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getContextAnalytics(user.userId, 'home', monthsCount, daysCount);
  }

  /**
   * GET /finance/analytics/combined
   * Get combined analytics (local + home) converted to primary currency
   */
  @Get('analytics/combined')
  async getCombinedAnalytics(
    @CurrentUser() user: { userId: string },
    @Query('months') months?: string,
    @Query('days') days?: string,
    @Query('primaryCurrency') primaryCurrency?: string,
  ) {
    const monthsCount = months ? parseInt(months, 10) : 6;
    const daysCount = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getCombinedAnalytics(
      user.userId,
      monthsCount,
      daysCount,
      primaryCurrency || 'USD',
    );
  }

  /**
   * GET /finance/advisor/recommendations
   * Get personalized financial recommendations
   */
  @Get('advisor/recommendations')
  async getRecommendations(
    @CurrentUser() user: { userId: string },
    @Query('context') context?: 'local' | 'home' | 'combined',
  ) {
    return this.financialAdvisorService.getRecommendations(
      user.userId,
      context || 'local',
    );
  }

  /**
   * GET /finance/advisor/health-score
   * Get financial health score with breakdown
   */
  @Get('advisor/health-score')
  async getHealthScore(
    @CurrentUser() user: { userId: string },
    @Query('context') context?: 'local' | 'home' | 'combined',
  ) {
    return this.financialAdvisorService.getHealthScore(
      user.userId,
      context || 'local',
    );
  }

  /**
   * GET /finance/history
   * Get finance history (transactions with changes, account history)
   */
  @Get('history')
  async getFinanceHistory(
    @CurrentUser() user: { userId: string },
    @Query('context') context?: 'local' | 'home',
    @Query('accountId') accountId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    
    return this.financeService.getFinanceHistory(
      user.userId,
      context,
      accountId,
      limitNum,
      offsetNum,
    );
  }
}

