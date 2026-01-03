import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.notificationService.getNotifications(user.userId, limitNum, offsetNum);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: { userId: string }) {
    const count = await this.notificationService.getUnreadCount(user.userId);
    return { count };
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.notificationService.markAsRead(user.userId, id);
    return { success: true };
  }

  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: { userId: string }) {
    await this.notificationService.markAllAsRead(user.userId);
    return { success: true };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.notificationService.deleteNotification(user.userId, id);
    return { success: true };
  }
}

