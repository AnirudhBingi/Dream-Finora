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

export interface PaginatedGroupsResponse {
  groups: Group[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export async function getGroups(
  token: string,
  limit: number = 50,
  offset: number = 0,
): Promise<PaginatedGroupsResponse | Group[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  queryParams.append('offset', offset.toString());

  const response = await fetch(`${getApiBaseUrl()}/groups?${queryParams.toString()}`, {
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

  const data = await response.json();
  // Check if response has pagination structure
  if (data.groups && Array.isArray(data.groups)) {
    return data as PaginatedGroupsResponse;
  }
  // Backward compatibility: return array if not paginated
  return data as Group[];
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

export interface InviteMemberResponse {
  invitationId: string;
  token: string;
  email?: string | null;
  mobileNumber?: string | null;
  expiresAt: string;
  inviteLink: string;
}

export async function inviteGroupMember(
  token: string,
  groupId: string,
  data: { email?: string; mobileNumber?: string; userId?: string },
): Promise<InviteMemberResponse> {
  const response = await fetch(`${getApiBaseUrl()}/groups/${groupId}/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to send invitation' }));
    throw new Error(error.message || `Failed to send invitation: ${response.status}`);
  }

  return response.json();
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  email?: string | null;
  mobileNumber?: string | null;
  token: string;
  status: string;
  expiresAt: string;
  group: {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
  };
  inviter: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export async function getGroupInvitation(token: string): Promise<GroupInvitation> {
  const response = await fetch(`${getApiBaseUrl()}/groups/invitations/${token}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get invitation' }));
    throw new Error(error.message || `Failed to get invitation: ${response.status}`);
  }

  return response.json();
}

export async function acceptGroupInvitation(
  token: string,
  invitationToken: string,
): Promise<{ success: boolean; groupId: string; groupName: string }> {
  const response = await fetch(`${getApiBaseUrl()}/groups/invitations/${invitationToken}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to accept invitation' }));
    throw new Error(error.message || `Failed to accept invitation: ${response.status}`);
  }

  return response.json();
}

export async function declineGroupInvitation(
  token: string,
  invitationToken: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/groups/invitations/${invitationToken}/decline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to decline invitation' }));
    throw new Error(error.message || `Failed to decline invitation: ${response.status}`);
  }

  return response.json();
}

