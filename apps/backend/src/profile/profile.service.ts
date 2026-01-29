import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private trustScoreService: TrustScoreService,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        User: {
          include: {
            TrustScore: {
              include: {
                TrustScoreHistory: {
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      // Return default profile if none exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get user with trust score
      const userWithTrustScore = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          TrustScore: {
            include: {
              TrustScoreHistory: {
                orderBy: { createdAt: 'desc' },
                take: 5,
              },
            },
          },
        },
      });

      if (!userWithTrustScore) {
        throw new NotFoundException('User not found');
      }

      // Ensure trust score exists
      const trustScore =
        await this.trustScoreService.getOrCreateTrustScore(userId);

      // Return user data without password
      const { password: _password, ...userData } = userWithTrustScore;
      void _password;

      return {
        id: null,
        userId: user.id,
        displayName: null,
        avatarUrl: null,
        bio: null,
        primaryCurrency: 'USD',
        homeCountryCurrency: 'USD',
        notificationsEnabled: true,
        emailNotifications: true,
        pushNotifications: true,
        expenseReminders: true,
        choreReminders: true,
        messageNotifications: true,
        listingNotifications: true,
        createdAt: user.createdAt,
        user: {
          ...userData,
          trustScore,
        },
      };
    }

    // Ensure trust score exists for existing profile and recalculate if needed
    if (!profile.User.TrustScore) {
      profile.User.TrustScore =
        await this.trustScoreService.getOrCreateTrustScore(userId);
    } else {
      // Always recalculate to ensure score is up-to-date
      const updatedTrustScore =
        await this.trustScoreService.getOrCreateTrustScore(userId);
      profile.User.TrustScore = updatedTrustScore;
    }

    // Transform TrustScore to trustScore and remove password if present
    const {
      password: _password,
      TrustScore,
      ...userWithoutPasswordAndTrustScore
    } = profile.User;
    void _password;
    return {
      ...profile,
      user: {
        ...userWithoutPasswordAndTrustScore,
        trustScore: TrustScore || null,
      },
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    // Check if profile exists
    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      // Update existing profile
      const updated = await this.prisma.userProfile.update({
        where: { userId },
        data: updateProfileDto,
        include: {
          User: {
            include: {
              TrustScore: {
                include: {
                  TrustScoreHistory: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                  },
                },
              },
            },
          },
        },
      });

      // Remove password from response
      if (updated.User && 'password' in updated.User) {
        const { password: _password, ...userWithoutPassword } = updated.User;
        void _password;
        return { ...updated, user: userWithoutPassword };
      }

      return updated;
    } else {
      // Create new profile
      const created = await this.prisma.userProfile.create({
        data: {
          id: randomUUID(),
          userId,
          ...updateProfileDto,
        },
        include: {
          User: {
            include: {
              TrustScore: {
                include: {
                  TrustScoreHistory: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                  },
                },
              },
            },
          },
        },
      });

      // Remove password from response
      if (created.User && 'password' in created.User) {
        const { password: _password, ...userWithoutPassword } = created.User;
        void _password;
        return { ...created, user: userWithoutPassword };
      }

      return created;
    }
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      const updated = await this.prisma.userProfile.update({
        where: { userId },
        data: { avatarUrl },
        include: {
          User: {
            include: {
              TrustScore: {
                include: {
                  TrustScoreHistory: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                  },
                },
              },
            },
          },
        },
      });

      // Remove password from response
      if (updated.User && 'password' in updated.User) {
        const { password: _password, ...userWithoutPassword } = updated.User;
        void _password;
        return { ...updated, user: userWithoutPassword };
      }

      return updated;
    } else {
      const created = await this.prisma.userProfile.create({
        data: {
          id: randomUUID(),
          userId,
          avatarUrl,
        },
        include: {
          User: {
            include: {
              TrustScore: {
                include: {
                  TrustScoreHistory: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                  },
                },
              },
            },
          },
        },
      });

      // Remove password from response
      if (created.User && 'password' in created.User) {
        const { password: _password, ...userWithoutPassword } = created.User;
        void _password;
        return { ...created, user: userWithoutPassword };
      }

      return created;
    }
  }

  async getUserProfile(
    viewerId: string,
    targetUserId: string,
  ): Promise<UserProfileResponseDto> {
    // If viewer is target user, they should use getProfile instead
    if (viewerId === targetUserId) {
      throw new BadRequestException(
        'Use GET /profile to view your own profile',
      );
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        UserProfile: true,
        TrustScore: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check friendship status
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userId: viewerId, friendId: targetUserId },
          { userId: targetUserId, friendId: viewerId },
        ],
      },
    });

    let friendStatus:
      | 'none'
      | 'pending_incoming'
      | 'pending_outgoing'
      | 'accepted'
      | 'blocked' = 'none';
    if (friendship) {
      if (friendship.status === 'blocked') {
        friendStatus = 'blocked';
      } else if (friendship.status === 'accepted') {
        friendStatus = 'accepted';
      } else if (friendship.status === 'pending') {
        // Determine if incoming or outgoing
        friendStatus =
          friendship.userId === viewerId
            ? 'pending_outgoing'
            : 'pending_incoming';
      }
    }

    // Get profile with default values
    const profile = targetUser.UserProfile || {
      id: null,
      userId: targetUserId,
      displayName: null,
      avatarUrl: null,
      bio: null,
      primaryCurrency: 'USD',
      homeCountryCurrency: 'USD',
      profileVisibility: 'public',
      trustScoreVisibility: 'public',
      createdAt: targetUser.createdAt,
    };

    const isFriend = friendStatus === 'accepted';
    const profileVisibility = (profile.profileVisibility || 'public') as
      | 'public'
      | 'friends'
      | 'private';
    const trustScoreVisibility = (profile.trustScoreVisibility || 'public') as
      | 'public'
      | 'friends'
      | 'private';

    // Apply privacy rules for profile visibility
    const canSeeProfile =
      profileVisibility === 'public' ||
      (profileVisibility === 'friends' && isFriend);
    const canSeeEmail = canSeeProfile;
    const canSeeBio = canSeeProfile;

    // Apply privacy rules for trust score visibility
    const canSeeTrustScore =
      trustScoreVisibility === 'public' ||
      (trustScoreVisibility === 'friends' && isFriend);
    const canSeeTrustScoreBreakdown =
      isFriend && trustScoreVisibility !== 'private';

    // Calculate mutual friends count
    const mutualFriendsCount = await this.calculateMutualFriendsCount(
      viewerId,
      targetUserId,
    );

    // Calculate listings count (all active listings are public)
    const listingsCount = await this.prisma.listing.count({
      where: {
        userId: targetUserId,
        status: 'ACTIVE',
      },
    });

    // Calculate shared groups count
    const sharedGroupsCount = await this.calculateSharedGroupsCount(
      viewerId,
      targetUserId,
    );

    // Get trust score if visible
    let trustScore: UserProfileResponseDto['trustScore'] = null;
    if (canSeeTrustScore && targetUser.TrustScore) {
      trustScore = {
        score: targetUser.TrustScore.score,
      };

      if (canSeeTrustScoreBreakdown) {
        // Get trust score breakdown from trust score service
        const breakdown =
          await this.trustScoreService.calculateTrustScoreBreakdown(
            targetUserId,
          );
        if (breakdown) {
          trustScore.breakdown = {
            expenseScore: breakdown.expenseScore || 0,
            choreScore: breakdown.choreScore || 0,
            communityScore: breakdown.communityScore || 0,
            reliabilityScore: breakdown.reliabilityScore || 0,
            responsivenessScore: breakdown.responsivenessScore || 0,
            accountTrustScore: breakdown.accountTrustScore || 0,
          };
        }
      }
    }

    // Build response
    const response: UserProfileResponseDto = {
      userId: targetUserId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: canSeeBio ? profile.bio : null,
      email: canSeeEmail ? targetUser.email : undefined,
      mobileNumber: canSeeEmail
        ? targetUser.mobileNumber || undefined
        : undefined,
      trustScore,
      friendStatus,
      mutualFriendsCount,
      listingsCount,
      sharedGroupsCount,
      profileVisibility,
      trustScoreVisibility,
    };

    return response;
  }

  private async calculateMutualFriendsCount(
    userId: string,
    targetUserId: string,
  ): Promise<number> {
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
    });

    // Count mutual friends
    const mutualCount = targetFriends.filter((f) => {
      const friendId = f.userId === targetUserId ? f.friendId : f.userId;
      return userFriendIds.has(friendId);
    }).length;

    return mutualCount;
  }

  private async calculateSharedGroupsCount(
    userId: string,
    targetUserId: string,
  ): Promise<number> {
    // Get user's groups
    const userGroups = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const userGroupIds = new Set(userGroups.map((gm) => gm.groupId));

    // Get target user's groups
    const targetGroups = await this.prisma.groupMember.findMany({
      where: { userId: targetUserId },
      select: { groupId: true },
    });

    // Count shared groups
    const sharedCount = targetGroups.filter((gm) =>
      userGroupIds.has(gm.groupId),
    ).length;

    return sharedCount;
  }
}
