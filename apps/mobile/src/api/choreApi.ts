import { api } from "./client";

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
  status: "pending" | "assigned" | "completed" | "cancelled";
  assignedTo: string | null;
  assignmentType: "single" | "multiple" | "open";
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
  recurrencePattern?: "daily" | "weekly" | "monthly" | "custom" | null;
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
  rotationType?: "round-robin" | null;
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
  assignmentType?: "single" | "multiple" | "open";
  dueDate?: string;
  reminderHoursBefore?: number; // e.g., 24 for 24 hours before due date
  reminderEnabled?: boolean;
  // Recurring fields
  isRecurring?: boolean;
  recurrencePattern?: "daily" | "weekly" | "monthly" | "custom";
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
  rotationType?: "round-robin";
}

export async function createChore(
  token: string,
  data: CreateChoreDto,
): Promise<Chore> {
  return api.post<Chore>("/chores", data, { token });
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
  queryParams.append("limit", limit.toString());
  queryParams.append("offset", offset.toString());
  if (groupId) queryParams.append("groupId", groupId);

  const data = await api.get<PaginatedChoresResponse | Chore[]>(
    `/chores?${queryParams.toString()}`,
    { token },
  );
  // Check if response has pagination structure
  if (
    data &&
    typeof data === "object" &&
    "chores" in data &&
    Array.isArray((data as any).chores)
  ) {
    return data as PaginatedChoresResponse;
  }
  // Backward compatibility: return array if not paginated
  return data as Chore[];
}

export async function getChoreById(
  token: string,
  choreId: string,
): Promise<Chore> {
  return api.get<Chore>(`/chores/${choreId}`, { token });
}

export async function assignChore(
  token: string,
  choreId: string,
  userId: string,
): Promise<Chore> {
  return api.put<Chore>(`/chores/${choreId}/assign`, { userId }, { token });
}

export async function grabChore(
  token: string,
  choreId: string,
): Promise<Chore> {
  return api.put<Chore>(`/chores/${choreId}/grab`, undefined, { token });
}

export async function completeChore(
  token: string,
  choreId: string,
): Promise<Chore & { lastCompletion?: ChoreCompletion }> {
  return api.put<Chore & { lastCompletion?: ChoreCompletion }>(
    `/chores/${choreId}/complete`,
    undefined,
    { token },
  );
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
  recurrencePattern?: "daily" | "weekly" | "monthly" | "custom";
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
  rotationType?: "round-robin";
}

export async function updateChore(
  token: string,
  choreId: string,
  data: UpdateChoreDto,
): Promise<Chore> {
  return api.patch<Chore>(`/chores/${choreId}`, data, { token });
}

export async function deleteChore(
  token: string,
  choreId: string,
): Promise<{ success: boolean; message: string }> {
  return api.delete<{ success: boolean; message: string }>(
    `/chores/${choreId}`,
    { token },
  );
}

export async function unassignChore(
  token: string,
  choreId: string,
): Promise<Chore> {
  return api.put<Chore>(`/chores/${choreId}/unassign`, undefined, { token });
}

