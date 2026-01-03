import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { EmailService } from '../shared/email.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { FriendResponseDto } from './dto/friend-response.dto';
import { randomUUID } from 'crypto';
import { InviteUserDto } from './dto/invite-user.dto';

@Injectable()
export class FriendService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private emailService: EmailService,
  ) {}

  async sendFriendRequest(userId: string, dto: SendFriendRequestDto): Promise<FriendResponseDto> {
    // Determine if identifier is email or mobile number
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.friendEmailOrMobile);
    
    // Find friend by email or mobile number
    const friend = isEmail
      ? await this.prisma.user.findUnique({
          where: { email: dto.friendEmailOrMobile },
          include: { UserProfile: true },
        })
      : await this.prisma.user.findUnique({
          where: { mobileNumber: dto.friendEmailOrMobile },
          include: { UserProfile: true },
        });

    if (!friend) {
      throw new NotFoundException('User not found');
    }

    if (friend.id === userId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const existingFriendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId: friend.id },
          { userId: friend.id, friendId: userId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'blocked') {
        throw new ConflictException('Cannot send friend request to blocked user');
      }
      if (existingFriendship.status === 'accepted') {
        throw new ConflictException('Already friends with this user');
      }
      if (existingFriendship.status === 'pending' && existingFriendship.userId === userId) {
        throw new ConflictException('Friend request already sent');
      }
      // If friend sent request to us, accept it automatically
      if (existingFriendship.status === 'pending' && existingFriendship.userId === friend.id) {
        return this.acceptFriendRequest(userId, existingFriendship.id);
      }
    }

    // Create friend request
    const friendship = await this.prisma.friend.create({
      data: {
        id: randomUUID(),
        userId,
        friendId: friend.id,
        status: 'pending',
        updatedAt: new Date(),
      },
      include: {
        User_Friend_friendIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
    });

    // Notify the friend about the request
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        UserProfile: { select: { displayName: true } },
      },
    });
    const requesterName = requester?.UserProfile?.displayName || requester?.email || 'Someone';
    
    await this.notificationService.notifyFriendRequest(
      friend.id,
      userId,
      requesterName,
    ).catch(err => {
      console.error(`Failed to create notification for friend request:`, err);
    });

    return this.mapToFriendResponse(friendship);
  }

  async getFriends(userId: string): Promise<FriendResponseDto[]> {
    const friendships = await this.prisma.friend.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
      include: {
        User_Friend_userIdToUser: {
          include: {
            UserProfile: true,
          },
        },
        User_Friend_friendIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
      orderBy: {
        acceptedAt: 'desc',
      },
    });

    // Map to always show friend (not self) in response
    return friendships.map((f) => {
      const isUser = f.userId === userId;
      return this.mapToFriendResponse({
        ...f,
        friend: isUser ? f.User_Friend_friendIdToUser : f.User_Friend_userIdToUser,
      });
    });
  }

  async getPendingRequests(userId: string): Promise<{
    incoming: FriendResponseDto[];
    outgoing: FriendResponseDto[];
  }> {
    const incoming = await this.prisma.friend.findMany({
      where: {
        friendId: userId,
        status: 'pending',
      },
      include: {
        User_Friend_userIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const outgoing = await this.prisma.friend.findMany({
      where: {
        userId,
        status: 'pending',
      },
      include: {
        User_Friend_friendIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      incoming: incoming.map((f) => this.mapToFriendResponse({ ...f, friend: f.User_Friend_userIdToUser })),
      outgoing: outgoing.map((f) => this.mapToFriendResponse(f)),
    };
  }

  async acceptFriendRequest(userId: string, friendshipId: string): Promise<FriendResponseDto> {
    const friendship = await this.prisma.friend.findUnique({
      where: { id: friendshipId },
      include: {
        User_Friend_friendIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.friendId !== userId) {
      throw new BadRequestException('You can only accept friend requests sent to you');
    }

    if (friendship.status !== 'pending') {
      throw new BadRequestException('Friend request is not pending');
    }

    const updated = await this.prisma.friend.update({
      where: { id: friendshipId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
      include: {
        User_Friend_friendIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
    });

    // Notify the requester that their friend request was accepted
    const accepter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        UserProfile: { select: { displayName: true } },
      },
    });
    const accepterName = accepter?.UserProfile?.displayName || accepter?.email || 'Someone';
    
    await this.notificationService.notifyFriendAccepted(
      updated.userId,
      userId,
      accepterName,
    ).catch(err => {
      console.error(`Failed to create notification for friend acceptance:`, err);
    });

    return this.mapToFriendResponse(updated);
  }

  async rejectFriendRequest(userId: string, friendshipId: string): Promise<{ message: string }> {
    const friendship = await this.prisma.friend.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.friendId !== userId) {
      throw new BadRequestException('You can only reject friend requests sent to you');
    }

    if (friendship.status !== 'pending') {
      throw new BadRequestException('Friend request is not pending');
    }

    await this.prisma.friend.delete({
      where: { id: friendshipId },
    });

    return { message: 'Friend request rejected' };
  }

  async removeFriend(userId: string, friendshipId: string): Promise<{ message: string }> {
    const friendship = await this.prisma.friend.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    // Check if user is part of this friendship
    if (friendship.userId !== userId && friendship.friendId !== userId) {
      throw new BadRequestException('You can only remove your own friendships');
    }

    if (friendship.status !== 'accepted') {
      throw new BadRequestException('Can only remove accepted friendships');
    }

    await this.prisma.friend.delete({
      where: { id: friendshipId },
    });

    return { message: 'Friend removed successfully' };
  }

  async blockUser(userId: string, friendId: string): Promise<FriendResponseDto> {
    if (userId === friendId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if friendship exists
    const existingFriendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existingFriendship) {
      // Update existing friendship to blocked
      const updated = await this.prisma.friend.update({
        where: { id: existingFriendship.id },
        data: {
          userId, // Ensure userId is the blocker
          friendId,
          status: 'blocked',
        },
        include: {
          User_Friend_friendIdToUser: {
            include: {
              UserProfile: true,
            },
          },
        },
      });

      return this.mapToFriendResponse(updated);
    } else {
      // Create new blocked friendship
      const blocked = await this.prisma.friend.create({
        data: {
          id: randomUUID(),
          userId,
          friendId,
          status: 'blocked',
          updatedAt: new Date(),
        },
        include: {
          User_Friend_friendIdToUser: {
            include: {
              UserProfile: true,
            },
          },
        },
      });

      return this.mapToFriendResponse(blocked);
    }
  }

  async unblockUser(userId: string, friendId: string): Promise<{ message: string }> {
    if (userId === friendId) {
      throw new BadRequestException('Cannot unblock yourself');
    }

    // Find blocked friendship where userId is the blocker
    const blockedFriendship = await this.prisma.friend.findFirst({
      where: {
        userId,
        friendId,
        status: 'blocked',
      },
    });

    if (!blockedFriendship) {
      throw new NotFoundException('Blocked relationship not found');
    }

    // Delete the blocked friendship
    await this.prisma.friend.delete({
      where: { id: blockedFriendship.id },
    });

    return { message: 'User unblocked successfully' };
  }

  async getBlockedUsers(userId: string): Promise<FriendResponseDto[]> {
    const blockedFriendships = await this.prisma.friend.findMany({
      where: {
        userId,
        status: 'blocked',
      },
      include: {
        User_Friend_friendIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return blockedFriendships.map((friendship) => this.mapToFriendResponse(friendship));
  }

  async getMutualFriends(userId: string, targetUserId: string): Promise<FriendResponseDto[]> {
    // Get user's friends
    const userFriends = await this.prisma.friend.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
    });

    const userFriendIds = new Set(
      userFriends.map((f) => (f.userId === userId ? f.friendId : f.userId)),
    );

    // Get target user's friends
    const targetFriends = await this.prisma.friend.findMany({
      where: {
        OR: [
          { userId: targetUserId, status: 'accepted' },
          { friendId: targetUserId, status: 'accepted' },
        ],
      },
      include: {
        User_Friend_userIdToUser: {
          include: {
            UserProfile: true,
          },
        },
        User_Friend_friendIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
    });

    // Find mutual friends
    const mutualFriendIds = targetFriends
      .map((f) => {
        const friendId = f.userId === targetUserId ? f.friendId : f.userId;
        return userFriendIds.has(friendId) ? friendId : null;
      })
      .filter((id): id is string => id !== null);

    // Get full friend details
    const mutualFriends = await this.prisma.friend.findMany({
      where: {
        OR: [
          { userId, friendId: { in: mutualFriendIds }, status: 'accepted' },
          { friendId: userId, userId: { in: mutualFriendIds }, status: 'accepted' },
        ],
      },
      include: {
        User_Friend_userIdToUser: {
          include: {
            UserProfile: true,
          },
        },
        User_Friend_friendIdToUser: {
          include: {
            UserProfile: true,
          },
        },
      },
    });

      return mutualFriends.map((f) => {
        const isUser = f.userId === userId;
        return this.mapToFriendResponse({
          ...f,
          friend: isUser ? f.User_Friend_friendIdToUser : f.User_Friend_userIdToUser,
        });
      });
  }

  async searchUsers(userId: string, query: string): Promise<Array<{
    id: string;
    email: string;
    mobileNumber?: string | null;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
    friendStatus?: 'none' | 'pending' | 'accepted' | 'blocked';
  }>> {
    // Get all existing friendships for this user
    const friendships = await this.prisma.friend.findMany({
      where: {
        OR: [
          { userId },
          { friendId: userId },
        ],
      },
    });

    const friendStatusMap = new Map<string, 'pending' | 'accepted' | 'blocked'>();
    friendships.forEach((f) => {
      const otherUserId = f.userId === userId ? f.friendId : f.userId;
      friendStatusMap.set(otherUserId, f.status as 'pending' | 'accepted' | 'blocked');
    });

    // Search users by email, mobile number, or display name
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } }, // Exclude self
          {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { mobileNumber: { contains: query, mode: 'insensitive' } },
              { UserProfile: { displayName: { contains: query, mode: 'insensitive' } } },
            ],
          },
        ],
      },
      include: {
        UserProfile: true,
      },
      take: 20,
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      mobileNumber: user.mobileNumber,
      profile: user.UserProfile,
      friendStatus: friendStatusMap.get(user.id) || 'none',
    }));
  }

  private mapToFriendResponse(friendship: any): FriendResponseDto {
    const friend = friendship.friend || friendship.User_Friend_friendIdToUser || friendship.User_Friend_userIdToUser;
    return {
      id: friendship.id,
      userId: friendship.userId,
      friendId: friendship.friendId,
      status: friendship.status as 'pending' | 'accepted' | 'blocked',
      createdAt: friendship.createdAt,
      updatedAt: friendship.updatedAt,
      acceptedAt: friendship.acceptedAt,
      friend: {
        id: friend.id,
        email: friend.email,
        profile: friend.UserProfile
          ? {
              displayName: friend.UserProfile.displayName,
              avatarUrl: friend.UserProfile.avatarUrl,
            }
          : null,
      },
    };
  }

  async inviteUserToApp(userId: string, inviteDto: InviteUserDto) {
    // Validate that either email or mobileNumber is provided
    if (!inviteDto.email && !inviteDto.mobileNumber) {
      throw new BadRequestException('Either email or mobileNumber must be provided');
    }

    // Check if user already exists
    let existingUser: { id: string; email: string; mobileNumber: string | null } | null = null;
    if (inviteDto.email) {
      existingUser = await this.prisma.user.findUnique({
        where: { email: inviteDto.email },
      });
    } else if (inviteDto.mobileNumber) {
      existingUser = await this.prisma.user.findUnique({
        where: { mobileNumber: inviteDto.mobileNumber },
      });
    }

    if (existingUser) {
      throw new ConflictException('User with this email/mobile number already exists');
    }

    // Check for existing pending invitation
    const existingInvitation = await this.prisma.userInvitation.findFirst({
      where: {
        OR: [
          inviteDto.email ? { email: inviteDto.email } : {},
          inviteDto.mobileNumber ? { mobileNumber: inviteDto.mobileNumber } : {},
        ],
        status: 'pending',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      throw new ConflictException('Invitation already sent to this email/mobile number');
    }

    // Get inviter info
    const inviter = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserProfile: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    // Generate invitation token
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const invitation = await this.prisma.userInvitation.create({
      data: {
        id: randomUUID(),
        invitedBy: userId,
        email: inviteDto.email || null,
        mobileNumber: inviteDto.mobileNumber || null,
        token,
        status: 'pending',
        expiresAt,
      },
    });

    // Send email/SMS invitation
    const inviterName = inviter.UserProfile?.displayName || inviter.email;
    if (inviteDto.email) {
      await this.emailService.sendAppInvitation(
        inviteDto.email,
        inviterName,
        token,
      ).catch(err => {
        console.error('Failed to send email invitation:', err);
        // Don't throw - invitation is still created
      });
    }
    if (inviteDto.mobileNumber) {
      await this.emailService.sendSMSInvitation(
        inviteDto.mobileNumber,
        inviterName,
        token,
        false,
      ).catch(err => {
        console.error('Failed to send SMS invitation:', err);
        // Don't throw - invitation is still created
      });
    }

    return {
      invitationId: invitation.id,
      token,
      email: invitation.email,
      mobileNumber: invitation.mobileNumber,
      expiresAt: invitation.expiresAt,
      inviteLink: `${process.env.FRONTEND_URL || 'https://dreamfinora.com'}/register?invite=${token}`,
    };
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
      include: {
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

  async acceptInvitation(token: string, userId: string) {
    // Find invitation by token
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation has already been used or expired');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invitation has expired');
    }

    // Verify user email/mobile matches invitation
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

    // Mark invitation as accepted
    await this.prisma.userInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    // Automatically send friend request from inviter to new user
    try {
      await this.sendFriendRequest(invitation.invitedBy, {
        friendEmailOrMobile: user.email,
      });
    } catch (err) {
      // Ignore errors (user might already be friends or request might exist)
      console.log('Could not auto-send friend request:', err);
    }

    return { success: true };
  }
}

