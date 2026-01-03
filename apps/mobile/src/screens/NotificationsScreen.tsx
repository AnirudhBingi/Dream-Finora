import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
import { setBadgeCount } from '../services/pushNotifications';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';

interface NotificationsScreenProps {
  onBack: () => void;
  onViewExpense?: (expenseId: string) => void;
  onViewChore?: (choreId: string) => void;
  onViewSpaceV?: (spacevId: string) => void;
  onViewRide?: (rideId: string) => void;
  onViewGroup?: (groupId: string) => void;
  onViewFriend?: (friendId: string) => void;
  onViewMessage?: (chatId: string) => void;
}

export function NotificationsScreen({
  onBack,
  onViewExpense,
  onViewChore,
  onViewSpaceV,
  onViewRide,
  onViewGroup,
  onViewFriend,
  onViewMessage,
}: NotificationsScreenProps) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
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
      setNotifications(data?.notifications || []);
      setFilteredNotifications(data?.notifications || []);
      setHasMore(data?.hasMore || false);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
      setNotifications([]);
      setFilteredNotifications([]);
      setHasMore(false);
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
      setFilteredNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n,
        ),
      );
      // Update badge count
      const unreadCount = (notifications || []).filter(n => n.id !== notificationId && !n.read).length;
      await setBadgeCount(unreadCount);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  async function handleMarkAllAsRead() {
    if (!token) return;

    try {
      await markAllNotificationsAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      setFilteredNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      // Update badge count to 0
      await setBadgeCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }

  async function handleClearAll() {
    if (!token) return;

    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all notifications one by one (or implement bulk delete endpoint)
              for (const notification of notifications) {
                await deleteNotification(token, notification.id);
              }
              setNotifications([]);
              setFilteredNotifications([]);
            } catch (err) {
              console.error('Failed to clear all notifications:', err);
            }
          },
        },
      ],
    );
  }

  function handleFilter(filter: string) {
    setSelectedFilter(filter);
    if (filter === 'all') {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(notifications.filter(n => n.type === filter));
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
    } else if (notification.data?.choreId && onViewChore) {
      onViewChore(notification.data.choreId);
    } else if (notification.data?.listingId && onViewSpaceV) {
      onViewSpaceV(notification.data.listingId);
    } else if (notification.data?.rideId && onViewRide) {
      onViewRide(notification.data.rideId);
    } else if (notification.data?.groupId && onViewGroup) {
      onViewGroup(notification.data.groupId);
    } else if (notification.data?.chatId && onViewMessage) {
      onViewMessage(notification.data.chatId);
    } else if (notification.type === 'friend_request' && notification.data?.friendId) {
      // For friend requests, clicking the card goes to friends list (requests tab)
      // The "View Profile" button will handle profile navigation separately
      if (onViewFriend) {
        onViewFriend(notification.data.friendId);
      }
    } else if (notification.data?.friendId && onViewFriend) {
      onViewFriend(notification.data.friendId);
    }
  }

  function handleViewProfile(notification: Notification) {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // For friend requests, "View Profile" should navigate to user's profile
    // TODO: Navigate to UserProfileScreen when it's implemented (Phase 2.3)
    // For now, navigate to friends list - this will be fixed when UserProfileScreen is created
    if (notification.data?.friendId && onViewFriend) {
      onViewFriend(notification.data.friendId);
    }
  }

  function getActionLabel(notification: Notification): string | null {
    if (notification.data?.expenseId) return 'View Expense';
    if (notification.data?.choreId) return 'View Chore';
    if (notification.data?.listingId) return 'View Listing';
    if (notification.data?.rideId) return 'View Ride';
    if (notification.data?.groupId) return 'View Group';
    if (notification.data?.friendId) return 'View Profile';
    if (notification.data?.chatId) return 'Open Chat';
    return null;
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
      case 'listing_favorited':
        return 'favorite';
      case 'listing_commented':
        return 'comment';
      case 'ride_created':
      case 'ride_joined':
      case 'ride_updated':
      case 'ride_cancelled':
        return 'directions-car';
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

  const unreadCount = (filteredNotifications || []).filter(n => !n.read).length;
  const groupedNotifications = groupNotificationsByDate(filteredNotifications || []);

  const filterTypes = [
    { key: 'all', label: 'All' },
    { key: 'expense_added', label: 'Expenses' },
    { key: 'chore_assigned', label: 'Chores' },
    { key: 'message_received', label: 'Messages' },
    { key: 'friend_request', label: 'Friends' },
    { key: 'listing_commented', label: 'Listings' },
  ];

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
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllButtonText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {(notifications || []).length > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      {notifications.length > 0 && (
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {filterTypes.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  selectedFilter === filter.key && styles.filterChipSelected,
                ]}
                onPress={() => handleFilter(filter.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === filter.key && styles.filterChipTextSelected,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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

        {(filteredNotifications || []).length === 0 ? (
          <EmptyState
            icon="notifications-none"
            title="No notifications"
            message="You're all caught up! New notifications will appear here."
          />
        ) : (
          groupedNotifications.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{group.date}</Text>
              {group.items.map((notification) => (
                <View
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.read && styles.notificationCardUnread,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.notificationContentWrapper}
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
                        <View style={styles.notificationHeader}>
                          <Text style={styles.notificationTitle}>{notification.title}</Text>
                          {!notification.read && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.notificationMessage}>{notification.message}</Text>
                        <Text style={styles.notificationTime}>{formatDate(notification.createdAt)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.notificationRight}>
                    {getActionLabel(notification) && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          // For "View Profile" on friend requests, use separate handler
                          if (notification.type === 'friend_request' && getActionLabel(notification) === 'View Profile') {
                            handleViewProfile(notification);
                          } else {
                            handleNotificationPress(notification);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionButtonText}>{getActionLabel(notification)}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="close" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  markAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  clearAllButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  notificationContentWrapper: {
    flex: 1,
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
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
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
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  filterWrapper: {
    height: 56,
    flexShrink: 0,
    flexGrow: 0,
  },
  filterContainer: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  filterContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    flexShrink: 0,
    flexGrow: 0,
  },
  filterChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  notificationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

