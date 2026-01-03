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

export async function getTrustScoreHistory(token: string, limit: number = 20): Promise<{ history: TrustScoreHistory[] }> {
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

