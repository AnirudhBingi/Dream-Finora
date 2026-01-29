import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ChoreAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChoreDto } from './dto/create-chore.dto';
import { UpdateChoreDto } from './dto/update-chore.dto';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationService } from '../notification/notification.service';
import { ChoreReminderService } from './chore-reminder.service';
import { ChorePointsService } from './chore-points.service';
import { RecurringChoreService } from './recurring-chore.service';
import { ChoreRotationService } from './chore-rotation.service';
import { randomUUID } from 'crypto';
import { NotificationType } from '../notification/notification.service';

type UserWithProfile = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    UserProfile: {
      select: {
        displayName: true;
        avatarUrl: true;
      };
    };
  };
}>;

type ChoreAssignmentWithUser = Prisma.ChoreAssignmentGetPayload<{
  include: {
    User: {
      select: {
        id: true;
        email: true;
        UserProfile: {
          select: {
            displayName: true;
            avatarUrl: true;
          };
        };
      };
    };
  };
}>;

type ChoreCompletionWithUser = Prisma.ChoreCompletionGetPayload<{
  include: {
    User: {
      select: {
        id: true;
        email: true;
        UserProfile: {
          select: {
            displayName: true;
            avatarUrl: true;
          };
        };
      };
    };
  };
}>;

type ChoreRotationWithUser = Prisma.ChoreRotationGetPayload<{
  include: {
    User: {
      select: {
        id: true;
        email: true;
        UserProfile: {
          select: {
            displayName: true;
            avatarUrl: true;
          };
        };
      };
    };
  };
}>;

