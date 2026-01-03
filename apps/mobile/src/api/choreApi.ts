import { getApiBaseUrl } from './getApiBaseUrl';

export interface ChoreCompletion {
  id: string;
  choreId: string;
  userId: string;
  completedAt: string;
  pointsEarned: number;
  onTime: boolean;
  user?: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface Chore {
  id: string;
  groupId: string | null;
  createdBy: string;
  title: string;
  description: string | null;
  points: number;
  status: 'pending' | 'assigned' | 'completed';
  assignedTo: string | null;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  group?: {
    id: string;
    name: string;
  } | null;
  createdByUser: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  assignedToUser?: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
  completions?: ChoreCompletion[];
}

export interface CreateChoreDto {
  title: string;
  description?: string;
  points?: number;
  groupId?: string;
  assignedTo?: string;
  dueDate?: string;
}

export async function createChore(
  token: string,
  data: CreateChoreDto,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create chore' }));
    throw new Error(error.message || `Failed to create chore: ${response.status}`);
  }

  return response.json();
}

export interface PaginatedChoresResponse {
  chores: Chore[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export async function getChores(
  token: string,
  groupId?: string,
  limit: number = 50,
  offset: number = 0,
): Promise<PaginatedChoresResponse | Chore[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  queryParams.append('offset', offset.toString());
  if (groupId) {
    queryParams.append('groupId', groupId);
  }

  const response = await fetch(`${getApiBaseUrl()}/chores?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch chores' }));
    throw new Error(error.message || `Failed to fetch chores: ${response.status}`);
  }

  const data = await response.json();
  // Check if response has pagination structure
  if (data.chores && Array.isArray(data.chores)) {
    return data as PaginatedChoresResponse;
  }
  // Backward compatibility: return array if not paginated
  return data as Chore[];
}

export async function getChoreById(token: string, choreId: string): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch chore' }));
    throw new Error(error.message || `Failed to fetch chore: ${response.status}`);
  }

  return response.json();
}

export async function assignChore(
  token: string,
  choreId: string,
  userId: string,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/assign`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to assign chore' }));
    throw new Error(error.message || `Failed to assign chore: ${response.status}`);
  }

  return response.json();
}

export async function grabChore(token: string, choreId: string): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/grab`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to grab chore' }));
    throw new Error(error.message || `Failed to grab chore: ${response.status}`);
  }

  return response.json();
}

export async function completeChore(
  token: string,
  choreId: string,
): Promise<Chore & { lastCompletion?: ChoreCompletion }> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/complete`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to complete chore' }));
    throw new Error(error.message || `Failed to complete chore: ${response.status}`);
  }

  return response.json();
}

export interface UpdateChoreDto {
  title?: string;
  description?: string;
  points?: number;
  assignedTo?: string;
  dueDate?: string;
}

export async function updateChore(
  token: string,
  choreId: string,
  data: UpdateChoreDto,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update chore' }));
    throw new Error(error.message || `Failed to update chore: ${response.status}`);
  }

  return response.json();
}

export async function deleteChore(
  token: string,
  choreId: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete chore' }));
    throw new Error(error.message || `Failed to delete chore: ${response.status}`);
  }

  return response.json();
}

export async function unassignChore(
  token: string,
  choreId: string,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/unassign`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to unassign chore' }));
    throw new Error(error.message || `Failed to unassign chore: ${response.status}`);
  }

  return response.json();
}

export interface ChoreHistoryEntry {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
  changes?: any;
  notes?: string | null;
  pointsEarned?: number;
  onTime?: boolean;
  user?: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
}

export async function getChoreHistory(
  token: string,
  choreId: string,
): Promise<ChoreHistoryEntry[]> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch chore history' }));
    throw new Error(error.message || `Failed to fetch chore history: ${response.status}`);
  }

  return response.json();
}

export interface ChoreStats {
  totalPoints: number;
  totalCompleted: number;
  onTimeCount: number;
  onTimePercentage: number;
  currentStreak: number;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    unlocked: boolean;
    unlockedAt?: string;
  }>;
  recentCompletions: Array<{
    id: string;
    choreTitle: string;
    pointsEarned: number;
    completedAt: string;
    onTime: boolean;
  }>;
}

export async function getChoreStats(token: string): Promise<ChoreStats> {
  const response = await fetch(`${getApiBaseUrl()}/chores/stats/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch chore stats' }));
    throw new Error(error.message || `Failed to fetch chore stats: ${response.status}`);
  }

  return response.json();
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  rank: number;
  role: string;
}

export async function getGroupLeaderboard(
  token: string,
  groupId: string,
): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${getApiBaseUrl()}/chores/leaderboard/${groupId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch leaderboard' }));
    throw new Error(error.message || `Failed to fetch leaderboard: ${response.status}`);
  }

  return response.json();
}