export async function cancelChore(
  token: string,
  choreId: string,
): Promise<Chore> {
  return api.put<Chore>(`/chores/${choreId}/cancel`, undefined, { token });
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
  return api.put<Chore>(`/chores/${choreId}/reassign`, data, { token });
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
  return api.get<ChoreHistoryEntry[]>(`/chores/${choreId}/history`, { token });
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
  return api.get<ChoreStats>("/chores/stats/me", { token });
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

export async function getGroupChoreStats(
  token: string,
  groupId: string,
): Promise<GroupChoreStats> {
  return api.get<GroupChoreStats>(`/chores/stats/group/${groupId}`, { token });
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

export async function getGroupAchievements(
  token: string,
  groupId: string,
): Promise<GroupAchievements> {
  return api.get<GroupAchievements>(`/chores/groups/${groupId}/achievements`, {
    token,
  });
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
  return api.get<GroupChoreHistoryEntry[]>(
    `/chores/groups/${groupId}/history?limit=${limit}`,
    { token },
  );
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
  return api.get<GroupAnalytics>(
    `/chores/groups/${groupId}/analytics?days=${days}`,
    { token },
  );
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

export async function getFriendChoreStats(
  token: string,
  friendId: string,
): Promise<FriendChoreStats> {
  return api.get<FriendChoreStats>(`/chores/stats/friend/${friendId}`, {
    token,
  });
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
  period: "week" | "month" | "all-time" = "all-time",
): Promise<{
  period: string;
  groupId: string;
  leaderboard: LeaderboardEntry[];
  updatedAt: string;
}> {
  return api.get<{
    period: string;
    groupId: string;
    leaderboard: LeaderboardEntry[];
    updatedAt: string;
  }>(`/chores/leaderboard/${groupId}?period=${period}`, { token });
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
  return api.post<CalculatePointsResponse>("/chores/calculate-points", data, {
    token,
  });
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
  return api.post<Chore>(
    `/chores/${choreId}/assign-multiple`,
    { userIds },
    { token },
  );
}

export async function getChoreAssignments(
  token: string,
  choreId: string,
): Promise<ChoreAssignment[]> {
  return api.get<ChoreAssignment[]>(`/chores/${choreId}/assignments`, {
    token,
  });
}

export async function completeChoreAssignment(
  token: string,
  choreId: string,
  assignmentId: string,
): Promise<Chore> {
  return api.put<Chore>(
    `/chores/${choreId}/assignments/${assignmentId}/complete`,
    undefined,
    { token },
  );
}

export async function removeChoreAssignment(
  token: string,
  choreId: string,
  assignmentId: string,
): Promise<Chore> {
  return api.delete<Chore>(`/chores/${choreId}/assignments/${assignmentId}`, {
    token,
  });
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
  return api.get<RecurringChoreOccurrences>(`/chores/${choreId}/occurrences`, {
    token,
  });
}

export async function stopRecurrence(
  token: string,
  choreId: string,
): Promise<Chore> {
  return api.put<Chore>(`/chores/${choreId}/recurrence/stop`, undefined, {
    token,
  });
}

export async function skipOccurrence(
  token: string,
  parentChoreId: string,
  occurrenceId: string,
): Promise<{ success: boolean; message: string }> {
  return api.put<{ success: boolean; message: string }>(
    `/chores/${parentChoreId}/recurrence/skip`,
    { occurrenceId },
    { token },
  );
}

export async function generateNextOccurrence(
  token: string,
  choreId: string,
): Promise<Chore> {
  return api.post<Chore>(`/chores/${choreId}/recurrence/generate`, undefined, {
    token,
  });
}

// Rotation Functions
export async function getRotationOrder(
  token: string,
  choreId: string,
): Promise<ChoreRotationMember[]> {
  return api.get<ChoreRotationMember[]>(`/chores/${choreId}/rotation`, {
    token,
  });
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
  return api.get<RotationScheduleItem[]>(
    `/chores/${choreId}/rotation/schedule?count=${count}`,
    { token },
  );
}

export async function updateRotationOrder(
  token: string,
  choreId: string,
  userIds: string[],
): Promise<void> {
  await api.put<void>(`/chores/${choreId}/rotation`, { userIds }, { token });
}

export async function skipUserInRotation(
  token: string,
  choreId: string,
  userId: string,
  skipUntil: string,
): Promise<void> {
  await api.post<void>(
    `/chores/${choreId}/rotation/skip`,
    { userId, skipUntil },
    { token },
  );
}

export async function removeSkip(
  token: string,
  choreId: string,
  userId: string,
): Promise<void> {
  await api.delete<void>(`/chores/${choreId}/rotation/skip/${userId}`, {
    token,
  });
}

export async function assignToNextUser(
  token: string,
  choreId: string,
): Promise<Chore> {
  return api.post<Chore>(`/chores/${choreId}/rotation/assign-next`, undefined, {
    token,
  });
}

export interface RotationFairnessResponse {
  groupId: string;
  fairnessScore: number;
}

export async function getRotationFairness(
  token: string,
  groupId: string,
): Promise<RotationFairnessResponse> {
  return api.get<RotationFairnessResponse>(
    `/chores/groups/${groupId}/rotation-fairness`,
    { token },
  );
}
