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
import {
  getGoalById,
  deleteGoal,
  deleteContribution,
  FinancialGoal,
  GoalContribution,
} from "../api/financeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { SkeletonDetailScreen } from "../components/SkeletonLoader";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { Header, HeaderOption } from "../components/Header";
import { useTheme, getBackgroundVariant } from "../theme";

interface GoalDetailScreenProps {
  goalId: string;
  onEdit: () => void;
  onAddContribution: () => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function GoalDetailScreen({
  goalId,
  onEdit,
  onAddContribution,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: GoalDetailScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();

  const {
    data: goal,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<FinancialGoal>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getGoalById(token, goalId);
    },
    immediate: true,
    deps: [token, goalId],
  });

  const { execute: executeDeleteGoal, loading: deletingGoal } =
    useAsyncOperation({
      operationFn: async () => {
        if (!token) throw new Error("No authentication token");
        return deleteGoal(token, goalId);
      },
      onSuccess: () => {
        onBack();
      },
      onError: (errorMessage) => {
        Alert.alert("Error", errorMessage);
      },
    });

  const { execute: executeDeleteContribution, loading: deletingContribution } =
    useAsyncOperation({
      operationFn: async (contributionId: string) => {
        if (!token) throw new Error("No authentication token");
        return deleteContribution(token, goalId, contributionId);
      },
      onSuccess: () => {
        refetch();
      },
      onError: (errorMessage) => {
        Alert.alert("Error", errorMessage);
      },
    });

