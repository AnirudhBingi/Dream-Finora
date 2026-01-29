import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecurringChoreService } from './recurring-chore.service';
import { randomUUID } from 'crypto';

export type RotationType = 'round-robin'; // Simplified: Only round-robin for now

export interface RotationMember {
  userId: string;
  rotationOrder: number;
  lastAssignedAt: Date | null;
  skipUntil: Date | null;
}

@Injectable()
export class ChoreRotationService {
  private readonly logger = new Logger(ChoreRotationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => RecurringChoreService))
    private recurringChoreService: RecurringChoreService,
  ) {}

  /**
   * Initialize rotation for a chore with group members
   * Uses simple round-robin rotation
   * @param choreId - The chore ID
   * @param groupId - The group ID (for validation)
   * @param userIds - Optional: specific user IDs to include in rotation. If not provided, uses all group members.
   */
  async initializeRotation(
    choreId: string,
    groupId: string,
    userIds?: string[],
  ): Promise<void> {
    const chore = await this.prisma.chore.findUnique({
      where: { id: choreId },
      include: {
        ChoreRotation: true,
        ChoreAssignment: true, // Check if there are specific assignments
      },
    });

    if (!chore) {
      throw new NotFoundException('Chore not found');
    }

    if (!chore.groupId) {
      throw new BadRequestException('Rotation only available for group chores');
    }

    if (chore.groupId !== groupId) {
      throw new BadRequestException('Group mismatch');
    }

    // Determine which users should be in rotation
    let rotationUserIds: string[];

    if (userIds && userIds.length > 0) {
      // Use provided user IDs (selected members)
      rotationUserIds = userIds;
    } else if (chore.ChoreAssignment && chore.ChoreAssignment.length > 0) {
      // Use users from multiple assignments if available
      rotationUserIds = chore.ChoreAssignment.map((a) => a.userId);
    } else {
      // Fallback: Get all group members
      const groupMembers = await this.prisma.groupMember.findMany({
        where: { groupId },
        orderBy: { createdAt: 'asc' },
      });
      rotationUserIds = groupMembers.map((m) => m.userId);
    }

    if (rotationUserIds.length === 0) {
      throw new BadRequestException('No users available for rotation');
    }

    // Verify all users are in the group
    const groupMembers = await this.prisma.groupMember.findMany({
      where: { groupId },
    });
    const groupUserIds = new Set(groupMembers.map((m) => m.userId));
    const invalidUsers = rotationUserIds.filter((id) => !groupUserIds.has(id));
    if (invalidUsers.length > 0) {
      throw new BadRequestException(
        `Users ${invalidUsers.join(', ')} are not group members`,
      );
    }

    // Delete existing rotation entries
    await this.prisma.choreRotation.deleteMany({
      where: { choreId },
    });

    // Create rotation entries for each selected member
    const rotationEntries = rotationUserIds.map((userId, index) => ({
      id: randomUUID(),
      choreId,
      userId,
      rotationOrder: index,
      lastAssignedAt: null,
      skipUntil: null,
    }));

    await this.prisma.choreRotation.createMany({
      data: rotationEntries,
    });

    // Update chore with rotation settings
    await this.prisma.chore.update({
      where: { id: choreId },
      data: {
        rotationEnabled: true,
        rotationType: 'round-robin',
      },
    });

    this.logger.log(
      `Initialized rotation for chore ${choreId} with ${rotationEntries.length} selected members`,
    );
  }

  /**
   * Get the next user in rotation based on rotation type
   */
  async getNextUserInRotation(choreId: string): Promise<string | null> {
    const chore = await this.prisma.chore.findUnique({
      where: { id: choreId },
      include: {
        ChoreRotation: {
          include: {
            User: {
              include: {
                UserProfile: true,
              },
            },
          },
          orderBy: { rotationOrder: 'asc' },
        },
        Group: {
          include: {
            GroupMember: true,
          },
        },
      },
    });

    if (!chore || !chore.rotationEnabled) {
      return null;
    }

    if (!chore.groupId) {
      return null;
    }

    const now = new Date();

    // Filter out users who are skipped
    const availableRotations = chore.ChoreRotation.filter(
      (r) => !r.skipUntil || new Date(r.skipUntil) < now,
    );

    if (availableRotations.length === 0) {
      // All users are skipped, return null
      return null;
    }

    // Simple round-robin: Find the user with the oldest lastAssignedAt, or null if never assigned
    // Sort by: never assigned first, then by lastAssignedAt ascending
    const sorted = [...availableRotations].sort((a, b) => {
      if (!a.lastAssignedAt && !b.lastAssignedAt) {
        return a.rotationOrder - b.rotationOrder;
      }
      if (!a.lastAssignedAt) return -1;
      if (!b.lastAssignedAt) return 1;
      return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
    });

    return sorted[0].userId;
  }

  /**
   * Assign chore to next user in rotation
   */
  async assignToNextUser(choreId: string): Promise<string | null> {
    const nextUserId = await this.getNextUserInRotation(choreId);

    if (!nextUserId) {
      return null;
    }

    // Update rotation record
    await this.prisma.choreRotation.updateMany({
      where: {
        choreId,
        userId: nextUserId,
      },
      data: {
        lastAssignedAt: new Date(),
      },
    });

    // Update chore assignment
    await this.prisma.chore.update({
      where: { id: choreId },
      data: {
        assignedTo: nextUserId,
        status: 'assigned',
      },
    });

    this.logger.log(
      `Assigned chore ${choreId} to user ${nextUserId} via rotation`,
    );

    return nextUserId;
  }

  /**
   * Get rotation order for a chore
   */
  async getRotationOrder(choreId: string): Promise<RotationMember[]> {
    const rotations = await this.prisma.choreRotation.findMany({
      where: { choreId },
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
      orderBy: { rotationOrder: 'asc' },
    });

    return rotations.map((r) => ({
      userId: r.userId,
      rotationOrder: r.rotationOrder,
      lastAssignedAt: r.lastAssignedAt,
      skipUntil: r.skipUntil,
    }));
  }

  /**
   * Get rotation schedule for a recurring chore
   * Shows who will be assigned to upcoming occurrences
   */
  async getRotationSchedule(
    choreId: string,
    upcomingCount: number = 10,
  ): Promise<
    Array<{
      occurrenceNumber: number;
      assignedToUserId: string | null;
      dueDate: Date | null;
      isAssigned: boolean;
    }>
  > {
    const chore = await this.prisma.chore.findUnique({
      where: { id: choreId },
      include: {
        ChoreRotation: {
          orderBy: { rotationOrder: 'asc' },
        },
      },
    });

    if (!chore || !chore.rotationEnabled || !chore.isRecurring) {
      return [];
    }

    const rotationMembers = chore.ChoreRotation;
    if (rotationMembers.length === 0) {
      return [];
    }

    // Get existing occurrences (child chores)
    const existingOccurrences = await this.prisma.chore.findMany({
      where: {
        parentChoreId: choreId,
        status: { in: ['pending', 'assigned'] },
      },
      orderBy: { dueDate: 'asc' },
      take: upcomingCount,
    });

    const schedule: Array<{
      occurrenceNumber: number;
      assignedToUserId: string | null;
      dueDate: Date | null;
      isAssigned: boolean;
    }> = [];

    // Calculate who should be assigned based on rotation
    // Find the last assigned user to determine next in rotation
    const lastAssignedRotations = rotationMembers
      .filter((r) => r.lastAssignedAt)
      .sort((a, b) => {
        if (!a.lastAssignedAt || !b.lastAssignedAt) return 0;
        return b.lastAssignedAt.getTime() - a.lastAssignedAt.getTime();
      });

    let nextRotationIndex = 0;
    if (lastAssignedRotations.length > 0) {
      const lastAssigned = lastAssignedRotations[0];
      const lastIndex = rotationMembers.findIndex(
        (r) => r.userId === lastAssigned.userId,
      );
      nextRotationIndex = (lastIndex + 1) % rotationMembers.length;
    }

    // Add existing occurrences
    for (const occurrence of existingOccurrences) {
      schedule.push({
        occurrenceNumber: schedule.length + 1,
        assignedToUserId: occurrence.assignedTo,
        dueDate: occurrence.dueDate,
        isAssigned: occurrence.status === 'assigned',
      });
    }

    // Calculate future occurrences if we need more
    const needed = upcomingCount - schedule.length;
    if (needed > 0 && chore.recurrencePattern) {
      // Get the last due date to start calculating from
      const lastScheduleItem =
        schedule.length > 0 ? schedule[schedule.length - 1] : null;
      let currentDate =
        lastScheduleItem && lastScheduleItem.dueDate
          ? new Date(lastScheduleItem.dueDate)
          : chore.dueDate
            ? new Date(chore.dueDate)
            : new Date();

      // Parse recurrence config
      const recurrenceConfig = chore.recurrenceConfig as {
        daysOfWeek?: number[];
        interval?: number;
        dayOfMonth?: number;
        weekOfMonth?: number;
        dayOfWeek?: number;
      } | null;

      // Calculate each future occurrence using RecurringChoreService
      // We always want to calculate from currentDate (last occurrence), not the original dueDate
      // So we pass null for dueDate to ensure it uses currentDate as the base
      for (let i = 0; i < needed; i++) {
        const rotationIndex = (nextRotationIndex + i) % rotationMembers.length;
        const assignedUserId = rotationMembers[rotationIndex].userId;

        // Use RecurringChoreService to calculate the next occurrence date
        // This properly handles daysOfWeek, intervals, etc.
        // Pass null for dueDate so it always uses currentDate (lastOccurrenceDate) as the base
        const nextDueDate = this.recurringChoreService.calculateNextOccurrence(
          chore.recurrencePattern as 'daily' | 'weekly' | 'monthly' | 'custom',
          recurrenceConfig,
          currentDate,
          null, // Always use currentDate as base, not original dueDate
        );

        if (!nextDueDate) {
          // Can't calculate more occurrences, stop
          break;
        }

        schedule.push({
          occurrenceNumber: schedule.length + 1,
          assignedToUserId: assignedUserId,
          dueDate: nextDueDate,
          isAssigned: false,
        });

        // Update currentDate for next iteration (calculate from the newly calculated date)
        currentDate = new Date(nextDueDate);
      }
    }

    return schedule;
  }

  /**
   * Update rotation order
   */
  async updateRotationOrder(choreId: string, userIds: string[]): Promise<void> {
    const chore = await this.prisma.chore.findUnique({
      where: { id: choreId },
      include: { ChoreRotation: true },
    });

    if (!chore || !chore.rotationEnabled) {
      throw new BadRequestException('Rotation not enabled for this chore');
    }

    // Verify all users are in rotation
    const existingUserIds = new Set(chore.ChoreRotation.map((r) => r.userId));
    const providedUserIds = new Set(userIds);

    if (![...providedUserIds].every((id) => existingUserIds.has(id))) {
      throw new BadRequestException('All provided users must be in rotation');
    }

    // Update rotation order
    await Promise.all(
      userIds.map((userId, index) =>
        this.prisma.choreRotation.updateMany({
          where: {
            choreId,
            userId,
          },
          data: {
            rotationOrder: index,
          },
        }),
      ),
    );

    this.logger.log(`Updated rotation order for chore ${choreId}`);
  }

  /**
   * Skip user in rotation until a specific date
   */
  async skipUser(
    choreId: string,
    userId: string,
    skipUntil: Date,
  ): Promise<void> {
    const rotation = await this.prisma.choreRotation.findUnique({
      where: {
        choreId_userId: {
          choreId,
          userId,
        },
      },
    });

    if (!rotation) {
      throw new NotFoundException('User not in rotation');
    }

    await this.prisma.choreRotation.update({
      where: {
        choreId_userId: {
          choreId,
          userId,
        },
      },
      data: {
        skipUntil,
      },
    });

    this.logger.log(
      `Skipped user ${userId} in rotation for chore ${choreId} until ${skipUntil.toISOString()}`,
    );
  }

  /**
   * Remove skip from user
   */
  async removeSkip(choreId: string, userId: string): Promise<void> {
    await this.prisma.choreRotation.updateMany({
      where: {
        choreId,
        userId,
      },
      data: {
        skipUntil: null,
      },
    });

    this.logger.log(
      `Removed skip for user ${userId} in rotation for chore ${choreId}`,
    );
  }

  /**
   * Disable rotation for a chore
   */
  async disableRotation(choreId: string): Promise<void> {
    await this.prisma.chore.update({
      where: { id: choreId },
      data: {
        rotationEnabled: false,
        rotationType: null,
      },
    });

    // Optionally delete rotation records (keeping history might be useful)
    // await this.prisma.choreRotation.deleteMany({ where: { choreId } });

    this.logger.log(`Disabled rotation for chore ${choreId}`);
  }

  /**
   * Calculate fairness metrics for a group
   */
  async calculateFairnessScore(groupId: string): Promise<number> {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
    });

    if (members.length === 0) {
      return 100; // Perfect fairness if no members
    }

    // Get workload for each member (pending/assigned chores)
    const workloads = await Promise.all(
      members.map(async (member) => {
        const assignedCount = await this.prisma.chore.count({
          where: {
            groupId,
            OR: [
              { assignedTo: member.userId },
              {
                ChoreAssignment: {
                  some: { userId: member.userId },
                },
              },
            ],
            status: {
              in: ['pending', 'assigned'],
            },
          },
        });
        return assignedCount;
      }),
    );

    const avgWorkload =
      workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    if (avgWorkload === 0) {
      return 100; // Perfect fairness if no assignments
    }

    // Calculate deviation from average for each member
    const deviations = workloads.map((w) => Math.abs(w - avgWorkload));
    const avgDeviation =
      deviations.reduce((sum, d) => sum + d, 0) / deviations.length;

    // Fairness score: 100 - (normalized average deviation)
    // Lower deviation = higher fairness
    const normalizedDeviation = (avgDeviation / (avgWorkload + 1)) * 100;
    const fairnessScore = Math.max(0, Math.round(100 - normalizedDeviation));

    return fairnessScore;
  }
}
