import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChoreDto } from './dto/create-chore.dto';
import { UpdateChoreDto } from './dto/update-chore.dto';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationService } from '../notification/notification.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ChoreService {
  constructor(
    private prisma: PrismaService,
    private trustScoreService: TrustScoreService,
    private notificationService: NotificationService,
  ) {}

  async createChore(userId: string, createChoreDto: CreateChoreDto) {
    // If groupId is provided, verify user is member of group
    if (createChoreDto.groupId) {
      const group = await this.prisma.group.findFirst({
        where: {
          id: createChoreDto.groupId,
          GroupMember: {
            some: {
              userId,
            },
          },
        },
      });

      if (!group) {
        throw new BadRequestException('Group not found or you are not a member');
      }
    }

    // If assignedTo is provided, verify user exists and is in group (if groupId provided)
    if (createChoreDto.assignedTo) {
      const assignedUser = await this.prisma.user.findUnique({
        where: { id: createChoreDto.assignedTo },
      });

      if (!assignedUser) {
        throw new BadRequestException('Assigned user not found');
      }

      if (createChoreDto.groupId) {
        const isMember = await this.prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: createChoreDto.groupId,
              userId: createChoreDto.assignedTo,
            },
          },
        });

        if (!isMember) {
          throw new BadRequestException('Assigned user is not a member of the group');
        }
      }
    }

    const chore = await this.prisma.$transaction(async (tx) => {
      const newChore = await tx.chore.create({
        data: {
          id: randomUUID(),
          groupId: createChoreDto.groupId,
          createdBy: userId,
          title: createChoreDto.title,
          description: createChoreDto.description,
          points: createChoreDto.points || 10,
          status: createChoreDto.assignedTo ? 'assigned' : 'pending',
          assignedTo: createChoreDto.assignedTo,
          dueDate: createChoreDto.dueDate ? new Date(createChoreDto.dueDate) : null,
        },
      });

      // Create history entry for creation
      await tx.choreHistory.create({
        data: {
          id: randomUUID(),
          choreId: newChore.id,
          action: 'created',
          userId,
        },
      });

      return newChore;
    });

    // Fetch chore with relations
    const choreWithRelations = await this.prisma.chore.findUnique({
      where: { id: chore.id },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
          },
        },
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
        User_Chore_assignedToToUser: {
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

    if (!choreWithRelations) {
      throw new NotFoundException('Chore not found after creation');
    }

    // Notify assigned user if chore was created with assignment
    if (choreWithRelations.assignedTo && choreWithRelations.assignedTo !== userId) {
      const creatorName = choreWithRelations.User_Chore_createdByToUser.UserProfile?.displayName || choreWithRelations.User_Chore_createdByToUser.email;
      await this.notificationService.notifyChoreAssigned(
        choreWithRelations.assignedTo,
        choreWithRelations.id,
        choreWithRelations.title,
        creatorName,
      ).catch(err => {
        console.error(`Failed to create notification for assigned user:`, err);
      });
    }

    return choreWithRelations;
  }

  async getChores(userId: string, groupId?: string, limit: number = 50, offset: number = 0) {
    console.log('[ChoreService] Getting chores for user:', userId, 'groupId:', groupId);
    const where: any = {
      OR: [
        { createdBy: userId },
        { assignedTo: userId },
        {
          Group: {
            GroupMember: {
              some: {
                userId,
              },
            },
          },
        },
      ],
    };

    if (groupId) {
      where.groupId = groupId;
    }

    const [chores, total] = await Promise.all([
      this.prisma.chore.findMany({
        where,
      include: {
        Group: {
          select: {
            id: true,
            name: true,
          },
        },
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
        User_Chore_assignedToToUser: {
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
        ChoreCompletion: {
          orderBy: { completedAt: 'desc' },
          take: 1, // Latest completion
        },
      },
        orderBy: [
          { status: 'asc' }, // pending first, then assigned, then completed
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      this.prisma.chore.count({ where }),
    ]);

    console.log('[ChoreService] Found chores:', chores.length, 'for user:', userId);

    return {
      chores,
      total,
      limit,
      offset,
      hasMore: offset + chores.length < total,
    };
  }

  async getChoreById(userId: string, choreId: string) {
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        OR: [
          { createdBy: userId },
          { assignedTo: userId },
          {
            Group: {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
          },
        },
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
        User_Chore_assignedToToUser: {
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
        ChoreCompletion: {
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
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    if (!chore) {
      throw new NotFoundException('Chore not found');
    }

    return chore;
  }

  async assignChore(userId: string, choreId: string, assignToUserId: string) {
    // Verify chore exists and user has permission
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        OR: [
          { createdBy: userId },
          {
            Group: {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
    });

    if (!chore) {
      throw new NotFoundException('Chore not found or you do not have permission');
    }

    if (chore.status === 'completed') {
      throw new BadRequestException('Cannot assign a completed chore');
    }

    // Verify assigned user exists and is in group (if groupId provided)
    const assignedUser = await this.prisma.user.findUnique({
      where: { id: assignToUserId },
    });

    if (!assignedUser) {
      throw new BadRequestException('User not found');
    }

    if (chore.groupId) {
      const isMember = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: chore.groupId,
            userId: assignToUserId,
          },
        },
      });

      if (!isMember) {
        throw new BadRequestException('User is not a member of the group');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedChore = await tx.chore.update({
        where: { id: choreId },
        data: {
          assignedTo: assignToUserId,
          status: 'assigned',
        },
      });

      // Create history entry
      await tx.choreHistory.create({
          data: {
            id: randomUUID(),
            choreId,
            action: 'assigned',
            userId,
            changes: {
              before: { assignedTo: chore.assignedTo },
              after: { assignedTo: assignToUserId },
            },
          },
      });

      return updatedChore;
    });

    // Fetch updated chore with relations
    const updatedWithRelations = await this.prisma.chore.findUnique({
      where: { id: choreId },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
          },
        },
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
        User_Chore_assignedToToUser: {
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

    // Notify assigned user
    if (assignToUserId !== userId && updatedWithRelations) {
      const assignerName = updatedWithRelations.User_Chore_createdByToUser.UserProfile?.displayName || updatedWithRelations.User_Chore_createdByToUser.email;
      await this.notificationService.notifyChoreAssigned(
        assignToUserId,
        updatedWithRelations.id,
        updatedWithRelations.title,
        assignerName,
      ).catch(err => {
        console.error(`Failed to create notification for assigned user:`, err);
      });
    }

    return updatedWithRelations;
  }

  async grabChore(userId: string, choreId: string) {
    // Verify chore exists and is unassigned
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        status: 'pending',
        assignedTo: null,
        OR: [
          {
            Group: {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          },
          { groupId: null },
        ],
      },
    });

    if (!chore) {
      throw new NotFoundException('Chore not found or already assigned');
    }

    // Assign to user
    const updated = await this.prisma.chore.update({
      where: { id: choreId },
      data: {
        assignedTo: userId,
        status: 'assigned',
      },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
          },
        },
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
        User_Chore_assignedToToUser: {
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

    // Notify assigned user (grabChore assigns to self, so no notification needed)
    // This is handled in assignChore method

    return updated;
  }

  async completeChore(userId: string, choreId: string) {
    // Verify chore exists and is assigned to user
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        assignedTo: userId,
        status: 'assigned',
      },
    });

    if (!chore) {
      throw new NotFoundException('Chore not found or not assigned to you');
    }

    // Calculate points (base + 50% bonus if was unassigned when grabbed)
    // For now, we'll check if it was pending when assigned (simplified)
    // In a real system, we'd track if it was grabbed vs assigned
    const wasUnassigned = true; // Simplified - assume bonus for now if needed
    const bonusMultiplier = 1.5; // 50% bonus
    const pointsEarned = Math.round(chore.points * bonusMultiplier);

    // Check if completed on time
    const isOnTime = !chore.dueDate || new Date() <= new Date(chore.dueDate);

    // Create completion record and update chore in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const completion = await tx.choreCompletion.create({
        data: {
          id: randomUUID(),
          choreId,
          userId,
          pointsEarned,
          onTime: isOnTime,
        },
      });

      await tx.chore.update({
        where: { id: choreId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Create history entry for completion
      await tx.choreHistory.create({
        data: {
          id: randomUUID(),
          choreId,
          action: 'completed',
          userId,
          changes: {
            pointsEarned,
            onTime: isOnTime,
          },
        },
      });

      return completion;
    });

    // Update trust score (chore completion contributes to trust score)
    await this.trustScoreService.updateChoreScore(userId);

    // Return chore with completion info
    const updatedChore = await this.prisma.chore.findUnique({
      where: { id: choreId },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
          },
        },
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
        User_Chore_assignedToToUser: {
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
        ChoreCompletion: {
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
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    if (!updatedChore) {
      throw new NotFoundException('Chore not found after completion');
    }

    // Notify creator when chore is completed (if creator is different from completer)
    if (updatedChore.createdBy !== userId) {
      const completerName = updatedChore.User_Chore_assignedToToUser?.UserProfile?.displayName || updatedChore.User_Chore_assignedToToUser?.email || 'Someone';
      await this.notificationService.notifyChoreCompleted(
        updatedChore.createdBy,
        updatedChore.id,
        updatedChore.title,
        completerName,
      ).catch(err => {
        console.error(`Failed to create notification for chore creator:`, err);
      });
    }

    // Notify creator when chore is completed (if creator is different from completer)
    if (updatedChore && updatedChore.createdBy !== userId) {
      const completerName = updatedChore.User_Chore_assignedToToUser?.UserProfile?.displayName || updatedChore.User_Chore_assignedToToUser?.email || 'Someone';
      await this.notificationService.notifyChoreCompleted(
        updatedChore.createdBy,
        updatedChore.id,
        updatedChore.title,
        completerName,
      ).catch(err => {
        console.error(`Failed to create notification for chore creator:`, err);
      });
    }

    return {
      ...updatedChore,
      lastCompletion: result,
    };
  }

  async updateChore(userId: string, choreId: string, updateChoreDto: UpdateChoreDto) {
    // Verify chore exists and user has permission
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        OR: [
          { createdBy: userId },
          {
            Group: {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
      include: {
        User_Chore_assignedToToUser: {
          select: {
            id: true,
            email: true,
            UserProfile: { select: { displayName: true } },
          },
        },
      },
    });

    if (!chore) {
      throw new NotFoundException('Chore not found or you do not have permission');
    }

    if (chore.status === 'completed') {
      throw new BadRequestException('Cannot edit a completed chore');
    }

    // Track changes for history
    const changes: any = {};
    const oldValues: any = {};

    if (updateChoreDto.title !== undefined && updateChoreDto.title !== chore.title) {
      oldValues.title = chore.title;
      changes.title = updateChoreDto.title;
    }
    if (updateChoreDto.description !== undefined && updateChoreDto.description !== chore.description) {
      oldValues.description = chore.description;
      changes.description = updateChoreDto.description;
    }
    if (updateChoreDto.points !== undefined && updateChoreDto.points !== chore.points) {
      oldValues.points = chore.points;
      changes.points = updateChoreDto.points;
    }
    if (updateChoreDto.dueDate !== undefined) {
      const newDueDate = updateChoreDto.dueDate ? new Date(updateChoreDto.dueDate) : null;
      if (chore.dueDate?.getTime() !== newDueDate?.getTime()) {
        oldValues.dueDate = chore.dueDate;
        changes.dueDate = newDueDate;
      }
    }

    // Handle assignment change
    let assignmentChanged = false;
    if (updateChoreDto.assignedTo !== undefined) {
      const newAssignedTo = updateChoreDto.assignedTo || null;
      if (chore.assignedTo !== newAssignedTo) {
        oldValues.assignedTo = chore.assignedTo;
        changes.assignedTo = newAssignedTo;
        assignmentChanged = true;

        // Validate new assigned user if provided
        if (newAssignedTo) {
          const assignedUser = await this.prisma.user.findUnique({
            where: { id: newAssignedTo },
          });
          if (!assignedUser) {
            throw new BadRequestException('Assigned user not found');
          }

          if (chore.groupId) {
            const isMember = await this.prisma.groupMember.findUnique({
              where: {
                groupId_userId: {
                  groupId: chore.groupId,
                  userId: newAssignedTo,
                },
              },
            });
            if (!isMember) {
              throw new BadRequestException('Assigned user is not a member of the group');
            }
          }
        }
      }
    }

    // Build update data
    const updateData: any = {};
    if (updateChoreDto.title !== undefined) updateData.title = updateChoreDto.title;
    if (updateChoreDto.description !== undefined) updateData.description = updateChoreDto.description;
    if (updateChoreDto.points !== undefined) updateData.points = updateChoreDto.points;
    if (updateChoreDto.dueDate !== undefined) {
      updateData.dueDate = updateChoreDto.dueDate ? new Date(updateChoreDto.dueDate) : null;
    }
    if (updateChoreDto.assignedTo !== undefined) {
      updateData.assignedTo = updateChoreDto.assignedTo || null;
      updateData.status = updateChoreDto.assignedTo ? 'assigned' : 'pending';
    }

    // Update chore and create history in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedChore = await tx.chore.update({
        where: { id: choreId },
        data: updateData,
        include: {
          Group: {
            select: {
              id: true,
              name: true,
            },
          },
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
          User_Chore_assignedToToUser: {
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

      // Create history entry if there were changes
      if (Object.keys(changes).length > 0) {
        await tx.choreHistory.create({
          data: {
            id: randomUUID(),
            choreId,
            action: 'updated',
            userId,
            changes: {
              before: oldValues,
              after: changes,
            },
          },
        });
      }

      return updatedChore;
    });

    // Notify newly assigned user if assignment changed
    if (assignmentChanged && updateChoreDto.assignedTo && updateChoreDto.assignedTo !== userId) {
      const updaterName = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          UserProfile: { select: { displayName: true } },
        },
      });
      const updaterDisplayName = updaterName?.UserProfile?.displayName || updaterName?.email || 'Someone';
      
      await this.notificationService.notifyChoreAssigned(
        updateChoreDto.assignedTo,
        choreId,
        updated.title,
        updaterDisplayName,
      ).catch(err => {
        console.error(`Failed to create notification for assigned user:`, err);
      });
    }

    return updated;
  }

  async deleteChore(userId: string, choreId: string) {
    // Verify chore exists and user has permission (only creator can delete)
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        createdBy: userId,
      },
      include: {
        User_Chore_assignedToToUser: {
          select: {
            id: true,
            email: true,
            UserProfile: { select: { displayName: true } },
          },
        },
      },
    });

    if (!chore) {
      throw new NotFoundException('Chore not found or you do not have permission to delete it');
    }

    // Create history entry before deletion
    await this.prisma.choreHistory.create({
      data: {
        id: randomUUID(),
        choreId,
        action: 'deleted',
        userId,
        notes: `Chore "${chore.title}" was deleted`,
      },
    });

    // Delete chore (cascade will handle completions and history)
    await this.prisma.chore.delete({
      where: { id: choreId },
    });

    return { success: true, message: 'Chore deleted successfully' };
  }

  async unassignChore(userId: string, choreId: string) {
    // Verify chore exists and user has permission
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        OR: [
          { createdBy: userId },
          { assignedTo: userId },
          {
            Group: {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
    });

    if (!chore) {
      throw new NotFoundException('Chore not found or you do not have permission');
    }

    if (!chore.assignedTo) {
      throw new BadRequestException('Chore is not assigned');
    }

    if (chore.status === 'completed') {
      throw new BadRequestException('Cannot unassign a completed chore');
    }

    // Update chore and create history
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedChore = await tx.chore.update({
        where: { id: choreId },
        data: {
          assignedTo: null,
          status: 'pending',
        },
        include: {
          Group: {
            select: {
              id: true,
              name: true,
            },
          },
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
          User_Chore_assignedToToUser: {
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

      await tx.choreHistory.create({
        data: {
          id: randomUUID(),
          choreId,
          action: 'unassigned',
          userId,
          changes: {
            before: { assignedTo: chore.assignedTo },
            after: { assignedTo: null },
          },
        },
      });

      return updatedChore;
    });

    return updated;
  }

  async getGroupPointsLeaderboard(userId: string, groupId: string) {
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
      throw new NotFoundException('Group not found or you are not a member');
    }

    // Get all group members
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        User: {
          include: {
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

    // Get total points for each member from chore completions in this group
    const leaderboard = await Promise.all(
      members.map(async (member) => {
        const totalPoints = await this.prisma.choreCompletion.aggregate({
          where: {
            userId: member.userId,
            Chore: {
              groupId,
            },
          },
          _sum: {
            pointsEarned: true,
          },
        });

        return {
          userId: member.userId,
          displayName: member.User.UserProfile?.displayName || member.User.email.split('@')[0],
          avatarUrl: member.User.UserProfile?.avatarUrl || null,
          totalPoints: totalPoints._sum?.pointsEarned || 0,
          role: member.role,
        };
      }),
    );

    // Sort by points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add rank
    return leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  async getChoreHistory(userId: string, choreId: string) {
    // Verify chore exists and user has permission
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        OR: [
          { createdBy: userId },
          { assignedTo: userId },
          {
            Group: {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
    });

    if (!chore) {
      throw new NotFoundException('Chore not found or you do not have permission');
    }

    // Get history entries
    const history = await this.prisma.choreHistory.findMany({
      where: { choreId },
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
      orderBy: { createdAt: 'desc' },
    });

    // Get completion history
    const completions = await this.prisma.choreCompletion.findMany({
      where: { choreId },
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
      orderBy: { completedAt: 'desc' },
    });

    // Combine and format history
    const allHistory = [
      // Creation entry (from chore createdAt)
      {
        id: 'creation',
        action: 'created',
        userId: chore.createdBy,
        createdAt: chore.createdAt,
        user: null, // Will be populated below
      },
      // History entries
      ...history.map(h => ({
        id: h.id,
        action: h.action,
        userId: h.userId,
        createdAt: h.createdAt,
        changes: h.changes,
        notes: h.notes,
        user: h.User,
      })),
      // Completion entries
      ...completions.map(c => ({
        id: c.id,
        action: 'completed',
        userId: c.userId,
        createdAt: c.completedAt,
        pointsEarned: c.pointsEarned,
        onTime: c.onTime,
        user: c.User,
      })),
    ];

    // Fetch creator info for creation entry
    const creator = await this.prisma.user.findUnique({
      where: { id: chore.createdBy },
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
    });

    // Update creation entry with creator info
    const creationEntry = allHistory.find(e => e.id === 'creation');
    if (creationEntry) {
      creationEntry.user = creator;
    }

    // Sort by date (most recent first)
    allHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allHistory;
  }
}

