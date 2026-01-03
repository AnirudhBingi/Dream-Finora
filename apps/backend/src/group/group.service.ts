import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../shared/currency.service';
import { NotificationService } from '../notification/notification.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupService {
  constructor(
    private prisma: PrismaService,
    private currencyService: CurrencyService,
    private notificationService: NotificationService,
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
        name: createGroupDto.name,
        description: createGroupDto.description,
        createdBy: userId,
        members: {
          create: allMemberIds.map((memberId) => ({
            userId: memberId,
            role: memberId === userId ? 'ADMIN' : 'MEMBER', // Creator is ADMIN, others are MEMBER
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
            profile: {
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

  async getGroups(userId: string) {
    // Get all groups where user is a member
    const groups = await this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            expenses: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return groups;
  }

  async getGroupById(userId: string, groupId: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        expenses: {
          include: {
            splits: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: {
                      select: {
                        displayName: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
              },
            },
            createdByUser: {
              select: {
                id: true,
                email: true,
                profile: {
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
        members: {
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
        groupId,
        userId: memberId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
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

  async removeMember(userId: string, groupId: string, memberId: string) {
    // Verify user has permission (must be member of group)
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        members: {
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
          profile: { select: { displayName: true } },
        },
      });
      const removerDisplayName = removerName?.profile?.displayName || removerName?.email || 'Someone';
      
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
        members: {
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
        expense: {
          groupId,
        },
        userId,
        isPaid: false,
      },
      include: {
        expense: {
          include: {
            createdByUser: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            paidByUser: {
              select: {
                id: true,
                email: true,
                profile: {
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
        expense: {
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
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        expense: {
          include: {
            paidByUser: {
              select: {
                id: true,
                email: true,
                profile: {
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
          const expenseCurrency = split.expense.currency || 'USD';
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
        const payerId = split.expense.paidBy || split.expense.createdBy;
        return payerId !== userId; // Skip if user owes themselves
      })
      .reduce((sum, split) => sum + split.convertedAmount, 0);
    const totalOwedToUser = convertedOwedToUser.reduce((sum, split) => sum + split.convertedAmount, 0);
    const netBalance = totalOwedToUser - totalOwed;

    // Group by user (exclude cases where user owes themselves)
    const owedByUser = new Map<string, { user: any; amount: number; originalAmount: number; originalCurrency: string; splits: any[] }>();
    convertedOwedSplits.forEach((split) => {
      // Use paidBy if available, otherwise fallback to createdBy for backward compatibility
      const creditorId = split.expense.paidBy || split.expense.createdBy;
      // Skip if user owes themselves
      if (creditorId === userId) {
        return;
      }
      if (!owedByUser.has(creditorId)) {
        // Use paidByUser if available, otherwise use createdByUser
        const creditorUser = split.expense.paidByUser || split.expense.createdByUser;
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
          user: split.user,
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
        members: {
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
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
            profile: {
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
        members: {
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
        members: {
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
        user: {
          select: {
            id: true,
            email: true,
            profile: {
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
        members: {
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
    if (group.members.length === 0) {
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
        members: {
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
}

