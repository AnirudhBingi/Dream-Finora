import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChoreService } from './chore.service';
import { ChoreStatsService } from './chore-stats.service';
import { ChorePointsService } from './chore-points.service';
import { RecurringChoreService } from './recurring-chore.service';
import { ChoreRotationService } from './chore-rotation.service';
import { CreateChoreDto } from './dto/create-chore.dto';
import { UpdateChoreDto } from './dto/update-chore.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('chores')
@UseGuards(JwtAuthGuard)
export class ChoreController {
  constructor(
    private readonly choreService: ChoreService,
    private readonly choreStatsService: ChoreStatsService,
    private readonly chorePointsService: ChorePointsService,
    private readonly recurringChoreService: RecurringChoreService,
    private readonly choreRotationService: ChoreRotationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createChore(
    @CurrentUser() user: { userId: string },
    @Body() createChoreDto: CreateChoreDto,
  ) {
    return this.choreService.createChore(user.userId, createChoreDto);
  }

  @Get()
  async getChores(
    @CurrentUser() user: { userId: string },
    @Query('groupId') groupId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.choreService.getChores(user.userId, groupId, limitNum, offsetNum);
  }

  // IMPORTANT: All specific routes with :id must come before the general @Get(':id') route
  // Rotation endpoints (most specific first)
  @Get(':id/rotation/schedule')
  async getRotationSchedule(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Query('count') count?: string,
  ) {
    const upcomingCount = count ? parseInt(count, 10) : 10;
    return this.choreRotationService.getRotationSchedule(id, upcomingCount);
  }

  @Get(':id/rotation')
  async getRotationOrder(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.choreRotationService.getRotationOrder(id);
  }

  @Get(':id/history')
  async getChoreHistory(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.choreService.getChoreHistory(user.userId, id);
  }

  @Get(':id/assignments')
  async getChoreAssignments(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.choreService.getChoreAssignments(user.userId, id);
  }

  // General :id route must come last
  @Get(':id')
  async getChoreById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.choreService.getChoreById(user.userId, id);
  }

  @Put(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assignChore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.choreService.assignChore(user.userId, id, body.userId);
  }

  @Put(':id/grab')
  @HttpCode(HttpStatus.OK)
  async grabChore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.choreService.grabChore(user.userId, id);
  }

  @Put(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeChore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.choreService.completeChore(user.userId, id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateChore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updateChoreDto: UpdateChoreDto,
  ) {
    return this.choreService.updateChore(user.userId, id, updateChoreDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteChore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.choreService.deleteChore(user.userId, id);
  }

  @Put(':id/unassign')
  @HttpCode(HttpStatus.OK)
  async unassignChore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.choreService.unassignChore(user.userId, id);
  }

  @Get('stats/me')
  async getMyStats(@CurrentUser() user: { userId: string }) {
    return this.choreStatsService.getUserStats(user.userId);
  }

  @Get('leaderboard/:groupId')
  async getGroupLeaderboard(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Query('period') period?: 'week' | 'month' | 'all-time',
  ) {
    return this.choreService.getGroupPointsLeaderboard(user.userId, groupId, period || 'all-time');
  }

  @Get('stats/group/:groupId')
  async getGroupStats(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Query('period') period?: 'week' | 'month' | 'all-time',
  ) {
    return this.choreStatsService.getGroupStats(user.userId, groupId, period || 'all-time');
  }

  @Get('stats/friend/:friendId')
  async getFriendStats(
    @CurrentUser() user: { userId: string },
    @Param('friendId') friendId: string,
  ) {
    return this.choreStatsService.getFriendStats(user.userId, friendId);
  }

  @Get('groups/:groupId/achievements')
  async getGroupAchievements(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
  ) {
    return this.choreStatsService.getGroupAchievements(user.userId, groupId);
  }

  @Get('groups/:groupId/history')
  async getGroupHistory(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.choreStatsService.getGroupChoreHistory(user.userId, groupId, limitNum);
  }

  @Get('groups/:groupId/analytics')
  async getGroupAnalytics(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.choreStatsService.getGroupAnalytics(user.userId, groupId, daysNum);
  }

  @Post('calculate-points')
  @HttpCode(HttpStatus.OK)
  async calculatePoints(
    @Body() body: { category?: string; title: string; description?: string },
  ) {
    const points = this.chorePointsService.calculatePoints(
      body.category,
      body.title,
      body.description,
    );
    const explanation = this.chorePointsService.getPointExplanation(
      body.category,
      body.title,
      body.description,
      points,
    );
    return { points, explanation };
  }

  @Post(':id/assign-multiple')
  @HttpCode(HttpStatus.OK)
  async assignMultipleChore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
  ) {
    return this.choreService.assignMultipleChore(user.userId, id, body.userIds);
  }

  @Put(':id/assignments/:assignmentId/complete')
  @HttpCode(HttpStatus.OK)
  async completeChoreAssignment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.choreService.completeChoreAssignment(user.userId, id, assignmentId);
  }

  @Delete(':id/assignments/:assignmentId')
  @HttpCode(HttpStatus.OK)
  async removeChoreAssignment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.choreService.removeChoreAssignment(user.userId, id, assignmentId);
  }

  @Put(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelChore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.choreService.cancelChore(user.userId, id);
  }

  @Put(':id/reassign')
  @HttpCode(HttpStatus.OK)
  async reassignChore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { userId: string; reason?: string },
  ) {
    return this.choreService.reassignChore(user.userId, id, body.userId, body.reason);
  }


  @Put(':id/rotation')
  @HttpCode(HttpStatus.OK)
  async updateRotationOrder(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
  ) {
    return this.choreRotationService.updateRotationOrder(id, body.userIds);
  }

  @Post(':id/rotation/skip')
  @HttpCode(HttpStatus.OK)
  async skipUserInRotation(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { userId: string; skipUntil: string },
  ) {
    return this.choreRotationService.skipUser(id, body.userId, new Date(body.skipUntil));
  }

  @Delete(':id/rotation/skip/:userId')
  @HttpCode(HttpStatus.OK)
  async removeSkip(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.choreRotationService.removeSkip(id, userId);
  }

  @Post(':id/rotation/assign-next')
  @HttpCode(HttpStatus.OK)
  async assignToNextUser(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const nextUserId = await this.choreRotationService.assignToNextUser(id);
    if (!nextUserId) {
      return { message: 'No user available in rotation' };
    }
    return this.choreService.getChoreById(user.userId, id);
  }

  @Get('groups/:groupId/rotation-fairness')
  async getRotationFairness(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
  ) {
    const fairnessScore = await this.choreRotationService.calculateFairnessScore(groupId);
    return { groupId, fairnessScore };
  }
}

