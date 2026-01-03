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
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('finance/budgets')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBudget(
    @CurrentUser() user: { userId: string },
    @Body() createBudgetDto: CreateBudgetDto,
  ) {
    return this.budgetService.createBudget(user.userId, createBudgetDto);
  }

  @Get()
  async getBudgets(
    @CurrentUser() user: { userId: string },
    @Query('context') context?: 'local' | 'home',
  ) {
    return this.budgetService.getBudgets(user.userId, context);
  }

  @Get(':id')
  async getBudgetById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.budgetService.getBudgetById(user.userId, id);
  }

  @Patch(':id')
  async updateBudget(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetService.updateBudget(user.userId, id, updateBudgetDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteBudget(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.budgetService.deleteBudget(user.userId, id);
  }

  @Get(':id/tracking')
  async getBudgetTracking(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Query('period') period?: string,
  ) {
    return this.budgetService.getBudgetTracking(user.userId, id, period);
  }
}

