import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../shared/currency.service';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';
import { EmailService } from '../shared/email.service';
import { ListingService } from '../listing/listing.service';
import { PostService } from '../post/post.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { randomUUID } from 'crypto';

type GroupUserSummary = {
  id: string;
  email: string;
  UserProfile: {
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

type GroupMemberWithUser = Prisma.GroupMemberGetPayload<{
  include: {
    User: {
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

type GroupWithMembers = Prisma.GroupGetPayload<{
  include: {
    GroupMember: {
      include: {
        User: {
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
    };
    User: {
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

type GroupResponse = Omit<GroupWithMembers, 'GroupMember' | 'User'> & {
  members: Array<{
    id: string;
    groupId: string;
    userId: string;
    role: string;
    createdAt: string;
    user: {
      id: string;
      email: string;
      profile: {
        displayName: string | null;
        avatarUrl: string | null;
      } | null;
    };
  }>;
  createdByUser: {
    id: string;
    email: string;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
};

type UserWithProfile = Prisma.UserGetPayload<{
  include: {
    UserProfile: true;
  };
}>;

type ExpenseSplitWithExpense = Prisma.ExpenseSplitGetPayload<{
  include: {
    User: {
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
    Expense: {
      include: {
        User_Expense_createdByToUser: {
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
        User_Expense_paidByToUser: {
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
    };
  };
}>;

type ConvertedExpenseSplit = ExpenseSplitWithExpense & {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
};

type GroupFeedPost = Awaited<
  ReturnType<PostService['getPosts']>
>['posts'][number];
type GroupFeedListing =
  Awaited<ReturnType<ListingService['getListings']>> extends Array<
    infer ListingItem
  >
    ? ListingItem
    : Awaited<ReturnType<ListingService['getListings']>> extends {
          listings: Array<infer ListingItem>;
        }
      ? ListingItem
      : never;

type GroupFeedItem =
  | { type: 'post'; data: GroupFeedPost }
  | { type: 'listing'; data: GroupFeedListing };

@Injectable()
export class GroupService {
  constructor(
    private prisma: PrismaService,
    private currencyService: CurrencyService,
    private notificationService: NotificationService,
    private emailService: EmailService,
    private listingService: ListingService,
    private postService: PostService,
  ) {}

  private async ensureGroupFeedAccess(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, visibility: true },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.visibility === 'public') {
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

  async getGroupFeed(
    userId: string,
    groupId: string,
    options?: { limit?: number; cursor?: string },
  ) {
    await this.ensureGroupFeedAccess(userId, groupId);

    const limit = options?.limit ?? 20;
    const cursor = options?.cursor;

    const [postsResponse, listingsResponse] = await Promise.all([
      this.postService.getPosts(userId, { groupId, limit, cursor }),
      this.listingService.getListings(userId, { groupId, limit, cursor }),
    ]);

    const posts: GroupFeedPost[] = postsResponse.posts ?? [];
    const listings: GroupFeedListing[] = Array.isArray(listingsResponse)
      ? listingsResponse
      : (listingsResponse.listings ?? []);

    const items: GroupFeedItem[] = [
      ...posts.map((post) => ({ type: 'post' as const, data: post })),
      ...listings.map((listing) => ({
        type: 'listing' as const,
        data: listing,
      })),
    ]
      .sort((a, b) => {
        const aTime = new Date(a.data.createdAt).getTime();
        const bTime = new Date(b.data.createdAt).getTime();
        if (aTime !== bTime) return bTime - aTime;
        if (a.type !== b.type) return a.type === 'post' ? -1 : 1;
        return String(b.data.id).localeCompare(String(a.data.id));
      })
      .slice(0, limit);

    const lastItem = items[items.length - 1];
    const nextCursor = lastItem
      ? `${new Date(lastItem.data.createdAt).toISOString()}|${lastItem.type}|${lastItem.data.id}`
      : null;

    return {
      items,
      nextCursor,
      hasMore: items.length === limit,
    };
  }

  async createGroup(userId: string, createGroupDto: CreateGroupDto) {
    // Verify all member IDs exist (if provided)
    if (createGroupDto.memberIds && createGroupDto.memberIds.length > 0) {
      const uniqueMemberIds = [...new Set(createGroupDto.memberIds)];
      const users = await this.prisma.user.findMany({
        where: { id: { in: uniqueMemberIds } },
        select: { id: true },
      });

      if (users.length !== uniqueMemberIds.length) {
        throw new BadRequestException('One or more member IDs are invalid');
      }
    }

    // Create group with creator as first member (ADMIN role)
    const memberIds = createGroupDto.memberIds || [];
    const allMemberIds = [userId, ...memberIds.filter((id) => id !== userId)]; // Ensure creator is included

    const group = await this.prisma.group.create({
      data: {
        id: randomUUID(),
        name: createGroupDto.name,
        description: createGroupDto.description,
        icon: createGroupDto.icon || 'group',
        avatarUrl: createGroupDto.avatarUrl || null,
        allowMemberEditing: createGroupDto.allowMemberEditing ?? false,
        visibility: createGroupDto.visibility ?? 'private',
        createdBy: userId,
        GroupMember: {
          create: allMemberIds.map((memberId) => ({
            id: randomUUID(),
            userId: memberId,
            role: memberId === userId ? 'ADMIN' : 'MEMBER', // Creator is ADMIN, others are MEMBER
          })),
        },
      },
      include: {
        GroupMember: {
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

    // Transform Prisma structure to match frontend expectations
    const { GroupMember, User, ...groupBase } = group;
    const response: GroupResponse = {
      ...groupBase,
      visibility: groupBase.visibility,
      members: GroupMember.map((member: GroupMemberWithUser) => ({
        id: member.id,
        groupId: member.groupId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt.toISOString(),
        user: {
          id: member.User.id,
          email: member.User.email,
          profile: member.User.UserProfile
            ? {
                displayName: member.User.UserProfile.displayName,
                avatarUrl: member.User.UserProfile.avatarUrl,
              }
            : null,
        },
      })),
      createdByUser: {
        id: User.id,
        email: User.email,
        profile: User.UserProfile
          ? {
              displayName: User.UserProfile.displayName,
              avatarUrl: User.UserProfile.avatarUrl,
            }
          : null,
      },
    };
    return response;
  }

  async getGroups(userId: string, limit: number = 50, offset: number = 0) {
    // Get all groups where user is a member
    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where: {
          GroupMember: {
            some: {
              userId,
            },
          },
        },
        include: {
          GroupMember: {
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
              Expense: true,
              Chore: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.group.count({
        where: {
          GroupMember: {
            some: {
              userId,
            },
          },
        },
      }),
    ]);

    // Get ride counts for each group (via expenses)
    const groupIds = groups.map((g) => g.id);

    // First, get all expenses for these groups
    const expenses = await this.prisma.expense.findMany({
      where: {
        groupId: { in: groupIds },
      },
      select: {
        id: true,
        groupId: true,
      },
    });

    const expenseIds = expenses.map((e) => e.id);
    const expenseToGroupMap = new Map<string, string>();
    expenses.forEach((e) => {
      if (e.groupId) {
        expenseToGroupMap.set(e.id, e.groupId);
      }
    });

    // Then get rides linked to these expenses
    const rides = await this.prisma.ride.findMany({
      where: {
        expenseId: { in: expenseIds },
      },
      select: {
        expenseId: true,
      },
    });

    // Create a map of groupId -> ride count
    const groupRideCountMap = new Map<string, number>();
    rides.forEach((ride) => {
      if (ride.expenseId) {
        const groupId = expenseToGroupMap.get(ride.expenseId);
        if (groupId) {
          const currentCount = groupRideCountMap.get(groupId) || 0;
          groupRideCountMap.set(groupId, currentCount + 1);
        }
      }
    });

    // Get message counts for each group (via chats)
    const groupChats = await this.prisma.chat.findMany({
      where: {
        groupId: { in: groupIds },
      },
      select: {
        groupId: true,
        _count: {
          select: {
            Message: true,
          },
        },
      },
    });

    // Create a map of groupId -> message count
    const groupMessageCountMap = new Map<string, number>();
    groupChats.forEach((chat) => {
      if (chat.groupId) {
        groupMessageCountMap.set(chat.groupId, chat._count.Message);
      }
    });

    // Transform Prisma structure to match frontend expectations
    const transformedGroups = groups.map((group) => {
      const { GroupMember, User, ...groupBase } = group;
      return {
        ...groupBase,
        members: GroupMember.map((member) => ({
          id: member.id,
          groupId: member.groupId,
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt.toISOString(),
          user: {
            id: member.User.id,
            email: member.User.email,
            profile: member.User.UserProfile
              ? {
                  displayName: member.User.UserProfile.displayName,
                  avatarUrl: member.User.UserProfile.avatarUrl,
                }
              : null,
          },
        })),
        createdByUser: {
          id: User.id,
          email: User.email,
          profile: User.UserProfile
            ? {
                displayName: User.UserProfile.displayName,
                avatarUrl: User.UserProfile.avatarUrl,
              }
            : null,
        },
        _count: {
          ...groupBase._count,
          rides: groupRideCountMap.get(group.id) || 0,
          messages: groupMessageCountMap.get(group.id) || 0,
        },
      };
    });

    return {
      groups: transformedGroups,
      total,
      limit,
      offset,
      hasMore: offset + groups.length < total,
    };
  }

  async getPublicGroups(
    userId: string,
    memberId?: string,
    limit: number = 50,
    offset: number = 0,
    query?: string,
  ) {
    const where: Prisma.GroupWhereInput = {
      visibility: 'public',
      ...(memberId
        ? {
            GroupMember: {
              some: {
                userId: memberId,
              },
            },
          }
        : {}),
      ...(query
        ? {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        include: {
          GroupMember: {
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
      this.prisma.group.count({ where }),
    ]);

    const groupIds = groups.map((group) => group.id);
    const joinRequests = await this.prisma.groupJoinRequest.findMany({
      where: {
        userId,
        groupId: { in: groupIds },
      },
      select: {
        groupId: true,
        status: true,
      },
    });

    const joinRequestMap = new Map<string, string>();
    joinRequests.forEach((request) => {
      joinRequestMap.set(request.groupId, request.status);
    });

    const transformedGroups = groups.map((group) => {
      const { GroupMember, User, ...groupBase } = group;
      const isMember = GroupMember.some((member) => member.userId === userId);
      return {
        ...groupBase,
        members: GroupMember.map((member) => ({
          id: member.id,
          groupId: member.groupId,
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt.toISOString(),
          user: {
            id: member.User.id,
            email: member.User.email,
            profile: member.User.UserProfile
              ? {
                  displayName: member.User.UserProfile.displayName,
                  avatarUrl: member.User.UserProfile.avatarUrl,
                }
              : null,
          },
        })),
        createdByUser: {
          id: User.id,
          email: User.email,
          profile: User.UserProfile
            ? {
                displayName: User.UserProfile.displayName,
                avatarUrl: User.UserProfile.avatarUrl,
              }
            : null,
        },
        isMember,
        joinRequestStatus: joinRequestMap.get(group.id) || null,
      };
    });

    return {
      groups: transformedGroups,
      total,
      limit,
      offset,
      hasMore: offset + groups.length < total,
    };
  }

  async requestToJoinGroup(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        visibility: true,
        createdBy: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.visibility !== 'public') {
      throw new BadRequestException('Group is not open for public requests');
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('You are already a member of this group');
    }

    const existingRequest = await this.prisma.groupJoinRequest.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (existingRequest?.status === 'pending') {
      throw new BadRequestException('Join request already sent');
    }

    const joinRequest = await this.prisma.groupJoinRequest.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      update: {
        status: 'pending',
        handledBy: null,
        handledAt: null,
      },
      create: {
        id: randomUUID(),
        groupId,
        userId,
        status: 'pending',
      },
    });

    await this.notificationService.createNotification({
      userId: group.createdBy,
      type: NotificationType.GROUP_JOIN_REQUEST,
      title: 'New join request',
      message: 'Someone requested to join your circle.',
      data: { groupId: group.id, requestId: joinRequest.id },
    });

    return joinRequest;
  }

  async getJoinRequests(userId: string, groupId: string) {
    const adminMembership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      throw new BadRequestException('Only group admins can view join requests');
    }

    return this.prisma.groupJoinRequest.findMany({
      where: { groupId },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveJoinRequest(userId: string, groupId: string, requestId: string) {
    const adminMembership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      throw new BadRequestException(
        'Only group admins can approve join requests',
      );
    }

    const request = await this.prisma.groupJoinRequest.findFirst({
      where: { id: requestId, groupId },
    });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Join request is not pending');
    }

    await this.prisma.groupMember.create({
      data: {
        id: randomUUID(),
        groupId,
        userId: request.userId,
        role: 'MEMBER',
      },
    });

    const updated = await this.prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        handledBy: userId,
        handledAt: new Date(),
      },
    });

    await this.notificationService.createNotification({
      userId: request.userId,
      type: NotificationType.GROUP_JOIN_APPROVED,
      title: 'Request approved',
      message: 'Your request to join the circle was approved.',
      data: { groupId },
    });

    return updated;
  }

  async declineJoinRequest(userId: string, groupId: string, requestId: string) {
    const adminMembership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      throw new BadRequestException(
        'Only group admins can decline join requests',
      );
    }

    const request = await this.prisma.groupJoinRequest.findFirst({
      where: { id: requestId, groupId },
    });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Join request is not pending');
    }

    return this.prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'declined',
        handledBy: userId,
        handledAt: new Date(),
      },
    });
  }

  async getGroupById(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: {
        id: groupId,
      },
      include: {
        GroupMember: {
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
        Expense: {
          include: {
            ExpenseSplit: {
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
            User_Expense_createdByToUser: {
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
            Ride: {
              select: {
                id: true,
                origin: true,
                destination: true,
                type: true,
                date: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.GroupMember.some(
      (member) => member.userId === userId,
    );
    if (!isMember) {
      throw new NotFoundException(
        'Group not found or you do not have permission',
      );
    }

    // Transform Prisma structure to match frontend expectations
    const { GroupMember, User, Expense, ...groupBase } = group;

    // Calculate ride statistics for this group using bidirectional rideId field
    const rideExpensesList = (Expense || []).filter((e) => e.rideId !== null);

    const rideStats = {
      totalRides: rideExpensesList.length,
      totalSpent: rideExpensesList.reduce((sum, e) => sum + e.amount, 0),
      rideExpenses: rideExpensesList.map((expense) => ({
        id: expense.id,
        rideId: expense.rideId,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date:
          expense.date instanceof Date
            ? expense.date.toISOString()
            : new Date(expense.date).toISOString(),
      })),
    };

    return {
      ...groupBase,
      members: GroupMember.map((member) => ({
        id: member.id,
        groupId: member.groupId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt.toISOString(),
        user: {
          id: member.User.id,
          email: member.User.email,
          profile: member.User.UserProfile
            ? {
                displayName: member.User.UserProfile.displayName,
                avatarUrl: member.User.UserProfile.avatarUrl,
              }
            : null,
        },
      })),
      createdByUser: {
        id: User.id,
        email: User.email,
        profile: User.UserProfile
          ? {
              displayName: User.UserProfile.displayName,
              avatarUrl: User.UserProfile.avatarUrl,
            }
          : null,
      },
      expenses: (Expense || []).map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date:
          expense.date instanceof Date
            ? expense.date.toISOString()
            : new Date(expense.date).toISOString(),
        createdAt:
          expense.createdAt instanceof Date
            ? expense.createdAt.toISOString()
            : new Date(expense.createdAt).toISOString(),
        category: expense.category,
        receiptUrl: expense.receiptUrl,
        paidBy: expense.paidBy,
        rideId: expense.rideId || null, // Include rideId if expense was created from a ride
        ride: expense.Ride
          ? {
              id: expense.Ride.id,
              origin: expense.Ride.origin,
              destination: expense.Ride.destination,
              type: expense.Ride.type,
              date:
                expense.Ride.date instanceof Date
                  ? expense.Ride.date.toISOString()
                  : new Date(expense.Ride.date).toISOString(),
            }
          : null, // Include ride summary if available
        splits: expense.ExpenseSplit.map((split) => ({
          id: split.id,
          userId: split.userId,
          amount: split.amount,
          isPaid: split.isPaid,
          paidAt: split.paidAt
            ? split.paidAt instanceof Date
              ? split.paidAt.toISOString()
              : new Date(split.paidAt).toISOString()
            : null,
          user: {
            id: split.User.id,
            email: split.User.email,
            profile: split.User.UserProfile
              ? {
                  displayName: split.User.UserProfile.displayName,
                  avatarUrl: split.User.UserProfile.avatarUrl,
                }
              : null,
          },
        })),
      })),
      stats: {
        totalExpenses: Expense?.length || 0,
        totalMembers: GroupMember.length,
        rides: rideStats,
      },
    };
  }

  async addMember(userId: string, groupId: string, memberId: string) {
    // Verify user has permission (must be member of group)
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        'Group not found or you do not have permission',
      );
    }

    // Check if member already exists
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: memberId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this group');
    }

    // Verify member ID exists
    const user = await this.prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const member = await this.prisma.groupMember.create({
      data: {
        id: randomUUID(),
        groupId,
        userId: memberId,
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

    return member;
  }

  async inviteMember(
    userId: string,
    groupId: string,
    inviteDto: InviteMemberDto,
  ) {
    // Verify user has permission (must be member of group)
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        'Group not found or you do not have permission',
      );
    }

    // Determine if we're inviting by userId, email, or mobileNumber
    let inviteeUser: UserWithProfile | null = null;
    let email: string | null = null;
    let mobileNumber: string | null = null;

    if (inviteDto.userId) {
      // Inviting existing user by ID
      const user = await this.prisma.user.findUnique({
        where: { id: inviteDto.userId },
        include: { UserProfile: true },
      });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      inviteeUser = user;
      email = user.email;
      mobileNumber = user.mobileNumber;
    } else if (inviteDto.email) {
      // Inviting by email
      email = inviteDto.email;
      const user = await this.prisma.user.findUnique({
        where: { email: inviteDto.email },
        include: { UserProfile: true },
      });
      if (user) {
        inviteeUser = user;
        mobileNumber = user.mobileNumber;
      }
    } else if (inviteDto.mobileNumber) {
      // Inviting by mobile number
      mobileNumber = inviteDto.mobileNumber;
      const user = await this.prisma.user.findUnique({
        where: { mobileNumber: inviteDto.mobileNumber },
        include: { UserProfile: true },
      });
      if (user) {
        inviteeUser = user;
        email = user.email;
      }
    } else {
      throw new BadRequestException(
        'Either userId, email, or mobileNumber must be provided',
      );
    }

    // Check if user is already a member
    if (inviteeUser) {
      const existingMember = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: inviteeUser.id,
          },
        },
      });

      if (existingMember) {
        throw new BadRequestException('User is already a member of this group');
      }

      // Check for existing pending invitation
      const existingInvitation = await this.prisma.groupInvitation.findFirst({
        where: {
          groupId,
          userId: inviteeUser.id,
          status: 'pending',
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingInvitation) {
        throw new BadRequestException('Invitation already sent to this user');
      }
    } else {
      // Non-user invitation - check by email or mobile
      const existingInvitation = await this.prisma.groupInvitation.findFirst({
        where: {
          groupId,
          OR: [email ? { email } : {}, mobileNumber ? { mobileNumber } : {}],
          status: 'pending',
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingInvitation) {
        throw new BadRequestException(
          'Invitation already sent to this email/mobile number',
        );
      }
    }

    // Generate invitation token
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const invitation = await this.prisma.groupInvitation.create({
      data: {
        id: randomUUID(),
        groupId,
        invitedBy: userId,
        email: email || null,
        mobileNumber: mobileNumber || null,
        userId: inviteeUser?.id || null,
        token,
        status: 'pending',
        expiresAt,
      },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        Inviter: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Send notification if user exists
    if (inviteeUser) {
      await this.notificationService.createNotification({
        userId: inviteeUser.id,
        type: NotificationType.GROUP_MEMBER_ADDED, // Using existing type, or add new one
        title: 'Group Invitation',
        message: `${group.User.UserProfile?.displayName || group.User.email} invited you to join "${group.name}"`,
        data: {
          groupId,
          invitationId: invitation.id,
          token,
        },
      });
    } else {
      // User doesn't exist - automatically create app invitation
      // Check if app invitation already exists
      const existingAppInvitation = await this.prisma.userInvitation.findFirst({
        where: {
          OR: [email ? { email } : {}, mobileNumber ? { mobileNumber } : {}],
          status: 'pending',
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!existingAppInvitation) {
        // Create app invitation for non-registered user
        const appInvitationToken = randomUUID();
        const appInvitationExpiresAt = new Date();
        appInvitationExpiresAt.setDate(appInvitationExpiresAt.getDate() + 7);

        await this.prisma.userInvitation.create({
          data: {
            id: randomUUID(),
            invitedBy: userId,
            email: email || null,
            mobileNumber: mobileNumber || null,
            token: appInvitationToken,
            status: 'pending',
            expiresAt: appInvitationExpiresAt,
          },
        });

        // Send email/SMS invitation
        const inviterName =
          group.User.UserProfile?.displayName || group.User.email;
        if (email) {
          await this.emailService
            .sendGroupInvitation(
              email,
              inviterName,
              group.name,
              token,
              appInvitationToken,
            )
            .catch((err) => {
              console.error('Failed to send email invitation:', err);
              // Don't throw - invitation is still created
            });
        }
        if (mobileNumber) {
          await this.emailService
            .sendSMSInvitation(
              mobileNumber,
              inviterName,
              appInvitationToken,
              true,
              group.name,
            )
            .catch((err) => {
              console.error('Failed to send SMS invitation:', err);
              // Don't throw - invitation is still created
            });
        }
      }
    }

    return {
      invitationId: invitation.id,
      token,
      email: invitation.email,
      mobileNumber: invitation.mobileNumber,
      expiresAt: invitation.expiresAt,
      inviteLink: `${process.env.FRONTEND_URL || 'https://dreamfinora.com'}/invite/group/${token}`,
    };
  }

  async acceptInvitation(userId: string, token: string) {
    // Find invitation by token
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { token },
      include: {
        Group: true,
        Inviter: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        'Invitation has already been accepted or declined',
      );
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invitation has expired');
    }

    // Verify user matches invitation (if userId was specified)
    if (invitation.userId && invitation.userId !== userId) {
      throw new BadRequestException('This invitation is not for you');
    }

    // Verify user email/mobile matches (if no userId was specified)
    if (!invitation.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, mobileNumber: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const emailMatches = invitation.email && user.email === invitation.email;
      const mobileMatches =
        invitation.mobileNumber &&
        user.mobileNumber === invitation.mobileNumber;

      if (!emailMatches && !mobileMatches) {
        throw new BadRequestException('This invitation is not for you');
      }
    }

    // Check if user is already a member
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: invitation.groupId,
          userId,
        },
      },
    });

    if (existingMember) {
      // Mark invitation as accepted even though already member
      await this.prisma.groupInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          userId, // Update userId if it was null
        },
      });
      return {
        success: true,
        message: 'You are already a member of this group',
      };
    }

    // Add user as member
    await this.prisma.groupMember.create({
      data: {
        id: randomUUID(),
        groupId: invitation.groupId,
        userId,
        role: 'MEMBER',
      },
    });

    // Update invitation status
    await this.prisma.groupInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        userId, // Update userId if it was null
      },
    });

    // Send notification to inviter
    await this.notificationService.createNotification({
      userId: invitation.invitedBy,
      type: NotificationType.GROUP_MEMBER_ADDED, // Using existing type
      title: 'Invitation Accepted',
      message: `Your invitation to join "${invitation.Group.name}" was accepted`,
      data: {
        groupId: invitation.groupId,
        userId,
      },
    });

    return {
      success: true,
      groupId: invitation.groupId,
      groupName: invitation.Group.name,
    };
  }

  async declineInvitation(userId: string, token: string) {
    // Find invitation by token
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation has already been processed');
    }

    // Verify user matches invitation
    if (invitation.userId && invitation.userId !== userId) {
      throw new BadRequestException('This invitation is not for you');
    }

    // Update invitation status
    await this.prisma.groupInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'declined',
        declinedAt: new Date(),
        userId: invitation.userId || userId, // Update userId if it was null
      },
    });

    return { success: true };
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { token },
      include: {
        Group: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
        },
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

  async removeMember(userId: string, groupId: string, memberId: string) {
    // Verify user has permission (must be member of group)
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        'Group not found or you do not have permission',
      );
    }

    // Cannot remove the creator
    if (group.createdBy === memberId) {
      throw new BadRequestException('Cannot remove the group creator');
    }

    // Cannot remove yourself (for now - could allow leaving group later)
    if (userId === memberId) {
      throw new BadRequestException(
        'Cannot remove yourself. Leave group functionality coming soon.',
      );
    }

    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: memberId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in group');
    }

    await this.prisma.groupMember.delete({
      where: {
        id: member.id,
      },
    });

    // Get group info for notification
    const groupInfo = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    // Notify the removed member
    if (memberId !== userId && groupInfo) {
      const removerName = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          UserProfile: { select: { displayName: true } },
        },
      });
      const removerDisplayName =
        removerName?.UserProfile?.displayName ||
        removerName?.email ||
        'Someone';

      await this.notificationService
        .notifyGroupMemberRemoved(
          memberId,
          groupId,
          groupInfo.name,
          removerDisplayName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for removed member:`,
            err,
          );
        });
    }

    return { success: true };
  }

  async getGroupBalances(
    userId: string,
    groupId: string,
    primaryCurrency: string = 'USD',
  ) {
    // Verify user is member of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        'Group not found or you do not have permission',
      );
    }

    // Get all unpaid splits for expenses in this group
    const owedSplits: ExpenseSplitWithExpense[] =
      await this.prisma.expenseSplit.findMany({
        where: {
          Expense: {
            groupId,
          },
          userId,
          isPaid: false,
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
          Expense: {
            include: {
              User_Expense_createdByToUser: {
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
              User_Expense_paidByToUser: {
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

    // Get all unpaid splits where others owe the user (user paid for the expense)
    const owedToUser: ExpenseSplitWithExpense[] =
      await this.prisma.expenseSplit.findMany({
        where: {
          Expense: {
            groupId,
            OR: [
              { paidBy: userId }, // User paid for the expense
              {
                AND: [
                  { paidBy: null }, // Fallback: if paidBy is null, use createdBy (backward compatibility)
                  { createdBy: userId },
                ],
              },
            ],
          },
          userId: { not: userId },
          isPaid: false,
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
          Expense: {
            include: {
              User_Expense_paidByToUser: {
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
              User_Expense_createdByToUser: {
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

    // Convert all amounts to primary currency
    const convertSplits = async (
      splits: ExpenseSplitWithExpense[],
    ): Promise<ConvertedExpenseSplit[]> => {
      return Promise.all(
        splits.map(async (split) => {
          const expenseCurrency = split.Expense.currency || 'USD';
          const convertedAmount = await this.currencyService.convertAmount(
            split.amount,
            expenseCurrency,
            primaryCurrency,
          );
          return {
            ...split,
            originalAmount: split.amount,
            originalCurrency: expenseCurrency,
            convertedAmount,
            convertedCurrency: primaryCurrency,
          };
        }),
      );
    };

    const convertedOwedSplits = await convertSplits(owedSplits);
    const convertedOwedToUser = await convertSplits(owedToUser);

    // Calculate totals in primary currency (exclude splits where user owes themselves)
    // Use paidBy if available, otherwise fallback to createdBy for backward compatibility
    const totalOwed = convertedOwedSplits
      .filter((split) => {
        const payerId = split.Expense.paidBy || split.Expense.createdBy;
        return payerId !== userId; // Skip if user owes themselves
      })
      .reduce((sum, split) => sum + split.convertedAmount, 0);
    const totalOwedToUser = convertedOwedToUser.reduce(
      (sum, split) => sum + split.convertedAmount,
      0,
    );
    const netBalance = totalOwedToUser - totalOwed;

    // Group by user (exclude cases where user owes themselves)
    const owedByUser = new Map<
      string,
      {
        user: GroupUserSummary;
        amount: number;
        originalAmount: number;
        originalCurrency: string;
        splits: ConvertedExpenseSplit[];
      }
    >();
    convertedOwedSplits.forEach((split) => {
      // Use paidBy if available, otherwise fallback to createdBy for backward compatibility
      const creditorId = split.Expense.paidBy || split.Expense.createdBy;
      // Skip if user owes themselves
      if (creditorId === userId) {
        return;
      }
      if (!owedByUser.has(creditorId)) {
        // Use paidByUser if available, otherwise use createdByUser
        const creditorUser =
          split.Expense.User_Expense_paidByToUser ||
          split.Expense.User_Expense_createdByToUser;
        owedByUser.set(creditorId, {
          user: creditorUser,
          amount: 0,
          originalAmount: 0,
          originalCurrency: split.originalCurrency,
          splits: [],
        });
      }
      const entry = owedByUser.get(creditorId)!;
      entry.amount += split.convertedAmount;
      entry.originalAmount += split.originalAmount;
      entry.splits.push(split);
    });

    const owedToUserByUser = new Map<
      string,
      {
        user: GroupUserSummary;
        amount: number;
        originalAmount: number;
        originalCurrency: string;
        splits: ConvertedExpenseSplit[];
      }
    >();
    convertedOwedToUser.forEach((split) => {
      const debtorId = split.userId;
      if (!owedToUserByUser.has(debtorId)) {
        owedToUserByUser.set(debtorId, {
          user: split.User,
          amount: 0,
          originalAmount: 0,
          originalCurrency: split.originalCurrency,
          splits: [],
        });
      }
      const entry = owedToUserByUser.get(debtorId)!;
      entry.amount += split.convertedAmount;
      entry.originalAmount += split.originalAmount;
      entry.splits.push(split);
    });

    return {
      totalOwed,
      totalOwedToUser,
      netBalance,
      primaryCurrency,
      owedByUser: Array.from(owedByUser.values()),
      owedToUser: Array.from(owedToUserByUser.values()),
    };
  }

  async updateGroup(
    userId: string,
    groupId: string,
    updateData: {
      name?: string;
      description?: string;
      avatarUrl?: string;
      visibility?: 'public' | 'private';
    },
  ) {
    // Verify user is admin of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        'Group not found or you do not have permission to edit it',
      );
    }

    const updated = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        ...updateData,
        ...(updateData.avatarUrl !== undefined && {
          avatarUrl: updateData.avatarUrl,
        }),
      },
      include: {
        GroupMember: {
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

  async deleteGroup(userId: string, groupId: string) {
    // Verify user is admin of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        'Group not found or you do not have permission to delete it',
      );
    }

    // Delete group (cascade will handle expenses, chores, members)
    await this.prisma.group.delete({
      where: { id: groupId },
    });

    return { success: true };
  }

  async updateGroupAvatar(userId: string, groupId: string, avatarUrl: string) {
    // Verify user is admin of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        'Group not found or you do not have permission to edit it',
      );
    }

    const updated = await this.prisma.group.update({
      where: { id: groupId },
      data: { avatarUrl },
      include: {
        GroupMember: {
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

    // Transform Prisma structure to match frontend expectations
    const { GroupMember, User, ...groupBase } = updated;
    return {
      ...groupBase,
      members: GroupMember.map((member) => ({
        id: member.id,
        groupId: member.groupId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt.toISOString(),
        user: {
          id: member.User.id,
          email: member.User.email,
          profile: member.User.UserProfile
            ? {
                displayName: member.User.UserProfile.displayName,
                avatarUrl: member.User.UserProfile.avatarUrl,
              }
            : null,
        },
      })),
      createdByUser: {
        id: User.id,
        email: User.email,
        profile: User.UserProfile
          ? {
              displayName: User.UserProfile.displayName,
              avatarUrl: User.UserProfile.avatarUrl,
            }
          : null,
      },
    };
  }

  async changeMemberRole(
    userId: string,
    groupId: string,
    memberId: string,
    role: 'ADMIN' | 'MEMBER',
  ) {
    // Verify user is admin of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        'Group not found or you do not have permission',
      );
    }

    // Cannot change role of creator (they're always admin)
    if (group.createdBy === memberId) {
      throw new BadRequestException('Cannot change role of group creator');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: memberId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in group');
    }

    const updated = await this.prisma.groupMember.update({
      where: { id: member.id },
      data: { role },
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

  async transferOwnership(userId: string, groupId: string, newOwnerId: string) {
    // Verify user is current owner (creator)
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        createdBy: userId,
      },
      include: {
        GroupMember: {
          where: {
            userId: newOwnerId,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you are not the owner');
    }

    // Verify new owner is a member
    if (group.GroupMember.length === 0) {
      throw new BadRequestException('New owner must be a member of the group');
    }

    // Update group owner and set new owner as ADMIN
    await this.prisma.$transaction([
      this.prisma.group.update({
        where: { id: groupId },
        data: { createdBy: newOwnerId },
      }),
      this.prisma.groupMember.updateMany({
        where: {
          groupId,
          userId: newOwnerId,
        },
        data: { role: 'ADMIN' },
      }),
      // Optionally set old owner to MEMBER (or keep as ADMIN)
      this.prisma.groupMember.updateMany({
        where: {
          groupId,
          userId,
        },
        data: { role: 'ADMIN' }, // Keep old owner as admin too
      }),
    ]);

    return { success: true };
  }

  async leaveGroup(userId: string, groupId: string) {
    // Verify user is member
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you are not a member');
    }

    // Cannot leave if you're the creator (must transfer ownership first)
    if (group.createdBy === userId) {
      throw new BadRequestException(
        'Cannot leave group as creator. Transfer ownership first.',
      );
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
      throw new NotFoundException('Member not found');
    }

    await this.prisma.groupMember.delete({
      where: { id: member.id },
    });

    return { success: true };
  }

  async getGroupHistory(userId: string, groupId: string) {
    // Verify user is member of group
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        GroupMember: {
          some: {
            userId,
          },
        },
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
        GroupMember: {
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
            createdAt: 'asc',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or you are not a member');
    }

    const history: Array<{
      type: string;
      timestamp: Date;
      description: string;
      user: {
        id: string;
        email: string;
        profile: {
          displayName: string | null;
          avatarUrl: string | null;
        } | null;
      } | null;
    }> = [];

    // Group creation
    history.push({
      type: 'created',
      timestamp: group.createdAt,
      description: `Group "${group.name}" was created`,
      user: {
        id: group.User.id,
        email: group.User.email,
        profile: group.User.UserProfile,
      },
    });

    // Member additions (using createdAt from GroupMember)
    for (const member of group.GroupMember) {
      if (member.userId !== group.createdBy) {
        // Not the creator, so it was added later
        history.push({
          type: 'member_added',
          timestamp: member.createdAt,
          description: `${member.User.UserProfile?.displayName || member.User.email} was added to the group`,
          user: {
            id: member.User.id,
            email: member.User.email,
            profile: member.User.UserProfile,
          },
        });
      }
    }

    // Get expenses for this group
    const expenses = await this.prisma.expense.findMany({
      where: { groupId },
      select: {
        id: true,
        description: true,
        createdAt: true,
        createdBy: true,
        User_Expense_createdByToUser: {
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
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    for (const expense of expenses) {
      history.push({
        type: 'expense_created',
        timestamp: expense.createdAt,
        description: `Expense "${expense.description}" was added`,
        user: {
          id: expense.User_Expense_createdByToUser.id,
          email: expense.User_Expense_createdByToUser.email,
          profile: expense.User_Expense_createdByToUser.UserProfile,
        },
      });
    }

    // Get chores for this group
    const chores = await this.prisma.chore.findMany({
      where: { groupId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        createdBy: true,
        User_Chore_createdByToUser: {
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
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    for (const chore of chores) {
      history.push({
        type: 'chore_created',
        timestamp: chore.createdAt,
        description: `Chore "${chore.title}" was created`,
        user: {
          id: chore.User_Chore_createdByToUser.id,
          email: chore.User_Chore_createdByToUser.email,
          profile: chore.User_Chore_createdByToUser.UserProfile,
        },
      });
    }

    // Sort by timestamp
    history.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return history;
  }
}
