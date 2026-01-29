import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  Notification,
  NotificationType,
} from "../api/notificationApi";
import { setBadgeCount } from "../services/pushNotifications";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { getUserFriendlyErrorMessage } from "../components/ErrorState";
import { Header } from "../components/Header";
import { useTheme } from "../theme";

interface NotificationsScreenProps {
  onBack: () => void;
  onViewExpense?: (expenseId: string) => void;
  onViewChore?: (choreId: string) => void;
  onViewSpaceV?: (spacevId: string) => void;
  onViewRide?: (rideId: string) => void;
  onViewGroup?: (groupId: string) => void;
  onViewFriend?: (friendId: string) => void;
  onViewMessage?: (
    chatId: string,
    groupId?: string,
    groupName?: string,
  ) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
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
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: NotificationsScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Fetch notifications
  const {
    data: notificationsData,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<{ notifications: Notification[]; hasMore: boolean }>({
    fetchFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const data = await getNotifications(token, 50, 0);
      return {
        notifications: data?.notifications || [],
        hasMore: data?.hasMore || false,
      };
    },
    immediate: true,
    deps: [token],
  });

  const notifications = notificationsData?.notifications || [];
  const hasMore = notificationsData?.hasMore || false;

  // Filter notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    if (selectedFilter === "all") {
      return notifications;
    }
    return notifications.filter((n) => n.type === selectedFilter);
  }, [notifications, selectedFilter]);

  const { execute: handleMarkAsRead } = useAsyncOperation({
    operationFn: async (notificationId: string) => {
      if (!token) throw new Error("Not authenticated");
      await markNotificationAsRead(token, notificationId);
      // Update badge count
      const unreadCount = notifications.filter(
        (n) => n.id !== notificationId && !n.read,
      ).length;
      await setBadgeCount(unreadCount);
      // Refetch to get updated notifications
      refetch();
      return notificationId;
    },
  });

  const { execute: handleMarkAllAsRead } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error("Not authenticated");
      await markAllNotificationsAsRead(token);
      // Update badge count to 0
      await setBadgeCount(0);
      // Refetch to get updated notifications
      refetch();
    },
  });

  const { execute: handleClearAllOperation } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error("Not authenticated");
      // Delete all notifications one by one (or implement bulk delete endpoint)
      for (const notification of notifications) {
        await deleteNotification(token, notification.id);
      }
      // Refetch to get updated notifications
      refetch();
    },
  });

  function handleClearAll() {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to delete all notifications? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => handleClearAllOperation(),
        },
      ],
    );
  }

  function handleFilter(filter: string) {
    setSelectedFilter(filter);
  }

  const { execute: handleDelete } = useAsyncOperation({
    operationFn: async (notificationId: string) => {
      if (!token) throw new Error("Not authenticated");
      await deleteNotification(token, notificationId);
      // Refetch to get updated notifications
      refetch();
      return notificationId;
    },
  });

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
      onViewMessage(
        notification.data.chatId,
        notification.data.groupId,
        notification.data.groupName,
      );
    } else if (
      notification.type === "friend_request" &&
      notification.data?.friendId
    ) {
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
    if (notification.data?.expenseId) return "View Expense";
    if (notification.data?.choreId) return "View Chore";
    if (notification.data?.listingId) return "View Listing";
    if (notification.data?.rideId) return "View Ride";
    if (notification.data?.groupId) return "View Group";
    if (notification.data?.friendId) return "View Profile";
    if (notification.data?.chatId) return "Open Chat";
    return null;
  }

  function getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case "expense_added":
      case "expense_updated":
      case "expense_deleted":
        return "receipt";
      case "expense_settled":
      case "expense_split_paid":
        return "check-circle";
      case "chore_assigned":
      case "chore_completed":
      case "chore_created":
      case "chore_updated":
      case "chore_deleted":
        return "task";
      case "group_member_added":
      case "group_member_removed":
        return "group";
      case "friend_request":
      case "friend_accepted":
        return "person-add";
      case "message_received":
        return "message";
      case "listing_interest":
      case "listing_favorited":
        return "favorite";
      case "listing_commented":
        return "comment";
      case "ride_created":
      case "ride_joined":
      case "ride_updated":
      case "ride_cancelled":
        return "directions-car";
      default:
        return "notifications";
    }
  }

  function getNotificationColor(type: NotificationType): string {
    switch (type) {
      case "expense_added":
      case "expense_updated":
        return theme.colors.blue;
      case "expense_settled":
      case "expense_split_paid":
      case "chore_completed":
        return theme.colors.success;
      case "expense_deleted":
        return theme.colors.error;
      case "chore_assigned":
      case "chore_created":
        return theme.colors.warning;
      case "chore_updated":
        return theme.colors.info;
      case "chore_deleted":
        return theme.colors.error;
      case "friend_request":
      case "friend_accepted":
        return theme.colors.primary;
      case "message_received":
        return theme.colors.info;
      default:
        return theme.colors.textSecondary;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function groupNotificationsByDate(
    notifications: Notification[],
  ): { date: string; items: Notification[] }[] {
    const groups: Map<string, Notification[]> = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    notifications.forEach((notification) => {
      const date = new Date(notification.createdAt);
      date.setHours(0, 0, 0, 0);
      const diffDays = Math.floor(
        (today.getTime() - date.getTime()) / 86400000,
      );

      let dateLabel: string;
      if (diffDays === 0) {
        dateLabel = "Today";
      } else if (diffDays === 1) {
        dateLabel = "Yesterday";
      } else if (diffDays < 7) {
        dateLabel = date.toLocaleDateString("en-US", { weekday: "long" });
      } else {
        dateLabel = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year:
            date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
        });
      }

      if (!groups.has(dateLabel)) {
        groups.set(dateLabel, []);
      }
      groups.get(dateLabel)!.push(notification);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items,
    }));
  }

  const unreadCount = (filteredNotifications || []).filter(
    (n) => !n.read,
  ).length;
  const groupedNotifications = groupNotificationsByDate(
    filteredNotifications || [],
  );

  const filterTypes = [
    { key: "all", label: "All" },
    { key: "expense_added", label: "Expenses" },
    { key: "chore_assigned", label: "Chores" },
    { key: "message_received", label: "Messages" },
    { key: "friend_request", label: "Friends" },
    { key: "listing_commented", label: "Listings" },
  ];

  // Prepare right actions for header (unreadCount is already calculated above)
  const rightActions = (
    <>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => handleMarkAllAsRead()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Mark all as read"
        >
          <MaterialIcons name="done-all" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      )}
      {(notifications || []).length > 0 && (
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={handleClearAll}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Clear all notifications"
        >
          <MaterialIcons
            name="delete-outline"
            size={24}
            color={theme.colors.white}
          />
        </TouchableOpacity>
      )}
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Notifications"
          onBack={onBack}
          rightActions={rightActions}
          showNotifications={false}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Notifications"
        onBack={onBack}
        rightActions={rightActions}
        showNotifications={false}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToSettings={onNavigateToSettings}
      />

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
                    selectedFilter === filter.key &&
                      styles.filterChipTextSelected,
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
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
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
                          {
                            backgroundColor: `${getNotificationColor(notification.type)}20`,
                          },
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
                          <Text style={styles.notificationTitle}>
                            {notification.title}
                          </Text>
                          {!notification.read && (
                            <View style={styles.unreadDot} />
                          )}
                        </View>
                        <Text style={styles.notificationMessage}>
                          {notification.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatDate(notification.createdAt)}
                        </Text>
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
                          if (
                            notification.type === "friend_request" &&
                            getActionLabel(notification) === "View Profile"
                          ) {
                            handleViewProfile(notification);
                          } else {
                            handleNotificationPress(notification);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionButtonText}>
                          {getActionLabel(notification)}
                        </Text>
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
                      <MaterialIcons
                        name="close"
                        size={18}
                        color={theme.colors.textTertiary}
                      />
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

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    headerActionButton: {
      padding: theme.spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 22,
      backgroundColor: theme.colors.overlayLight,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    errorContainer: {
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: 8,
      margin: theme.spacing.base,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 8,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    emptyContainer: {
      alignItems: "center",
      padding: 48,
      marginTop: 64,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginTop: theme.spacing.base,
      marginBottom: theme.spacing.sm,
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    dateGroup: {
      marginBottom: theme.spacing.xl,
    },
    dateHeader: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    notificationCard: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.base,
      marginHorizontal: theme.spacing.xl,
      marginBottom: theme.spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    notificationCardUnread: {
      backgroundColor: theme.colors.blueBackground,
      borderColor: theme.colors.blue,
      borderWidth: 1,
    },
    notificationContentWrapper: {
      flex: 1,
    },
    notificationContent: {
      flexDirection: "row",
      alignItems: "flex-start",
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.md,
    },
    notificationText: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
    },
    notificationTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    notificationMessage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      lineHeight: 20,
    },
    notificationTime: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.blue,
      marginLeft: theme.spacing.sm,
    },
    deleteButton: {
      padding: theme.spacing.sm,
      marginLeft: theme.spacing.sm,
    },
    filterWrapper: {
      height: 56,
      flexShrink: 0,
      flexGrow: 0,
    },
    filterContainer: {
      height: 56,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    filterContent: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
      alignItems: "center",
      flexDirection: "row",
    },
    filterChip: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.sm,
      flexShrink: 0,
      flexGrow: 0,
    },
    filterChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    filterChipText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    filterChipTextSelected: {
      color: theme.colors.textInverse,
    },
    notificationRight: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    actionButton: {
      paddingVertical: 6,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 6,
      backgroundColor: theme.colors.blue,
    },
    actionButtonText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textInverse,
    },
  });
