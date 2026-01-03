import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationService } from '../notification/notification.service';

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
        participants: {
          every: {
            userId: {
              in: [userId1, userId2],
            },
          },
        },
        AND: [
          {
            participants: {
              some: {
                userId: userId1,
              },
            },
          },
          {
            participants: {
              some: {
                userId: userId2,
              },
            },
          },
        ],
      },
      include: {
        participants: {
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
        messages: {
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
        type: 'direct',
        participants: {
          create: [
            { userId: userId1 },
            { userId: userId2 },
          ],
        },
      },
      include: {
        participants: {
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
        messages: {
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
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
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
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1, // Get last message for preview
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // For each chat, get the other participant (for direct chats)
    return chats.map((chat) => {
      const otherParticipant = chat.participants.find((p) => p.userId !== userId);
      const lastMessage = chat.messages[0] || null;

      return {
        id: chat.id,
        type: chat.type,
        otherParticipant: otherParticipant?.user || null,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              sentAt: lastMessage.sentAt,
              senderId: lastMessage.senderId,
            }
          : null,
        unreadCount: 0, // TODO: Calculate unread count
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
        participants: {
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

    // Get messages
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
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
        participants: {
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
        chatId,
        senderId: userId,
        content: content.trim(),
      },
      include: {
        sender: {
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
    const senderName = message.sender.profile?.displayName || message.sender.email || 'Someone';
    const messagePreview = content.trim();
    
    for (const participant of participants) {
      await this.notificationService.notifyMessageReceived(
        participant.userId,
        chatId,
        message.id,
        senderName,
        messagePreview,
      ).catch(err => {
        console.error(`Failed to create notification for participant ${participant.userId}:`, err);
      });
    }

    return message;
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
        participants: {
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
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });
  }
}

