import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChoreRotationService } from './chore-rotation.service';
import { randomUUID } from 'crypto';

export interface RecurrenceConfig {
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday) for weekly
  interval?: number; // e.g., every 2 days, every 3 weeks
  dayOfMonth?: number; // For monthly (1-31)
  weekOfMonth?: number; // For monthly (1-5, -1 for last)
  dayOfWeek?: number; // For monthly (0-6)
}

@Injectable()
export class RecurringChoreService {
  private readonly logger = new Logger(RecurringChoreService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChoreRotationService))
    private choreRotationService?: ChoreRotationService,
  ) {}

  /**
   * Calculate the next occurrence date based on recurrence pattern
   */
  calculateNextOccurrence(
    pattern: 'daily' | 'weekly' | 'monthly' | 'custom',
    config: RecurrenceConfig | null,
    lastOccurrenceDate: Date,
    dueDate?: Date | null,
  ): Date | null {
    const baseDate = dueDate || lastOccurrenceDate;
    const nextDate = new Date(baseDate);

    switch (pattern) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + (config?.interval || 1));
        break;

      case 'weekly':
        if (config?.daysOfWeek && config.daysOfWeek.length > 0) {
          // Find next matching day of week
          const currentDay = nextDate.getDay();
          const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b);
          const nextDay =
            sortedDays.find((day) => day > currentDay) || sortedDays[0];

          const daysUntilNext =
            nextDay > currentDay
              ? nextDay - currentDay
              : 7 - currentDay + nextDay;

          nextDate.setDate(nextDate.getDate() + daysUntilNext);
        } else {
          nextDate.setDate(nextDate.getDate() + 7 * (config?.interval || 1));
        }
        break;

      case 'monthly':
        if (config?.dayOfMonth) {
          // Specific day of month (e.g., 15th of every month)
          nextDate.setMonth(nextDate.getMonth() + (config?.interval || 1));
          const lastDayOfMonth = new Date(
            nextDate.getFullYear(),
            nextDate.getMonth() + 1,
            0,
          ).getDate();
          nextDate.setDate(Math.min(config.dayOfMonth, lastDayOfMonth));
        } else if (config?.weekOfMonth && config?.dayOfWeek !== undefined) {
          // Specific week and day (e.g., first Monday of every month)
          nextDate.setMonth(nextDate.getMonth() + (config?.interval || 1));
          nextDate.setDate(1); // Start from first day of month

          // Find the target day of week
          while (nextDate.getDay() !== config.dayOfWeek) {
            nextDate.setDate(nextDate.getDate() + 1);
          }

          // Move to the correct week
          if (config.weekOfMonth === -1) {
            // Last occurrence of the month
            const lastDay = new Date(
              nextDate.getFullYear(),
              nextDate.getMonth() + 1,
              0,
            );
            const lastDayOfWeek = lastDay.getDay();
            const daysToSubtract = (lastDayOfWeek - config.dayOfWeek + 7) % 7;
            nextDate.setDate(lastDay.getDate() - daysToSubtract);
          } else {
            nextDate.setDate(nextDate.getDate() + (config.weekOfMonth - 1) * 7);
          }
        } else {
          // Same day of month, next month
          nextDate.setMonth(nextDate.getMonth() + (config?.interval || 1));
        }
        break;

      case 'custom':
        // Custom logic based on config
        if (config?.interval) {
          nextDate.setDate(nextDate.getDate() + config.interval);
        }
        break;

      default:
        return null;
    }

    return nextDate;
  }

  /**
   * Generate the next occurrence of a recurring chore
   */
  async generateNextOccurrence(parentChoreId: string): Promise<string | null> {
    try {
      const parentChore = await this.prisma.chore.findUnique({
        where: { id: parentChoreId },
        include: {
          ChoreAssignment: true,
        },
      });

      if (
        !parentChore ||
        !parentChore.isRecurring ||
        !parentChore.recurrencePattern
      ) {
        return null;
      }

      // Check if we should stop generating (end date or count reached)
      if (parentChore.recurrenceEndDate) {
        const endDate = new Date(parentChore.recurrenceEndDate);
        if (new Date() >= endDate) {
          // Stop recurring
          await this.prisma.chore.update({
            where: { id: parentChoreId },
            data: { isRecurring: false },
          });
          return null;
        }
      }

      if (
        parentChore.recurrenceCount &&
        parentChore.occurrencesGenerated >= parentChore.recurrenceCount
      ) {
        // Stop recurring
        await this.prisma.chore.update({
          where: { id: parentChoreId },
          data: { isRecurring: false },
        });
        return null;
      }

      // Calculate next occurrence date
      const lastOccurrenceDate = parentChore.nextOccurrenceDate
        ? new Date(parentChore.nextOccurrenceDate)
        : new Date();

      const recurrenceConfig =
        parentChore.recurrenceConfig as RecurrenceConfig | null;
      const nextDate = this.calculateNextOccurrence(
        parentChore.recurrencePattern as
          | 'daily'
          | 'weekly'
          | 'monthly'
          | 'custom',
        recurrenceConfig,
        lastOccurrenceDate,
        parentChore.dueDate ? new Date(parentChore.dueDate) : null,
      );

      if (!nextDate) {
        return null;
      }

      // IMPORTANT: Due date is set based on recurrence pattern
      // For recurring chores, due date should match when the next occurrence should be completed
      // For rotation: assignment happens AFTER creation, but due date is already set

      // Create the occurrence with proper due date
      const occurrenceId = randomUUID();
      await this.prisma.chore.create({
        data: {
          id: occurrenceId,
          groupId: parentChore.groupId,
          friendId: parentChore.friendId,
          createdBy: parentChore.createdBy,
          title: parentChore.title,
          description: parentChore.description,
          category: parentChore.category,
          points: parentChore.points,
          status: 'pending',
          assignmentType: parentChore.assignmentType,
          // Set due date to the calculated next occurrence date
          // This ensures due date matches the recurrence pattern
          dueDate: nextDate,
          parentChoreId: parentChoreId,
          isRecurring: false, // Occurrences are not recurring themselves
          reminderEnabled: parentChore.reminderEnabled,
          reminderHoursBefore: parentChore.reminderHoursBefore,
          // Copy rotation settings (rotation will assign AFTER creation)
          rotationEnabled: parentChore.rotationEnabled,
          rotationType: parentChore.rotationType,
        },
      });

      // IMPORTANT: Rotation vs Multiple Assignment Logic
      // - If rotation is enabled: Each occurrence is assigned to ONE person (single assignment)
      //   Rotation members are in ChoreRotation, not ChoreAssignment
      //   Points: Full points per person (each does it individually)
      // - If multiple assignment (no rotation): All members assigned to same occurrence
      //   Points: Divided among all members (they do it together)

      // Copy assignments if multiple assignment type AND rotation is NOT enabled
      if (
        parentChore.assignmentType === 'multiple' &&
        parentChore.ChoreAssignment.length > 0 &&
        !parentChore.rotationEnabled
      ) {
        await Promise.all(
          parentChore.ChoreAssignment.map((assignment) =>
            this.prisma.choreAssignment.create({
              data: {
                id: randomUUID(),
                choreId: occurrenceId,
                userId: assignment.userId,
              },
            }),
          ),
        );
      } else if (
        parentChore.assignmentType === 'single' ||
        parentChore.rotationEnabled
      ) {
        // SYNC: Rotation + Recurring + Due Date
        // Step 1: Initialize rotation if enabled (must be done BEFORE assignment)
        // Note: When rotation is enabled, assignmentType should be 'single' even if multiple members selected
        if (
          parentChore.rotationEnabled &&
          this.choreRotationService &&
          parentChore.groupId
        ) {
          try {
            // Get rotation members from parent chore to maintain same rotation order
            const parentRotation = await this.prisma.choreRotation.findMany({
              where: { choreId: parentChoreId },
              orderBy: { rotationOrder: 'asc' },
            });

            // Extract user IDs from parent rotation (these are the selected members)
            const rotationUserIds =
              parentRotation.length > 0
                ? parentRotation.map((r) => r.userId)
                : undefined; // Fallback to all group members if parent rotation not found

            // Initialize rotation for the occurrence with same members as parent
            await this.choreRotationService.initializeRotation(
              occurrenceId,
              parentChore.groupId,
              rotationUserIds, // Use same rotation members as parent
            );

            // Step 2: Assign to next user in rotation
            const nextUserId =
              await this.choreRotationService.assignToNextUser(occurrenceId);
            if (nextUserId) {
              // Update status to assigned after rotation assignment
              await this.prisma.chore.update({
                where: { id: occurrenceId },
                data: {
                  assignedTo: nextUserId,
                  status: 'assigned',
                  // Due date is already set correctly from recurrence calculation above
                },
              });
              this.logger.log(
                `Assigned occurrence ${occurrenceId} to user ${nextUserId} via rotation (due: ${nextDate.toISOString()})`,
              );
            } else {
              this.logger.warn(
                `No user available in rotation for occurrence ${occurrenceId}, leaving unassigned`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Failed to assign via rotation for occurrence ${occurrenceId}:`,
              error,
            );
            // Fallback: Leave as pending if rotation fails (can be grabbed manually)
          }
        } else if (parentChore.assignedTo) {
          // Keep same assignment if rotation is not enabled
          await this.prisma.chore.update({
            where: { id: occurrenceId },
            data: { assignedTo: parentChore.assignedTo, status: 'assigned' },
          });
        }

        // Note: Rotation initialization already done above if rotation is enabled
        // This ensures rotation order exists before assignment
      }

      // Update parent chore's next occurrence date and increment count
      await this.prisma.chore.update({
        where: { id: parentChoreId },
        data: {
          nextOccurrenceDate: nextDate,
          occurrencesGenerated: parentChore.occurrencesGenerated + 1,
        },
      });

      this.logger.log(
        `Generated occurrence ${occurrenceId} for recurring chore ${parentChoreId}`,
      );
      return occurrenceId;
    } catch (error) {
      this.logger.error(
        `Failed to generate occurrence for chore ${parentChoreId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Process all recurring chores that need new occurrences
   * This should be called by a cron job
   */
  async processRecurringChores(): Promise<void> {
    try {
      const now = new Date();

      // Find all recurring chores that need a new occurrence
      const recurringChores = await this.prisma.chore.findMany({
        where: {
          isRecurring: true,
          AND: [
            {
              OR: [
                { nextOccurrenceDate: null },
                { nextOccurrenceDate: { lte: now } },
              ],
            },
            // Not past end date
            {
              OR: [
                { recurrenceEndDate: null },
                { recurrenceEndDate: { gte: now } },
              ],
            },
          ],
        },
      });

      this.logger.log(`Processing ${recurringChores.length} recurring chores`);

      for (const chore of recurringChores) {
        await this.generateNextOccurrence(chore.id);
      }
    } catch (error) {
      this.logger.error('Failed to process recurring chores:', error);
    }
  }
}
