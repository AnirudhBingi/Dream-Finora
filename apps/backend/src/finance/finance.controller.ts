import {
  Controller,
  Get,
  Post,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CategorizationService } from '../shared/categorization.service';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly categorizationService: CategorizationService,
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
  ) {
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
}

