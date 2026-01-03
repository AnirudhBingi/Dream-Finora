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
import { FriendService } from './friend.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async sendFriendRequest(
    @CurrentUser() user: { userId: string },
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendService.sendFriendRequest(user.userId, dto);
  }

  @Get()
  async getFriends(@CurrentUser() user: { userId: string }) {
    return this.friendService.getFriends(user.userId);
  }

  @Get('requests')
  async getPendingRequests(@CurrentUser() user: { userId: string }) {
    return this.friendService.getPendingRequests(user.userId);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptFriendRequest(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.friendService.acceptFriendRequest(user.userId, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectFriendRequest(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.friendService.rejectFriendRequest(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeFriend(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.friendService.removeFriend(user.userId, id);
  }

  @Post('block/:friendId')
  @HttpCode(HttpStatus.OK)
  async blockUser(
    @CurrentUser() user: { userId: string },
    @Param('friendId') friendId: string,
  ) {
    return this.friendService.blockUser(user.userId, friendId);
  }

  @Post('unblock/:friendId')
  @HttpCode(HttpStatus.OK)
  async unblockUser(
    @CurrentUser() user: { userId: string },
    @Param('friendId') friendId: string,
  ) {
    return this.friendService.unblockUser(user.userId, friendId);
  }

  @Get('blocked')
  async getBlockedUsers(@CurrentUser() user: { userId: string }) {
    return this.friendService.getBlockedUsers(user.userId);
  }

  @Get('mutual/:userId')
  async getMutualFriends(
    @CurrentUser() user: { userId: string },
    @Param('userId') targetUserId: string,
  ) {
    return this.friendService.getMutualFriends(user.userId, targetUserId);
  }

  @Get('search')
  async searchUsers(
    @CurrentUser() user: { userId: string },
    @Query('q') query: string,
  ) {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.friendService.searchUsers(user.userId, query.trim());
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  async inviteUserToApp(
    @CurrentUser() user: { userId: string },
    @Body() inviteDto: InviteUserDto,
  ) {
    return this.friendService.inviteUserToApp(user.userId, inviteDto);
  }

  @Get('invitations/:token')
  async getInvitation(@Param('token') token: string) {
    return this.friendService.getInvitationByToken(token);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async acceptInvitation(
    @CurrentUser() user: { userId: string },
    @Param('token') token: string,
  ) {
    return this.friendService.acceptInvitation(token, user.userId);
  }
}

