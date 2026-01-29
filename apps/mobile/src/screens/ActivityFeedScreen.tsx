import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getActivityFeed, ActivityItem } from "../api/activityApi";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface ActivityFeedScreenProps {
  onBack: () => void;
  onViewExpense?: (expenseId: string) => void;
  onViewChore?: (choreId: string) => void;
  onViewGroup?: (groupId: string) => void;
  onViewSpaceV?: (spacevId: string) => void;
  onViewRide?: (rideId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function ActivityFeedScreen({
  onBack,
  onViewExpense,
  onViewChore,
  onViewGroup,
  onViewSpaceV,
  onViewRide,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ActivityFeedScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [hasMore, setHasMore] = useState(false);

  interface ActivityFeedData {
    activities: ActivityItem[];
    hasMore: boolean;
  }

  const { data, loading, refreshing, error, refresh, refetch } =
    useDataFetch<ActivityFeedData>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        return getActivityFeed(
          token,
          50,
          0,
          selectedFilter === "all" ? undefined : selectedFilter,
        );
      },
      immediate: true,
      deps: [token, selectedFilter],
      transform: (data) => {
        setHasMore(data.hasMore);
        return data;
      },
    });

  const activities = data?.activities ?? [];

  function handleFilter(filter: string) {
    setSelectedFilter(filter);
  }

  function handleActivityPress(activity: ActivityItem) {
    if (activity.data?.expenseId && onViewExpense) {
      onViewExpense(activity.data.expenseId);
    } else if (activity.data?.choreId && onViewChore) {
      onViewChore(activity.data.choreId);
    } else if (activity.data?.groupId && onViewGroup) {
      onViewGroup(activity.data.groupId);
    } else if (activity.data?.listingId && onViewSpaceV) {
      onViewSpaceV(activity.data.listingId);
    } else if (activity.data?.rideId && onViewRide) {
      onViewRide(activity.data.rideId);
    }
  }

  function getActivityIcon(type: string): string {
    switch (type) {
      case "expense_created":
        return "receipt";
      case "chore_created":
      case "chore_completed":
        return "task";
      case "group_created":
        return "group";
      case "listing_created":
        return "list";
      case "ride_created":
        return "directions-car";
      default:
        return "history";
    }
  }

  function getActivityColor(type: string): string {
    switch (type) {
      case "expense_created":
        return theme.colors.blue;
      case "chore_created":
        return theme.colors.warning;
      case "chore_completed":
        return theme.colors.success;
      case "group_created":
        return theme.colors.primary; // Purple-like
      case "listing_created":
        return theme.colors.info; // Cyan-like
      case "ride_created":
        return theme.colors.blue;
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

  function groupActivitiesByDate(
    activities: ActivityItem[],
  ): { date: string; items: ActivityItem[] }[] {
    const groups: Map<string, ActivityItem[]> = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    activities.forEach((activity) => {
      const date = new Date(activity.timestamp);
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
      groups.get(dateLabel)!.push(activity);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items,
    }));
  }

  const groupedActivities = groupActivitiesByDate(activities);

  const filterTypes = [
    { key: "all", label: "All" },
    { key: "expenses", label: "Expenses" },
    { key: "chores", label: "Chores" },
    { key: "groups", label: "Groups" },
    { key: "listings", label: "Listings" },
    { key: "rides", label: "Rides" },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading activity feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Activity Feed"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      {/* Filter Chips */}
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

        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="history"
              size={64}
              color={theme.colors.textTertiary}
            />
            <Text style={styles.emptyText}>No activities</Text>
            <Text style={styles.emptySubtext}>
              Your activity feed will appear here as you use the app.
            </Text>
          </View>
        ) : (
          groupedActivities.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{group.date}</Text>
              {group.items.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={styles.activityCard}
                  onPress={() => handleActivityPress(activity)}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: `${getActivityColor(activity.type)}20`,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={getActivityIcon(activity.type) as any}
                        size={24}
                        color={getActivityColor(activity.type)}
                      />
                    </View>
                    <View style={styles.activityText}>
                      <Text style={styles.activityDescription}>
                        {activity.description}
                      </Text>
                      {activity.user && (
                        <Text style={styles.activityUser}>
                          {activity?.user?.profile?.displayName ||
                            activity?.user?.email ||
                            "Unknown"}
                        </Text>
                      )}
                      <Text style={styles.activityTime}>
                        {formatDate(activity.timestamp)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
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
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.gray500,
    },
    filterContainer: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    filterContent: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      gap: 8,
    },
    filterChip: {
      paddingVertical: 8,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 8,
    },
    filterChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    filterChipText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray500,
    },
    filterChipTextSelected: {
      color: theme.colors.textInverse,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    errorContainer: {
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: 8,
      margin: 16,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.medium,
    },
    emptyContainer: {
      alignItems: "center",
      padding: 48,
      marginTop: 64,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.gray700,
      marginTop: 16,
      marginBottom: theme.spacing.sm,
    },
    emptySubtext: {
      fontSize: 16,
      color: theme.colors.gray500,
      textAlign: "center",
    },
    dateGroup: {
      marginBottom: 24,
    },
    dateHeader: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.gray500,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: 24,
      marginBottom: 12,
    },
    activityCard: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.base,
      marginHorizontal: 24,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activityContent: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    activityText: {
      flex: 1,
    },
    activityDescription: {
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    activityUser: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      marginBottom: 4,
    },
    activityTime: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
  });
