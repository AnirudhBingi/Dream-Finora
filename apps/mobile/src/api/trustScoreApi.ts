import { getApiBaseUrl } from './getApiBaseUrl';

export interface TrustScoreBreakdown {
  expense: {
    onTimeSettlementRate: number;
    recentActivityBonus: number;
    volumeBonus: number;
    rawScore: number;
  };
  chore: {
    completionRate: number;
    onTimeRate: number;
    pointsBonus: number;
    rawScore: number;
  };
  community: {
    listingSuccessRate: number;
    engagementRate: number;
    responseRate: number;
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
}

export async function getTrustScore(token: string): Promise<TrustScore> {
  const response = await fetch(`${getApiBaseUrl()}/trust-score`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch trust score' }));
    throw new Error(error.message || `Failed to fetch trust score: ${response.status}`);
  }

  return response.json();
}

export async function getTrustScoreBreakdown(token: string): Promise<TrustScoreWithBreakdown> {
  const response = await fetch(`${getApiBaseUrl()}/trust-score/breakdown`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch trust score breakdown' }));
    throw new Error(error.message || `Failed to fetch trust score breakdown: ${response.status}`);
  }

  return response.json();
}

export async function getTrustScoreHistory(token: string, limit: number = 50): Promise<{ history: TrustScoreHistory[] }> {
  const response = await fetch(`${getApiBaseUrl()}/trust-score/history?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch trust score history' }));
    throw new Error(error.message || `Failed to fetch trust score history: ${response.status}`);
  }

  return response.json();
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

export async function compareTrustScore(token: string): Promise<TrustScoreComparison> {
  const response = await fetch(`${getApiBaseUrl()}/trust-score/compare`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch trust score comparison' }));
    throw new Error(error.message || `Failed to fetch trust score comparison: ${response.status}`);
  }

  return response.json();
}

export interface TrustScoreInsights {
  currentScore: number;
  trend: {
    direction: 'up' | 'down' | 'stable';
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
  };
  suggestions: string[];
  history: Array<{
    score: number;
    timestamp: string;
    reason: string | null;
  }>;
}

export async function getTrustScoreInsights(token: string): Promise<TrustScoreInsights> {
  const response = await fetch(`${getApiBaseUrl()}/trust-score/insights`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch trust score insights' }));
    throw new Error(error.message || `Failed to fetch trust score insights: ${response.status}`);
  }

  return response.json();
}

