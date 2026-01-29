import { IsEnum } from 'class-validator';

export enum GroupMemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class ChangeMemberRoleDto {
  @IsEnum(GroupMemberRole)
  role: GroupMemberRole;
}
