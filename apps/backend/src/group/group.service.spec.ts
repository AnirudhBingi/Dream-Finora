import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GroupService } from './group.service';

describe('GroupService', () => {
  const createService = () => {
    const prisma = {
      group: {
        findUnique: jest.fn(),
      },
      groupMember: {
        findUnique: jest.fn(),
      },
    };
    const currencyService = {};
    const notificationService = {};
    const emailService = {};
    const listingService = {
      getListings: jest.fn(),
    };
    const postService = {
      getPosts: jest.fn(),
    };

    const service = new GroupService(
      prisma as any,
      currencyService as any,
      notificationService as any,
      emailService as any,
      listingService as any,
      postService as any,
    );

    return { service, prisma, listingService, postService };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('denies feed access for non-members in private groups', async () => {
    const { service, prisma } = createService();
    prisma.group.findUnique.mockResolvedValue({
      id: 'group-1',
      visibility: 'private',
    });
    prisma.groupMember.findUnique.mockResolvedValue(null);

    await expect(
      service.getGroupFeed('user-1', 'group-1', { limit: 10 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows feed access for public groups without membership', async () => {
    const { service, prisma, listingService, postService } = createService();
    prisma.group.findUnique.mockResolvedValue({
      id: 'group-1',
      visibility: 'public',
    });
    listingService.getListings.mockResolvedValue([]);
    postService.getPosts.mockResolvedValue({
      posts: [],
      total: 0,
      limit: 10,
      offset: 0,
      hasMore: false,
    });

    const response = await service.getGroupFeed('user-1', 'group-1', {
      limit: 10,
    });

    expect(response.items).toEqual([]);
    expect(response.hasMore).toBe(false);
  });

  it('throws when group is missing', async () => {
    const { service, prisma } = createService();
    prisma.group.findUnique.mockResolvedValue(null);

    await expect(
      service.getGroupFeed('user-1', 'missing', { limit: 10 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sorts feed items by time then type and returns cursor', async () => {
    const { service, prisma, listingService, postService } = createService();
    prisma.group.findUnique.mockResolvedValue({
      id: 'group-1',
      visibility: 'public',
    });

    postService.getPosts.mockResolvedValue({
      posts: [
        {
          id: 'p1',
          createdAt: '2026-01-02T00:00:00.000Z',
        },
        {
          id: 'p2',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 2,
      limit: 3,
      offset: 0,
      hasMore: false,
    });
    listingService.getListings.mockResolvedValue([
      {
        id: 'l1',
        createdAt: '2026-01-03T00:00:00.000Z',
      },
      {
        id: 'l2',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const response = await service.getGroupFeed('user-1', 'group-1', {
      limit: 3,
    });

    expect(response.items.map((item) => item.data.id)).toEqual(['l1', 'p1', 'p2']);
    expect(response.nextCursor).toBe(
      '2026-01-01T00:00:00.000Z|post|p2',
    );
    expect(response.hasMore).toBe(true);
  });
});
