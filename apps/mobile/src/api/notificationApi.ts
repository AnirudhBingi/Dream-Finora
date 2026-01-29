import { api } from "./client";

export type NotificationType =
  | "expense_added"
  | "expense_updated"
  | "expense_deleted"
  | "expense_settled"
  | "expense_split_paid"
  | "chore_assigned"
  | "chore_completed"
  | "chore_created"
  | "chore_updated"
  | "chore_deleted"
  | "group_member_added"
  | "group_member_removed"
  | "friend_request"
  | "friend_accepted"
  | "message_received"
  | "listing_interest"
  | "listing_commented"
  | "listing_favorited"
  | "ride_created"
  | "ride_joined"
  | "ride_updated"
  | "ride_cancelled";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export async function getNotifications(
  token: string,
  limit: number = 50,
  offset: number = 0,
): Promise<NotificationsResponse> {
  return api.get<NotificationsResponse>(
    `/notifications?limit=${limit}&offset=${offset}`,
    { token },
  );
}

export async function getUnreadCount(token: string): Promise<number> {
  const data = await api.get<UnreadCountResponse>(
    "/notifications/unread-count",
    {
      token,
      timeout: 10000, // 10 second timeout for this specific endpoint
    },
  );
  return data.count;
}

export async function markNotificationAsRead(
  token: string,
  notificationId: string,
): Promise<{ success: boolean }> {
  return api.put<{ success: boolean }>(
    `/notifications/${notificationId}/read`,
    undefined,
    { token },
  );
}

export async function markAllNotificationsAsRead(
  token: string,
): Promise<{ success: boolean }> {
  return api.put<{ success: boolean }>("/notifications/read-all", undefined, {
    token,
  });
}

export async function deleteNotification(
  token: string,
  notificationId: string,
): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/notifications/${notificationId}`, {
    token,
  });
}
