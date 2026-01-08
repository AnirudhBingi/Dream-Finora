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

export interface ChoreAssignment {
  id: string;
  choreId: string;
  userId: string;
  assignedAt: string;
  completedAt: string | null;
  pointsEarned: number | null;
  onTime: boolean | null;
  user?: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
}

// Rotation Types
export interface ChoreRotationMember {
  id: string;
  userId: string;
  rotationOrder: number;
  lastAssignedAt: string | null;
  skipUntil: string | null;
  user?: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
}

export interface Chore {
  id: string;
  groupId: string | null;
  friendId: string | null;
  createdBy: string;
  title: string;
  description: string | null;
  category: string | null;
  points: number;
  status: 'pending' | 'assigned' | 'completed' | 'cancelled';
  assignedTo: string | null;
  assignmentType: 'single' | 'multiple' | 'open';
  dueDate: string | null;
  reminderEnabled: boolean;
  reminderHoursBefore: number | null;
  createdAt: string;
  completedAt: string | null;
  group?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
  friendUser?: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
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
  assignments?: ChoreAssignment[];
  completions?: ChoreCompletion[];
  // Recurring fields
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'custom' | null;
  recurrenceConfig?: {
    daysOfWeek?: number[];
    interval?: number;
    dayOfMonth?: number;
    weekOfMonth?: number;
    dayOfWeek?: number;
  } | null;
  parentChoreId?: string | null;
  nextOccurrenceDate?: string | null;
  recurrenceEndDate?: string | null;
  recurrenceCount?: number | null;
  occurrencesGenerated?: number;
  // Rotation fields
  rotationEnabled?: boolean;
  rotationType?: 'round-robin' | null;
  rotation?: ChoreRotationMember[];
}

