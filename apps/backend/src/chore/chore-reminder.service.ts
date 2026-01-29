import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ChoreReminderService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Schedule reminders for a chore
   */
  async scheduleReminders(
    choreId: string,
    dueDate: Date | null,
    reminderHoursBefore: number | null,
    userIds: string[],
  ) {
    if (!dueDate || !reminderHoursBefore || reminderHoursBefore <= 0) {
      return;
    }

    // Calculate reminder time
    const reminderAt = new Date(dueDate);
    reminderAt.setHours(reminderAt.getHours() - reminderHoursBefore);

    // Don't schedule if reminder time is in the past
    if (reminderAt <= new Date()) {
      return;
    }

    // Create reminders for all assigned users
    for (const userId of userIds) {
      await this.prisma.choreReminder.upsert({
        where: {
          choreId_userId_reminderType: {
            choreId,
            userId,
            reminderType: 'due_date',
          },
        },
        create: {
          id: randomUUID(),
          choreId,
          userId,
          reminderAt,
          reminderType: 'due_date',
        },
        update: {
          reminderAt,
          sent: false,
          sentAt: null,
        },
      });
    }
  }

  /**
   * Cancel reminders for a chore (when completed or deleted)
   */
  async cancelReminders(choreId: string) {
    await this.prisma.choreReminder.deleteMany({
      where: {
        choreId,
        sent: false,
      },
    });
  }

  /**
   * Send due date reminders (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendDueDateReminders() {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Find reminders that should be sent (within the next hour)
    const reminders = await this.prisma.choreReminder.findMany({
      where: {
        sent: false,
        reminderType: 'due_date',
        reminderAt: {
          gte: now,
          lte: oneHourFromNow,
        },
      },
      include: {
        Chore: {
          include: {
            User_Chore_createdByToUser: {
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
        },
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

    for (const reminder of reminders) {
      // Check if chore is still pending/assigned
      if (reminder.Chore.status === 'completed') {
        await this.prisma.choreReminder.update({
          where: { id: reminder.id },
          data: { sent: true, sentAt: new Date() },
        });
        continue;
      }

      // Send notification
      const choreTitle = reminder.Chore.title;
      const dueDate = reminder.Chore.dueDate;
      const hoursUntilDue = dueDate
        ? Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60))
        : 0;

      let message = `Reminder: "${choreTitle}" is due`;
      if (hoursUntilDue > 0) {
        message += ` in ${hoursUntilDue} hour${hoursUntilDue !== 1 ? 's' : ''}`;
      } else {
        message += ' soon';
      }

      await this.notificationService
        .createNotification({
          userId: reminder.userId,
          type: NotificationType.CHORE_ASSIGNED,
          title: 'Chore Reminder',
          message,
          data: { choreId: reminder.choreId },
        })
        .catch((err) => {
          console.error(
            `Failed to send reminder for chore ${reminder.choreId}:`,
            err,
          );
        });

      // Mark reminder as sent
      await this.prisma.choreReminder.update({
        where: { id: reminder.id },
        data: { sent: true, sentAt: new Date() },
      });
    }
  }

  /**
   * Check for overdue chores and send notifications (runs daily at 9 AM)
   */
  @Cron('0 9 * * *') // 9 AM every day
  async checkOverdueChores() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find overdue chores (due date passed, not completed)
    const overdueChores = await this.prisma.chore.findMany({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          in: ['pending', 'assigned'],
        },
      },
      include: {
        User_Chore_assignedToToUser: {
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
        ChoreAssignment: {
          where: {
            completedAt: null,
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
        },
        User_Chore_createdByToUser: {
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

    for (const chore of overdueChores) {
      const daysOverdue = Math.floor(
        (now.getTime() - chore.dueDate!.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Send overdue notification to assigned users
      if (chore.assignmentType === 'single' && chore.assignedTo) {
        // Check if we already sent an overdue reminder today
        const existingReminder = await this.prisma.choreReminder.findFirst({
          where: {
            choreId: chore.id,
            userId: chore.assignedTo,
            reminderType: 'overdue',
            sent: true,
            sentAt: {
              gte: yesterday,
            },
          },
        });

        if (!existingReminder) {
          await this.sendOverdueNotification(
            chore.id,
            chore.title,
            chore.assignedTo,
            daysOverdue,
          );

          // Create reminder record
          await this.prisma.choreReminder.create({
            data: {
              id: randomUUID(),
              choreId: chore.id,
              userId: chore.assignedTo,
              reminderAt: now,
              reminderType: 'overdue',
              sent: true,
              sentAt: now,
            },
          });
        }
      } else if (
        chore.assignmentType === 'multiple' &&
        chore.ChoreAssignment.length > 0
      ) {
        // Send to all uncompleted assignments
        for (const assignment of chore.ChoreAssignment) {
          const existingReminder = await this.prisma.choreReminder.findFirst({
            where: {
              choreId: chore.id,
              userId: assignment.userId,
              reminderType: 'overdue',
              sent: true,
              sentAt: {
                gte: yesterday,
              },
            },
          });

          if (!existingReminder) {
            await this.sendOverdueNotification(
              chore.id,
              chore.title,
              assignment.userId,
              daysOverdue,
            );

            await this.prisma.choreReminder.create({
              data: {
                id: randomUUID(),
                choreId: chore.id,
                userId: assignment.userId,
                reminderAt: now,
                reminderType: 'overdue',
                sent: true,
                sentAt: now,
              },
            });
          }
        }
      }

      // Also notify creator if chore is overdue
      if (chore.createdBy && daysOverdue > 0) {
        const existingReminder = await this.prisma.choreReminder.findFirst({
          where: {
            choreId: chore.id,
            userId: chore.createdBy,
            reminderType: 'overdue',
            sent: true,
            sentAt: {
              gte: yesterday,
            },
          },
        });

        if (!existingReminder) {
          const assignedName = chore.assignedTo
            ? chore.User_Chore_assignedToToUser?.UserProfile?.displayName ||
              chore.User_Chore_assignedToToUser?.email ||
              'Someone'
            : 'Unassigned';

          await this.notificationService
            .createNotification({
              userId: chore.createdBy,
              type: NotificationType.CHORE_ASSIGNED,
              title: 'Overdue Chore Alert',
              message: `"${chore.title}" assigned to ${assignedName} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
              data: { choreId: chore.id },
            })
            .catch((err) => {
              console.error(
                `Failed to send overdue notification to creator:`,
                err,
              );
            });
        }
      }
    }
  }

  private async sendOverdueNotification(
    choreId: string,
    choreTitle: string,
    userId: string,
    daysOverdue: number,
  ) {
    const message =
      daysOverdue === 1
        ? `"${choreTitle}" was due yesterday`
        : `"${choreTitle}" is ${daysOverdue} days overdue`;

    await this.notificationService
      .createNotification({
        userId,
        type: NotificationType.CHORE_ASSIGNED,
        title: 'Overdue Chore',
        message,
        data: { choreId },
      })
      .catch((err) => {
        console.error(`Failed to send overdue notification:`, err);
      });
  }
}
