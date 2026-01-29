import { api } from "./client";

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
  theme?: string;
  language?: string;
  fontSize?: string;
  highContrast?: boolean;
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  expenseReminders?: boolean;
  choreReminders?: boolean;
  messageNotifications?: boolean;
  listingNotifications?: boolean;
  profileVisibility?: "public" | "friends" | "private";
  trustScoreVisibility?: "public" | "friends" | "private";
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
  theme?: string;
  language?: string;
  fontSize?: string;
  highContrast?: boolean;
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  expenseReminders?: boolean;
  choreReminders?: boolean;
  messageNotifications?: boolean;
  listingNotifications?: boolean;
  profileVisibility?: "public" | "friends" | "private";
  trustScoreVisibility?: "public" | "friends" | "private";
}

export async function getProfile(token: string): Promise<Profile> {
  const data = await api.get<Profile>("/profile", { token });
  // If API returns null, return a default profile structure
  if (!data) {
    throw new Error("Profile data is null");
  }
  return data;
}

export async function updateProfile(
  token: string,
  data: UpdateProfileDto,
): Promise<Profile> {
  return api.put<Profile>("/profile", data, { token });
}

export async function uploadAvatar(
  token: string,
  uri: string,
  filename: string,
  type: string,
): Promise<Profile> {
  const formData = new FormData();

  // @ts-ignore - FormData.append accepts File, but React Native uses different format
  formData.append("file", {
    uri,
    name: filename,
    type,
  } as any);

  return api.post<Profile>("/profile/avatar", formData, { token });
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
      reliabilityScore?: number;
      responsivenessScore?: number;
      accountTrustScore?: number;
    };
  } | null;
  friendStatus:
    | "none"
    | "pending_incoming"
    | "pending_outgoing"
    | "accepted"
    | "blocked";
  mutualFriendsCount: number;
  listingsCount: number;
  sharedGroupsCount: number;
  profileVisibility: "public" | "friends" | "private";
  trustScoreVisibility: "public" | "friends" | "private";
}

export async function getUserProfile(
  token: string,
  userId: string,
): Promise<UserProfile> {
  return api.get<UserProfile>(`/profile/${userId}`, { token });
}
