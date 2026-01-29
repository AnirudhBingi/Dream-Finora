import { api } from "./client";

export interface TrustScoreBreakdown {
  expense: {
    onTimeSettlementRate: number;
    recentActivityBonus: number;
    volumeBonus: number;
    organizerCompletionRate: number;
    organizerBonus: number;
    payerCompletionRate: number;
    payerBonus: number;
    rawScore: number;
  };
  chore: {
    completionRate: number;
    onTimeRate: number;
    pointsBonus: number;
    streakBonus?: number;
    achievementsBonus?: number;
    organizerCompletionRate?: number;
    organizerBonus?: number;
    rawScore: number;
  };
  community: {
    listingSuccessRate: number;
    engagementRate: number;
    postEngagementRate?: number;
    postActivityBonus?: number;
    rawScore: number;
  };
  responsiveness?: {
    responseRate: number;
    rawScore: number;
  };
  accountTrust?: {
    emailVerified: boolean;
    profileCompletionRate: number;
    tenureScore: number;
    rawScore: number;
  };
}

export interface TrustScore {
  id: string;
  userId: string;
  score: number;
  verified: boolean;
  updatedAt: string;
  history?: TrustScoreHistory[];
  breakdown?: TrustScoreBreakdown;
}

export interface TrustScoreHistory {
  id: string;
  trustScoreId: string;
  score: number;
  reason: string | null;
  createdAt: string;
}

export interface TrustScoreWithBreakdown extends TrustScore {
  breakdown: TrustScoreBreakdown;
  expenseScore: number;
  choreScore: number;
  communityScore: number;
  reliabilityScore?: number;
  responsivenessScore?: number;
  accountTrustScore?: number;
}

export async function getTrustScore(token: string): Promise<TrustScore> {
  return api.get<TrustScore>("/finscore", { token });
}

export async function getTrustScoreBreakdown(
  token: string,
): Promise<TrustScoreWithBreakdown> {
  return api.get<TrustScoreWithBreakdown>("/finscore/breakdown", { token });
}

export async function getTrustScoreHistory(
  token: string,
  limit: number = 50,
): Promise<{ history: TrustScoreHistory[] }> {
  return api.get<{ history: TrustScoreHistory[] }>(
    `/finscore/history?limit=${limit}`,
    { token },
  );
}

export interface TrustScoreRankHistory {
  id: string;
  userId: string;
  category: string;
  period: string;
  rank: number;
  totalUsers: number;
  date: string;
  createdAt: string;
}

export async function getTrustScoreRankHistory(
  token: string,
  options?: {
    limit?: number;
    category?: "overall" | "expense" | "chore" | "community";
    period?: "all-time" | "weekly" | "monthly";
  },
): Promise<{ history: TrustScoreRankHistory[] }> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined)
    params.append("limit", options.limit.toString());
  if (options?.category) params.append("category", options.category);
  if (options?.period) params.append("period", options.period);

  const endpoint = params.toString()
    ? `/finscore/rank-history?${params.toString()}`
    : "/finscore/rank-history";

  return api.get<{ history: TrustScoreRankHistory[] }>(endpoint, { token });
}

export interface TrustScoreComparison {
  userScore: number;
  userRank: number;
  totalFriends: number;
  breakdown: TrustScoreBreakdown;
  friends: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    score: number;
    rank: number;
  }>;
}

export async function compareTrustScore(
  token: string,
): Promise<TrustScoreComparison> {
  return api.get<TrustScoreComparison>("/finscore/compare", { token });
}

export interface TrustScoreInsights {
  currentScore: number;
  trend: {
    direction: "up" | "down" | "stable";
    change: number;
    recentAverage: number;
    previousAverage: number;
  };
  breakdown: TrustScoreBreakdown;
  affectsScore: {
    expense: {
      weight: number;
      components: Array<{ name: string; impact: number }>;
    };
    chore: {
      weight: number;
      components: Array<{ name: string; impact: number }>;
    };
    community: {
      weight: number;
      components: Array<{ name: string; impact: number }>;
    };
    responsiveness?: {
      weight: number;
      components: Array<{ name: string; impact: number }>;
    };
    accountTrust?: {
      weight: number;
      components: Array<{ name: string; impact: number }>;
    };
  };
  suggestions: string[];
  history: Array<{
    score: number;
    timestamp: string;
    reason: string | null;
  }>;
}

export async function getTrustScoreInsights(
  token: string,
): Promise<TrustScoreInsights> {
  return api.get<TrustScoreInsights>("/finscore/insights", { token });
}

export interface LeaderboardUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  finscore: number;
  rank: number;
  badge?: string;
}

export interface LeaderboardResponse {
  users: LeaderboardUser[];
  total: number;
  userRank: number | null;
}

export async function getLeaderboard(
  token: string,
  options?: {
    limit?: number;
    offset?: number;
    category?: "overall" | "expense" | "chore" | "community";
  },
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined)
    params.append("limit", options.limit.toString());
  if (options?.offset !== undefined)
    params.append("offset", options.offset.toString());
  if (options?.category) params.append("category", options.category);

  const endpoint = params.toString()
    ? `/finscore/leaderboard?${params.toString()}`
    : "/finscore/leaderboard";

  return api.get<LeaderboardResponse>(endpoint, { token });
}

export async function getFriendsLeaderboard(
  token: string,
): Promise<LeaderboardUser[]> {
  return api.get<LeaderboardUser[]>("/finscore/leaderboard/friends", { token });
}

export interface UserPosition {
  rank: number | null;
  totalUsers: number;
  percentile: number | null;
}

export async function getUserPosition(
  token: string,
  category?: "overall" | "expense" | "chore" | "community",
): Promise<UserPosition> {
  const params = new URLSearchParams();
  if (category) params.append("category", category);

  const endpoint = params.toString()
    ? `/finscore/leaderboard/position?${params.toString()}`
    : "/finscore/leaderboard/position";

  return api.get<UserPosition>(endpoint, { token });
}

export interface ShareRankResponse {
  rank: number | null;
  totalUsers: number;
  percentile: number | null;
  shareText: string | null;
}

export async function getShareRank(
  token: string,
  category?: "overall" | "expense" | "chore" | "community",
): Promise<ShareRankResponse> {
  const params = new URLSearchParams();
  if (category) params.append("category", category);

  const endpoint = params.toString()
    ? `/finscore/share-rank?${params.toString()}`
    : "/finscore/share-rank";

  return api.get<ShareRankResponse>(endpoint, { token });
}
