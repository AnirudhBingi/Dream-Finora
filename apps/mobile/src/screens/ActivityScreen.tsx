import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

interface ActivityScreenProps {
  onBack: () => void;
  onViewExpense?: (expenseId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function ActivityScreen({
  onBack,
  onViewExpense,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ActivityScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();

  const { data, loading, refreshing, error, refresh, refetch } = useDataFetch<{
    activities: ActivityItem[];
  }>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getActivityFeed(token, 100, 0);
    },
    immediate: true,
    deps: [token],
  });

  const activities = data?.activities ?? [];

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

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  }

  function getUserDisplayName(activity: ActivityItem): string {
    return (
      activity?.user?.profile?.displayName || activity?.user?.email || "Unknown"
    );
  }

  function getActivityIcon(
    type: string,
    action: string,
  ): keyof typeof MaterialIcons.glyphMap {
    if (type === "expense_created" || type === "expense") {
      switch (action) {
        case "created":
          return "add-circle";
        case "updated":
          return "edit";
        case "deleted":
          return "delete";
        default:
          return "receipt";
      }
    }
    if (type === "settlement_created" || type === "settlement") {
      return "account-balance-wallet";
    }
    if (type === "chore") {
      return "check-circle";
    }
    if (type === "group") {
      return "group";
    }
    if (type === "listing") {
      return "store";
    }
    if (type === "friend") {
      return "person-add";
    }
    if (type === "finance") {
      return "account-balance-wallet";
    }
    return "info";
  }

  function getActivityColor(type: string, action: string): string {
    if (action === "deleted") return theme.colors.error;
    if (action === "created" || action === "settled" || action === "completed")
      return theme.colors.success;
    if (action === "updated" || action === "edited") return theme.colors.blue;
    return theme.colors.textSecondary;
  }

  function handleActivityPress(activity: ActivityItem) {
    // Navigate to expense if available
    if (
      activity.type === "expense_created" &&
      activity.data?.expenseId &&
      onViewExpense
    ) {
      onViewExpense(activity.data.expenseId);
    }
    // Navigate to expense for settlements (if linked to an expense)
    if (
      activity.type === "settlement_created" &&
      activity.data?.expenseId &&
      onViewExpense
    ) {
      onViewExpense(activity.data.expenseId);
    }
    // TODO: Add navigation for other activity types
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Activity"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Activity"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Activity"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="history"
              size={64}
              color={theme.colors.textTertiary}
            />
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>
              Your activities will appear here as you use the app
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {activities.map((activity, index) => {
              const isLast = index === activities.length - 1;
              const iconName = getActivityIcon(activity.type, "");
              const iconColor = getActivityColor(activity.type, "");
              const isTappable =
                (activity.type === "expense_created" ||
                  activity.type === "settlement_created") &&
                activity.data?.expenseId;

              return (
                <TouchableOpacity
                  key={activity.id}
                  style={styles.timelineItem}
                  onPress={() => handleActivityPress(activity)}
                  disabled={!isTappable}
                  activeOpacity={isTappable ? 0.7 : 1}
                >
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: `${iconColor}20` },
                      ]}
                    >
                      <MaterialIcons
                        name={iconName}
                        size={24}
                        color={iconColor}
                      />
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.activityCard}>
                      <View style={styles.activityHeader}>
                        <Text style={styles.activityTitle}>
                          {activity.type === "settlement_created"
                            ? "Settlement"
                            : activity.type === "expense_created"
                              ? "Expense"
                              : activity.type}
                        </Text>
                        <Text style={styles.activityTime}>
                          {formatDate(activity.timestamp)}
                        </Text>
                      </View>
                      <Text style={styles.activityDescription}>
                        {activity.description}
                      </Text>
                      {activity.user && (
                        <Text style={styles.activityUser}>
                          {activity.user.profile?.displayName ||
                            activity.user.email ||
                            "Unknown"}
                        </Text>
                      )}
                      {activity.data?.amount && (
                        <Text style={styles.activityAmount}>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: activity.data.currency || "USD",
                          }).format(activity.data.amount)}
                        </Text>
                      )}
                      {isTappable && (
                        <View style={styles.tapHint}>
                          <Text style={styles.tapHintText}>
                            Tap to view expense
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.base,
      paddingBottom: 32,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    loadingText: {
      marginTop: 16,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    errorText: {
      marginTop: 16,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      textAlign: "center",
    },
    retryButton: {
      marginTop: 16,
      backgroundColor: theme.colors.blue,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: "500",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 48,
    },
    emptyText: {
      marginTop: 16,
      fontSize: 20,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    emptySubtext: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    timeline: {
      flex: 1,
    },
    timelineItem: {
      flexDirection: "row",
      marginBottom: theme.spacing.base,
    },
    timelineLeft: {
      width: 40,
      alignItems: "center",
      marginRight: 16,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: theme.colors.border,
      marginTop: 8,
      minHeight: 40,
    },
    timelineContent: {
      flex: 1,
    },
    activityCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.md,
      padding: theme.spacing.base,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    activityHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    activityUser: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    activityTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    activityTime: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    activityDescription: {
      fontSize: 14,
      color: theme.colors.gray700,
      marginBottom: 4,
    },
    activityAmount: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginTop: 4,
    },
    tapHint: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    tapHintText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.blue,
      fontStyle: "italic",
    },
  });
