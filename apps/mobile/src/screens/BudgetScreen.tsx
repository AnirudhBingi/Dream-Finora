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
  getBudgets,
  deleteBudget,
  Budget,
  BudgetTracking,
} from "../api/financeApi";
import { getProfile, Profile } from "../api/profileApi";
import { MaterialIcons } from "@expo/vector-icons";
import { SkeletonBudgetList } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { Header } from "../components/Header";
import { useTheme, getBackgroundVariant } from "../theme";

interface BudgetScreenProps {
  context: "local" | "home";
  onCreateBudget: () => void;
  onEditBudget: (budgetId: string) => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
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
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: theme.spacing.sm,
      marginBottom: theme.spacing.base,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
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
      fontWeight: theme.typography.fontWeight.medium,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.blue,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
      minHeight: 56,
    },
    createButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: "600",
    },
    emptyContainer: {
      alignItems: "center",
      padding: 32,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.gray700,
      marginTop: theme.spacing.base,
      marginBottom: theme.spacing.sm,
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray500,
      textAlign: "center",
    },
    budgetCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    budgetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    budgetHeaderLeft: {
      flex: 1,
      marginRight: 12,
    },
    budgetName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    budgetCategory: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      marginBottom: 4,
    },
    budgetPeriod: {
      fontSize: 12,
      color: theme.colors.gray400,
    },
    statusBadge: {
      paddingVertical: 4,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    progressContainer: {
      marginBottom: 12,
    },
    progressBar: {
      height: theme.spacing.sm,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: theme.spacing.sm,
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
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      fontWeight: theme.typography.fontWeight.medium,
    },
    progressPercentage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      fontWeight: "600",
    },
    budgetFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    remainingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
    },
    remainingAmount: {
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    deleteButton: {
      padding: 8,
      minHeight: 44,
      minWidth: 44,
      justifyContent: "center",
      alignItems: "center",
    },
  });
}

export function BudgetScreen({
  context,
  onCreateBudget,
  onEditBudget,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: BudgetScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [primaryCurrency, setPrimaryCurrency] = useState<string>("USD");
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>("USD");

  const { data, loading, refreshing, error, refresh, refetch } = useDataFetch<
    Budget[]
  >({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getBudgets(token, context);
    },
    immediate: true,
    deps: [token, context],
  });

  const budgets = data ?? [];

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

  const { execute: executeDeleteBudget } = useAsyncOperation({
    operationFn: async (budgetId: string) => {
      if (!token) throw new Error("No authentication token");
      await deleteBudget(token, budgetId);
      return null;
    },
    onSuccess: () => {
      refetch();
      Alert.alert("Success", "Budget deleted successfully");
    },
  });

  function handleDelete(budgetId: string, budgetName: string) {
    Alert.alert(
      "Delete Budget",
      `Are you sure you want to delete "${budgetName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => executeDeleteBudget(budgetId),
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

  function getStatusColor(status: string): string {
    switch (status) {
      case "exceeded":
        return theme.colors.error;
      case "warning":
        return theme.colors.warning;
      case "on_track":
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case "exceeded":
        return "Exceeded";
      case "warning":
        return "Warning";
      case "on_track":
        return "On Track";
      default:
        return "Unknown";
    }
  }

  function getProgressPercentage(
    tracking: BudgetTracking | undefined,
    amount: number,
  ): number {
    if (!tracking) return 0;
    return amount > 0 ? Math.min((tracking.spent / amount) * 100, 100) : 0;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title={context === "local" ? "Local Budgets" : "Home Country Budgets"}
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading budgets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={context === "local" ? "Local Budgets" : "Home Country Budgets"}
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

          <TouchableOpacity
            style={styles.createButton}
            onPress={onCreateBudget}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.white} />
            <Text style={styles.createButtonText}>Create Budget</Text>
          </TouchableOpacity>

          {budgets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="account-balance-wallet"
                size={48}
                color={theme.colors.borderDark}
              />
              <Text style={styles.emptyText}>No budgets yet</Text>
              <Text style={styles.emptySubtext}>
                Create a budget to track your spending for{" "}
                {context === "local" ? "local" : "home country"} finances!
              </Text>
            </View>
          ) : (
            budgets.map((budget) => {
              const tracking = budget.currentTracking || {
                spent: 0,
                budgeted: budget.amount,
                status: "on_track" as const,
              };
              const percentage = getProgressPercentage(
                tracking as BudgetTracking,
                budget.amount,
              );
              const remaining = budget.amount - tracking.spent;
              const statusColor = getStatusColor(tracking.status);

              return (
                <TouchableOpacity
                  key={budget.id}
                  style={styles.budgetCard}
                  onPress={() => onEditBudget(budget.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.budgetHeader}>
                    <View style={styles.budgetHeaderLeft}>
                      <Text style={styles.budgetName}>{budget.name}</Text>
                      {budget.category && (
                        <Text style={styles.budgetCategory}>
                          {budget.category}
                        </Text>
                      )}
                      <Text style={styles.budgetPeriod}>
                        {budget.period.charAt(0).toUpperCase() +
                          budget.period.slice(1)}{" "}
                        • {formatCurrency(budget.amount)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getBackgroundVariant(statusColor) },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getStatusText(tracking.status)}
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
                        {formatCurrency(tracking.spent)} /{" "}
                        {formatCurrency(budget.amount)}
                      </Text>
                      <Text style={styles.progressPercentage}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.budgetFooter}>
                    <Text style={styles.remainingText}>
                      {remaining >= 0 ? "Remaining: " : "Over by: "}
                      <Text style={styles.remainingAmount}>
                        {formatCurrency(Math.abs(remaining))}
                      </Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(budget.id, budget.name);
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
