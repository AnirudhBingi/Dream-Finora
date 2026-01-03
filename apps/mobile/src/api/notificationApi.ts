import { getApiBaseUrl } from './getApiBaseUrl';

export type NotificationType =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'expense_settled'
  | 'expense_split_paid'
  | 'chore_assigned'
  | 'chore_completed'
  | 'group_member_added'
  | 'group_member_removed'
  | 'friend_request'
  | 'friend_accepted'
  | 'message_received'
  | 'listing_interest'
  | 'listing_commented'
  | 'listing_favorited'
  | 'ride_created'
  | 'ride_joined'
  | 'ride_updated'
  | 'ride_cancelled';

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
  const url = new URL(`${getApiBaseUrl()}/notifications`);
  url.searchParams.append('limit', limit.toString());
  url.searchParams.append('offset', offset.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch notifications' }));
    throw new Error(error.message || `Failed to fetch notifications: ${response.status}`);
  }

  return response.json();
}

export async function getUnreadCount(token: string): Promise<number> {
  const response = await fetch(`${getApiBaseUrl()}/notifications/unread-count`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch unread count' }));
    throw new Error(error.message || `Failed to fetch unread count: ${response.status}`);
  }

  const data: UnreadCountResponse = await response.json();
  return data.count;
}

export async function markNotificationAsRead(
  token: string,
  notificationId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to mark notification as read' }));
    throw new Error(error.message || `Failed to mark notification as read: ${response.status}`);
  }

  return response.json();
}

export async function markAllNotificationsAsRead(token: string): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to mark all notifications as read' }));
    throw new Error(error.message || `Failed to mark all notifications as read: ${response.status}`);
  }

  return response.json();
}

export async function deleteNotification(
  token: string,
  notificationId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete notification' }));
    throw new Error(error.message || `Failed to delete notification: ${response.status}`);
  }

  return response.json();
}

