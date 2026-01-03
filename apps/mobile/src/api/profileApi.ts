import { getApiBaseUrl } from './getApiBaseUrl';

export interface TrustScore {
  id: string;
  userId: string;
  score: number;
  verified: boolean;
  updatedAt: string;
  history?: TrustScoreHistory[];
}

export interface TrustScoreHistory {
  id: string;
  trustScoreId: string;
  score: number;
  reason: string | null;
  createdAt: string;
}

export interface Profile {
  id: string | null;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  primaryCurrency?: string | null;
  homeCountryCurrency?: string | null;
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  expenseReminders?: boolean;
  choreReminders?: boolean;
  messageNotifications?: boolean;
  listingNotifications?: boolean;
  profileVisibility?: 'public' | 'friends' | 'private';
  trustScoreVisibility?: 'public' | 'friends' | 'private';
  createdAt: string;
  user: {
    id: string;
    email: string;
    createdAt: string;
    trustScore?: TrustScore | null;
  };
}

export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  primaryCurrency?: string;
  homeCountryCurrency?: string;
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  expenseReminders?: boolean;
  choreReminders?: boolean;
  messageNotifications?: boolean;
  listingNotifications?: boolean;
  profileVisibility?: 'public' | 'friends' | 'private';
  trustScoreVisibility?: 'public' | 'friends' | 'private';
}

export async function getProfile(token: string): Promise<Profile> {
  const response = await fetch(`${getApiBaseUrl()}/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch profile' }));
    throw new Error(error.message || `Failed to fetch profile: ${response.status}`);
  }

  return response.json();
}

export async function updateProfile(
  token: string,
  data: UpdateProfileDto,
): Promise<Profile> {
  const response = await fetch(`${getApiBaseUrl()}/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update profile' }));
    throw new Error(error.message || `Failed to update profile: ${response.status}`);
  }

  return response.json();
}

export async function uploadAvatar(
  token: string,
  uri: string,
  filename: string,
  type: string,
): Promise<Profile> {
  const formData = new FormData();
  
  // @ts-ignore - FormData.append accepts File, but React Native uses different format
  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  const response = await fetch(`${getApiBaseUrl()}/profile/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type - let fetch set it with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload avatar' }));
    throw new Error(error.message || `Failed to upload avatar: ${response.status}`);
  }

  return response.json();
}

export interface UserProfile {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  email?: string;
  mobileNumber?: string;
  trustScore?: {
    score: number;
    breakdown?: {
      expenseScore: number;
      choreScore: number;
      communityScore: number;
      financeScore: number;
      listingScore: number;
    };
  } | null;
  friendStatus: 'none' | 'pending_incoming' | 'pending_outgoing' | 'accepted' | 'blocked';
  mutualFriendsCount: number;
  listingsCount: number;
  sharedGroupsCount: number;
  profileVisibility: 'public' | 'friends' | 'private';
  trustScoreVisibility: 'public' | 'friends' | 'private';
}

export async function getUserProfile(token: string, userId: string): Promise<UserProfile> {
  const response = await fetch(`${getApiBaseUrl()}/profile/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch user profile' }));
    throw new Error(error.message || `Failed to fetch user profile: ${response.status}`);
  }

  return response.json();
}

