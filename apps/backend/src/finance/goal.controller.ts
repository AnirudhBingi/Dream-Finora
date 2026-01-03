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
import { GoalService } from './goal.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AddContributionDto } from './dto/add-contribution.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('finance/goals')
@UseGuards(JwtAuthGuard)
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGoal(
    @CurrentUser() user: { userId: string },
    @Body() createGoalDto: CreateGoalDto,
  ) {
    return this.goalService.createGoal(user.userId, createGoalDto);
  }

  @Get()
  async getGoals(
    @CurrentUser() user: { userId: string },
    @Query('context') context?: 'local' | 'home',
    @Query('status') status?: string,
  ) {
    return this.goalService.getGoals(user.userId, context, status);
  }

  @Get(':id')
  async getGoalById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.goalService.getGoalById(user.userId, id);
  }

  @Patch(':id')
  async updateGoal(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    return this.goalService.updateGoal(user.userId, id, updateGoalDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteGoal(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.goalService.deleteGoal(user.userId, id);
  }

  @Post(':id/contributions')
  @HttpCode(HttpStatus.CREATED)
  async addContribution(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() addContributionDto: AddContributionDto,
  ) {
    return this.goalService.addContribution(user.userId, id, addContributionDto);
  }

  @Delete(':id/contributions/:contributionId')
  @HttpCode(HttpStatus.OK)
  async deleteContribution(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
  ) {
    return this.goalService.deleteContribution(user.userId, id, contributionId);
  }
}

