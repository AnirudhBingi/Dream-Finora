import { api } from "./client";
import type { BalanceInfo } from "./types";

export type GroupMemberRole = "ADMIN" | "MEMBER";
export type GroupVisibility = "public" | "private";
export type GroupJoinRequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled";

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
  icon?: string | null;
  avatarUrl?: string | null;
  allowMemberEditing?: boolean;
  visibility?: GroupVisibility;
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
    chores?: number;
    rides?: number;
    messages?: number;
  };
  isMember?: boolean;
  joinRequestStatus?: GroupJoinRequestStatus | null;
}

export interface GroupRideStats {
  totalRides: number;
  totalSpent: number;
  rideExpenses: Array<{
    id: string;
    rideId: string | null;
    description: string;
    amount: number;
    currency: string;
    date: string;
  }>;
}

export interface GroupStats {
  totalExpenses: number;
  totalMembers: number;
  rides: GroupRideStats;
}

export interface GroupWithExpenses extends Group {
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    category?: string | null;
    receiptUrl?: string | null;
    paidBy?: string | null;
    rideId?: string | null; // Include rideId if expense was created from a ride
    ride?: {
      id: string;
      origin: string;
      destination: string;
      type: "giveRide" | "rideshare";
      date: string;
    } | null; // Ride summary if expense was created from a ride
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
  stats?: GroupStats; // Ride statistics for the group
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  memberIds?: string[];
  allowMemberEditing?: boolean;
  icon?: string;
  visibility?: GroupVisibility;
}

export async function createGroup(
  token: string,
  data: CreateGroupDto,
): Promise<Group> {
  return api.post<Group>("/groups", data, { token });
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
  queryParams.append("limit", limit.toString());
  queryParams.append("offset", offset.toString());

  const data = await api.get<PaginatedGroupsResponse | Group[]>(
    `/groups?${queryParams.toString()}`,
    { token },
  );
  // Check if response has pagination structure
  if (
    data &&
    typeof data === "object" &&
    "groups" in data &&
    Array.isArray((data as any).groups)
  ) {
    return data as PaginatedGroupsResponse;
  }
  // Backward compatibility: return array if not paginated
  return data as Group[];
}

export async function getPublicGroups(
  token: string,
  params: {
    memberId?: string;
    limit?: number;
    offset?: number;
    query?: string;
  } = {},
): Promise<PaginatedGroupsResponse> {
  const queryParams = new URLSearchParams();
  if (params.memberId) queryParams.append("memberId", params.memberId);
  if (params.limit !== undefined)
    queryParams.append("limit", params.limit.toString());
  if (params.offset !== undefined)
    queryParams.append("offset", params.offset.toString());
  if (params.query) queryParams.append("q", params.query);

  return api.get<PaginatedGroupsResponse>(
    `/groups/public?${queryParams.toString()}`,
    { token },
  );
}

export async function getGroupById(
  token: string,
  groupId: string,
): Promise<GroupWithExpenses> {
  return api.get<GroupWithExpenses>(`/groups/${groupId}`, { token });
}

export async function getGroupBalances(
  token: string,
  groupId: string,
  primaryCurrency?: string,
): Promise<BalanceInfo> {
  const endpoint = primaryCurrency
    ? `/groups/${groupId}/balances?primaryCurrency=${encodeURIComponent(primaryCurrency)}`
    : `/groups/${groupId}/balances`;
  return api.get<BalanceInfo>(endpoint, { token });
}

export async function addGroupMember(
  token: string,
  groupId: string,
  userId: string,
): Promise<GroupMember> {
  return api.post<GroupMember>(
    `/groups/${groupId}/members`,
    { userId },
    { token },
  );
}

export async function removeGroupMember(
  token: string,
  groupId: string,
  memberId: string,
): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(
    `/groups/${groupId}/members/${memberId}`,
    { token },
  );
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  visibility?: GroupVisibility;
}

export async function uploadGroupAvatar(
  token: string,
  groupId: string,
  uri: string,
  filename: string,
  type: string,
): Promise<Group> {
  const formData = new FormData();

  // @ts-ignore - FormData.append accepts File, but React Native uses different format
  formData.append("file", {
    uri,
    name: filename,
    type,
  } as any);

  return api.post<Group>(`/groups/${groupId}/avatar`, formData, { token });
}

export async function updateGroup(
  token: string,
  groupId: string,
  data: UpdateGroupDto,
): Promise<Group> {
  return api.put<Group>(`/groups/${groupId}`, data, { token });
}

export async function deleteGroup(
  token: string,
  groupId: string,
): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/groups/${groupId}`, { token });
}

export async function changeMemberRole(
  token: string,
  groupId: string,
  memberId: string,
  role: GroupMemberRole,
): Promise<GroupMember> {
  return api.put<GroupMember>(
    `/groups/${groupId}/members/${memberId}/role`,
    { role },
    { token },
  );
}

export async function transferOwnership(
  token: string,
  groupId: string,
  newOwnerId: string,
): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(
    `/groups/${groupId}/transfer-ownership`,
    { newOwnerId },
    { token },
  );
}

export async function leaveGroup(
  token: string,
  groupId: string,
): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(`/groups/${groupId}/leave`, undefined, {
    token,
  });
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
  return api.post<InviteMemberResponse>(`/groups/${groupId}/invite`, data, {
    token,
  });
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

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  userId: string;
  status: GroupJoinRequestStatus;
  handledBy?: string | null;
  handledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export async function requestJoinGroup(
  token: string,
  groupId: string,
): Promise<GroupJoinRequest> {
  return api.post<GroupJoinRequest>(
    `/groups/${groupId}/join-requests`,
    undefined,
    { token },
  );
}

export async function getGroupJoinRequests(
  token: string,
  groupId: string,
): Promise<GroupJoinRequest[]> {
  return api.get<GroupJoinRequest[]>(`/groups/${groupId}/join-requests`, {
    token,
  });
}

export async function approveGroupJoinRequest(
  token: string,
  groupId: string,
  requestId: string,
): Promise<GroupJoinRequest> {
  return api.post<GroupJoinRequest>(
    `/groups/${groupId}/join-requests/${requestId}/approve`,
    undefined,
    { token },
  );
}

export async function declineGroupJoinRequest(
  token: string,
  groupId: string,
  requestId: string,
): Promise<GroupJoinRequest> {
  return api.post<GroupJoinRequest>(
    `/groups/${groupId}/join-requests/${requestId}/decline`,
    undefined,
    { token },
  );
}

export async function getGroupInvitation(
  token: string,
): Promise<GroupInvitation> {
  return api.get<GroupInvitation>(`/groups/invitations/${token}`, { token });
}

export async function acceptGroupInvitation(
  token: string,
  invitationToken: string,
): Promise<{ success: boolean; groupId: string; groupName: string }> {
  return api.post<{ success: boolean; groupId: string; groupName: string }>(
    `/groups/invitations/${invitationToken}/accept`,
    undefined,
    { token },
  );
}

export async function declineGroupInvitation(
  token: string,
  invitationToken: string,
): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(
    `/groups/invitations/${invitationToken}/decline`,
    undefined,
    { token },
  );
}

export type { BalanceInfo } from "./types";
