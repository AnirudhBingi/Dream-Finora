import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto, ListingType, ListingStatus } from './dto/create-listing.dto';
import { CategorizationService } from '../shared/categorization.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationService } from '../notification/notification.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ListingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categorizationService: CategorizationService,
    @Inject(forwardRef(() => TrustScoreService))
    private trustScoreService: TrustScoreService,
    private readonly notificationService: NotificationService,
  ) {}

  async createListing(userId: string, createListingDto: CreateListingDto) {
    // Auto-categorize item listings if category not provided in metadata
    let metadata = createListingDto.metadata || {};
    if (
      createListingDto.type === ListingType.ITEM &&
      (!metadata || !(metadata as any).category)
    ) {
      const categoryMatch = this.categorizationService.categorizeItem(createListingDto.title);
      if (categoryMatch) {
        metadata = {
          ...metadata,
          category: categoryMatch.category,
        };
      }
    }

    const listing = await this.prisma.listing.create({
      data: {
        id: randomUUID(),
        userId,
        type: createListingDto.type,
        title: createListingDto.title,
        description: createListingDto.description,
        location: createListingDto.location,
        price: createListingDto.price,
        currency: createListingDto.currency || 'USD',
        images: createListingDto.images || [],
        metadata: (metadata || null) as any, // Cast to any for Prisma JSON type
        status: ListingStatus.ACTIVE,
        updatedAt: new Date(),
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

    // Update trust score for listing creator (engagement rate)
    await this.trustScoreService.updateCommunityScore(userId).catch((err) => {
      console.error('Failed to update trust score after listing creation:', err);
      // Don't throw - trust score update failure shouldn't break listing creation
    });

    return listing;
  }

  async getListings(
    userId: string,
    filters?: {
      type?: ListingType;
      status?: ListingStatus;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    } else {
      // Default to active listings
      where.status = ListingStatus.ACTIVE;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      listings,
      total,
      limit,
      offset,
      hasMore: offset + listings.length < total,
    };
  }

  async getListingById(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
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

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Increment view count (don't count own views)
    if (listing.userId !== userId) {
      await this.prisma.listing.update({
        where: { id: listingId },
        data: { views: { increment: 1 } },
      });
      listing.views += 1;
    }

    // Check if user has favorited this listing
    const isFavorited = await this.isFavorited(userId, listingId);

    // Get counts separately
    const [favoriteCount, commentCount] = await Promise.all([
      this.prisma.listingFavorite.count({
        where: { listingId },
      }),
      this.prisma.listingComment.count({
        where: { listingId },
      }),
    ]);

    return {
      ...listing,
      isFavorited,
      favoriteCount,
      commentCount,
    };
  }

  async updateListingStatus(
    userId: string,
    listingId: string,
    status: ListingStatus,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new BadRequestException('You can only update your own listings');
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status, updatedAt: new Date() },
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

    // Update trust score for listing owner when status changes to completed/closed
    // Only update if status changed to a "successful" status
    if (status === ListingStatus.COMPLETED || status === ListingStatus.CLOSED) {
      await this.trustScoreService.updateCommunityScore(userId).catch((err) => {
        console.error('Failed to update trust score after listing status change:', err);
        // Don't throw - trust score update failure shouldn't break the listing update
      });
    }

    return updated;
  }

  async deleteListing(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new BadRequestException('You can only delete your own listings');
    }

    await this.prisma.listing.delete({
      where: { id: listingId },
    });

    return { message: 'Listing deleted successfully' };
  }

  async getMyListings(userId: string) {
    return this.prisma.listing.findMany({
      where: { userId },
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async addListingImages(userId: string, listingId: string, imageUrls: string[]) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new BadRequestException('You can only update your own listings');
    }

    const updatedImages = [...(listing.images || []), ...imageUrls];

    return this.prisma.listing.update({
      where: { id: listingId },
      data: { images: updatedImages, updatedAt: new Date() },
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
  }

  async updateListing(userId: string, listingId: string, updateData: Partial<CreateListingDto>) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new BadRequestException('You can only update your own listings');
    }

    // Prepare update data
    const data: any = {
      updatedAt: new Date(),
    };

    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.location !== undefined) data.location = updateData.location;
    if (updateData.price !== undefined) data.price = updateData.price;
    if (updateData.currency !== undefined) data.currency = updateData.currency;
    if (updateData.images !== undefined) data.images = updateData.images;
    if (updateData.metadata !== undefined) data.metadata = updateData.metadata as any;

    return this.prisma.listing.update({
      where: { id: listingId },
      data,
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
  }

  async toggleFavorite(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const existing = await this.prisma.listingFavorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    if (existing) {
      // Unfavorite
      await this.prisma.listingFavorite.delete({
        where: {
          userId_listingId: {
            userId,
            listingId,
          },
        },
      });
      return { favorited: false };
    } else {
      // Favorite
      await this.prisma.listingFavorite.create({
        data: {
          id: randomUUID(),
          userId,
          listingId,
        },
      });

      // Notify listing creator (if not favoriting own listing)
      if (listing.userId !== userId) {
        const favoriter = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            UserProfile: { select: { displayName: true } },
          },
        });
        const favoriterName = favoriter?.UserProfile?.displayName || favoriter?.email || 'Someone';

        await this.notificationService.notifyListingFavorited(
          listing.userId,
          listingId,
          listing.title,
          favoriterName,
        ).catch(err => {
          console.error(`Failed to create notification for listing favorited:`, err);
        });
      }

      return { favorited: true };
    }
  }

  async getFavorites(userId: string) {
    const favorites = await this.prisma.listingFavorite.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch listings separately since there's no relation
    const listings = await Promise.all(
      favorites.map(async (favorite) => {
        const listing = await this.prisma.listing.findUnique({
          where: { id: favorite.listingId },
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
        return listing;
      }),
    );

    return listings.filter((listing): listing is NonNullable<typeof listing> => listing !== null);
  }

  async getComments(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const comments = await this.prisma.listingComment.findMany({
      where: { listingId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Fetch user data for each comment separately since there's no relation
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await this.prisma.user.findUnique({
          where: { id: comment.userId },
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
        return {
          ...comment,
          User: user || null,
        };
      }),
    );

    return commentsWithUsers;
  }

  async addComment(userId: string, listingId: string, content: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (!content.trim()) {
      throw new BadRequestException('Comment content cannot be empty');
    }

    const comment = await this.prisma.listingComment.create({
      data: {
        id: randomUUID(),
        userId,
        listingId,
        content: content.trim(),
        updatedAt: new Date(),
      },
    });

    // Fetch user data separately since there's no relation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    const commentWithUser = {
      ...comment,
      User: user || null,
    };

    // Notify listing creator (if not commenting on own listing)
    if (listing.userId !== userId) {
      const commenter = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          UserProfile: { select: { displayName: true } },
        },
      });
      const commenterName = commenter?.UserProfile?.displayName || commenter?.email || 'Someone';

      await this.notificationService.notifyListingCommented(
        listing.userId,
        listingId,
        listing.title,
        commenterName,
      ).catch(err => {
        console.error(`Failed to create notification for listing comment:`, err);
      });
    }

    return commentWithUser;
  }

  async deleteComment(userId: string, listingId: string, commentId: string) {
    const comment = await this.prisma.listingComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new BadRequestException('You can only delete your own comments');
    }

    if (comment.listingId !== listingId) {
      throw new BadRequestException('Comment does not belong to this listing');
    }

    await this.prisma.listingComment.delete({
      where: { id: commentId },
    });

    return { message: 'Comment deleted successfully' };
  }

  async editComment(userId: string, listingId: string, commentId: string, content: string) {
    const comment = await this.prisma.listingComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new BadRequestException('You can only edit your own comments');
    }

    if (comment.listingId !== listingId) {
      throw new BadRequestException('Comment does not belong to this listing');
    }

    if (!content.trim()) {
      throw new BadRequestException('Comment content cannot be empty');
    }

    const updated = await this.prisma.listingComment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
        updatedAt: new Date(),
      },
    });

    // Fetch user data separately since there's no relation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    return {
      ...updated,
      User: user || null,
    };
  }

  async generateShareLink(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // In production, this would generate a proper shareable link
    // For now, return a simple link format
    const baseUrl = process.env.FRONTEND_URL || 'https://dreamfinora.com';
    return {
      shareLink: `${baseUrl}/listings/${listingId}`,
      listingId,
    };
  }

  async isFavorited(userId: string, listingId: string): Promise<boolean> {
    const favorite = await this.prisma.listingFavorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    return !!favorite;
  }

  async getFavoriteCount(listingId: string): Promise<number> {
    return this.prisma.listingFavorite.count({
      where: { listingId },
    });
  }
}