  function handleDelete() {
    if (!goal) return;
    Alert.alert(
      "Delete Goal",
      `Are you sure you want to delete "${goal.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => executeDeleteGoal(),
        },
      ],
    );
  }

  function handleDeleteContribution(contributionId: string) {
    if (!goal) return;
    Alert.alert(
      "Delete Contribution",
      "Are you sure you want to delete this contribution?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => executeDeleteContribution(contributionId),
        },
      ],
    );
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  function calculateDaysRemaining(
    targetDate: string | null | undefined,
  ): number | null {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Prepare header options menu
  const headerOptions: HeaderOption[] = [];
  if (goal) {
    headerOptions.push({
      label: "Edit",
      icon: "edit",
      onPress: onEdit,
    });
    headerOptions.push({
      label: "Delete",
      icon: "delete",
      onPress: handleDelete,
      danger: true,
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Goal Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (error || !goal) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Goal Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <ErrorState message={error || "Goal not found"} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const percentage = getProgressPercentage(goal);
  const remaining = goal.targetAmount - goal.currentAmount;
  const statusColor = getStatusColor(goal.status);
  const daysRemaining = calculateDaysRemaining(goal.targetDate);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Goal Details"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        useOptionsMenu={true}
        options={headerOptions}
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

          {/* Goal Header */}
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleRow}>
              <MaterialIcons
                name={getCategoryIcon(goal.category) as any}
                size={32}
                color={statusColor}
              />
              <View style={styles.goalTitleText}>
                <Text style={styles.goalName}>{goal.name}</Text>
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

          {/* Progress Section */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercentage}>
                {percentage.toFixed(0)}%
              </Text>
            </View>
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
            <View style={styles.progressAmounts}>
              <View>
                <Text style={styles.progressAmountLabel}>Current</Text>
                <Text style={styles.progressAmount}>
                  {formatCurrency(goal.currentAmount)}
                </Text>
              </View>
              <View>
                <Text style={styles.progressAmountLabel}>Target</Text>
                <Text style={styles.progressAmount}>
                  {formatCurrency(goal.targetAmount)}
                </Text>
              </View>
              <View>
                <Text style={styles.progressAmountLabel}>
                  {remaining >= 0 ? "Remaining" : "Exceeded"}
                </Text>
                <Text style={styles.progressAmount}>
                  {formatCurrency(Math.abs(remaining))}
                </Text>
              </View>
            </View>
          </View>

          {/* Goal Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Priority</Text>
              <Text style={styles.infoValue}>
                {goal.priority.toUpperCase()}
              </Text>
            </View>
            {goal.targetDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Target Date</Text>
                <Text style={styles.infoValue}>
                  {formatDate(goal.targetDate)}
                </Text>
                {daysRemaining !== null && (
                  <Text
                    style={[
                      styles.daysRemaining,
                      daysRemaining < 0 && styles.daysRemainingOverdue,
                    ]}
                  >
                    {daysRemaining >= 0
                      ? `${daysRemaining} days left`
                      : `${Math.abs(daysRemaining)} days overdue`}
                  </Text>
                )}
              </View>
            )}
            {goal.account && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account</Text>
                <Text style={styles.infoValue}>{goal.account.name}</Text>
              </View>
            )}
          </View>

          {/* Add Contribution Button */}
          {goal.status === "active" && (
            <TouchableOpacity
              style={styles.addContributionButton}
              onPress={onAddContribution}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24} color={theme.colors.white} />
              <Text style={styles.addContributionButtonText}>
                Add Contribution
              </Text>
            </TouchableOpacity>
          )}

          {/* Contributions Section */}
          <View style={styles.contributionsSection}>
            <Text style={styles.sectionTitle}>
              Contributions ({goal.contributions?.length || 0})
            </Text>
            {!goal.contributions || goal.contributions.length === 0 ? (
              <View style={styles.emptyContributions}>
                <MaterialIcons
                  name="payment"
                  size={48}
                  color={theme.colors.borderDark}
                />
                <Text style={styles.emptyText}>No contributions yet</Text>
                <Text style={styles.emptySubtext}>
                  Add contributions to track your progress towards this goal
                </Text>
              </View>
            ) : (
              goal.contributions.map((contribution: GoalContribution) => (
                <View key={contribution.id} style={styles.contributionCard}>
                  <View style={styles.contributionHeader}>
                    <View style={styles.contributionLeft}>
                      <Text style={styles.contributionAmount}>
                        {formatCurrency(contribution.amount)}
                      </Text>
                      <Text style={styles.contributionDate}>
                        {formatDate(contribution.date)}
                      </Text>
                      {contribution.notes && (
                        <Text style={styles.contributionNotes}>
                          {contribution.notes}
                        </Text>
                      )}
                      {contribution.transaction && (
                        <View style={styles.transactionLink}>
                          <MaterialIcons
                            name="receipt"
                            size={14}
                            color={theme.colors.textSecondary}
                          />
                          <Text style={styles.transactionLinkText}>
                            Linked to transaction
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteContributionButton}
                      onPress={() => handleDeleteContribution(contribution.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="delete"
                        size={18}
                        color={theme.colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
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
    headerActionButton: {
      padding: 8,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 22,
      backgroundColor: theme.colors.surfaceOverlay,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      gap: 16,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.gray500,
    },
    errorContainer: {
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: 8,
      marginBottom: theme.spacing.base,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: 8,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 8,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.medium,
    },
    goalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 24,
    },
    goalTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    goalTitleText: {
      flex: 1,
    },
    goalName: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    goalCategory: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      textTransform: "capitalize",
    },
    statusBadge: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    progressCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: 20,
      marginBottom: theme.spacing.base,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    progressLabel: {
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    progressPercentage: {
      fontSize: 20,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    progressBar: {
      height: 12,
      backgroundColor: theme.colors.border,
      borderRadius: 6,
      overflow: "hidden",
      marginBottom: theme.spacing.base,
    },
    progressFill: {
      height: "100%",
      borderRadius: 6,
    },
    progressAmounts: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    progressAmountLabel: {
      fontSize: 12,
      color: theme.colors.gray500,
      marginBottom: 4,
    },
    progressAmount: {
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    infoCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    infoLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
    },
    infoValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    daysRemaining: {
      fontSize: 12,
      color: theme.colors.success,
      marginTop: 4,
      marginLeft: "auto",
    },
    daysRemainingOverdue: {
      color: theme.colors.error,
    },
    addContributionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.success,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginBottom: 24,
      gap: 8,
      minHeight: 56,
    },
    addContributionButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    contributionsSection: {
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
    },
    emptyContributions: {
      alignItems: "center",
      padding: 32,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.base,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      textAlign: "center",
    },
    contributionCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: theme.spacing.base,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    contributionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    contributionLeft: {
      flex: 1,
    },
    contributionAmount: {
      fontSize: 18,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.success,
      marginBottom: 4,
    },
    contributionDate: {
      fontSize: 12,
      color: theme.colors.gray500,
      marginBottom: 4,
    },
    contributionNotes: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      marginTop: 4,
    },
    transactionLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 8,
    },
    transactionLinkText: {
      fontSize: 12,
      color: theme.colors.gray500,
    },
    deleteContributionButton: {
      padding: 8,
      minHeight: 44,
      minWidth: 44,
      justifyContent: "center",
      alignItems: "center",
    },
  });
