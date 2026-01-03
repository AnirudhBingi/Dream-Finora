import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto, ListingType, ListingStatus } from './dto/create-listing.dto';
import { CategorizationService } from '../shared/categorization.service';
import { TrustScoreService } from '../trust-score/trust-score.service';

@Injectable()
export class ListingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categorizationService: CategorizationService,
    @Inject(forwardRef(() => TrustScoreService))
    private trustScoreService: TrustScoreService,
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
      },
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

    return this.prisma.listing.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getListingById(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
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

    return listing;
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
    });
  }
}