export interface CreateChoreDto {
  title: string;
  description?: string;
  category?: string;
  points?: number;
  groupId?: string;
  friendId?: string;
  assignedTo?: string;
  assignedToMultiple?: string[];
  assignmentType?: 'single' | 'multiple' | 'open';
  dueDate?: string;
  reminderHoursBefore?: number; // e.g., 24 for 24 hours before due date
  reminderEnabled?: boolean;
  // Recurring fields
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceConfig?: {
    daysOfWeek?: number[];
    interval?: number;
    dayOfMonth?: number;
    weekOfMonth?: number;
    dayOfWeek?: number;
  };
  recurrenceEndDate?: string;
  recurrenceCount?: number;
  // Rotation fields
  rotationEnabled?: boolean;
  rotationType?: 'round-robin';
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
  reminderEnabled?: boolean;
  reminderHoursBefore?: number;
  // Recurring fields
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceConfig?: {
    daysOfWeek?: number[];
    interval?: number;
    dayOfMonth?: number;
    weekOfMonth?: number;
    dayOfWeek?: number;
  };
  recurrenceEndDate?: string;
  recurrenceCount?: number;
  // Rotation fields
  rotationEnabled?: boolean;
  rotationType?: 'round-robin';
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

export async function cancelChore(
  token: string,
  choreId: string,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/cancel`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to cancel chore' }));
    throw new Error(error.message || `Failed to cancel chore: ${response.status}`);
  }

  return response.json();
}

export interface ReassignChoreDto {
  userId: string;
  reason?: string;
}

export async function reassignChore(
  token: string,
  choreId: string,
  data: ReassignChoreDto,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/reassign`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to reassign chore' }));
    throw new Error(error.message || `Failed to reassign chore: ${response.status}`);
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

export interface GroupChoreStats {
  groupId: string;
  groupName: string;
  totalPoints: number;
  totalCompleted: number;
  totalAssigned: number;
  overallCompletionRate: number;
  memberCount: number;
  fairnessScore: number;
  members: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    totalPoints: number;
    totalCompleted: number;
    totalAssigned: number;
    completionRate: number;
    onTimeCount: number;
    onTimePercentage: number;
    avgCompletionTimeHours: number;
    role: string;
    rank: number;
  }>;
  workloadBalance: Array<{
    userId: string;
    displayName: string;
    assignedCount: number;
    deviation: number;
    balanceScore: number;
  }>;
}

export async function getGroupChoreStats(token: string, groupId: string): Promise<GroupChoreStats> {
  const response = await fetch(`${getApiBaseUrl()}/chores/stats/group/${groupId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch group chore stats' }));
    throw new Error(error.message || `Failed to fetch group chore stats: ${response.status}`);
  }

  return response.json();
}

export interface GroupAchievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

export interface GroupAchievements {
  groupId: string;
  groupName: string;
  totalPoints: number;
  totalCompleted: number;
  achievements: GroupAchievement[];
}

export async function getGroupAchievements(token: string, groupId: string): Promise<GroupAchievements> {
  const response = await fetch(`${getApiBaseUrl()}/chores/groups/${groupId}/achievements`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch group achievements' }));
    throw new Error(error.message || `Failed to fetch group achievements: ${response.status}`);
  }

  return response.json();
}

export interface GroupChoreHistoryEntry {
  id: string;
  action: string;
  choreId: string;
  choreTitle: string;
  userId: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string;
    };
  };
  changes?: any;
  notes?: string;
  createdAt: string;
}

export async function getGroupChoreHistory(
  token: string,
  groupId: string,
  limit: number = 50,
): Promise<GroupChoreHistoryEntry[]> {
  const response = await fetch(`${getApiBaseUrl()}/chores/groups/${groupId}/history?limit=${limit}`, {
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

export interface GroupAnalytics {
  groupId: string;
  period: number;
  totalCompletions: number;
  totalPoints: number;
  dailyTrend: Array<{ date: string; count: number }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    points: number;
  }>;
  weeklySummary: Array<{
    week: string;
    completions: number;
    points: number;
  }>;
}

export async function getGroupAnalytics(
  token: string,
  groupId: string,
  days: number = 30,
): Promise<GroupAnalytics> {
  const response = await fetch(`${getApiBaseUrl()}/chores/groups/${groupId}/analytics?days=${days}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch group analytics' }));
    throw new Error(error.message || `Failed to fetch group analytics: ${response.status}`);
  }

  return response.json();
}

export interface FriendChoreStats {
  friendId: string;
  friendName: string;
  friendAvatarUrl: string | null;
  userStats: {
    totalPoints: number;
    totalCompleted: number;
    onTimeCount: number;
    onTimePercentage: number;
  };
  friendStats: {
    totalPoints: number;
    totalCompleted: number;
    onTimeCount: number;
    onTimePercentage: number;
  };
  combinedTotalPoints: number;
  combinedTotalCompleted: number;
}

export async function getFriendChoreStats(token: string, friendId: string): Promise<FriendChoreStats> {
  const response = await fetch(`${getApiBaseUrl()}/chores/stats/friend/${friendId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch friend chore stats' }));
    throw new Error(error.message || `Failed to fetch friend chore stats: ${response.status}`);
  }

  return response.json();
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  totalCompleted?: number;
  currentStreak?: number;
  rank: number;
  change?: number; // Position change from previous period
  role: string;
}

export async function getGroupLeaderboard(
  token: string,
  groupId: string,
  period: 'week' | 'month' | 'all-time' = 'all-time'
): Promise<{ period: string; groupId: string; leaderboard: LeaderboardEntry[]; updatedAt: string }> {
  const response = await fetch(`${getApiBaseUrl()}/chores/leaderboard/${groupId}?period=${period}`, {
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

export interface CalculatePointsRequest {
  category?: string;
  title: string;
  description?: string;
}

export interface CalculatePointsResponse {
  points: number;
  explanation: string;
}

export async function calculateChorePoints(
  token: string,
  data: CalculatePointsRequest,
): Promise<CalculatePointsResponse> {
  const response = await fetch(`${getApiBaseUrl()}/chores/calculate-points`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to calculate points' }));
    throw new Error(error.message || `Failed to calculate points: ${response.status}`);
  }

  return response.json();
}

export interface ChoreAssignment {
  id: string;
  choreId: string;
  userId: string;
  assignedAt: string;
  completedAt: string | null;
  pointsEarned: number | null;
  onTime: boolean | null;
  user?: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
}

export async function assignMultipleChore(
  token: string,
  choreId: string,
  userIds: string[],
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/assign-multiple`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userIds }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to assign chore' }));
    throw new Error(error.message || `Failed to assign chore: ${response.status}`);
  }

