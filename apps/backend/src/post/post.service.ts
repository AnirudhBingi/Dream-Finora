import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationService } from '../notification/notification.service';
import { randomUUID } from 'crypto';

type PostCommentWithUser = Prisma.PostCommentGetPayload<{
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

type PostWithRelations = Prisma.PostGetPayload<Prisma.PostDefaultArgs> & {
  User?: {
    id: string;
    email: string;
    UserProfile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
  PostComment?: PostCommentWithUser[];
  _count?: {
    PostLike?: number;
    PostComment?: number;
  };
};

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TrustScoreService))
    private trustScoreService: TrustScoreService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Transform Prisma post with User relation to match frontend interface
   */
  private transformPost(post: PostWithRelations) {
    const { User, PostComment, ...postWithoutUser } = post;
    const latestComments = Array.isArray(PostComment)
      ? PostComment.slice(0, 2).map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          user: comment.User
            ? {
                id: comment.User.id,
                email: comment.User.email,
                profile: comment.User.UserProfile
                  ? {
                      displayName: comment.User.UserProfile.displayName,
                      avatarUrl: comment.User.UserProfile.avatarUrl,
                    }
                  : null,
              }
            : null,
        }))
      : [];
    const latestComment = latestComments.length > 0 ? latestComments[0] : null;
    return {
      ...postWithoutUser,
      // Ensure images and hashtags are always arrays (never null/undefined)
      images: Array.isArray(postWithoutUser.images)
        ? postWithoutUser.images
        : [],
      hashtags: Array.isArray(postWithoutUser.hashtags)
        ? postWithoutUser.hashtags
        : [],
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

  async createPost(userId: string, createPostDto: CreatePostDto) {
    if (createPostDto.groupId) {
      await this.ensureGroupAccess(userId, createPostDto.groupId, true);
    }

    // Allow creating posts with content (images can be uploaded separately via POST /posts/:id/images)
    // Empty content is allowed - images can be uploaded after post creation
    // This enables image-only posts (create with empty content, then upload images)

    const post = await this.prisma.post.create({
      data: {
        id: randomUUID(),
        userId,
        groupId: createPostDto.groupId ?? null,
        content: createPostDto.content?.trim() || null,
        images: createPostDto.images || [],
        location: createPostDto.location || null,
        hashtags: createPostDto.hashtags || [],
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

    // Update FinScore for post creator (community engagement)
    await this.trustScoreService.updateCommunityScore(userId).catch((err) => {
      console.error('Failed to update FinScore after post creation:', err);
    });

    return this.transformPost(post);
  }

  async getPosts(
    userId: string,
    filters?: {
      userId?: string; // Filter by specific user
      groupId?: string;
      search?: string;
      limit?: number;
      offset?: number;
      cursor?: string;
    },
  ) {
    const where: Prisma.PostWhereInput = {};

    if (filters?.groupId) {
      await this.ensureGroupAccess(userId, filters.groupId, false);
      where.groupId = filters.groupId;
    } else {
      where.groupId = null;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    const searchText = filters?.search?.trim();
    if (searchText) {
      const tokens = searchText
        .split(/\s+/)
        .map((token) => token.replace(/^#/, '').trim())
        .filter((token) => token.length > 0);

      const orConditions: Prisma.PostWhereInput[] = tokens.flatMap((token) => [
        { content: { contains: token, mode: 'insensitive' } },
        { location: { contains: token, mode: 'insensitive' } },
      ]);

      if (tokens.length > 0) {
        orConditions.push({ hashtags: { hasSome: tokens } });
      }

      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const useRelevance = Boolean(searchText);
    const cursorInfo = this.parseCursor(filters?.cursor);
    const useCursor = Boolean(cursorInfo) && !useRelevance;

    const tokens = searchText
      ? searchText
          .split(/\s+/)
          .map((token) => token.replace(/^#/, '').trim().toLowerCase())
          .filter(Boolean)
      : [];

    const computePostScore = (post: {
      content?: string | null;
      location?: string | null;
      hashtags?: string[] | null;
    }) => {
      if (tokens.length === 0) return 0;
      const content = (post.content || '').toLowerCase();
      const location = (post.location || '').toLowerCase();
      const hashtags = Array.isArray(post.hashtags)
        ? post.hashtags.map((tag) => tag.replace(/^#/, '').toLowerCase())
        : [];

      return tokens.reduce((score, token) => {
        if (content.includes(token)) score += 3;
        if (hashtags.includes(token)) score += 2;
        if (location.includes(token)) score += 1;
        return score;
      }, 0);
    };

    const take = useRelevance ? limit + offset : limit;
    const skip = useRelevance ? 0 : useCursor ? 0 : offset;

    if (useCursor && cursorInfo) {
      const cursorFilter: Prisma.PostWhereInput = {
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

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
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
          PostComment: {
            take: 2,
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
          },
        },
        orderBy: useCursor
          ? [{ createdAt: 'desc' }, { id: 'desc' }]
          : { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.post.count({ where }),
    ]);

    const rankedPosts = useRelevance
      ? [...posts]
          .map((post) => ({
            post,
            score: computePostScore(post),
          }))
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.post.createdAt.getTime() - a.post.createdAt.getTime();
          })
          .map((entry) => entry.post)
      : posts;

    const pagedPosts = useRelevance
      ? rankedPosts.slice(offset, offset + limit)
      : rankedPosts;

    const transformedPosts = pagedPosts.map((post) => this.transformPost(post));

    return {
      posts: transformedPosts,
      total,
      limit,
      offset,
      hasMore: offset + pagedPosts.length < total,
    };
  }

  async getPostById(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
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

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count (don't count own views)
    if (post.userId !== userId) {
      await this.prisma.post.update({
        where: { id: postId },
        data: { viewsCount: { increment: 1 } },
      });
      post.viewsCount += 1;
    }

    // Check if user has liked this post
    const isLiked = await this.isLiked(userId, postId);

    // Get counts
    const [likesCount, commentsCount, sharesCount] = await Promise.all([
      this.prisma.postLike.count({ where: { postId } }),
      this.prisma.postComment.count({ where: { postId } }),
      this.prisma.postShare.count({ where: { postId } }),
    ]);

    const transformed = this.transformPost(post);
    return {
      ...transformed,
      isLiked,
      likesCount,
      commentsCount,
      sharesCount,
    };
  }

  async updatePost(
    userId: string,
    postId: string,
    updatePostDto: UpdatePostDto,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new BadRequestException('You can only update your own posts');
    }

    // Validate that post has either content or images after update
    const updatedContent =
      updatePostDto.content !== undefined
        ? updatePostDto.content?.trim()
        : post.content;
    const updatedImages =
      updatePostDto.images !== undefined ? updatePostDto.images : post.images;
    if (!updatedContent && (!updatedImages || updatedImages.length === 0)) {
      throw new BadRequestException(
        'Post must have either content or at least one image',
      );
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        content:
          updatePostDto.content !== undefined
            ? updatePostDto.content?.trim() || null
            : undefined,
        images:
          updatePostDto.images !== undefined ? updatePostDto.images : undefined,
        location:
          updatePostDto.location !== undefined
            ? updatePostDto.location || null
            : undefined,
        hashtags:
          updatePostDto.hashtags !== undefined
            ? updatePostDto.hashtags
            : undefined,
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

    return this.transformPost(updated);
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new BadRequestException('You can only delete your own posts');
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    return { message: 'Post deleted successfully' };
  }

  async toggleLike(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existing) {
      // Unlike
      await this.prisma.postLike.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      // Like
      await this.prisma.postLike.create({
        data: {
          id: randomUUID(),
          userId,
          postId,
        },
      });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      });

      // Notify post creator (if not liking own post)
      if (post.userId !== userId) {
        const liker = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            UserProfile: { select: { displayName: true } },
          },
        });
        const likerName =
          liker?.UserProfile?.displayName || liker?.email || 'Someone';

        await this.notificationService
          .notifyPostLiked(post.userId, postId, likerName)
          .catch((err) => {
            console.error(`Failed to create notification for post liked:`, err);
          });
      }

      return { liked: true };
    }
  }

  async getLikes(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const likes = await this.prisma.postLike.findMany({
      where: { postId },
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

    return likes
      .map((like) => like.User)
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

  async getComments(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comments = await this.prisma.postComment.findMany({
      where: { postId },
      orderBy: {
        createdAt: 'asc',
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

    // Transform User to user to match frontend interface
    return comments.map((comment) => {
      const { User, ...commentWithoutUser } = comment;
      return {
        ...commentWithoutUser,
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
      };
    });
  }

  async addComment(userId: string, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!content.trim()) {
      throw new BadRequestException('Comment content cannot be empty');
    }

    const comment = await this.prisma.postComment.create({
      data: {
        id: randomUUID(),
        userId,
        postId,
        content: content.trim(),
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

    // Update comment count
    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    // Transform User to user
    const { User, ...commentWithoutUser } = comment;
    const commentWithUser = {
      ...commentWithoutUser,
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
    };

    // Notify post creator (if not commenting on own post)
    if (post.userId !== userId) {
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
        .notifyPostCommented(post.userId, postId, commenterName)
        .catch((err) => {
          console.error(`Failed to create notification for post comment:`, err);
        });
    }

    return commentWithUser;
  }

  async deleteComment(userId: string, postId: string, commentId: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new BadRequestException('You can only delete your own comments');
    }

    if (comment.postId !== postId) {
      throw new BadRequestException('Comment does not belong to this post');
    }

    await this.prisma.postComment.delete({
      where: { id: commentId },
    });

    // Update comment count
    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { decrement: 1 } },
    });

    return { message: 'Comment deleted successfully' };
  }

  async sharePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Create share record (optional - for tracking)
    await this.prisma.postShare.create({
      data: {
        id: randomUUID(),
        userId,
        postId,
      },
    });

    // Update share count
    await this.prisma.post.update({
      where: { id: postId },
      data: { sharesCount: { increment: 1 } },
    });

    // Update FinScore for sharer (community engagement)
    await this.trustScoreService.updateCommunityScore(userId).catch((err) => {
      console.error('Failed to update FinScore after post share:', err);
    });

    return { message: 'Post shared successfully' };
  }

  async isLiked(userId: string, postId: string): Promise<boolean> {
    const like = await this.prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    return !!like;
  }

  async addPostImages(userId: string, postId: string, imageUrls: string[]) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new BadRequestException('You can only update your own posts');
    }

    const updatedImages = [...(post.images || []), ...imageUrls];

    const updated = await this.prisma.post.update({
      where: { id: postId },
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

    return this.transformPost(updated);
  }
}
