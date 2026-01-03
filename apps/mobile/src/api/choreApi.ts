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

export async function getChores(
  token: string,
  groupId?: string,
): Promise<Chore[]> {
  const url = groupId
    ? `${getApiBaseUrl()}/chores?groupId=${groupId}`
    : `${getApiBaseUrl()}/chores`;
  const response = await fetch(url, {
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

  return response.json();
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