  return response.json();
}

export async function getChoreAssignments(
  token: string,
  choreId: string,
): Promise<ChoreAssignment[]> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/assignments`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch assignments' }));
    throw new Error(error.message || `Failed to fetch assignments: ${response.status}`);
  }

  return response.json();
}

export async function completeChoreAssignment(
  token: string,
  choreId: string,
  assignmentId: string,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/assignments/${assignmentId}/complete`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to complete assignment' }));
    throw new Error(error.message || `Failed to complete assignment: ${response.status}`);
  }

  return response.json();
}

export async function removeChoreAssignment(
  token: string,
  choreId: string,
  assignmentId: string,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/assignments/${assignmentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to remove assignment' }));
    throw new Error(error.message || `Failed to remove assignment: ${response.status}`);
  }

  return response.json();
}

// Recurring Chore Functions
export interface RecurringChoreOccurrences {
  parentChore: Chore;
  occurrences: Chore[];
  total: number;
}

export async function getRecurringChoreOccurrences(
  token: string,
  choreId: string,
): Promise<RecurringChoreOccurrences> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/occurrences`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get occurrences' }));
    throw new Error(error.message || `Failed to get occurrences: ${response.status}`);
  }

  return response.json();
}

export async function stopRecurrence(
  token: string,
  choreId: string,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/recurrence/stop`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to stop recurrence' }));
    throw new Error(error.message || `Failed to stop recurrence: ${response.status}`);
  }

  return response.json();
}

export async function skipOccurrence(
  token: string,
  parentChoreId: string,
  occurrenceId: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${parentChoreId}/recurrence/skip`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ occurrenceId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to skip occurrence' }));
    throw new Error(error.message || `Failed to skip occurrence: ${response.status}`);
  }

  return response.json();
}

export async function generateNextOccurrence(
  token: string,
  choreId: string,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/recurrence/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to generate occurrence' }));
    throw new Error(error.message || `Failed to generate occurrence: ${response.status}`);
  }

  return response.json();
}

// Rotation Functions
export async function getRotationOrder(
  token: string,
  choreId: string,
): Promise<ChoreRotationMember[]> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/rotation`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get rotation order' }));
    throw new Error(error.message || `Failed to get rotation order: ${response.status}`);
  }

  return response.json();
}

export interface RotationScheduleItem {
  occurrenceNumber: number;
  assignedToUserId: string | null;
  dueDate: string | null;
  isAssigned: boolean;
}

export async function getRotationSchedule(
  token: string,
  choreId: string,
  count: number = 10,
): Promise<RotationScheduleItem[]> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/rotation/schedule?count=${count}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get rotation schedule' }));
    throw new Error(error.message || `Failed to get rotation schedule: ${response.status}`);
  }

  return response.json();
}

export async function updateRotationOrder(
  token: string,
  choreId: string,
  userIds: string[],
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/rotation`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userIds }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update rotation order' }));
    throw new Error(error.message || `Failed to update rotation order: ${response.status}`);
  }
}

export async function skipUserInRotation(
  token: string,
  choreId: string,
  userId: string,
  skipUntil: string,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/rotation/skip`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, skipUntil }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to skip user' }));
    throw new Error(error.message || `Failed to skip user: ${response.status}`);
  }
}

export async function removeSkip(
  token: string,
  choreId: string,
  userId: string,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/rotation/skip/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to remove skip' }));
    throw new Error(error.message || `Failed to remove skip: ${response.status}`);
  }
}

export async function assignToNextUser(
  token: string,
  choreId: string,
): Promise<Chore> {
  const response = await fetch(`${getApiBaseUrl()}/chores/${choreId}/rotation/assign-next`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to assign to next user' }));
    throw new Error(error.message || `Failed to assign to next user: ${response.status}`);
  }

  return response.json();
}

export interface RotationFairnessResponse {
  groupId: string;
  fairnessScore: number;
}

export async function getRotationFairness(
  token: string,
  groupId: string,
): Promise<RotationFairnessResponse> {
  const response = await fetch(`${getApiBaseUrl()}/chores/groups/${groupId}/rotation-fairness`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get fairness score' }));
    throw new Error(error.message || `Failed to get fairness score: ${response.status}`);
  }

  return response.json();
}

