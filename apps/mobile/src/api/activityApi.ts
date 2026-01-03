import { getApiBaseUrl } from './getApiBaseUrl';

export interface ActivityItem {
  id: string;
  type: string;
  timestamp: string;
  description: string;
  user: {
    id: string;
    email: string;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
  data?: Record<string, any>;
}

export interface ActivityFeedResponse {
  activities: ActivityItem[];
  total: number;
  hasMore: boolean;
}

export async function getActivityFeed(
  token: string,
  limit: number = 50,
  offset: number = 0,
  filter?: string,
): Promise<ActivityFeedResponse> {
  const url = new URL(`${getApiBaseUrl()}/activity/feed`);
  url.searchParams.append('limit', limit.toString());
  url.searchParams.append('offset', offset.toString());
  if (filter) {
    url.searchParams.append('filter', filter);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch activity feed' }));
    throw new Error(error.message || `Failed to fetch activity feed: ${response.status}`);
  }

  return response.json();
}

export async function getGroupHistory(
  token: string,
  groupId: string,
): Promise<ActivityItem[]> {
  const response = await fetch(`${getApiBaseUrl()}/groups/${groupId}/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch group history' }));
    throw new Error(error.message || `Failed to fetch group history: ${response.status}`);
  }

  return response.json();
}
