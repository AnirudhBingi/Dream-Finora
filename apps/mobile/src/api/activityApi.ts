import { getApiBaseUrl } from './getApiBaseUrl';

export interface ActivityItem {
  id: string;
  type: 'expense' | 'settlement' | 'chore' | 'group' | 'listing' | 'friend' | 'finance';
  action: string;
  title: string;
  description: string;
  userId: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  createdAt: string;
  metadata?: {
    expenseId?: string;
    expenseDescription?: string;
    amount?: number;
    currency?: string;
    settlementId?: string;
    paymentMethod?: string;
    isTappable?: boolean;
    [key: string]: any;
  };
}

export async function getActivities(token: string, limit: number = 50): Promise<ActivityItem[]> {
  const response = await fetch(`${getApiBaseUrl()}/activity?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get activities' }));
    throw new Error(error.message || `Failed to get activities: ${response.status}`);
  }

  return response.json();
}