type ChoreWithRelations = Prisma.ChoreGetPayload<Prisma.ChoreDefaultArgs> & {
  Group?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  User_Chore_createdByToUser?: {
    id: string;
    email: string;
    UserProfile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
  User_Chore_assignedToToUser?: {
    id: string;
    email: string;
    UserProfile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
  User_Chore_friendIdToUser?: {
    id: string;
    email: string;
    UserProfile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
  ChoreCompletion?: ChoreCompletionWithUser[];
  ChoreAssignment?: ChoreAssignmentWithUser[];
  ChoreRotation?: ChoreRotationWithUser[];
};

@Injectable()
export class ChoreService {
  constructor(
    private prisma: PrismaService,
    private trustScoreService: TrustScoreService,
    private notificationService: NotificationService,
    private choreReminderService: ChoreReminderService,
    private chorePointsService: ChorePointsService,
    private recurringChoreService: RecurringChoreService,
    private choreRotationService: ChoreRotationService,
  ) {}

  private transformChore(chore: ChoreWithRelations) {
    const {
      User_Chore_createdByToUser,
      User_Chore_assignedToToUser,
      User_Chore_friendIdToUser,
      Group,
      ChoreCompletion,
      ChoreAssignment,
      ChoreRotation,
      ...choreBase
    } = chore;

    return {
      ...choreBase,
      createdAt: chore.createdAt?.toISOString(),
      dueDate: chore.dueDate?.toISOString() || null,
      completedAt: chore.completedAt?.toISOString() || null,
      group: Group
        ? {
            id: Group.id,
            name: Group.name,
            avatarUrl: Group.avatarUrl,
          }
        : null,
      friendUser: User_Chore_friendIdToUser
        ? {
            id: User_Chore_friendIdToUser.id,
            email: User_Chore_friendIdToUser.email,
            profile: User_Chore_friendIdToUser.UserProfile
              ? {
                  displayName:
                    User_Chore_friendIdToUser.UserProfile.displayName,
                  avatarUrl: User_Chore_friendIdToUser.UserProfile.avatarUrl,
                }
              : null,
          }
        : null,
      createdByUser: User_Chore_createdByToUser
        ? {
            id: User_Chore_createdByToUser.id,
            email: User_Chore_createdByToUser.email,
            profile: User_Chore_createdByToUser.UserProfile
              ? {
                  displayName:
                    User_Chore_createdByToUser.UserProfile.displayName,
                  avatarUrl: User_Chore_createdByToUser.UserProfile.avatarUrl,
                }
              : null,
          }
        : {
            id: chore.createdBy || '',
            email: 'Unknown',
            profile: null,
          },
      assignedToUser: User_Chore_assignedToToUser
        ? {
            id: User_Chore_assignedToToUser.id,
            email: User_Chore_assignedToToUser.email,
            profile: User_Chore_assignedToToUser.UserProfile
              ? {
                  displayName:
                    User_Chore_assignedToToUser.UserProfile.displayName,
                  avatarUrl: User_Chore_assignedToToUser.UserProfile.avatarUrl,
                }
              : null,
          }
        : null,
      assignments: (ChoreAssignment || []).map(
        (assignment: ChoreAssignmentWithUser) => ({
          id: assignment.id,
          choreId: assignment.choreId,
          userId: assignment.userId,
          assignedAt: assignment.assignedAt?.toISOString(),
          completedAt: assignment.completedAt?.toISOString() || null,
          pointsEarned: assignment.pointsEarned || null,
          onTime: assignment.onTime || null,
          user: assignment.User
            ? {
                id: assignment.User.id,
                email: assignment.User.email,
                profile: assignment.User.UserProfile
                  ? {
                      displayName: assignment.User.UserProfile.displayName,
                      avatarUrl: assignment.User.UserProfile.avatarUrl,
                    }
                  : null,
              }
            : null,
        }),
      ),
      completions: (ChoreCompletion || []).map(
        (completion: ChoreCompletionWithUser) => ({
          id: completion.id,
          choreId: completion.choreId,
          userId: completion.userId,
          completedAt: completion.completedAt?.toISOString(),
          pointsEarned: completion.pointsEarned,
          onTime: completion.onTime,
          user: completion.User
            ? {
                id: completion.User.id,
                email: completion.User.email,
                profile: completion.User.UserProfile
                  ? {
                      displayName: completion.User.UserProfile.displayName,
                      avatarUrl: completion.User.UserProfile.avatarUrl,
                    }
                  : null,
              }
            : null,
        }),
      ),
      // Recurring fields
      isRecurring: chore.isRecurring ?? false,
      recurrencePattern: chore.recurrencePattern,
      recurrenceConfig: chore.recurrenceConfig,
      parentChoreId: chore.parentChoreId,
      nextOccurrenceDate: chore.nextOccurrenceDate?.toISOString(),
      recurrenceEndDate: chore.recurrenceEndDate?.toISOString(),
      recurrenceCount: chore.recurrenceCount,
      occurrencesGenerated: chore.occurrencesGenerated ?? 0,
      // Rotation fields
      rotationEnabled: chore.rotationEnabled ?? false,
      rotationType: chore.rotationType,
      rotation: (ChoreRotation || []).map(
        (rotation: ChoreRotationWithUser) => ({
          id: rotation.id,
          userId: rotation.userId,
          rotationOrder: rotation.rotationOrder,
          lastAssignedAt: rotation.lastAssignedAt?.toISOString() || null,
          skipUntil: rotation.skipUntil?.toISOString() || null,
          user: rotation.User
            ? {
                id: rotation.User.id,
                email: rotation.User.email,
                profile: rotation.User.UserProfile
                  ? {
                      displayName: rotation.User.UserProfile.displayName,
                      avatarUrl: rotation.User.UserProfile.avatarUrl,
                    }
                  : null,
              }
            : null,
        }),
      ),
    };
  }

  async createChore(userId: string, createChoreDto: CreateChoreDto) {
    // Validate: Cannot have both groupId and friendId
    if (createChoreDto.groupId && createChoreDto.friendId) {
      throw new BadRequestException(
        'Cannot assign chore to both group and friend',
      );
    }

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
        throw new BadRequestException(
          'Group not found or you are not a member',
        );
      }
    }

    // If friendId is provided, verify friendship exists
    if (createChoreDto.friendId) {
      const friendship = await this.prisma.friend.findFirst({
        where: {
          OR: [
            { userId, friendId: createChoreDto.friendId, status: 'accepted' },
            {
              userId: createChoreDto.friendId,
              friendId: userId,
              status: 'accepted',
            },
          ],
        },
      });

      if (!friendship) {
        throw new BadRequestException(
          'Friend not found or friendship not accepted',
        );
      }
    }

    // Determine assignment type
    // IMPORTANT: If rotation is enabled, use 'single' assignment type
    // Rotation tasks assign to ONE person per occurrence, not multiple
    // The rotation members are stored in ChoreRotation, not ChoreAssignment
    let assignmentType = createChoreDto.assignmentType;
    if (!assignmentType) {
      if (createChoreDto.rotationEnabled) {
        // Rotation enabled: use 'single' even if multiple members selected
        // Rotation members will be stored in ChoreRotation
        assignmentType = createChoreDto.assignedTo ? 'single' : 'open';
      } else {
        // No rotation: normal assignment type logic
        assignmentType =
          createChoreDto.assignedToMultiple &&
          createChoreDto.assignedToMultiple.length > 0
            ? 'multiple'
            : createChoreDto.assignedTo
              ? 'single'
              : 'open';
      }
    }

    // Validate multiple assignments (only if rotation is NOT enabled)
    if (
      assignmentType === 'multiple' &&
      createChoreDto.assignedToMultiple &&
      !createChoreDto.rotationEnabled
    ) {
      if (createChoreDto.assignedToMultiple.length === 0) {
        throw new BadRequestException(
          'Multiple assignment requires at least one user',
        );
      }

      // Verify all users exist and are in group (if groupId provided)
      for (const assigneeId of createChoreDto.assignedToMultiple) {
        const assignedUser = await this.prisma.user.findUnique({
          where: { id: assigneeId },
        });

        if (!assignedUser) {
          throw new BadRequestException(
            `Assigned user ${assigneeId} not found`,
          );
        }

        if (createChoreDto.groupId) {
          const isMember = await this.prisma.groupMember.findUnique({
            where: {
              groupId_userId: {
                groupId: createChoreDto.groupId,
                userId: assigneeId,
              },
            },
          });

          if (!isMember) {
            throw new BadRequestException(
              `User ${assigneeId} is not a member of the group`,
            );
          }
        }
      }
    }

    // Validate single assignment
    if (assignmentType === 'single' && createChoreDto.assignedTo) {
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
          throw new BadRequestException(
            'Assigned user is not a member of the group',
          );
        }
      }
    }

    const chore = await this.prisma.$transaction(async (tx) => {
      // Calculate points automatically based on category, title, and description
      // Only use manual points if explicitly provided (for admin overrides)
      const calculatedPoints = createChoreDto.points
        ? createChoreDto.points
        : this.chorePointsService.calculatePoints(
            createChoreDto.category,
            createChoreDto.title,
            createChoreDto.description,
          );

      // Handle recurring chore setup
      const isRecurring = createChoreDto.isRecurring || false;
      let nextOccurrenceDate: Date | null = null;

      if (isRecurring && createChoreDto.recurrencePattern) {
        const dueDate = createChoreDto.dueDate
          ? new Date(createChoreDto.dueDate)
          : new Date();
        nextOccurrenceDate = this.recurringChoreService.calculateNextOccurrence(
          createChoreDto.recurrencePattern,
          createChoreDto.recurrenceConfig || null,
          dueDate,
          dueDate,
        );
      }

      const newChore = await tx.chore.create({
        data: {
          id: randomUUID(),
          groupId: createChoreDto.groupId,
          friendId: createChoreDto.friendId,
          createdBy: userId,
          title: createChoreDto.title,
          description: createChoreDto.description,
          category: createChoreDto.category,
          points: calculatedPoints,
          assignmentType,
          status:
            (assignmentType === 'single' && createChoreDto.assignedTo) ||
            (assignmentType === 'multiple' &&
              createChoreDto.assignedToMultiple &&
              createChoreDto.assignedToMultiple.length > 0)
              ? 'assigned'
              : 'pending',
          assignedTo:
            assignmentType === 'single' ? createChoreDto.assignedTo : null,
          dueDate: createChoreDto.dueDate
            ? new Date(createChoreDto.dueDate)
            : null,
          reminderEnabled:
            createChoreDto.reminderEnabled !== undefined
              ? createChoreDto.reminderEnabled
              : createChoreDto.reminderHoursBefore !== undefined &&
                createChoreDto.reminderHoursBefore > 0,
          reminderHoursBefore: createChoreDto.reminderHoursBefore || null,
          // Recurring fields
          isRecurring,
          recurrencePattern: createChoreDto.recurrencePattern || null,
          recurrenceConfig: createChoreDto.recurrenceConfig ?? Prisma.JsonNull,
          recurrenceEndDate: createChoreDto.recurrenceEndDate
            ? new Date(createChoreDto.recurrenceEndDate)
            : null,
          recurrenceCount: createChoreDto.recurrenceCount || null,
          nextOccurrenceDate,
          occurrencesGenerated: 0,
          // Rotation fields
          rotationEnabled: createChoreDto.rotationEnabled || false,
          rotationType: createChoreDto.rotationType || null,
        },
      });

      // Create multiple assignments if needed
      // IMPORTANT: Don't create ChoreAssignment if rotation is enabled
      // Rotation members are stored in ChoreRotation, and each occurrence is assigned to ONE person
      if (
        assignmentType === 'multiple' &&
        createChoreDto.assignedToMultiple &&
        !createChoreDto.rotationEnabled
      ) {
        for (const assigneeId of createChoreDto.assignedToMultiple) {
          await tx.choreAssignment.create({
            data: {
              id: randomUUID(),
              choreId: newChore.id,
              userId: assigneeId,
            },
          });
        }
      }

      // Create history entry for creation
      await tx.choreHistory.create({
        data: {
          id: randomUUID(),
          choreId: newChore.id,
          action: 'created',
          userId,
          changes: {
            assignmentType,
            assignedToMultiple: createChoreDto.assignedToMultiple || [],
          },
        },
      });

      return newChore;
    });

    // Initialize rotation if enabled
    // IMPORTANT: Rotation only works with recurring tasks
    // For one-time tasks, rotation doesn't make sense (there's only one occurrence)
    if (
      createChoreDto.rotationEnabled &&
      createChoreDto.groupId &&
      createChoreDto.rotationType
    ) {
      // Validate that rotation is only enabled for recurring tasks
      if (!createChoreDto.isRecurring || !createChoreDto.recurrencePattern) {
        console.warn(
          `Rotation enabled for non-recurring task ${chore.id}. Rotation only works with recurring tasks.`,
        );
        // Don't initialize rotation for non-recurring tasks
        // The UI should prevent this, but we handle it gracefully here
      } else {
        try {
          // Determine which users should be in rotation
          // Priority: assignedToMultiple > assignedTo (single) > all group members
          let rotationUserIds: string[] | undefined;

          if (
            createChoreDto.assignedToMultiple &&
            createChoreDto.assignedToMultiple.length > 0
          ) {
            // Use selected members from multiple assignment
            rotationUserIds = createChoreDto.assignedToMultiple;
          } else if (createChoreDto.assignedTo) {
            // For single assignment, still need to initialize with that user
            // But rotation with one person doesn't make sense, so we'll include all group members
            // Actually, if single assignment, rotation should include all group members
            rotationUserIds = undefined; // Will use all group members
          }
          // If open assignment, rotation will include all group members

          await this.choreRotationService.initializeRotation(
            chore.id,
            createChoreDto.groupId,
            rotationUserIds, // Pass selected members if available
          );

          // For recurring tasks with rotation, the first occurrence will be assigned when it's generated
          // Don't assign the parent chore itself - it's just a template
          // The actual assignments happen in RecurringChoreService.generateNextOccurrence
        } catch (error) {
          // Log error but don't fail chore creation
          console.error(
            `Failed to initialize rotation for chore ${chore.id}:`,
            error,
          );
        }
      }
    }

    // Fetch chore with relations
    const choreWithRelations = await this.prisma.chore.findUnique({
      where: { id: chore.id },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
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
        User_Chore_friendIdToUser: {
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
        ChoreAssignment: {
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
        ChoreRotation: {
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
          orderBy: { rotationOrder: 'asc' },
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

    if (!choreWithRelations) {
      throw new NotFoundException('Chore not found after creation');
    }

    // Notify assigned users
    const creatorName =
      choreWithRelations.User_Chore_createdByToUser.UserProfile?.displayName ||
      choreWithRelations.User_Chore_createdByToUser.email;
    const groupName = choreWithRelations.Group?.name;

    // Single assignment notification
    if (
      choreWithRelations.assignedTo &&
      choreWithRelations.assignedTo !== userId
    ) {
      await this.notificationService
        .notifyChoreAssigned(
          choreWithRelations.assignedTo,
          choreWithRelations.id,
          choreWithRelations.title,
          creatorName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for assigned user:`,
            err,
          );
        });
    }

    // Multiple assignment notifications
    if (
      choreWithRelations.ChoreAssignment &&
      choreWithRelations.ChoreAssignment.length > 0
    ) {
      for (const assignment of choreWithRelations.ChoreAssignment) {
        if (assignment.userId !== userId) {
          await this.notificationService
            .notifyChoreAssigned(
              assignment.userId,
              choreWithRelations.id,
              choreWithRelations.title,
              creatorName,
            )
            .catch((err) => {
              console.error(
                `Failed to create notification for assigned user ${assignment.userId}:`,
                err,
              );
            });
        }
      }
    }

    // Notify all group members about new chore (if in a group and open/unassigned)
    if (
      choreWithRelations.groupId &&
      (choreWithRelations.status === 'pending' ||
        !choreWithRelations.assignedTo)
    ) {
      const groupMembers = await this.prisma.groupMember.findMany({
        where: { groupId: choreWithRelations.groupId },
        select: { userId: true },
      });

      for (const member of groupMembers) {
        if (member.userId !== userId) {
          await this.notificationService
            .notifyChoreCreated(
              member.userId,
              choreWithRelations.id,
              choreWithRelations.title,
              creatorName,
              groupName,
            )
            .catch((err) => {
              console.error(
                `Failed to create notification for group member ${member.userId}:`,
                err,
              );
            });
        }
      }
    }

    return this.transformChore(choreWithRelations);
  }

  async getChores(
    userId: string,
    groupId?: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    console.log(
      '[ChoreService] Getting chores for user:',
      userId,
      'groupId:',
      groupId,
    );
    const where: Prisma.ChoreWhereInput = {
      OR: [
        { createdBy: userId },
        { assignedTo: userId },
        { friendId: userId }, // Friend-to-friend chores
        {
          Group: {
            GroupMember: {
              some: {
                userId,
              },
            },
          },
        },
        {
          ChoreAssignment: {
            some: {
              userId,
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
              avatarUrl: true,
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
          User_Chore_friendIdToUser: {
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
          ChoreAssignment: {
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
          ChoreRotation: {
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
            orderBy: { rotationOrder: 'asc' },
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
            take: 1, // Latest completion
          },
        },
        orderBy: [
          { status: 'asc' }, // pending first, then assigned, then completed, then cancelled
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      this.prisma.chore.count({ where }),
    ]);

    console.log(
      '[ChoreService] Found chores:',
      chores.length,
      'for user:',
      userId,
    );

    const transformedChores = chores.map((chore) => this.transformChore(chore));

    return {
      chores: transformedChores,
      total,
      limit,
      offset,
      hasMore: offset + chores.length < total,
    };
  }

  async getChoreById(userId: string, choreId: string) {
    const chore = await this.prisma.chore.findUnique({
      where: { id: choreId },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
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
        User_Chore_friendIdToUser: {
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
        ChoreAssignment: {
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
        ChoreRotation: {
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
          orderBy: { rotationOrder: 'asc' },
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

    const isCreator = chore.createdBy === userId;
    const isAssignedToMe = chore.assignedTo === userId;
    const isFriendChore = chore.friendId === userId;
    const hasAssignment =
      chore.ChoreAssignment?.some(
        (assignment) => assignment.userId === userId,
      ) || false;
    const isGroupMember = chore.groupId
      ? await this.prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: chore.groupId,
              userId,
            },
          },
        })
      : null;

    if (
      !isCreator &&
      !isAssignedToMe &&
      !isFriendChore &&
      !hasAssignment &&
      !isGroupMember
    ) {
      throw new NotFoundException(
        'Chore not found or you do not have permission',
      );
    }

    return this.transformChore(chore);
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
      throw new NotFoundException(
        'Chore not found or you do not have permission',
      );
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

    await this.prisma.$transaction(async (tx) => {
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
            avatarUrl: true,
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
      const assignerName =
        updatedWithRelations.User_Chore_createdByToUser.UserProfile
          ?.displayName ||
        updatedWithRelations.User_Chore_createdByToUser.email;
      await this.notificationService
        .notifyChoreAssigned(
          assignToUserId,
          updatedWithRelations.id,
          updatedWithRelations.title,
          assignerName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for assigned user:`,
            err,
          );
        });
    }

    return updatedWithRelations
      ? this.transformChore(updatedWithRelations)
      : null;
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
            avatarUrl: true,
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

    // Notify creator that someone grabbed the chore
    const creatorName =
      updated.User_Chore_assignedToToUser?.UserProfile?.displayName ||
      updated.User_Chore_assignedToToUser?.email ||
      'Someone';
    if (updated.createdBy && updated.createdBy !== userId) {
      await this.notificationService
        .notifyChoreAssigned(
          updated.createdBy,
          updated.id,
          updated.title,
          creatorName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for chore creator:`,
            err,
          );
        });
    }

    return this.transformChore(updated);
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

    // Check if this was an unassigned chore that was grabbed (for bonus)
    // We check if assignment type was 'open' which indicates it was claimable
    const wasUnassigned = chore.assignmentType === 'open';

    // IMPORTANT: For rotation tasks, each occurrence is assigned to ONE person
    // So they get FULL points (not divided)
    // This is correct because rotation tasks use 'single' assignmentType
    // and are completed via completeChore (not completeChoreAssignment)

    // Calculate points using enhanced calculation (includes streak, category bonuses, late penalties)
    const completedAt = new Date();
    const pointsCalculation =
      await this.chorePointsService.calculatePointsEarned(
        userId,
        chore.points, // Full points for single assignment (including rotation tasks)
        chore.category,
        chore.dueDate ? new Date(chore.dueDate) : null,
        completedAt,
        wasUnassigned,
      );

    const pointsEarned = pointsCalculation.pointsEarned;

    // Check if completed on time
    const isOnTime = !chore.dueDate || completedAt <= new Date(chore.dueDate);

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

    // Cancel reminders since chore is completed
    await this.choreReminderService.cancelReminders(choreId).catch((err) => {
      console.error(`Failed to cancel reminders for chore ${choreId}:`, err);
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
            avatarUrl: true,
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

    const transformedChore = this.transformChore(updatedChore);

    // Notify creator when chore is completed (if creator is different from completer)
    if (updatedChore.createdBy !== userId) {
      const completerName =
        updatedChore.User_Chore_assignedToToUser?.UserProfile?.displayName ||
        updatedChore.User_Chore_assignedToToUser?.email ||
        'Someone';
      await this.notificationService
        .notifyChoreCompleted(
          updatedChore.createdBy,
          updatedChore.id,
          updatedChore.title,
          completerName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for chore creator:`,
            err,
          );
        });
    }

    // Notify creator when chore is completed (if creator is different from completer)
    if (updatedChore && updatedChore.createdBy !== userId) {
      const completerName =
        updatedChore.User_Chore_assignedToToUser?.UserProfile?.displayName ||
        updatedChore.User_Chore_assignedToToUser?.email ||
        'Someone';
      await this.notificationService
        .notifyChoreCompleted(
          updatedChore.createdBy,
          updatedChore.id,
          updatedChore.title,
          completerName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for chore creator:`,
            err,
          );
        });
    }

    return {
      ...transformedChore,
      lastCompletion: {
        ...result,
        completedAt: result.completedAt?.toISOString(),
      },
    };
  }

  async updateChore(
    userId: string,
    choreId: string,
    updateChoreDto: UpdateChoreDto,
  ) {
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
      throw new NotFoundException(
        'Chore not found or you do not have permission',
      );
    }

    if (chore.status === 'completed' || chore.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot edit a completed or cancelled chore',
      );
    }

    // Track changes for history
    const changes: Record<string, unknown> = {};
    const oldValues: Record<string, unknown> = {};

    if (
      updateChoreDto.title !== undefined &&
      updateChoreDto.title !== chore.title
    ) {
      oldValues.title = chore.title;
      changes.title = updateChoreDto.title;
    }
    if (
      updateChoreDto.description !== undefined &&
      updateChoreDto.description !== chore.description
    ) {
      oldValues.description = chore.description;
      changes.description = updateChoreDto.description;
    }
    // Handle points changes (manual or auto-calculated)
    if (
      updateChoreDto.points !== undefined &&
      updateChoreDto.points !== chore.points
    ) {
      oldValues.points = chore.points;
      changes.points = updateChoreDto.points;
    } else if (
      updateChoreDto.title !== undefined ||
      updateChoreDto.description !== undefined ||
      updateChoreDto.category !== undefined
    ) {
      // Auto-calculate points if title/description/category changed
      const finalTitle =
        updateChoreDto.title !== undefined ? updateChoreDto.title : chore.title;
      const finalDescription =
        updateChoreDto.description !== undefined
          ? updateChoreDto.description
          : chore.description;
      const finalCategory =
        updateChoreDto.category !== undefined
          ? updateChoreDto.category
          : chore.category;
      const calculatedPoints = this.chorePointsService.calculatePoints(
        finalCategory,
        finalTitle,
        finalDescription,
      );
      if (calculatedPoints !== chore.points) {
        oldValues.points = chore.points;
        changes.points = calculatedPoints;
      }
    }
    if (updateChoreDto.dueDate !== undefined) {
      const newDueDate = updateChoreDto.dueDate
        ? new Date(updateChoreDto.dueDate)
        : null;
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
              throw new BadRequestException(
                'Assigned user is not a member of the group',
              );
            }
          }
        }
      }
    }

    // Build update data
    const updateData: Prisma.ChoreUncheckedUpdateInput = {};
    if (updateChoreDto.title !== undefined)
      updateData.title = updateChoreDto.title;
    if (updateChoreDto.description !== undefined)
      updateData.description = updateChoreDto.description;

    // Auto-calculate points if not explicitly provided and title/description/category changed
    if (updateChoreDto.points !== undefined) {
      updateData.points = updateChoreDto.points;
    } else if (
      updateChoreDto.title !== undefined ||
      updateChoreDto.description !== undefined ||
      updateChoreDto.category !== undefined
    ) {
      // Recalculate points based on updated title/description/category
      const finalTitle =
        updateChoreDto.title !== undefined ? updateChoreDto.title : chore.title;
      const finalDescription =
        updateChoreDto.description !== undefined
          ? updateChoreDto.description
          : chore.description;
      const finalCategory =
        updateChoreDto.category !== undefined
          ? updateChoreDto.category
          : chore.category;
      updateData.points = this.chorePointsService.calculatePoints(
        finalCategory,
        finalTitle,
        finalDescription,
      );
    }
    if (updateChoreDto.dueDate !== undefined) {
      updateData.dueDate = updateChoreDto.dueDate
        ? new Date(updateChoreDto.dueDate)
        : null;
    }
    if (updateChoreDto.reminderHoursBefore !== undefined) {
      updateData.reminderEnabled = updateChoreDto.reminderHoursBefore > 0;
      updateData.reminderHoursBefore =
        updateChoreDto.reminderHoursBefore > 0
          ? updateChoreDto.reminderHoursBefore
          : null;
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
              avatarUrl: true,
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
            } as Prisma.InputJsonValue,
          },
        });
      }

      return updatedChore;
    });

    // Notify newly assigned user if assignment changed
    if (
      assignmentChanged &&
      updateChoreDto.assignedTo &&
      updateChoreDto.assignedTo !== userId
    ) {
      const updaterName = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          UserProfile: { select: { displayName: true } },
        },
      });
      const updaterDisplayName =
        updaterName?.UserProfile?.displayName ||
        updaterName?.email ||
        'Someone';

      await this.notificationService
        .notifyChoreAssigned(
          updateChoreDto.assignedTo,
          choreId,
          updated.title,
          updaterDisplayName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for assigned user:`,
            err,
          );
        });
    }

    // Notify assigned user if chore was updated (and they're different from updater)
    const updaterName =
      updated.User_Chore_createdByToUser?.UserProfile?.displayName ||
      updated.User_Chore_createdByToUser?.email ||
      'Someone';
    if (
      updated.assignedTo &&
      updated.assignedTo !== userId &&
      Object.keys(changes).length > 0 &&
      !assignmentChanged
    ) {
      await this.notificationService
        .notifyChoreUpdated(
          updated.assignedTo,
          updated.id,
          updated.title,
          updaterName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for assigned user:`,
            err,
          );
        });
    }

    // Update reminders if due date or reminder settings changed
    if (
      (updateChoreDto.dueDate !== undefined ||
        updateChoreDto.reminderHoursBefore !== undefined) &&
      updated.dueDate
    ) {
      const userIds: string[] = [];
      if (updated.assignedTo) {
        userIds.push(updated.assignedTo);
      }
      // Get assignments if multiple
      const assignments = await this.prisma.choreAssignment.findMany({
        where: { choreId: updated.id },
        select: { userId: true },
      });
      assignments.forEach((assignment) => {
        if (!userIds.includes(assignment.userId)) {
          userIds.push(assignment.userId);
        }
      });

      if (
        userIds.length > 0 &&
        updated.reminderEnabled &&
        updated.reminderHoursBefore
      ) {
        await this.choreReminderService
          .scheduleReminders(
            updated.id,
            new Date(updated.dueDate),
            updated.reminderHoursBefore,
            userIds,
          )
          .catch((err) => {
            console.error(
              `Failed to update reminders for chore ${updated.id}:`,
              err,
            );
          });
      } else {
        // Cancel reminders if disabled
        await this.choreReminderService
          .cancelReminders(updated.id)
          .catch((err) => {
            console.error(
              `Failed to cancel reminders for chore ${updated.id}:`,
              err,
            );
          });
      }
    }

    return this.transformChore(updated);
  }

  /**
   * Cancel a chore (marks as cancelled but keeps history)
   */
  async cancelChore(userId: string, choreId: string) {
    // Verify chore exists and user has permission (creator, assigned user, or group admin)
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        status: {
          not: 'completed',
        },
      },
      include: {
        Group: {
          include: {
            GroupMember: {
              where: {
                userId,
              },
              select: {
                role: true,
              },
            },
          },
        },
        User_Chore_createdByToUser: {
          select: {
            id: true,
            email: true,
            UserProfile: { select: { displayName: true } },
          },
        },
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
      throw new NotFoundException('Chore not found or already completed');
    }

    // Check permissions: creator, assigned user, or group admin
    const isCreator = chore.createdBy === userId;
    const isAssigned = chore.assignedTo === userId;
    const isGroupAdmin = chore.Group?.GroupMember?.[0]?.role === 'ADMIN';

    if (!isCreator && !isAssigned && !isGroupAdmin) {
      throw new NotFoundException(
        'You do not have permission to cancel this chore',
      );
    }

    // Update chore and create history
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedChore = await tx.chore.update({
        where: { id: choreId },
        data: {
          status: 'cancelled',
        },
        include: {
          Group: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
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
          action: 'cancelled',
          userId,
          notes: `Chore "${chore.title}" was cancelled`,
        },
      });

      return updatedChore;
    });

    // Cancel reminders
    await this.choreReminderService.cancelReminders(choreId).catch((err) => {
      console.error(`Failed to cancel reminders for chore ${choreId}:`, err);
    });

    // Notify assigned user if different from canceller
    if (chore.assignedTo && chore.assignedTo !== userId) {
      const cancellerName =
        chore.User_Chore_createdByToUser?.UserProfile?.displayName ||
        chore.User_Chore_createdByToUser?.email ||
        'Someone';
      await this.notificationService
        .createNotification({
          userId: chore.assignedTo,
          type: NotificationType.CHORE_UPDATED,
          title: 'Chore Cancelled',
          message: `${cancellerName} cancelled chore: ${chore.title}`,
          data: { choreId },
        })
        .catch((err) => {
          console.error(`Failed to create notification:`, err);
        });
    }

    return this.transformChore(updated);
  }

  /**
   * Reassign a chore from one user to another (when someone can't complete)
   */
  async reassignChore(
    userId: string,
    choreId: string,
    newUserId: string,
    reason?: string,
  ) {
    // Verify chore exists and user has permission
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        status: {
          in: ['pending', 'assigned'],
        },
      },
      include: {
        Group: {
          include: {
            GroupMember: {
              where: {
                userId,
              },
              select: {
                role: true,
              },
            },
          },
        },
        User_Chore_createdByToUser: {
          select: {
            id: true,
            email: true,
            UserProfile: { select: { displayName: true } },
          },
        },
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
      throw new NotFoundException('Chore not found or cannot be reassigned');
    }

    // Check permissions: creator, current assignee, or group admin
    const isCreator = chore.createdBy === userId;
    const isAssigned = chore.assignedTo === userId;
    const isGroupAdmin = chore.Group?.GroupMember?.[0]?.role === 'ADMIN';

    if (!isCreator && !isAssigned && !isGroupAdmin) {
      throw new NotFoundException(
        'You do not have permission to reassign this chore',
      );
    }

    // Verify new user exists and is in group (if group chore)
    const newUser = await this.prisma.user.findUnique({
      where: { id: newUserId },
    });

    if (!newUser) {
      throw new BadRequestException('New assigned user not found');
    }

    if (chore.groupId) {
      const isMember = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: chore.groupId,
            userId: newUserId,
          },
        },
      });

      if (!isMember) {
        throw new BadRequestException(
          'New assigned user is not a member of the group',
        );
      }
    }

    // Update chore and create history
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedChore = await tx.chore.update({
        where: { id: choreId },
        data: {
          assignedTo: newUserId,
          status: 'assigned',
        },
        include: {
          Group: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
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
          action: 'reassigned',
          userId,
          notes:
            reason ||
            `Chore reassigned from ${chore.User_Chore_assignedToToUser?.email || 'previous assignee'} to new user`,
          changes: {
            from: chore.assignedTo,
            to: newUserId,
            reason,
          },
        },
      });

      return updatedChore;
    });

    // Notify new assignee
    const reassignerName =
      chore.User_Chore_createdByToUser?.UserProfile?.displayName ||
      chore.User_Chore_createdByToUser?.email ||
      'Someone';
    await this.notificationService
      .notifyChoreAssigned(newUserId, choreId, chore.title, reassignerName)
      .catch((err) => {
        console.error(`Failed to create notification for new assignee:`, err);
      });

    // Notify previous assignee if different
    if (
      chore.assignedTo &&
      chore.assignedTo !== userId &&
      chore.assignedTo !== newUserId
    ) {
      await this.notificationService
        .createNotification({
          userId: chore.assignedTo,
          type: NotificationType.CHORE_UPDATED,
          title: 'Chore Reassigned',
          message: `${reassignerName} reassigned "${chore.title}" to someone else`,
          data: { choreId },
        })
        .catch((err) => {
          console.error(`Failed to create notification:`, err);
        });
    }

    return this.transformChore(updated);
  }

  async deleteChore(userId: string, choreId: string) {
    // Verify chore exists and user has permission (only creator can delete)
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        createdBy: userId,
      },
      include: {
        User_Chore_createdByToUser: {
          select: {
            id: true,
            email: true,
            UserProfile: { select: { displayName: true } },
          },
        },
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
      throw new NotFoundException(
        'Chore not found or you do not have permission to delete it',
      );
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

    // Notify assigned user if chore was deleted (and they're different from deleter)
    const deleterName =
      chore.User_Chore_createdByToUser?.UserProfile?.displayName ||
      chore.User_Chore_createdByToUser?.email ||
      'Someone';
    if (chore.assignedTo && chore.assignedTo !== userId) {
      await this.notificationService
        .notifyChoreDeleted(chore.assignedTo, chore.title, deleterName)
        .catch((err) => {
          console.error(
            `Failed to create notification for assigned user:`,
            err,
          );
        });
    }

    // Cancel reminders before deletion
    await this.choreReminderService.cancelReminders(choreId).catch((err) => {
      console.error(`Failed to cancel reminders for chore ${choreId}:`, err);
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
      throw new NotFoundException(
        'Chore not found or you do not have permission',
      );
    }

    if (!chore.assignedTo) {
      throw new BadRequestException('Chore is not assigned');
    }

    if (chore.status === 'completed' || chore.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot unassign a completed or cancelled chore',
      );
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
              avatarUrl: true,
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

    // Notify the previously assigned user that they were unassigned (if different from unassigner)
    if (chore.assignedTo && chore.assignedTo !== userId) {
      const unassignerName =
        updated.User_Chore_createdByToUser?.UserProfile?.displayName ||
        updated.User_Chore_createdByToUser?.email ||
        'Someone';
      await this.notificationService
        .createNotification({
          userId: chore.assignedTo,
          type: NotificationType.CHORE_UPDATED,
          title: 'Chore Unassigned',
          message: `${unassignerName} unassigned you from "${chore.title}"`,
          data: { choreId },
        })
        .catch((err) => {
          console.error(`Failed to create notification:`, err);
        });
    }

    return this.transformChore(updated);
  }

  async getGroupPointsLeaderboard(
    userId: string,
    groupId: string,
    period?: 'week' | 'month' | 'all-time',
  ) {
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

    // Calculate date filter based on period
    const now = new Date();
    let dateFilter: { gte?: Date } | undefined;
    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { gte: weekAgo };
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { gte: monthAgo };
    }

    // Get total points for each member from chore completions in this group
    const leaderboard = await Promise.all(
      members.map(async (member) => {
        const totalPoints = await this.prisma.choreCompletion.aggregate({
          where: {
            userId: member.userId,
            completedAt: dateFilter,
            Chore: {
              groupId,
            },
          },
          _sum: {
            pointsEarned: true,
          },
        });

        // Also get completion count and streak for this period
        const completions = await this.prisma.choreCompletion.findMany({
          where: {
            userId: member.userId,
            completedAt: dateFilter,
            Chore: {
              groupId,
            },
          },
          orderBy: { completedAt: 'desc' },
        });

        // Calculate current streak for this period
        let currentStreak = 0;
        if (completions.length > 0) {
          const completionsByDate = new Map<string, number>();
          completions.forEach((c) => {
            const dateKey = c.completedAt.toISOString().split('T')[0];
            completionsByDate.set(
              dateKey,
              (completionsByDate.get(dateKey) || 0) + 1,
            );
          });

          const sortedDates = Array.from(completionsByDate.keys())
            .sort()
            .reverse();
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (let i = 0; i < sortedDates.length; i++) {
            const date = new Date(sortedDates[i]);
            date.setHours(0, 0, 0, 0);
            const expectedDate = new Date(today);
            expectedDate.setDate(expectedDate.getDate() - i);
            if (date.getTime() === expectedDate.getTime()) {
              currentStreak++;
            } else {
              break;
            }
          }
        }

        return {
          userId: member.userId,
          displayName:
            member.User.UserProfile?.displayName ||
            member.User.email.split('@')[0],
          avatarUrl: member.User.UserProfile?.avatarUrl || null,
          totalPoints: totalPoints._sum?.pointsEarned || 0,
          totalCompleted: completions.length,
          currentStreak,
          role: member.role,
        };
      }),
    );

    // Sort by points descending, then by completion count, then by streak
    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.totalCompleted !== a.totalCompleted) {
        return b.totalCompleted - a.totalCompleted;
      }
      return b.currentStreak - a.currentStreak;
    });

    // Add rank and period info
    return {
      period: period || 'all-time',
      groupId,
      leaderboard: leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1,
        change: 0, // TODO: Calculate position change from previous period
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  async stopRecurrence(userId: string, choreId: string) {
    // Verify chore exists and user has permission
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        createdBy: userId,
        isRecurring: true,
      },
    });

    if (!chore) {
      throw new NotFoundException(
        'Recurring chore not found or you do not have permission',
      );
    }

    const updated = await this.prisma.chore.update({
      where: { id: choreId },
      data: {
        isRecurring: false,
      },
    });

    // Create history entry
    await this.prisma.choreHistory.create({
      data: {
        id: randomUUID(),
        choreId,
        action: 'recurrence_stopped',
        userId,
        changes: {
          isRecurring: false,
        },
      },
    });

    return this.transformChore(updated);
  }

  async skipOccurrence(
    userId: string,
    parentChoreId: string,
    occurrenceId: string,
  ) {
    // Verify parent chore exists and user has permission
    const parentChore = await this.prisma.chore.findFirst({
      where: {
        id: parentChoreId,
        createdBy: userId,
        isRecurring: true,
      },
    });

    if (!parentChore) {
      throw new NotFoundException(
        'Parent chore not found or you do not have permission',
      );
    }

    // Verify occurrence exists and belongs to parent
    const occurrence = await this.prisma.chore.findFirst({
      where: {
        id: occurrenceId,
        parentChoreId,
      },
    });

    if (!occurrence) {
      throw new NotFoundException('Occurrence not found');
    }

    // Delete the occurrence
    await this.prisma.chore.delete({
      where: { id: occurrenceId },
    });

    // Create history entry
    await this.prisma.choreHistory.create({
      data: {
        id: randomUUID(),
        choreId: parentChoreId,
        action: 'occurrence_skipped',
        userId,
        changes: {
          occurrenceId,
          skippedAt: new Date().toISOString(),
        },
      },
    });

    return { success: true, message: 'Occurrence skipped' };
  }

  async assignMultipleChore(
    userId: string,
    choreId: string,
    userIds: string[],
  ) {
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
      throw new NotFoundException(
        'Chore not found or you do not have permission',
      );
    }

    if (chore.status === 'completed') {
      throw new BadRequestException('Cannot assign a completed chore');
    }

    if (chore.assignmentType !== 'multiple') {
      throw new BadRequestException(
        'Chore is not configured for multiple assignments',
      );
    }

    if (userIds.length === 0) {
      throw new BadRequestException('At least one user must be provided');
    }

    // Verify all users exist and are in group (if groupId provided)
    for (const assigneeId of userIds) {
      const assignedUser = await this.prisma.user.findUnique({
        where: { id: assigneeId },
      });

      if (!assignedUser) {
        throw new BadRequestException(`User ${assigneeId} not found`);
      }

      if (chore.groupId) {
        const isMember = await this.prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: chore.groupId,
              userId: assigneeId,
            },
          },
        });

        if (!isMember) {
          throw new BadRequestException(
            `User ${assigneeId} is not a member of the group`,
          );
        }
      }

      // Check if assignment already exists
      const existingAssignment = await this.prisma.choreAssignment.findUnique({
        where: {
          choreId_userId: {
            choreId,
            userId: assigneeId,
          },
        },
      });

      if (existingAssignment) {
        throw new BadRequestException(
          `User ${assigneeId} is already assigned to this chore`,
        );
      }
    }

    // Create assignments
    await this.prisma.$transaction(async (tx) => {
      const newAssignments: ChoreAssignment[] = [];
      for (const assigneeId of userIds) {
        const assignment = await tx.choreAssignment.create({
          data: {
            id: randomUUID(),
            choreId,
            userId: assigneeId,
          },
        });
        newAssignments.push(assignment);
      }

      // Update chore status if needed
      await tx.chore.update({
        where: { id: choreId },
        data: {
          status: 'assigned',
        },
      });

      // Create history entry
      await tx.choreHistory.create({
        data: {
          id: randomUUID(),
          choreId,
          action: 'assigned_multiple',
          userId,
          changes: {
            assignedUsers: userIds,
          },
        },
      });

      return newAssignments;
    });

    // Notify assigned users
    const creatorName = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        UserProfile: {
          select: {
            displayName: true,
          },
        },
      },
    });

    const assignerName =
      creatorName?.UserProfile?.displayName || creatorName?.email || 'Someone';

    for (const assigneeId of userIds) {
      if (assigneeId !== userId) {
        await this.notificationService
          .notifyChoreAssigned(assigneeId, choreId, chore.title, assignerName)
          .catch((err) => {
            console.error(
              `Failed to create notification for assigned user ${assigneeId}:`,
              err,
            );
          });
      }
    }

    // Return updated chore
    return this.getChoreById(userId, choreId);
  }

  async getChoreAssignments(userId: string, choreId: string) {
    // Verify chore exists and user has permission
    const chore = await this.prisma.chore.findFirst({
      where: {
        id: choreId,
        OR: [
          { createdBy: userId },
          { assignedTo: userId },
          { friendId: userId },
          {
            Group: {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          },
          {
            ChoreAssignment: {
              some: {
                userId,
              },
            },
          },
        ],
      },
    });

    if (!chore) {
      throw new NotFoundException(
        'Chore not found or you do not have permission',
      );
    }

    const assignments = await this.prisma.choreAssignment.findMany({
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
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map((assignment) => ({
      id: assignment.id,
      choreId: assignment.choreId,
      userId: assignment.userId,
      assignedAt: assignment.assignedAt.toISOString(),
      completedAt: assignment.completedAt?.toISOString() || null,
      pointsEarned: assignment.pointsEarned || null,
      onTime: assignment.onTime || null,
      user: {
        id: assignment.User.id,
        email: assignment.User.email,
        profile: assignment.User.UserProfile
          ? {
              displayName: assignment.User.UserProfile.displayName,
              avatarUrl: assignment.User.UserProfile.avatarUrl,
            }
          : null,
      },
    }));
  }

  async completeChoreAssignment(
    userId: string,
    choreId: string,
    assignmentId: string,
  ) {
    // Verify assignment exists and belongs to user
    const assignment = await this.prisma.choreAssignment.findFirst({
      where: {
        id: assignmentId,
        choreId,
        userId,
        completedAt: null, // Not already completed
      },
      include: {
        Chore: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found or already completed');
    }

    const chore = assignment.Chore;

    // IMPORTANT: Points calculation for multiple assignments
    // - If rotation is enabled: Each occurrence is assigned to ONE person, so give FULL points
    //   (Rotation members are in ChoreRotation, not ChoreAssignment)
    // - If multiple assignment (no rotation): Divide points among all assignees
    //   (They work together on the same task)

    let basePointsPerPerson: number;

    if (chore.rotationEnabled) {
      // Rotation task: Each person does it individually, so full points
      basePointsPerPerson = chore.points;
    } else {
      // Multiple assignment (no rotation): Divide points equally
      const totalAssignments = await this.prisma.choreAssignment.count({
        where: { choreId },
      });
      basePointsPerPerson = Math.round(chore.points / totalAssignments);
    }

    // Check if this was an unassigned chore that was grabbed (for bonus)
    const wasUnassigned = chore.assignmentType === 'open';

    // Calculate points using enhanced calculation (includes streak, category bonuses, late penalties)
    const completedAt = new Date();
    const pointsCalculation =
      await this.chorePointsService.calculatePointsEarned(
        userId,
        basePointsPerPerson,
        chore.category,
        chore.dueDate ? new Date(chore.dueDate) : null,
        completedAt,
        wasUnassigned,
      );

    const pointsEarned = pointsCalculation.pointsEarned;

    // Check if completed on time
    const isOnTime = !chore.dueDate || completedAt <= new Date(chore.dueDate);

    // Update assignment and create completion record
    const result = await this.prisma.$transaction(async (tx) => {
      // Update assignment
      const updatedAssignment = await tx.choreAssignment.update({
        where: { id: assignmentId },
        data: {
          completedAt: new Date(),
          pointsEarned,
          onTime: isOnTime,
        },
      });

      // Create completion record
      await tx.choreCompletion.create({
        data: {
          id: randomUUID(),
          choreId,
          userId,
          pointsEarned,
          onTime: isOnTime,
        },
      });

      // Check if all assignments are completed
      const remainingAssignments = await tx.choreAssignment.count({
        where: {
          choreId,
          completedAt: null,
        },
      });

      // If all assignments completed, mark chore as completed
      if (remainingAssignments === 0) {
        await tx.chore.update({
          where: { id: choreId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
      }

      // Create history entry
      await tx.choreHistory.create({
        data: {
          id: randomUUID(),
          choreId,
          action: 'assignment_completed',
          userId,
          changes: {
            assignmentId,
            pointsEarned,
            onTime: isOnTime,
          },
        },
      });

      return { updatedAssignment, allCompleted: remainingAssignments === 0 };
    });

    // Cancel reminders if all assignments are completed
    if (result.allCompleted) {
      await this.choreReminderService.cancelReminders(choreId).catch((err) => {
        console.error(`Failed to cancel reminders for chore ${choreId}:`, err);
      });
    }

    // Update trust score
    await this.trustScoreService.updateChoreScore(userId);

    // Notify creator
    if (chore.createdBy !== userId) {
      const completerName = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          UserProfile: {
            select: {
              displayName: true,
            },
          },
        },
      });

      const completerDisplayName =
        completerName?.UserProfile?.displayName ||
        completerName?.email ||
        'Someone';
      await this.notificationService
        .notifyChoreCompleted(
          chore.createdBy,
          choreId,
          chore.title,
          completerDisplayName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for chore creator:`,
            err,
          );
        });
    }

    // Return updated chore
    return this.getChoreById(userId, choreId);
  }

  async removeChoreAssignment(
    userId: string,
    choreId: string,
    assignmentId: string,
  ) {
    // Verify assignment exists
    const assignment = await this.prisma.choreAssignment.findFirst({
      where: {
        id: assignmentId,
        choreId,
      },
      include: {
        Chore: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const chore = assignment.Chore;

    // Verify user has permission (creator, group admin, or the assigned user themselves)
    const hasPermission =
      chore.createdBy === userId ||
      assignment.userId === userId ||
      (chore.groupId &&
        (await this.prisma.groupMember.findFirst({
          where: {
            groupId: chore.groupId,
            userId,
            role: 'ADMIN',
          },
        })));

    if (!hasPermission) {
      throw new BadRequestException(
        'You do not have permission to remove this assignment',
      );
    }

    if (assignment.completedAt) {
      throw new BadRequestException('Cannot remove a completed assignment');
    }

    // Remove assignment
    await this.prisma.$transaction(async (tx) => {
      await tx.choreAssignment.delete({
        where: { id: assignmentId },
      });

      // Check if any assignments remain
      const remainingAssignments = await tx.choreAssignment.count({
        where: {
          choreId,
        },
      });

      // If no assignments remain, mark chore as pending
      if (remainingAssignments === 0) {
        await tx.chore.update({
          where: { id: choreId },
          data: {
            status: 'pending',
          },
        });
      }

      // Create history entry
      await tx.choreHistory.create({
        data: {
          id: randomUUID(),
          choreId,
          action: 'assignment_removed',
          userId,
          changes: {
            assignmentId,
            removedUserId: assignment.userId,
          },
        },
      });
    });

    // Return updated chore
    return this.getChoreById(userId, choreId);
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
      throw new NotFoundException(
        'Chore not found or you do not have permission',
      );
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

    // Transform user data helper
    const transformUser = (user: UserWithProfile | null) => {
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        profile: user.UserProfile
          ? {
              displayName: user.UserProfile.displayName,
              avatarUrl: user.UserProfile.avatarUrl,
            }
          : null,
      };
    };

    // Combine and format history
    const allHistory = [
      // Creation entry (from chore createdAt)
      {
        id: 'creation',
        action: 'created',
        userId: chore.createdBy,
        createdAt: chore.createdAt.toISOString(),
        user: null, // Will be populated below
      },
      // History entries
      ...history.map((h) => ({
        id: h.id,
        action: h.action,
        userId: h.userId,
        createdAt: h.createdAt.toISOString(),
        changes: h.changes,
        notes: h.notes,
        user: transformUser(h.User),
      })),
      // Completion entries
      ...completions.map((c) => ({
        id: c.id,
        action: 'completed',
        userId: c.userId,
        createdAt: c.completedAt.toISOString(),
        pointsEarned: c.pointsEarned,
        onTime: c.onTime,
        user: transformUser(c.User),
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
    const creationEntry = allHistory.find((e) => e.id === 'creation');
    if (creationEntry) {
      creationEntry.user = transformUser(creator);
    }

    // Sort by date (most recent first)
    allHistory.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return allHistory;
  }
}
