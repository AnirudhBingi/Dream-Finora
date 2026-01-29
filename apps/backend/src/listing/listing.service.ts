import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateListingDto,
  ListingType,
  ListingStatus,
} from './dto/create-listing.dto';
import { CategorizationService } from '../shared/categorization.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationService } from '../notification/notification.service';
import { randomUUID } from 'crypto';

type ListingCommentWithUser = Prisma.ListingCommentGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        UserProfile: {
          select: {
            displayName: true;
            avatarUrl: true;
          };
        };
      };
    };
  };
}>;

type ListingWithRelations =
  Prisma.ListingGetPayload<Prisma.ListingDefaultArgs> & {
    User?: {
      id: string;
      email: string;
      UserProfile: {
        displayName: string | null;
        avatarUrl: string | null;
      } | null;
    } | null;
    ListingComment?: ListingCommentWithUser[];
    _count?: {
      ListingFavorite?: number;
      ListingComment?: number;
    };
  };

@Injectable()
export class ListingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categorizationService: CategorizationService,
    @Inject(forwardRef(() => TrustScoreService))
    private trustScoreService: TrustScoreService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Transform Prisma listing with User relation to match frontend interface
   */
  private transformListing(listing: ListingWithRelations) {
    const { User, ListingComment, ...listingWithoutUser } = listing;
    const latestComments = Array.isArray(ListingComment)
      ? ListingComment.slice(0, 2).map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          user: comment.user
            ? {
                id: comment.user.id,
                email: comment.user.email,
                profile: comment.user.UserProfile
                  ? {
                      displayName: comment.user.UserProfile.displayName,
                      avatarUrl: comment.user.UserProfile.avatarUrl,
                    }
                  : null,
              }
            : null,
        }))
      : [];
    const latestComment = latestComments.length > 0 ? latestComments[0] : null;
    return {
      ...listingWithoutUser,
      user: User
        ? {
            id: User.id,
            email: User.email,
            profile: User.UserProfile
              ? {
                  displayName: User.UserProfile.displayName,
                  avatarUrl: User.UserProfile.avatarUrl,
                }
              : null,
          }
        : null,
      latestComments,
      latestComment: latestComment
        ? {
            id: latestComment.id,
            content: latestComment.content,
            createdAt: latestComment.createdAt,
            user: latestComment.user
              ? {
                  id: latestComment.user.id,
                  email: latestComment.user.email,
                  profile: latestComment.user.profile
                    ? {
                        displayName: latestComment.user.profile.displayName,
                        avatarUrl: latestComment.user.profile.avatarUrl,
                      }
                    : null,
                }
              : null,
          }
        : null,
    };
  }

  private async attachListingInteractions(
    userId: string,
    listings: ListingWithRelations[],
    favoriteIds?: Set<string>,
  ) {
    if (listings.length === 0) {
      return [];
    }

    const resolvedFavoriteIds =
      favoriteIds ??
      new Set(
        (
          await this.prisma.listingFavorite.findMany({
            where: {
              userId,
              listingId: { in: listings.map((listing) => listing.id) },
            },
            select: { listingId: true },
          })
        ).map((favorite) => favorite.listingId),
      );

    return listings.map((listing) => ({
      ...this.transformListing(listing),
      isFavorited: resolvedFavoriteIds.has(listing.id),
      favoriteCount: listing._count?.ListingFavorite ?? 0,
      commentCount: listing._count?.ListingComment ?? 0,
    }));
  }

  private async ensureGroupAccess(
    userId: string,
    groupId: string,
    requireMembership: boolean,
  ) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, visibility: true },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.visibility === 'public' && !requireMembership) {
      return;
    }

    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this group');
    }
  }

  private parseCursor(cursor?: string) {
    if (!cursor) return null;
    const [timestamp, maybeType, maybeId] = cursor.split('|');
    const id = maybeId ?? maybeType;
    if (!timestamp || !id) return null;
    const createdAt = new Date(timestamp);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  }

  async createListing(userId: string, createListingDto: CreateListingDto) {
    if (createListingDto.groupId) {
      await this.ensureGroupAccess(
        userId,
        createListingDto.groupId,
        true,
      );
    }

    // Auto-categorize item listings if category not provided in metadata
    let metadata = createListingDto.metadata ?? null;
    const metadataRecord =
      metadata && typeof metadata === 'object'
        ? (metadata as Record<string, unknown>)
        : null;
    if (
      createListingDto.type === ListingType.ITEM &&
      (!metadataRecord || !metadataRecord.category)
    ) {
      const categoryMatch = this.categorizationService.categorizeItem(
        createListingDto.title,
      );
      if (categoryMatch) {
        metadata = {
          ...(metadataRecord ?? {}),
          category: categoryMatch.category,
        };
      }
    }
    const metadataValue = (metadata ?? Prisma.JsonNull) as
      | Prisma.InputJsonValue
      | typeof Prisma.JsonNull;

    const listing = await this.prisma.listing.create({
      data: {
        id: randomUUID(),
        userId,
        groupId: createListingDto.groupId ?? null,
        type: createListingDto.type,
        title: createListingDto.title,
        description: createListingDto.description,
        location: createListingDto.location,
        price: createListingDto.price,
        currency: createListingDto.currency || 'USD',
        images: createListingDto.images || [],
        metadata: metadataValue,
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
      console.error(
        'Failed to update trust score after listing creation:',
        err,
      );
      // Don't throw - trust score update failure shouldn't break listing creation
    });

    return this.transformListing(listing);
  }

  async getListings(
    userId: string,
    filters?: {
      type?: ListingType;
      status?: ListingStatus;
      search?: string;
      location?: string;
      userId?: string;
      groupId?: string;
      cursor?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.ListingWhereInput = {};

    if (filters?.groupId) {
      await this.ensureGroupAccess(userId, filters.groupId, false);
      where.groupId = filters.groupId;
    } else {
      where.groupId = null;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    } else {
      // Default to active listings
      where.status = ListingStatus.ACTIVE;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    const searchText = filters?.search?.trim();
    if (searchText) {
      where.OR = [
        { title: { contains: searchText, mode: 'insensitive' } },
        { description: { contains: searchText, mode: 'insensitive' } },
        { location: { contains: searchText, mode: 'insensitive' } },
      ];
    }

    if (filters?.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const sort = filters?.sort || 'newest';
    const useRelevance = Boolean(searchText) && sort === 'newest';
    const cursorInfo = this.parseCursor(filters?.cursor);
    const useCursor = Boolean(cursorInfo) && sort === 'newest' && !useRelevance;
    const orderBy =
      useCursor
        ? [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
        : sort === 'price_low'
          ? [{ price: 'asc' as const }, { createdAt: 'desc' as const }]
          : sort === 'price_high'
            ? [{ price: 'desc' as const }, { createdAt: 'desc' as const }]
            : sort === 'popular'
              ? [
                  { views: 'desc' as const },
                  { ListingFavorite: { _count: 'desc' as const } },
                  { createdAt: 'desc' as const },
                ]
              : [{ createdAt: 'desc' as const }];

    if (useCursor && cursorInfo) {
      const cursorFilter: Prisma.ListingWhereInput = {
        OR: [
          { createdAt: { lt: cursorInfo.createdAt } },
          { createdAt: cursorInfo.createdAt, id: { lt: cursorInfo.id } },
        ],
      };
      if (where.AND) {
        where.AND = Array.isArray(where.AND)
          ? [...where.AND, cursorFilter]
          : [where.AND, cursorFilter];
      } else {
        where.AND = [cursorFilter];
      }
    }

    const tokens = searchText
      ? searchText
          .split(/\s+/)
          .map((token) => token.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const computeListingScore = (listing: {
      title?: string | null;
      description?: string | null;
      location?: string | null;
    }) => {
      if (tokens.length === 0) return 0;
      const title = (listing.title || '').toLowerCase();
      const description = (listing.description || '').toLowerCase();
      const location = (listing.location || '').toLowerCase();
      return tokens.reduce((score, token) => {
        if (title.includes(token)) score += 3;
        if (location.includes(token)) score += 2;
        if (description.includes(token)) score += 1;
        return score;
      }, 0);
    };

    const take = useRelevance ? limit + offset : limit;
    const skip = useRelevance ? 0 : useCursor ? 0 : offset;

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
          _count: {
            select: {
              ListingFavorite: true,
              ListingComment: true,
            },
          },
          ListingComment: {
            take: 2,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
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
        orderBy,
        take,
        skip,
      }),
      this.prisma.listing.count({ where }),
    ]);

    const rankedListings = useRelevance
      ? [...listings]
          .map((listing) => ({
            listing,
            score: computeListingScore(listing),
          }))
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (
              b.listing.createdAt.getTime() - a.listing.createdAt.getTime()
            );
          })
          .map((entry) => entry.listing)
      : listings;

    const pagedListings = useRelevance
      ? rankedListings.slice(offset, offset + limit)
      : rankedListings;

    const transformedListings = await this.attachListingInteractions(
      userId,
      pagedListings,
    );

    return {
      listings: transformedListings,
      total,
      limit,
      offset,
      hasMore: offset + pagedListings.length < total,
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

    const transformed = this.transformListing(listing);
    return {
      ...transformed,
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
        console.error(
          'Failed to update trust score after listing status change:',
          err,
        );
        // Don't throw - trust score update failure shouldn't break the listing update
      });
    }

    return this.transformListing(updated);
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
    const listings = await this.prisma.listing.findMany({
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
        _count: {
          select: {
            ListingFavorite: true,
            ListingComment: true,
          },
        },
        ListingComment: {
          take: 2,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
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
      orderBy: [{ createdAt: 'desc' }],
    });

    return this.attachListingInteractions(userId, listings);
  }

  async addListingImages(
    userId: string,
    listingId: string,
    imageUrls: string[],
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

    const updatedImages = [...(listing.images || []), ...imageUrls];

    const updated = await this.prisma.listing.update({
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

    return this.transformListing(updated);
  }

  async updateListing(
    userId: string,
    listingId: string,
    updateData: Partial<CreateListingDto>,
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

    // Prepare update data
    const data: Prisma.ListingUpdateInput = {
      updatedAt: new Date(),
    };

    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.description !== undefined)
      data.description = updateData.description;
    if (updateData.location !== undefined) data.location = updateData.location;
    if (updateData.price !== undefined) data.price = updateData.price;
    if (updateData.currency !== undefined) data.currency = updateData.currency;
    if (updateData.images !== undefined) data.images = updateData.images;
    if (updateData.metadata !== undefined) {
      data.metadata = (updateData.metadata ?? Prisma.JsonNull) as
        | Prisma.InputJsonValue
        | typeof Prisma.JsonNull;
    }

    const updated = await this.prisma.listing.update({
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

    return this.transformListing(updated);
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
        const favoriterName =
          favoriter?.UserProfile?.displayName || favoriter?.email || 'Someone';

        await this.notificationService
          .notifyListingFavorited(
            listing.userId,
            listingId,
            listing.title,
            favoriterName,
          )
          .catch((err) => {
            console.error(
              `Failed to create notification for listing favorited:`,
              err,
            );
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
      include: {
        Listing: {
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
            _count: {
              select: {
                ListingFavorite: true,
                ListingComment: true,
              },
            },
          },
        },
      },
    });

    // Map favorites to listings and transform
    const listings = favorites
      .map((favorite) => favorite.Listing)
      .filter(
        (listing): listing is NonNullable<typeof listing> => listing !== null,
      )
      .map((listing) => listing);

    const favoriteIds = new Set(
      favorites.map((favorite) => favorite.listingId),
    );
    return this.attachListingInteractions(userId, listings, favoriteIds);
  }

  async getListingFavorites(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const favorites = await this.prisma.listingFavorite.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
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

    return favorites
      .map((favorite) => favorite.User)
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .map((user) => ({
        id: user.id,
        email: user.email,
        profile: user.UserProfile
          ? {
              displayName: user.UserProfile.displayName,
              avatarUrl: user.UserProfile.avatarUrl,
            }
          : null,
      }));
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
      include: {
        user: {
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

    // Map to match expected response format (user instead of User)
    return comments.map(({ user, ...comment }) => ({
      ...comment,
      user: user
        ? {
            id: user.id,
            email: user.email,
            profile: user.UserProfile
              ? {
                  displayName: user.UserProfile.displayName,
                  avatarUrl: user.UserProfile.avatarUrl,
                }
              : null,
          }
        : null,
    }));
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
      include: {
        user: {
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

    // Map to match expected response format (user instead of User)
    const commentWithUser = {
      ...comment,
      user: comment.user
        ? {
            id: comment.user.id,
            email: comment.user.email,
            profile: comment.user.UserProfile
              ? {
                  displayName: comment.user.UserProfile.displayName,
                  avatarUrl: comment.user.UserProfile.avatarUrl,
                }
              : null,
          }
        : null,
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
      const commenterName =
        commenter?.UserProfile?.displayName || commenter?.email || 'Someone';

      await this.notificationService
        .notifyListingCommented(
          listing.userId,
          listingId,
          listing.title,
          commenterName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for listing comment:`,
            err,
          );
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

  async editComment(
    userId: string,
    listingId: string,
    commentId: string,
    content: string,
  ) {
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
      include: {
        user: {
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

    // Map to match expected response format (user instead of User)
    return {
      ...updated,
      user: updated.user
        ? {
            id: updated.user.id,
            email: updated.user.email,
            profile: updated.user.UserProfile
              ? {
                  displayName: updated.user.UserProfile.displayName,
                  avatarUrl: updated.user.UserProfile.avatarUrl,
                }
              : null,
          }
        : null,
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
