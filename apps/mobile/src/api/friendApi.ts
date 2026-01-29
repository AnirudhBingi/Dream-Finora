import { api } from "./client";

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: "pending" | "accepted" | "blocked";
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string | null;
  friend: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface FriendRequests {
  incoming: Friend[];
  outgoing: Friend[];
}

export interface SearchUser {
  id: string;
  email: string;
  mobileNumber?: string | null;
  profile?: {
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  friendStatus?: "none" | "pending" | "accepted" | "blocked";
  trustScore?: {
    score: number;
  } | null;
  trustScoreVisibility?: "public" | "friends" | "private";
}

export interface SendFriendRequestDto {
  friendEmailOrMobile: string;
}

export async function getFriends(token: string): Promise<Friend[]> {
  return api.get<Friend[]>("/friends", { token });
}

export async function getPendingRequests(
  token: string,
): Promise<FriendRequests> {
  return api.get<FriendRequests>("/friends/requests", { token });
}

export async function sendFriendRequest(
  token: string,
  data: SendFriendRequestDto,
): Promise<Friend> {
  return api.post<Friend>("/friends/request", data, { token });
}

export async function acceptFriendRequest(
  token: string,
  friendshipId: string,
): Promise<Friend> {
  return api.post<Friend>(`/friends/${friendshipId}/accept`, undefined, {
    token,
  });
}

export async function rejectFriendRequest(
  token: string,
  friendshipId: string,
): Promise<void> {
  return api.post<void>(`/friends/${friendshipId}/reject`, undefined, {
    token,
  });
}

export async function removeFriend(
  token: string,
  friendshipId: string,
): Promise<void> {
  return api.delete<void>(`/friends/${friendshipId}`, { token });
}

export async function blockUser(
  token: string,
  friendId: string,
): Promise<Friend> {
  return api.post<Friend>(`/friends/block/${friendId}`, undefined, { token });
}

export async function unblockUser(
  token: string,
  friendId: string,
): Promise<void> {
  return api.post<void>(`/friends/unblock/${friendId}`, undefined, { token });
}

export async function getBlockedUsers(token: string): Promise<Friend[]> {
  return api.get<Friend[]>("/friends/blocked", { token });
}

export async function searchUsers(
  token: string,
  query: string,
): Promise<SearchUser[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  return api.get<SearchUser[]>(
    `/friends/search?q=${encodeURIComponent(query.trim())}`,
    { token },
  );
}

export async function getMutualFriends(
  token: string,
  userId: string,
): Promise<Friend[]> {
  return api.get<Friend[]>(`/friends/mutual/${userId}`, { token });
}

export interface InviteUserResponse {
  invitationId: string;
  token: string;
  email?: string | null;
  mobileNumber?: string | null;
  expiresAt: string;
  inviteLink: string;
}

export async function inviteUserToApp(
  token: string,
  data: { email?: string; mobileNumber?: string },
): Promise<InviteUserResponse> {
  return api.post<InviteUserResponse>("/friends/invite", data, { token });
}

export interface FriendRideStats {
  totalRides: number;
  totalSpentTogether: number;
  ridesAsDriver: number;
  ridesAsPassenger: number;
  recentRoutes: Array<{
    route: string;
    date: string;
    cost: number;
  }>;
}

export async function getFriendStats(
  token: string,
  friendId: string,
): Promise<FriendRideStats> {
  return api.get<FriendRideStats>(`/friends/${friendId}/stats`, { token });
}
