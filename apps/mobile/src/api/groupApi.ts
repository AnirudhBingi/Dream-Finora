import { getApiBaseUrl } from './getApiBaseUrl';

export type GroupMemberRole = 'ADMIN' | 'MEMBER';

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  members: GroupMember[];
  createdByUser: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  _count?: {
    expenses: number;
  };
}

export interface GroupWithExpenses extends Group {
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    splits: Array<{
      id: string;
      userId: string;
      amount: number;
      isPaid: boolean;
      user: {
        id: string;
        email: string;
        profile?: {
          displayName: string | null;
          avatarUrl: string | null;
        } | null;
      };
    }>;
  }>;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  memberIds?: string[];
}

export interface BalanceInfo {
  totalOwed: number;
  totalOwedToUser: number;
  netBalance: number;
  primaryCurrency?: string;
  owedByUser: Array<{
    user: {
      id: string;
      email: string;
      profile?: {
        displayName: string | null;
        avatarUrl: string | null;
      } | null;
    };
    amount: number;
    originalAmount?: number;
    originalCurrency?: string;
    splits: any[];
  }>;
  owedToUser: Array<{
    user: {
      id: string;
      email: string;
      profile?: {
        displayName: string | null;
        avatarUrl: string | null;
      } | null;
    };
    amount: number;
    originalAmount?: number;
    originalCurrency?: string;
    splits: any[];
  }>;
}

export async function createGroup(
  token: string,
  data: CreateGroupDto,
): Promise<Group> {
  const response = await fetch(`${getApiBaseUrl()}/groups`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create group' }));
    throw new Error(error.message || `Failed to create group: ${response.status}`);
  }

  return response.json();
}

export async function getGroups(token: string): Promise<Group[]> {
  const response = await fetch(`${getApiBaseUrl()}/groups`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch groups' }));
    throw new Error(error.message || `Failed to fetch groups: ${response.status}`);
  }

  return response.json();
}

export async function getGroupById(token: string, groupId: string): Promise<GroupWithExpenses> {
  const response = await fetch(`${getApiBaseUrl()}/groups/${groupId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch group' }));
    throw new Error(error.message || `Failed to fetch group: ${response.status}`);
  }

  return response.json();
}

export async function getGroupBalances(token: string, groupId: string, primaryCurrency?: string): Promise<BalanceInfo> {
  const url = new URL(`${getApiBaseUrl()}/groups/${groupId}/balances`);
  if (primaryCurrency) {
    url.searchParams.append('primaryCurrency', primaryCurrency);
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch balances' }));
    throw new Error(error.message || `Failed to fetch balances: ${response.status}`);
  }

  return response.json();
}

export async function addGroupMember(
  token: string,
  groupId: string,
  userId: string,
): Promise<GroupMember> {
  const response = await fetch(`${getApiBaseUrl()}/groups/${groupId}/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to add member' }));
    throw new Error(error.message || `Failed to add member: ${response.status}`);
  }

  return response.json();
}

export async function removeGroupMember(
  token: string,
  groupId: string,
  memberId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/groups/${groupId}/members/${memberId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to remove member' }));
    throw new Error(error.message || `Failed to remove member: ${response.status}`);
  }

  return response.json();
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
}

export async function updateGroup(
  token: string,
  groupId: string,
  data: UpdateGroupDto,
): Promise<Group> {
  const response = await fetch(`${getApiBaseUrl()}/groups/${groupId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update group' }));
    throw new Error(error.message || `Failed to update group: ${response.status}`);
  }

  return response.json();
}

export async function deleteGroup(
  token: string,
  groupId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/groups/${groupId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete group' }));
    throw new Error(error.message || `Failed to delete group: ${response.status}`);
  }

  return response.json();
}

export async function changeMemberRole(
  token: string,
  groupId: string,
  memberId: string,
  role: GroupMemberRole,
): Promise<GroupMember> {
  const response = await fetch(`${getApiBaseUrl()}/groups/${groupId}/members/${memberId}/role`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to change member role' }));
    throw new Error(error.message || `Failed to change member role: ${response.status}`);
  }

  return response.json();
}

export async function transferOwnership(
  token: string,
  groupId: string,
  newOwnerId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/groups/${groupId}/transfer-ownership`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newOwnerId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to transfer ownership' }));
    throw new Error(error.message || `Failed to transfer ownership: ${response.status}`);
  }

  return response.json();
}

export async function leaveGroup(
  token: string,
  groupId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/groups/${groupId}/leave`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to leave group' }));
    throw new Error(error.message || `Failed to leave group: ${response.status}`);
  }

  return response.json();
}

