import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationService } from '../notification/notification.service';
import { randomUUID } from 'crypto';

@Injectable()
export class MessagingService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => TrustScoreService))
    private trustScoreService: TrustScoreService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Find or create a direct chat between two users
   */
  async findOrCreateDirectChat(userId1: string, userId2: string) {
    // Check if a direct chat already exists between these two users
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        type: 'direct',
        ChatParticipant: {
          every: {
            userId: {
              in: [userId1, userId2],
            },
          },
        },
        AND: [
          {
            ChatParticipant: {
              some: {
                userId: userId1,
              },
            },
          },
          {
            ChatParticipant: {
              some: {
                userId: userId2,
              },
            },
          },
        ],
      },
      include: {
        ChatParticipant: {
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
        Message: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existingChat) {
      return existingChat;
    }

    // Create new direct chat
    const chat = await this.prisma.chat.create({
      data: {
        id: randomUUID(),
        type: 'direct',
        updatedAt: new Date(),
        ChatParticipant: {
          create: [
            { id: randomUUID(), userId: userId1 },
            { id: randomUUID(), userId: userId2 },
          ],
        },
      },
      include: {
        ChatParticipant: {
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
        Message: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });

    return chat;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        ChatParticipant: {
          some: {
            userId,
          },
        },
      },
      include: {
        ChatParticipant: {
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
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
            avatarUrl: true,
            createdBy: true,
          },
        },
        Message: {
          orderBy: { sentAt: 'desc' },
          take: 1, // Get last message for preview
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get user's lastReadAt for each chat to calculate unread count
    const chatIds = chats.map(chat => chat.id);
    const participantRecords = await this.prisma.chatParticipant.findMany({
      where: {
        chatId: { in: chatIds },
        userId,
      },
      select: {
        chatId: true,
        lastReadAt: true,
      },
    });

    const lastReadMap = new Map<string, Date | null>();
    participantRecords.forEach(p => {
      lastReadMap.set(p.chatId, p.lastReadAt);
    });

    // Get unread message counts for each chat
    const unreadCounts = await Promise.all(
      chatIds.map(async (chatId) => {
        const lastReadAt = lastReadMap.get(chatId);
        if (!lastReadAt) {
          // If never read, count all messages from others
          const count = await this.prisma.message.count({
            where: {
              chatId,
              senderId: { not: userId },
              deletedAt: null,
            },
          });
          return { chatId, count };
        }
        // Count messages after lastReadAt from others
        const count = await this.prisma.message.count({
          where: {
            chatId,
            senderId: { not: userId },
            sentAt: { gt: lastReadAt },
            deletedAt: null,
          },
        });
        return { chatId, count };
      })
    );

    const unreadCountMap = new Map<string, number>();
    unreadCounts.forEach(({ chatId, count }) => {
      unreadCountMap.set(chatId, count);
    });

    // For each chat, get the other participant (for direct chats) or group info
    return chats.map((chat) => {
      const isGroupChat = chat.type === 'group' || chat.groupId !== null;
      const otherParticipant = chat.ChatParticipant.find((p) => p.userId !== userId);
      const lastMessage = chat.Message[0] || null;
      const unreadCount = unreadCountMap.get(chat.id) || 0;

      if (isGroupChat && chat.Group) {
        return {
          id: chat.id,
          type: 'group',
          group: {
            id: chat.Group.id,
            name: chat.Group.name,
            description: chat.Group.description,
            avatarUrl: chat.Group.avatarUrl,
          },
          otherParticipant: null,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                sentAt: lastMessage.sentAt,
                senderId: lastMessage.senderId,
              }
            : null,
          unreadCount,
          updatedAt: chat.updatedAt,
        };
      }

      return {
        id: chat.id,
        type: chat.type,
        otherParticipant: otherParticipant?.User || null,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              sentAt: lastMessage.sentAt,
              senderId: lastMessage.senderId,
            }
          : null,
        unreadCount,
        updatedAt: chat.updatedAt,
      };
    });
  }

  /**
   * Get messages for a specific chat
   */
  async getMessages(userId: string, chatId: string) {
    // Verify user is a participant
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        ChatParticipant: {
          some: {
            userId,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found or you do not have access');
    }

    // Update lastReadAt for the user
    await this.prisma.chatParticipant.updateMany({
      where: {
        chatId,
        userId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    // Get messages (include deleted messages but mark them)
    const messages = await this.prisma.message.findMany({
      where: { chatId },
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
      orderBy: { sentAt: 'asc' },
    });

    return messages;
  }

  /**
   * Send a message
   */
  async sendMessage(userId: string, chatId: string, content: string) {
    // Verify user is a participant
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        ChatParticipant: {
          some: {
            userId,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found or you do not have access');
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        id: randomUUID(),
        chatId,
        senderId: userId,
        content: content.trim(),
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

    // Update chat's updatedAt
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Update trust score for message sender (response rate - they're responding)
    // Get other participants in the chat to update their scores too
    const participants = await this.prisma.chatParticipant.findMany({
      where: {
        chatId,
        userId: { not: userId }, // Other participants
      },
      select: {
        userId: true,
      },
    });

    // Update trust score for sender (they're responding to messages)
    await this.trustScoreService.updateCommunityScore(userId).catch((err) => {
      console.error('Failed to update trust score after sending message:', err);
      // Don't throw - trust score update failure shouldn't break message sending
    });

    // Update trust scores for other participants asynchronously (they received a message)
    // This will update their response rate when they respond
    for (const participant of participants) {
      await this.trustScoreService.updateCommunityScore(participant.userId).catch((err) => {
        console.error(`Failed to update trust score for participant ${participant.userId} after receiving message:`, err);
        // Don't throw - trust score update failure shouldn't break message sending
      });
    }

    // Notify other participants about the new message
    const senderName = message.User.UserProfile?.displayName || message.User.email || 'Someone';
    const messagePreview = content.trim();
    
    // Get chat info to determine if it's a group chat
    const chatInfo = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        type: true,
        groupId: true,
        Group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    const isGroupChat = chatInfo?.type === 'group' || chatInfo?.groupId !== null;
    
    for (const participant of participants) {
      await this.notificationService.notifyMessageReceived(
        participant.userId,
        chatId,
        message.id,
        senderName,
        messagePreview,
        isGroupChat ? chatInfo?.Group?.name : undefined,
        chatInfo?.groupId || undefined,
      ).catch(err => {
        console.error(`Failed to create notification for participant ${participant.userId}:`, err);
      });
    }

    return message;
  }

  /**
   * Create or get group chat for a group
   */
  async createOrGetGroupChat(userId: string, groupId: string) {
    // Verify user is a member of the group
    const groupMember = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
      },
    });

    if (!groupMember) {
      throw new NotFoundException('You are not a member of this group');
    }

    // Check if group chat already exists
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        groupId,
        type: 'group',
      },
      include: {
        ChatParticipant: {
          where: {
            userId,
          },
        },
      },
    });

    if (existingChat) {
      // User is already a participant
      if (existingChat.ChatParticipant.length > 0) {
        return existingChat;
      }
      // Add user as participant if chat exists but user isn't in it
      await this.prisma.chatParticipant.create({
        data: {
          id: randomUUID(),
          chatId: existingChat.id,
          userId,
        },
      });
      return existingChat;
    }

    // Get all group members
    const groupMembers = await this.prisma.groupMember.findMany({
      where: {
        groupId,
      },
      select: {
        userId: true,
      },
    });

    // Create new group chat
    const chat = await this.prisma.chat.create({
      data: {
        id: randomUUID(),
        type: 'group',
        groupId,
        updatedAt: new Date(),
        ChatParticipant: {
          create: groupMembers.map(member => ({
            id: randomUUID(),
            userId: member.userId,
          })),
        },
      },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
            avatarUrl: true,
          },
        },
        ChatParticipant: {
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
      },
    });

    return chat;
  }

  /**
   * Start a conversation with a user (from listing contact, etc.)
   */
  async startConversation(userId: string, otherUserId: string, initialMessage?: string) {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }

    // Verify other user exists
    const otherUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
    });

    if (!otherUser) {
      throw new NotFoundException('User not found');
    }

    // Find or create chat
    const chat = await this.findOrCreateDirectChat(userId, otherUserId);

    // Send initial message if provided
    if (initialMessage) {
      await this.sendMessage(userId, chat.id, initialMessage);
    }

    // Return chat with participants
    return this.prisma.chat.findUnique({
      where: { id: chat.id },
      include: {
        ChatParticipant: {
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
        Message: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Edit a message (within time limit, e.g., 5 minutes)
   */
  async editMessage(userId: string, chatId: string, messageId: string, newContent: string) {
    // Verify user is a participant
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        ChatParticipant: {
          some: {
            userId,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found or you do not have access');
    }

    // Get message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        chatId: true,
        senderId: true,
        content: true,
        sentAt: true,
        readAt: true,
        editedAt: true,
        deletedAt: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.chatId !== chatId) {
      throw new BadRequestException('Message does not belong to this chat');
    }

    if (message.senderId !== userId) {
      throw new BadRequestException('You can only edit your own messages');
    }

    // Check if message was deleted
    if (message.deletedAt) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    // Check time limit (5 minutes = 300000 ms)
    const timeSinceSent = Date.now() - message.sentAt.getTime();
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (timeSinceSent > FIVE_MINUTES) {
      throw new BadRequestException('Message can only be edited within 5 minutes of sending');
    }

    if (!newContent.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }

    // Update message
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent.trim(),
        editedAt: new Date(),
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

    return updated;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(userId: string, chatId: string, messageId: string) {
    // Verify user is a participant
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        ChatParticipant: {
          some: {
            userId,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found or you do not have access');
    }

    // Get message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        chatId: true,
        senderId: true,
        content: true,
        sentAt: true,
        readAt: true,
        editedAt: true,
        deletedAt: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.chatId !== chatId) {
      throw new BadRequestException('Message does not belong to this chat');
    }

    if (message.senderId !== userId) {
      throw new BadRequestException('You can only delete your own messages');
    }

    if (message.deletedAt) {
      throw new BadRequestException('Message is already deleted');
    }

    // Soft delete
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        content: '', // Clear content for deleted messages
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

    return updated;
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(userId: string, chatId: string, messageId: string) {
    // Verify user is a participant
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        ChatParticipant: {
          some: {
            userId,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found or you do not have access');
    }

    // Get message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        chatId: true,
        senderId: true,
        content: true,
        sentAt: true,
        readAt: true,
        editedAt: true,
        deletedAt: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.chatId !== chatId) {
      throw new BadRequestException('Message does not belong to this chat');
    }

    // Only mark as read if not sent by current user
    if (message.senderId === userId) {
      return message;
    }

    // Update readAt
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        readAt: new Date(),
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

    return updated;
  }
}

