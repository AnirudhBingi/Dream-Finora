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
import { CreateChoreDto } from './dto/create-chore.dto';
import { UpdateChoreDto } from './dto/update-chore.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('chores')
@UseGuards(JwtAuthGuard)
export class ChoreController {
  constructor(private readonly choreService: ChoreService) {}

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
  ) {
    return this.choreService.getChores(user.userId, groupId);
  }

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

  @Get(':id/history')
  async getChoreHistory(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.choreService.getChoreHistory(user.userId, id);
  }
}

