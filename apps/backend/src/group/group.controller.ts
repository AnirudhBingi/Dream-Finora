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
  async getGroups(@CurrentUser() user: { userId: string }) {
    return this.groupService.getGroups(user.userId);
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
}

