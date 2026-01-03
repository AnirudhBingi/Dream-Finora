export class UserProfileResponseDto {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  email?: string; // Only if profileVisibility allows
  mobileNumber?: string; // Only if profileVisibility allows
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
  listingsCount: number; // Public listings only
  sharedGroupsCount: number; // Groups both users are in
  profileVisibility: 'public' | 'friends' | 'private';
  trustScoreVisibility: 'public' | 'friends' | 'private';
}

