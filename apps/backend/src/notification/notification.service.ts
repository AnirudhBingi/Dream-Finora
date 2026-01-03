import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum NotificationType {
  EXPENSE_ADDED = 'expense_added',
  EXPENSE_UPDATED = 'expense_updated',
  EXPENSE_DELETED = 'expense_deleted',
  EXPENSE_SETTLED = 'expense_settled',
  EXPENSE_SPLIT_PAID = 'expense_split_paid',
  CHORE_ASSIGNED = 'chore_assigned',
  CHORE_COMPLETED = 'chore_completed',
  GROUP_MEMBER_ADDED = 'group_member_added',
  GROUP_MEMBER_REMOVED = 'group_member_removed',
  FRIEND_REQUEST = 'friend_request',
  FRIEND_ACCEPTED = 'friend_accepted',
  MESSAGE_RECEIVED = 'message_received',
  LISTING_INTEREST = 'listing_interest',
  RIDE_CREATED = 'ride_created',
  RIDE_JOINED = 'ride_joined',
}

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async createNotification(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data || {},
      },
    });
  }

  async getNotifications(userId: string, limit: number = 50, offset: number = 0) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
    ]);

    return {
      notifications,
      total,
      hasMore: offset + notifications.length < total,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user can only mark their own notifications as read
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async deleteNotification(userId: string, notificationId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Ensure user can only delete their own notifications
      },
    });
  }

  // Helper methods for creating specific notification types
  async notifyExpenseAdded(
    userId: string,
    expenseId: string,
    expenseDescription: string,
    createdByName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.EXPENSE_ADDED,
      title: 'New Expense Added',
      message: `${createdByName} added expense: ${expenseDescription}`,
      data: { expenseId },
    });
  }

  async notifyExpenseUpdated(
    userId: string,
    expenseId: string,
    expenseDescription: string,
    updatedByName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.EXPENSE_UPDATED,
      title: 'Expense Updated',
      message: `${updatedByName} updated expense: ${expenseDescription}`,
      data: { expenseId },
    });
  }

  async notifyExpenseDeleted(
    userId: string,
    expenseDescription: string,
    deletedByName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.EXPENSE_DELETED,
      title: 'Expense Deleted',
      message: `${deletedByName} deleted expense: ${expenseDescription}`,
    });
  }

  async notifyExpenseSettled(
    userId: string,
    expenseId: string,
    amount: number,
    currency: string,
    settledByName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.EXPENSE_SETTLED,
      title: 'Expense Settled',
      message: `${settledByName} settled ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount)}`,
      data: { expenseId },
    });
  }

  async notifySplitPaid(
    userId: string,
    expenseId: string,
    expenseDescription: string,
    amount: number,
    currency: string,
    paidByName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.EXPENSE_SPLIT_PAID,
      title: 'Split Marked as Paid',
      message: `${paidByName} marked their split for "${expenseDescription}" as paid (${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount)})`,
      data: { expenseId },
    });
  }

  // Chore notifications
  async notifyChoreAssigned(
    userId: string,
    choreId: string,
    choreTitle: string,
    assignedByName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.CHORE_ASSIGNED,
      title: 'Chore Assigned',
      message: `${assignedByName} assigned you a chore: ${choreTitle}`,
      data: { choreId },
    });
  }

  async notifyChoreCompleted(
    userId: string,
    choreId: string,
    choreTitle: string,
    completedByName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.CHORE_COMPLETED,
      title: 'Chore Completed',
      message: `${completedByName} completed chore: ${choreTitle}`,
      data: { choreId },
    });
  }

  // Group notifications
  async notifyGroupMemberAdded(
    userId: string,
    groupId: string,
    groupName: string,
    addedByName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.GROUP_MEMBER_ADDED,
      title: 'Added to Circle',
      message: `${addedByName} added you to circle: ${groupName}`,
      data: { groupId },
    });
  }

  async notifyGroupMemberRemoved(
    userId: string,
    groupId: string,
    groupName: string,
    removedByName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.GROUP_MEMBER_REMOVED,
      title: 'Removed from Circle',
      message: `${removedByName} removed you from circle: ${groupName}`,
      data: { groupId },
    });
  }

  // Friend notifications
  async notifyFriendRequest(
    userId: string,
    friendId: string,
    requesterName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.FRIEND_REQUEST,
      title: 'Friend Request',
      message: `${requesterName} sent you a friend request`,
      data: { friendId },
    });
  }

  async notifyFriendAccepted(
    userId: string,
    friendId: string,
    accepterName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.FRIEND_ACCEPTED,
      title: 'Friend Request Accepted',
      message: `${accepterName} accepted your friend request`,
      data: { friendId },
    });
  }

  // Message notifications
  async notifyMessageReceived(
    userId: string,
    chatId: string,
    messageId: string,
    senderName: string,
    messagePreview: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.MESSAGE_RECEIVED,
      title: `Message from ${senderName}`,
      message: messagePreview.length > 50 ? `${messagePreview.substring(0, 50)}...` : messagePreview,
      data: { chatId, messageId },
    });
  }

  // Listing notifications
  async notifyListingInterest(
    userId: string,
    listingId: string,
    listingTitle: string,
    interestedByName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.LISTING_INTEREST,
      title: 'Listing Interest',
      message: `${interestedByName} is interested in your listing: ${listingTitle}`,
      data: { listingId },
    });
  }

  // Ride notifications
  async notifyRideCreated(
    userId: string,
    rideId: string,
    origin: string,
    destination: string,
    driverName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.RIDE_CREATED,
      title: 'Ride Created',
      message: `${driverName} created a ride: ${origin} → ${destination}`,
      data: { rideId },
    });
  }

  async notifyRideJoined(
    userId: string,
    rideId: string,
    origin: string,
    destination: string,
    joinerName: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.RIDE_JOINED,
      title: 'Ride Joined',
      message: `${joinerName} joined your ride: ${origin} → ${destination}`,
      data: { rideId },
    });
  }
}

