import { api } from "./client";

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
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());
  if (filter) params.append("filter", filter);

  const endpoint = `/activity/feed?${params.toString()}`;
  return api.get<ActivityFeedResponse>(endpoint, { token });
}

export async function getGroupHistory(
  token: string,
  groupId: string,
): Promise<ActivityItem[]> {
  return api.get<ActivityItem[]>(`/groups/${groupId}/history`, { token });
}
