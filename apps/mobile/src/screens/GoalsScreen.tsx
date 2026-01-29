import React, { useEffect, useState, useMemo } from "react";
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
import { useAuth } from "../auth/authContext";
import { getGoals, deleteGoal, FinancialGoal } from "../api/financeApi";
import { getProfile, Profile } from "../api/profileApi";
import { MaterialIcons } from "@expo/vector-icons";
import { SkeletonGoalList } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { Header } from "../components/Header";
import { useTheme, getBackgroundVariant } from "../theme";

interface GoalsScreenProps {
  context: "local" | "home";
  onCreateGoal: () => void;
  onViewGoal: (goalId: string) => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function GoalsScreen({
  context,
  onCreateGoal,
  onViewGoal,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: GoalsScreenProps) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [primaryCurrency, setPrimaryCurrency] = useState<string>("USD");
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>("USD");

  const { data, loading, refreshing, error, refresh, refetch } = useDataFetch<
    FinancialGoal[]
  >({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getGoals(
        token,
        context,
        statusFilter === "all" ? undefined : statusFilter,
      );
    },
    immediate: true,
    deps: [token, context, statusFilter],
  });

  const goals = data ?? [];

  useEffect(() => {
    async function loadProfile() {
      if (!token) return;
      try {
        const profile = await getProfile(token);
        if (profile) {
          setPrimaryCurrency(profile.primaryCurrency || "USD");
          setHomeCountryCurrency(profile.homeCountryCurrency || "USD");
        } else {
          setPrimaryCurrency("USD");
          setHomeCountryCurrency("USD");
        }
      } catch (err) {
        setPrimaryCurrency("USD");
        setHomeCountryCurrency("USD");
      }
    }
    loadProfile();
  }, [token]);

  const { execute: executeDeleteGoal } = useAsyncOperation({
    operationFn: async (goalId: string) => {
      if (!token) throw new Error("No authentication token");
      await deleteGoal(token, goalId);
      return null;
    },
    onSuccess: () => {
      refetch();
      Alert.alert("Success", "Goal deleted successfully");
    },
  });

  function handleDelete(goalId: string, goalName: string) {
    Alert.alert(
      "Delete Goal",
      `Are you sure you want to delete "${goalName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => executeDeleteGoal(goalId),
        },
      ],
    );
  }

  function formatCurrency(amount: number): string {
    const displayCurrency =
      context === "local" ? primaryCurrency : homeCountryCurrency;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency,
    }).format(amount);
  }

  function getProgressPercentage(goal: FinancialGoal): number {
    if (goal.targetAmount <= 0) return 0;
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "completed":
        return theme.colors.success;
      case "paused":
        return theme.colors.warning;
      case "cancelled":
        return theme.colors.textSecondary;
      case "active":
        return theme.colors.blue;
      default:
        return theme.colors.textSecondary;
    }
  }

  function getCategoryIcon(category: string): string {
    switch (category) {
      case "savings":
        return "savings";
      case "debt":
        return "credit-card";
      case "purchase":
        return "shopping-bag";
      case "investment":
        return "trending-up";
      default:
        return "account-balance-wallet";
    }
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case "high":
        return theme.colors.error;
      case "medium":
        return theme.colors.warning;
      case "low":
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title={context === "local" ? "Local Goals" : "Home Country Goals"}
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading goals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={context === "local" ? "Local Goals" : "Home Country Goals"}
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
        <View style={styles.content}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Status Filter */}
          <View style={styles.filterContainer}>
            {["all", "active", "completed", "paused"].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  statusFilter === status && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(status)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === status && styles.filterChipTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={onCreateGoal}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.white} />
            <Text style={styles.createButtonText}>Create Goal</Text>
          </TouchableOpacity>

          {goals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="flag"
                size={48}
                color={theme.colors.borderDark}
              />
              <Text style={styles.emptyText}>No goals yet</Text>
              <Text style={styles.emptySubtext}>
                Create a financial goal to track your progress for{" "}
                {context === "local" ? "local" : "home country"} finances!
              </Text>
            </View>
          ) : (
            goals.map((goal) => {
              const percentage = getProgressPercentage(goal);
              const remaining = goal.targetAmount - goal.currentAmount;
              const statusColor = getStatusColor(goal.status);
              const priorityColor = getPriorityColor(goal.priority);

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalCard}
                  onPress={() => onViewGoal(goal.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.goalHeader}>
                    <View style={styles.goalHeaderLeft}>
                      <View style={styles.goalTitleRow}>
                        <MaterialIcons
                          name={getCategoryIcon(goal.category) as any}
                          size={24}
                          color={statusColor}
                        />
                        <Text style={styles.goalName}>{goal.name}</Text>
                      </View>
                      <View style={styles.goalMetaRow}>
                        <View
                          style={[
                            styles.priorityBadge,
                            {
                              backgroundColor:
                                getBackgroundVariant(priorityColor),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityText,
                              { color: priorityColor },
                            ]}
                          >
                            {goal.priority.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.goalCategory}>{goal.category}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getBackgroundVariant(statusColor) },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {goal.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: statusColor,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.progressText}>
                      <Text style={styles.progressAmount}>
                        {formatCurrency(goal.currentAmount)} /{" "}
                        {formatCurrency(goal.targetAmount)}
                      </Text>
                      <Text style={styles.progressPercentage}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.goalFooter}>
                    <Text style={styles.remainingText}>
                      {remaining >= 0 ? "Remaining: " : "Exceeded by: "}
                      <Text style={styles.remainingAmount}>
                        {formatCurrency(Math.abs(remaining))}
                      </Text>
                    </Text>
                    {goal.targetDate && (
                      <Text style={styles.targetDateText}>
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(goal.id, goal.name);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="delete"
                        size={20}
                        color={theme.colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: theme.spacing.xl,
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
      color: theme.colors.gray500,
    },
    errorContainer: {
      padding: 16,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: theme.spacing.sm,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.error,
      marginBottom: 8,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: "500",
    },
    filterContainer: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    filterChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    filterChipText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
      fontWeight: "500",
    },
    filterChipTextActive: {
      color: theme.colors.white,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.blue,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginBottom: theme.spacing.xl,
      gap: 8,
      minHeight: 56,
    },
    createButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyContainer: {
      alignItems: "center",
      padding: 32,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.base,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray500,
      textAlign: "center",
    },
    goalCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    goalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    goalHeaderLeft: {
      flex: 1,
      marginRight: 12,
    },
    goalTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    goalName: {
      fontSize: 18,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    goalMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    priorityBadge: {
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 4,
    },
    priorityText: {
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    goalCategory: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
      textTransform: "capitalize",
    },
    statusBadge: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    progressContainer: {
      marginBottom: 12,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 8,
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
    },
    progressText: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressAmount: {
      fontSize: 14,
      color: theme.colors.gray500,
      fontWeight: "500",
    },
    progressPercentage: {
      fontSize: 14,
      color: theme.colors.gray500,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    goalFooter: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    remainingText: {
      fontSize: 14,
      color: theme.colors.gray500,
      marginBottom: 4,
    },
    remainingAmount: {
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    targetDateText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    deleteButton: {
      position: "absolute",
      right: 0,
      top: 12,
      padding: 8,
      minHeight: 44,
      minWidth: 44,
      justifyContent: "center",
      alignItems: "center",
    },
  });
