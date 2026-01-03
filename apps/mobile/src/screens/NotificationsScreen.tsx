import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  Notification,
  NotificationType,
} from '../api/notificationApi';

interface NotificationsScreenProps {
  onBack: () => void;
  onViewExpense?: (expenseId: string) => void;
}

export function NotificationsScreen({ onBack, onViewExpense }: NotificationsScreenProps) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [token]);

  async function loadNotifications() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications(token, 50, 0);
      setNotifications(data.notifications);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    if (!token) return;

    try {
      await markNotificationAsRead(token, notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n,
        ),
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  async function handleMarkAllAsRead() {
    if (!token) return;

    try {
      await markAllNotificationsAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }

  async function handleDelete(notificationId: string) {
    if (!token) return;

    try {
      await deleteNotification(token, notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }

  function handleNotificationPress(notification: Notification) {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.data?.expenseId && onViewExpense) {
      onViewExpense(notification.data.expenseId);
    }
  }

  function getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case 'expense_added':
      case 'expense_updated':
      case 'expense_deleted':
        return 'receipt';
      case 'expense_settled':
      case 'expense_split_paid':
        return 'check-circle';
      case 'chore_assigned':
      case 'chore_completed':
        return 'task';
      case 'group_member_added':
      case 'group_member_removed':
        return 'group';
      case 'friend_request':
      case 'friend_accepted':
        return 'person-add';
      case 'message_received':
        return 'message';
      case 'listing_interest':
        return 'favorite';
      default:
        return 'notifications';
    }
  }

  function getNotificationColor(type: NotificationType): string {
    switch (type) {
      case 'expense_added':
      case 'expense_updated':
        return '#2563EB'; // Blue
      case 'expense_settled':
      case 'expense_split_paid':
      case 'chore_completed':
        return '#10B981'; // Green
      case 'expense_deleted':
        return '#EF4444'; // Red
      case 'chore_assigned':
        return '#F59E0B'; // Amber
      case 'friend_request':
      case 'friend_accepted':
        return '#8B5CF6'; // Purple
      case 'message_received':
        return '#06B6D4'; // Cyan
      default:
        return '#6B7280'; // Gray
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function groupNotificationsByDate(notifications: Notification[]): { date: string; items: Notification[] }[] {
    const groups: Map<string, Notification[]> = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    notifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      date.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);

      let dateLabel: string;
      if (diffDays === 0) {
        dateLabel = 'Today';
      } else if (diffDays === 1) {
        dateLabel = 'Yesterday';
      } else if (diffDays < 7) {
        dateLabel = date.toLocaleDateString('en-US', { weekday: 'long' });
      } else {
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
      }

      if (!groups.has(dateLabel)) {
        groups.set(dateLabel, []);
      }
      groups.get(dateLabel)!.push(notification);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const groupedNotifications = groupNotificationsByDate(notifications);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllButtonText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadNotifications} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadNotifications}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>
              You're all caught up! Notifications will appear here when you have updates.
            </Text>
          </View>
        ) : (
          groupedNotifications.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{group.date}</Text>
              {group.items.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.read && styles.notificationCardUnread,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: `${getNotificationColor(notification.type)}20` },
                      ]}
                    >
                      <MaterialIcons
                        name={getNotificationIcon(notification.type) as any}
                        size={24}
                        color={getNotificationColor(notification.type)}
                      />
                    </View>
                    <View style={styles.notificationText}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
                      <Text style={styles.notificationTime}>{formatDate(notification.createdAt)}</Text>
                    </View>
                    {!notification.read && <View style={styles.unreadDot} />}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(notification.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginLeft: 8,
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  markAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
    marginTop: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationCardUnread: {
    backgroundColor: '#F0F9FF',
    borderColor: '#2563EB',
    borderWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginLeft: 8,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});

