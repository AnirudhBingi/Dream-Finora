import { getApiBaseUrl } from './getApiBaseUrl';

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
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
  friendStatus?: 'none' | 'pending' | 'accepted' | 'blocked';
  trustScore?: {
    score: number;
  } | null;
  trustScoreVisibility?: 'public' | 'friends' | 'private';
}

export interface SendFriendRequestDto {
  friendEmailOrMobile: string;
}

export async function getFriends(token: string): Promise<Friend[]> {
  const response = await fetch(`${getApiBaseUrl()}/friends`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get friends' }));
    throw new Error(error.message || `Failed to get friends: ${response.status}`);
  }

  return response.json();
}

export async function getPendingRequests(token: string): Promise<FriendRequests> {
  const response = await fetch(`${getApiBaseUrl()}/friends/requests`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get pending requests' }));
    throw new Error(error.message || `Failed to get pending requests: ${response.status}`);
  }

  return response.json();
}

export async function sendFriendRequest(token: string, data: SendFriendRequestDto): Promise<Friend> {
  const response = await fetch(`${getApiBaseUrl()}/friends/request`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to send friend request' }));
    throw new Error(error.message || `Failed to send friend request: ${response.status}`);
  }

  return response.json();
}

export async function acceptFriendRequest(token: string, friendshipId: string): Promise<Friend> {
  const response = await fetch(`${getApiBaseUrl()}/friends/${friendshipId}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to accept friend request' }));
    throw new Error(error.message || `Failed to accept friend request: ${response.status}`);
  }

  return response.json();
}

export async function rejectFriendRequest(token: string, friendshipId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/friends/${friendshipId}/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to reject friend request' }));
    throw new Error(error.message || `Failed to reject friend request: ${response.status}`);
  }
}

export async function removeFriend(token: string, friendshipId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/friends/${friendshipId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to remove friend' }));
    throw new Error(error.message || `Failed to remove friend: ${response.status}`);
  }
}

export async function blockUser(token: string, friendId: string): Promise<Friend> {
  const response = await fetch(`${getApiBaseUrl()}/friends/block/${friendId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to block user' }));
    throw new Error(error.message || `Failed to block user: ${response.status}`);
  }

  return response.json();
}

export async function unblockUser(token: string, friendId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/friends/unblock/${friendId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to unblock user' }));
    throw new Error(error.message || `Failed to unblock user: ${response.status}`);
  }
}

export async function getBlockedUsers(token: string): Promise<Friend[]> {
  const response = await fetch(`${getApiBaseUrl()}/friends/blocked`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get blocked users' }));
    throw new Error(error.message || `Failed to get blocked users: ${response.status}`);
  }

  return response.json();
}

export async function searchUsers(token: string, query: string): Promise<SearchUser[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const response = await fetch(`${getApiBaseUrl()}/friends/search?q=${encodeURIComponent(query.trim())}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to search users' }));
    throw new Error(error.message || `Failed to search users: ${response.status}`);
  }

  return response.json();
}

export async function getMutualFriends(token: string, userId: string): Promise<Friend[]> {
  const response = await fetch(`${getApiBaseUrl()}/friends/mutual/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get mutual friends' }));
    throw new Error(error.message || `Failed to get mutual friends: ${response.status}`);
  }

  return response.json();
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
  const response = await fetch(`${getApiBaseUrl()}/friends/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to send invitation' }));
    throw new Error(error.message || `Failed to send invitation: ${response.status}`);
  }

  return response.json();
}

