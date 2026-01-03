import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGroup(
    @CurrentUser() user: { userId: string },
    @Body() createGroupDto: CreateGroupDto,
  ) {
    return this.groupService.createGroup(user.userId, createGroupDto);
  }

  @Get()
  async getGroups(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.groupService.getGroups(user.userId, limitNum, offsetNum);
  }

  @Get(':id')
  async getGroupById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.groupService.getGroupById(user.userId, id);
  }

  @Get(':id/balances')
  async getGroupBalances(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Query('primaryCurrency') primaryCurrency?: string,
  ) {
    return this.groupService.getGroupBalances(user.userId, id, primaryCurrency || 'USD');
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @CurrentUser() user: { userId: string },
    @Param('id') groupId: string,
    @Body() body: { userId: string },
  ) {
    return this.groupService.addMember(user.userId, groupId, body.userId);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @CurrentUser() user: { userId: string },
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.groupService.removeMember(user.userId, groupId, memberId);
  }

  @Post(':id/invite')
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @CurrentUser() user: { userId: string },
    @Param('id') groupId: string,
    @Body() inviteDto: InviteMemberDto,
  ) {
    return this.groupService.inviteMember(user.userId, groupId, inviteDto);
  }

  @Get('invitations/:token')
  async getInvitation(
    @Param('token') token: string,
  ) {
    return this.groupService.getInvitationByToken(token);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async acceptInvitation(
    @CurrentUser() user: { userId: string },
    @Param('token') token: string,
  ) {
    return this.groupService.acceptInvitation(user.userId, token);
  }

  @Post('invitations/:token/decline')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async declineInvitation(
    @CurrentUser() user: { userId: string },
    @Param('token') token: string,
  ) {
    return this.groupService.declineInvitation(user.userId, token);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateGroup(
    @CurrentUser() user: { userId: string },
    @Param('id') groupId: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupService.updateGroup(user.userId, groupId, updateGroupDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteGroup(
    @CurrentUser() user: { userId: string },
    @Param('id') groupId: string,
  ) {
    return this.groupService.deleteGroup(user.userId, groupId);
  }

  @Put(':id/members/:memberId/role')
  @HttpCode(HttpStatus.OK)
  async changeMemberRole(
    @CurrentUser() user: { userId: string },
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
    @Body() changeRoleDto: ChangeMemberRoleDto,
  ) {
    return this.groupService.changeMemberRole(user.userId, groupId, memberId, changeRoleDto.role);
  }

  @Post(':id/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  async transferOwnership(
    @CurrentUser() user: { userId: string },
    @Param('id') groupId: string,
    @Body() transferOwnershipDto: TransferOwnershipDto,
  ) {
    return this.groupService.transferOwnership(user.userId, groupId, transferOwnershipDto.newOwnerId);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  async leaveGroup(
    @CurrentUser() user: { userId: string },
    @Param('id') groupId: string,
  ) {
    return this.groupService.leaveGroup(user.userId, groupId);
  }

  @Get(':id/history')
  async getGroupHistory(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.groupService.getGroupHistory(user.userId, id);
  }
}

