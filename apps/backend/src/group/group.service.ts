import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../shared/currency.service';
import { NotificationService, NotificationType } from '../notification/notification.service';
import { EmailService } from '../shared/email.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class GroupService {
  constructor(
    private prisma: PrismaService,
    private currencyService: CurrencyService,
    private notificationService: NotificationService,
    private emailService: EmailService,
  ) {}

  async createGroup(userId: string, createGroupDto: CreateGroupDto) {
    // Verify all member IDs exist (if provided)
    if (createGroupDto.memberIds && createGroupDto.memberIds.length > 0) {
      const uniqueMemberIds = [...new Set(createGroupDto.memberIds)];
      const users = await this.prisma.user.findMany({
        where: { id: { in: uniqueMemberIds } },
        select: { id: true },
      });

      if (users.length !== uniqueMemberIds.length) {
        throw new BadRequestException('One or more member IDs are invalid');
      }
    }

    // Create group with creator as first member (ADMIN role)
    const memberIds = createGroupDto.memberIds || [];
    const allMemberIds = [userId, ...memberIds.filter((id) => id !== userId)]; // Ensure creator is included

    const group = await this.prisma.group.create({
      data: {
        id: randomUUID(),
        name: createGroupDto.name,
        description: createGroupDto.description,
        createdBy: userId,
        GroupMember: {
          create: allMemberIds.map((memberId) => ({
            id: randomUUID(),
            userId: memberId,
            role: memberId === userId ? 'ADMIN' : 'MEMBER', // Creator is ADMIN, others are MEMBER
          })),
        },
      },
      include: {
        GroupMember: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                UserProfile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return group;
  }

  async getGroups(userId: string, limit: number = 50, offset: number = 0) {
    // Get all groups where user is a member
    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where: {
          GroupMember: {
            some: {
              userId,
            },
          },
        },
      include: {
        GroupMember: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                UserProfile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            Expense: true,
          },
        },
      },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.group.count({
        where: {
          GroupMember: {
            some: {
              userId,
            },
          },
        },
      }),
    ]);

    return {
      groups,
      total,
      limit,
      offset,
      hasMore: offset + groups.length < total,
    };
  }

  async getGroupById(userId: string, groupId: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
      include: {
        GroupMember: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                UserProfile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        Expense: {
          include: {
            ExpenseSplit: {
              include: {
                User: {
                  select: {
                    id: true,
                    email: true,
                    UserProfile: {
                      select: {
                        displayName: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
              },
            },
            User_Expense_createdByToUser: {
              select: {
                id: true,
                email: true,
                UserProfile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async addMember(userId: string, groupId: string, memberId: string) {
    // Verify user has permission (must be member of group)
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you do not have permission');
    }

    // Check if member already exists
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: memberId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this group');
    }

    // Verify member ID exists
    const user = await this.prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const member = await this.prisma.groupMember.create({
      data: {
        id: randomUUID(),
        groupId,
        userId: memberId,
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return member;
  }

  async inviteMember(userId: string, groupId: string, inviteDto: InviteMemberDto) {
    // Verify user has permission (must be member of group)
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you do not have permission');
    }

    // Determine if we're inviting by userId, email, or mobileNumber
    let inviteeUser: { id: string; email: string; mobileNumber: string | null; UserProfile: any } | null = null;
    let email: string | null = null;
    let mobileNumber: string | null = null;

    if (inviteDto.userId) {
      // Inviting existing user by ID
      const user = await this.prisma.user.findUnique({
        where: { id: inviteDto.userId },
        include: { UserProfile: true },
      });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      inviteeUser = user;
      email = user.email;
      mobileNumber = user.mobileNumber;
    } else if (inviteDto.email) {
      // Inviting by email
      email = inviteDto.email;
      const user = await this.prisma.user.findUnique({
        where: { email: inviteDto.email },
        include: { UserProfile: true },
      });
      if (user) {
        inviteeUser = user;
        mobileNumber = user.mobileNumber;
      }
    } else if (inviteDto.mobileNumber) {
      // Inviting by mobile number
      mobileNumber = inviteDto.mobileNumber;
      const user = await this.prisma.user.findUnique({
        where: { mobileNumber: inviteDto.mobileNumber },
        include: { UserProfile: true },
      });
      if (user) {
        inviteeUser = user;
        email = user.email;
      }
    } else {
      throw new BadRequestException('Either userId, email, or mobileNumber must be provided');
    }

    // Check if user is already a member
    if (inviteeUser) {
      const existingMember = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: inviteeUser.id,
          },
        },
      });

      if (existingMember) {
        throw new BadRequestException('User is already a member of this group');
      }

      // Check for existing pending invitation
      const existingInvitation = await this.prisma.groupInvitation.findFirst({
        where: {
          groupId,
          userId: inviteeUser.id,
          status: 'pending',
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingInvitation) {
        throw new BadRequestException('Invitation already sent to this user');
      }
    } else {
      // Non-user invitation - check by email or mobile
      const existingInvitation = await this.prisma.groupInvitation.findFirst({
        where: {
          groupId,
          OR: [
            email ? { email } : {},
            mobileNumber ? { mobileNumber } : {},
          ],
          status: 'pending',
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingInvitation) {
        throw new BadRequestException('Invitation already sent to this email/mobile number');
      }
    }

    // Generate invitation token
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const invitation = await this.prisma.groupInvitation.create({
      data: {
        id: randomUUID(),
        groupId,
        invitedBy: userId,
        email: email || null,
        mobileNumber: mobileNumber || null,
        userId: inviteeUser?.id || null,
        token,
        status: 'pending',
        expiresAt,
      },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        Inviter: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Send notification if user exists
    if (inviteeUser) {
      await this.notificationService.createNotification({
        userId: inviteeUser.id,
        type: NotificationType.GROUP_MEMBER_ADDED, // Using existing type, or add new one
        title: 'Group Invitation',
        message: `${group.User.UserProfile?.displayName || group.User.email} invited you to join "${group.name}"`,
        data: {
          groupId,
          invitationId: invitation.id,
          token,
        },
      });
    } else {
      // User doesn't exist - automatically create app invitation
      // Check if app invitation already exists
      const existingAppInvitation = await this.prisma.userInvitation.findFirst({
        where: {
          OR: [
            email ? { email } : {},
            mobileNumber ? { mobileNumber } : {},
          ],
          status: 'pending',
          expiresAt: {
            gt: new Date(),
          },
        },
      });

        if (!existingAppInvitation) {
        // Create app invitation for non-registered user
        const appInvitationToken = randomUUID();
        const appInvitationExpiresAt = new Date();
        appInvitationExpiresAt.setDate(appInvitationExpiresAt.getDate() + 7);

        await this.prisma.userInvitation.create({
          data: {
            id: randomUUID(),
            invitedBy: userId,
            email: email || null,
            mobileNumber: mobileNumber || null,
            token: appInvitationToken,
            status: 'pending',
            expiresAt: appInvitationExpiresAt,
          },
        });

        // Send email/SMS invitation
        const inviterName = group.User.UserProfile?.displayName || group.User.email;
        if (email) {
          await this.emailService.sendGroupInvitation(
            email,
            inviterName,
            group.name,
            token,
            appInvitationToken,
          ).catch(err => {
            console.error('Failed to send email invitation:', err);
            // Don't throw - invitation is still created
          });
        }
        if (mobileNumber) {
          await this.emailService.sendSMSInvitation(
            mobileNumber,
            inviterName,
            appInvitationToken,
            true,
            group.name,
          ).catch(err => {
            console.error('Failed to send SMS invitation:', err);
            // Don't throw - invitation is still created
          });
        }
      }
    }

    return {
      invitationId: invitation.id,
      token,
      email: invitation.email,
      mobileNumber: invitation.mobileNumber,
      expiresAt: invitation.expiresAt,
      inviteLink: `${process.env.FRONTEND_URL || 'https://dreamfinora.com'}/invite/group/${token}`,
    };
  }

  async acceptInvitation(userId: string, token: string) {
    // Find invitation by token
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { token },
      include: {
        Group: true,
        Inviter: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation has already been accepted or declined');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invitation has expired');
    }

    // Verify user matches invitation (if userId was specified)
    if (invitation.userId && invitation.userId !== userId) {
      throw new BadRequestException('This invitation is not for you');
    }

    // Verify user email/mobile matches (if no userId was specified)
    if (!invitation.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, mobileNumber: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const emailMatches = invitation.email && user.email === invitation.email;
      const mobileMatches = invitation.mobileNumber && user.mobileNumber === invitation.mobileNumber;

      if (!emailMatches && !mobileMatches) {
        throw new BadRequestException('This invitation is not for you');
      }
    }

    // Check if user is already a member
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: invitation.groupId,
          userId,
        },
      },
    });

    if (existingMember) {
      // Mark invitation as accepted even though already member
      await this.prisma.groupInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          userId, // Update userId if it was null
        },
      });
      return { success: true, message: 'You are already a member of this group' };
    }

    // Add user as member
    await this.prisma.groupMember.create({
      data: {
        id: randomUUID(),
        groupId: invitation.groupId,
        userId,
        role: 'MEMBER',
      },
    });

    // Update invitation status
    await this.prisma.groupInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        userId, // Update userId if it was null
      },
    });

    // Send notification to inviter
    await this.notificationService.createNotification({
      userId: invitation.invitedBy,
      type: NotificationType.GROUP_MEMBER_ADDED, // Using existing type
      title: 'Invitation Accepted',
      message: `Your invitation to join "${invitation.Group.name}" was accepted`,
      data: {
        groupId: invitation.groupId,
        userId,
      },
    });

    return {
      success: true,
      groupId: invitation.groupId,
      groupName: invitation.Group.name,
    };
  }

  async declineInvitation(userId: string, token: string) {
    // Find invitation by token
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation has already been processed');
    }

    // Verify user matches invitation
    if (invitation.userId && invitation.userId !== userId) {
      throw new BadRequestException('This invitation is not for you');
    }

    // Update invitation status
    await this.prisma.groupInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'declined',
        declinedAt: new Date(),
        userId: invitation.userId || userId, // Update userId if it was null
      },
    });

    return { success: true };
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { token },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
        },
        Inviter: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  async removeMember(userId: string, groupId: string, memberId: string) {
    // Verify user has permission (must be member of group)
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you do not have permission');
    }

    // Cannot remove the creator
    if (group.createdBy === memberId) {
      throw new BadRequestException('Cannot remove the group creator');
    }

    // Cannot remove yourself (for now - could allow leaving group later)
    if (userId === memberId) {
      throw new BadRequestException('Cannot remove yourself. Leave group functionality coming soon.');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: memberId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in group');
    }

    await this.prisma.groupMember.delete({
      where: {
        id: member.id,
      },
    });

    // Get group info for notification
    const groupInfo = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    // Notify the removed member
    if (memberId !== userId && groupInfo) {
      const removerName = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          UserProfile: { select: { displayName: true } },
        },
      });
      const removerDisplayName = removerName?.UserProfile?.displayName || removerName?.email || 'Someone';
      
      await this.notificationService.notifyGroupMemberRemoved(
        memberId,
        groupId,
        groupInfo.name,
        removerDisplayName,
      ).catch(err => {
        console.error(`Failed to create notification for removed member:`, err);
      });
    }

    return { success: true };
  }

  async getGroupBalances(userId: string, groupId: string, primaryCurrency: string = 'USD') {
    // Verify user is member of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you do not have permission');
    }

    // Get all unpaid splits for expenses in this group
    const owedSplits = await this.prisma.expenseSplit.findMany({
      where: {
        Expense: {
          groupId,
        },
        userId,
        isPaid: false,
      },
      include: {
        Expense: {
          include: {
            User_Expense_createdByToUser: {
              select: {
                id: true,
                email: true,
                UserProfile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            User_Expense_paidByToUser: {
              select: {
                id: true,
                email: true,
                UserProfile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get all unpaid splits where others owe the user (user paid for the expense)
    const owedToUser = await this.prisma.expenseSplit.findMany({
      where: {
        Expense: {
          groupId,
          OR: [
            { paidBy: userId }, // User paid for the expense
            { 
              AND: [
                { paidBy: null }, // Fallback: if paidBy is null, use createdBy (backward compatibility)
                { createdBy: userId },
              ],
            },
          ],
        },
        userId: { not: userId },
        isPaid: false,
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        Expense: {
          include: {
            User_Expense_paidByToUser: {
              select: {
                id: true,
                email: true,
                UserProfile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Convert all amounts to primary currency
    const convertSplits = async (splits: any[]) => {
      return Promise.all(
        splits.map(async (split) => {
          const expenseCurrency = split.Expense.currency || 'USD';
          const convertedAmount = await this.currencyService.convertAmount(
            split.amount,
            expenseCurrency,
            primaryCurrency,
          );
          return {
            ...split,
            originalAmount: split.amount,
            originalCurrency: expenseCurrency,
            convertedAmount,
            convertedCurrency: primaryCurrency,
          };
        }),
      );
    };

    const convertedOwedSplits = await convertSplits(owedSplits);
    const convertedOwedToUser = await convertSplits(owedToUser);

    // Calculate totals in primary currency (exclude splits where user owes themselves)
    // Use paidBy if available, otherwise fallback to createdBy for backward compatibility
    const totalOwed = convertedOwedSplits
      .filter((split) => {
        const payerId = split.Expense.paidBy || split.Expense.createdBy;
        return payerId !== userId; // Skip if user owes themselves
      })
      .reduce((sum, split) => sum + split.convertedAmount, 0);
    const totalOwedToUser = convertedOwedToUser.reduce((sum, split) => sum + split.convertedAmount, 0);
    const netBalance = totalOwedToUser - totalOwed;

    // Group by user (exclude cases where user owes themselves)
    const owedByUser = new Map<string, { user: any; amount: number; originalAmount: number; originalCurrency: string; splits: any[] }>();
    convertedOwedSplits.forEach((split) => {
      // Use paidBy if available, otherwise fallback to createdBy for backward compatibility
        const creditorId = split.Expense.paidBy || split.Expense.createdBy;
      // Skip if user owes themselves
      if (creditorId === userId) {
        return;
      }
      if (!owedByUser.has(creditorId)) {
        // Use paidByUser if available, otherwise use createdByUser
          const creditorUser = split.Expense.User_Expense_paidByToUser || split.Expense.User_Expense_createdByToUser;
        owedByUser.set(creditorId, {
          user: creditorUser,
          amount: 0,
          originalAmount: 0,
          originalCurrency: split.originalCurrency,
          splits: [],
        });
      }
      const entry = owedByUser.get(creditorId)!;
      entry.amount += split.convertedAmount;
      entry.originalAmount += split.originalAmount;
      entry.splits.push(split);
    });

    const owedToUserByUser = new Map<string, { user: any; amount: number; originalAmount: number; originalCurrency: string; splits: any[] }>();
    convertedOwedToUser.forEach((split) => {
      const debtorId = split.userId;
      if (!owedToUserByUser.has(debtorId)) {
        owedToUserByUser.set(debtorId, {
          user: split.User,
          amount: 0,
          originalAmount: 0,
          originalCurrency: split.originalCurrency,
          splits: [],
        });
      }
      const entry = owedToUserByUser.get(debtorId)!;
      entry.amount += split.convertedAmount;
      entry.originalAmount += split.originalAmount;
      entry.splits.push(split);
    });

    return {
      totalOwed,
      totalOwedToUser,
      netBalance,
      primaryCurrency,
      owedByUser: Array.from(owedByUser.values()),
      owedToUser: Array.from(owedToUserByUser.values()),
    };
  }

  async updateGroup(userId: string, groupId: string, updateData: { name?: string; description?: string }) {
    // Verify user is admin of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you do not have permission to edit it');
    }

    const updated = await this.prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        GroupMember: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                UserProfile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  async deleteGroup(userId: string, groupId: string) {
    // Verify user is admin of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you do not have permission to delete it');
    }

    // Delete group (cascade will handle expenses, chores, members)
    await this.prisma.group.delete({
      where: { id: groupId },
    });

    return { success: true };
  }

  async changeMemberRole(userId: string, groupId: string, memberId: string, role: 'ADMIN' | 'MEMBER') {
    // Verify user is admin of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you do not have permission');
    }

    // Cannot change role of creator (they're always admin)
    if (group.createdBy === memberId) {
      throw new BadRequestException('Cannot change role of group creator');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: memberId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in group');
    }

    const updated = await this.prisma.groupMember.update({
      where: { id: member.id },
      data: { role },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  async transferOwnership(userId: string, groupId: string, newOwnerId: string) {
    // Verify user is current owner (creator)
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        createdBy: userId,
      },
      include: {
        GroupMember: {
          where: {
            userId: newOwnerId,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you are not the owner');
    }

    // Verify new owner is a member
    if (group.GroupMember.length === 0) {
      throw new BadRequestException('New owner must be a member of the group');
    }

    // Update group owner and set new owner as ADMIN
    await this.prisma.$transaction([
      this.prisma.group.update({
        where: { id: groupId },
        data: { createdBy: newOwnerId },
      }),
      this.prisma.groupMember.updateMany({
        where: {
          groupId,
          userId: newOwnerId,
        },
        data: { role: 'ADMIN' },
      }),
      // Optionally set old owner to MEMBER (or keep as ADMIN)
      this.prisma.groupMember.updateMany({
        where: {
          groupId,
          userId,
        },
        data: { role: 'ADMIN' }, // Keep old owner as admin too
      }),
    ]);

    return { success: true };
  }

  async leaveGroup(userId: string, groupId: string) {
    // Verify user is member
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you are not a member');
    }

    // Cannot leave if you're the creator (must transfer ownership first)
    if (group.createdBy === userId) {
      throw new BadRequestException('Cannot leave group as creator. Transfer ownership first.');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.groupMember.delete({
      where: { id: member.id },
    });

    return { success: true };
  }

  async getGroupHistory(userId: string, groupId: string) {
    // Verify user is member of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        GroupMember: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                UserProfile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you are not a member');
    }

    const history: Array<{
      type: string;
      timestamp: Date;
      description: string;
      user: {
        id: string;
        email: string;
        profile: {
          displayName: string | null;
          avatarUrl: string | null;
        } | null;
      } | null;
    }> = [];

    // Group creation
    history.push({
      type: 'created',
      timestamp: group.createdAt,
      description: `Group "${group.name}" was created`,
      user: {
        id: group.User.id,
        email: group.User.email,
        profile: group.User.UserProfile,
      },
    });

    // Member additions (using createdAt from GroupMember)
    for (const member of group.GroupMember) {
      if (member.userId !== group.createdBy) {
        // Not the creator, so it was added later
        history.push({
          type: 'member_added',
          timestamp: member.createdAt,
          description: `${member.User.UserProfile?.displayName || member.User.email} was added to the group`,
          user: {
            id: member.User.id,
            email: member.User.email,
            profile: member.User.UserProfile,
          },
        });
      }
    }

    // Get expenses for this group
    const expenses = await this.prisma.expense.findMany({
      where: { groupId },
      select: {
        id: true,
        description: true,
        createdAt: true,
        createdBy: true,
        User_Expense_createdByToUser: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    for (const expense of expenses) {
      history.push({
        type: 'expense_created',
        timestamp: expense.createdAt,
        description: `Expense "${expense.description}" was added`,
        user: {
          id: expense.User_Expense_createdByToUser.id,
          email: expense.User_Expense_createdByToUser.email,
          profile: expense.User_Expense_createdByToUser.UserProfile,
        },
      });
    }

    // Get chores for this group
    const chores = await this.prisma.chore.findMany({
      where: { groupId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        createdBy: true,
        User_Chore_createdByToUser: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    for (const chore of chores) {
      history.push({
        type: 'chore_created',
        timestamp: chore.createdAt,
        description: `Chore "${chore.title}" was created`,
        user: {
          id: chore.User_Chore_createdByToUser.id,
          email: chore.User_Chore_createdByToUser.email,
          profile: chore.User_Chore_createdByToUser.UserProfile,
        },
      });
    }

    // Sort by timestamp
    history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return history;
  }
}

