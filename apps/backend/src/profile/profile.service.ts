import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { TrustScoreService } from '../trust-score/trust-score.service';

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
        user: {
          include: {
            trustScore: {
              include: {
                history: {
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
          trustScore: {
            include: {
              history: {
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
      const trustScore = await this.trustScoreService.getOrCreateTrustScore(userId);

      // Return user data without password
      const { password, ...userData } = userWithTrustScore;

      return {
        id: null,
        userId: user.id,
        displayName: null,
        avatarUrl: null,
        bio: null,
        primaryCurrency: 'USD',
        homeCountryCurrency: 'USD',
        createdAt: user.createdAt,
        user: {
          ...userData,
          trustScore,
        },
      };
    }

    // Ensure trust score exists for existing profile and recalculate if needed
    if (!profile.user.trustScore) {
      profile.user.trustScore = await this.trustScoreService.getOrCreateTrustScore(userId);
    } else {
      // Always recalculate to ensure score is up-to-date
      const updatedTrustScore = await this.trustScoreService.getOrCreateTrustScore(userId);
      profile.user.trustScore = updatedTrustScore;
    }

    // Remove password from response if present
    if (profile.user && 'password' in profile.user) {
      const { password, ...userWithoutPassword } = profile.user;
      return { ...profile, user: userWithoutPassword };
    }

    return profile;
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
          user: {
            include: {
              trustScore: {
                include: {
                  history: {
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
      if (updated.user && 'password' in updated.user) {
        const { password, ...userWithoutPassword } = updated.user;
        return { ...updated, user: userWithoutPassword };
      }

      return updated;
    } else {
      // Create new profile
      const created = await this.prisma.userProfile.create({
        data: {
          userId,
          ...updateProfileDto,
        },
        include: {
          user: {
            include: {
              trustScore: {
                include: {
                  history: {
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
      if (created.user && 'password' in created.user) {
        const { password, ...userWithoutPassword } = created.user;
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
          user: {
            include: {
              trustScore: {
                include: {
                  history: {
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
      if (updated.user && 'password' in updated.user) {
        const { password, ...userWithoutPassword } = updated.user;
        return { ...updated, user: userWithoutPassword };
      }

      return updated;
    } else {
      const created = await this.prisma.userProfile.create({
        data: {
          userId,
          avatarUrl,
        },
        include: {
          user: {
            include: {
              trustScore: {
                include: {
                  history: {
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
      if (created.user && 'password' in created.user) {
        const { password, ...userWithoutPassword } = created.user;
        return { ...created, user: userWithoutPassword };
      }

      return created;
    }
  }
}


