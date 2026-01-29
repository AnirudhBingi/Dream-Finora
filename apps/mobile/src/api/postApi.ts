import { api } from "./client";
import { UserSummary } from "./types";

export interface Post {
  id: string;
  userId: string;
  groupId?: string | null;
  content?: string | null;
  images: string[];
  location?: string | null;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  isLiked?: boolean;
  latestComment?: PostCommentPreview | null;
  latestComments?: PostCommentPreview[];
}

export interface PostCommentPreview {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface CreatePostDto {
  content?: string;
  images?: string[];
  groupId?: string;
  location?: string;
  hashtags?: string[];
}

export interface UpdatePostDto {
  content?: string;
  images?: string[];
  location?: string;
  hashtags?: string[];
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface LikeResponse {
  liked: boolean;
}

export interface ShareResponse {
  message: string;
}

// Create a new post
export async function createPost(
  token: string,
  data: CreatePostDto,
): Promise<Post> {
  return api.post<Post>("/posts", data, { token });
}

// Get posts feed
export async function getPosts(
  token: string,
  options?: {
    userId?: string;
    groupId?: string;
    search?: string;
    limit?: number;
    offset?: number;
    cursor?: string;
  },
): Promise<PostsResponse> {
  const params = new URLSearchParams();
  if (options?.userId) params.append("userId", options.userId);
  if (options?.groupId) params.append("groupId", options.groupId);
  if (options?.search) params.append("search", options.search);
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.offset) params.append("offset", options.offset.toString());
  if (options?.cursor) params.append("cursor", options.cursor);

  const queryString = params.toString();
  const url = queryString ? `/posts?${queryString}` : "/posts";

  return api.get<PostsResponse>(url, { token });
}

// Get a single post by ID
export async function getPostById(
  token: string,
  postId: string,
): Promise<Post> {
  return api.get<Post>(`/posts/${postId}`, { token });
}

// Update a post
export async function updatePost(
  token: string,
  postId: string,
  data: UpdatePostDto,
): Promise<Post> {
  return api.put<Post>(`/posts/${postId}`, data, { token });
}

// Delete a post
export async function deletePost(
  token: string,
  postId: string,
): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/posts/${postId}`, { token });
}

// Like or unlike a post
export async function toggleLike(
  token: string,
  postId: string,
): Promise<LikeResponse> {
  return api.post<LikeResponse>(`/posts/${postId}/like`, {}, { token });
}

// Get comments for a post
export async function getPostComments(
  token: string,
  postId: string,
): Promise<PostComment[]> {
  return api.get<PostComment[]>(`/posts/${postId}/comments`, { token });
}

// Add a comment to a post
export async function addPostComment(
  token: string,
  postId: string,
  content: string,
): Promise<PostComment> {
  return api.post<PostComment>(
    `/posts/${postId}/comments`,
    { content },
    { token },
  );
}

// Delete a comment
export async function deletePostComment(
  token: string,
  postId: string,
  commentId: string,
): Promise<{ message: string }> {
  return api.delete<{ message: string }>(
    `/posts/${postId}/comments/${commentId}`,
    { token },
  );
}

// Share a post
export async function sharePost(
  token: string,
  postId: string,
): Promise<ShareResponse> {
  return api.post<ShareResponse>(`/posts/${postId}/share`, {}, { token });
}

export async function getPostLikes(
  token: string,
  postId: string,
): Promise<UserSummary[]> {
  return api.get<UserSummary[]>(`/posts/${postId}/likes`, { token });
}

// Upload images for a post
export async function uploadPostImages(
  token: string,
  postId: string,
  imageUris: string[],
): Promise<Post> {
  const formData = new FormData();

  for (const uri of imageUris) {
    const filename = uri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append("files", {
      uri,
      name: filename,
      type,
    } as any);
  }

  return api.post<Post>(`/posts/${postId}/images`, formData, { token });
}
