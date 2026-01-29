import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import { useAuth } from "../auth/authContext";
import {
  getFinanceHistory,
  FinanceHistory,
  FinanceTransaction,
  FinanceAccount,
} from "../api/financeApi";
import {
  getLocalAnalytics,
  getHomeAnalytics,
  ContextAnalytics,
} from "../api/analyticsApi";
import { getProfile, Profile } from "../api/profileApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme, chartColor } from "../theme";

const screenWidth = Dimensions.get("window").width;

interface FinanceHistoryScreenProps {
  context?: "local" | "home";
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function FinanceHistoryScreen({
  context: initialContext,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: FinanceHistoryScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [selectedContext, setSelectedContext] = useState<
    "local" | "home" | undefined
  >(initialContext);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balanceData, setBalanceData] = useState<ContextAnalytics | null>(null);

  const {
    data: history,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<FinanceHistory>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getFinanceHistory(token, selectedContext);
    },
    immediate: true,
    deps: [token, selectedContext],
  });

  useEffect(() => {
    async function loadProfile() {
      if (!token) return;
      try {
        const profileData = await getProfile(token);
        setProfile(profileData || null);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setProfile(null);
      }
    }
    loadProfile();
  }, [token]);

  useEffect(() => {
    async function loadBalanceData() {
      if (!token || !selectedContext) return;
      try {
        const analytics =
          selectedContext === "local"
            ? await getLocalAnalytics(token, 6, 30)
            : await getHomeAnalytics(token, 6, 30);
        setBalanceData(analytics);
      } catch (err) {
        console.error("Failed to load balance data:", err);
      }
    }
    loadBalanceData();
  }, [token, selectedContext]);

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const diffTime = today.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  function groupByDate(transactions: FinanceTransaction[]) {
    const groups: Record<string, FinanceTransaction[]> = {};
    transactions.forEach((transaction) => {
      const dateKey = formatDate(transaction.createdAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
    });
    return groups;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const transactionGroups = history?.transactions
    ? groupByDate(history.transactions)
    : {};

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={
          initialContext === "local"
            ? "Local Finance History"
            : "Home Country Finance History"
        }
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

          {/* Context Filter */}
          <View style={styles.contextToggle}>
            <TouchableOpacity
              style={[
                styles.contextButton,
                selectedContext === "local" && styles.contextButtonActive,
              ]}
              onPress={() => setSelectedContext("local")}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="location-on"
                size={20}
                color={
                  selectedContext === "local"
                    ? theme.colors.white
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.contextButtonText,
                  selectedContext === "local" && styles.contextButtonTextActive,
                ]}
              >
                Local
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.contextButton,
                selectedContext === "home" && styles.contextButtonActive,
              ]}
              onPress={() => setSelectedContext("home")}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="home"
                size={20}
                color={
                  selectedContext === "home"
                    ? theme.colors.white
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.contextButtonText,
                  selectedContext === "home" && styles.contextButtonTextActive,
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.contextButton,
                selectedContext === undefined && styles.contextButtonActive,
              ]}
              onPress={() => setSelectedContext(undefined)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.contextButtonText,
                  selectedContext === undefined &&
                    styles.contextButtonTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
          </View>

          {/* Balance Over Time Chart */}
          {selectedContext &&
            balanceData &&
            balanceData.balanceOverTime.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>
                  Balance Over Time (Last 30 Days)
                </Text>
                <LineChart
                  data={{
                    labels: balanceData.balanceOverTime.map((b) =>
                      formatDate(b.date),
                    ),
                    datasets: [
                      {
                        data: balanceData.balanceOverTime.map((b) => b.balance),
                        color: (opacity = 1) =>
                          chartColor(theme.colors.success, opacity),
                        strokeWidth: 2,
                      },
                    ],
                    legend: ["Balance"],
                  }}
                  width={screenWidth - 48}
                  height={220}
                  chartConfig={{
                    backgroundColor: theme.colors.background,
                    backgroundGradientFrom: theme.colors.white,
                    backgroundGradientTo: theme.colors.white,
                    decimalPlaces: 0,
                    color: (opacity = 1) =>
                      chartColor(theme.colors.blue, opacity),
                    labelColor: (opacity = 1) =>
                      chartColor(theme.colors.textSecondary, opacity),
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: theme.colors.success,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withDots
                  withShadow={false}
                  formatYLabel={(value) => {
                    const num = parseFloat(value);
                    const currency =
                      selectedContext === "local"
                        ? profile?.primaryCurrency || "USD"
                        : profile?.homeCountryCurrency || "USD";
                    if (num >= 1000) {
                      return `${currency === "USD" ? "$" : ""}${(num / 1000).toFixed(1)}k`;
                    }
                    return `${currency === "USD" ? "$" : ""}${num.toFixed(0)}`;
                  }}
                />
              </View>
            )}

          {/* Transaction History */}
          {history && history.transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="history"
                size={48}
                color={theme.colors.borderDark}
              />
              <Text style={styles.emptyText}>No history yet</Text>
              <Text style={styles.emptySubtext}>
                Your transaction history will appear here
              </Text>
            </View>
          ) : (
            Object.keys(transactionGroups).map((dateKey) => (
              <View key={dateKey} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>{dateKey}</Text>
                {transactionGroups[dateKey].map((transaction) => (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <View
                      style={[
                        styles.transactionIcon,
                        transaction.type === "income"
                          ? styles.transactionIconIncome
                          : styles.transactionIconExpense,
                      ]}
                    >
                      <MaterialIcons
                        name={
                          transaction.type === "income"
                            ? "arrow-downward"
                            : "arrow-upward"
                        }
                        size={20}
                        color={theme.colors.white}
                      />
                    </View>
                    <View style={styles.transactionContent}>
                      <Text style={styles.transactionDescription}>
                        {transaction.description ||
                          (transaction.type === "income"
                            ? transaction.source || "Income"
                            : transaction.category || "Expense")}
                      </Text>
                      <View style={styles.transactionMeta}>
                        {transaction.type === "income" &&
                          transaction.source && (
                            <Text style={styles.transactionMetaText}>
                              {transaction.source} •{" "}
                            </Text>
                          )}
                        {transaction.type === "expense" &&
                          transaction.category && (
                            <Text style={styles.transactionMetaText}>
                              {transaction.category} •{" "}
                            </Text>
                          )}
                        <Text style={styles.transactionMetaText}>
                          {new Date(transaction.date).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                        </Text>
                        {transaction.updatedAt !== transaction.createdAt && (
                          <>
                            <Text style={styles.transactionMetaText}> • </Text>
                            <MaterialIcons
                              name="edit"
                              size={12}
                              color={theme.colors.textSecondary}
                            />
                            <Text style={styles.transactionMetaText}>
                              {" "}
                              Edited
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.transactionAmount,
                        transaction.type === "income"
                          ? styles.transactionAmountIncome
                          : styles.transactionAmountExpense,
                      ]}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}

          {/* Account History */}
          {history && history.accounts && history.accounts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Changes</Text>
              {history.accounts.map((account: FinanceAccount) => (
                <View key={account.id} style={styles.accountItem}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={24}
                    color={theme.colors.blue}
                  />
                  <View style={styles.accountContent}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountMeta}>
                      {formatCurrency(account.balance, account.currency)} •{" "}
                      {account.context} • {formatDate(account.updatedAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Pagination Info */}
          {history && history.pagination.hasMore && (
            <View style={styles.paginationInfo}>
              <Text style={styles.paginationText}>
                Showing{" "}
                {history.pagination.offset + history.transactions.length} of{" "}
                {history.pagination.total} transactions
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
      paddingHorizontal: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: 16,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      padding: 16,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: theme.spacing.sm,
      marginBottom: theme.spacing.base,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: 8,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.spacing.sm,
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 44,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    contextToggle: {
      flexDirection: "row",
      gap: 12,
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.sm,
      padding: 4,
    },
    contextButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 6,
      gap: 8,
    },
    contextButtonActive: {
      backgroundColor: theme.colors.blue,
    },
    contextButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    contextButtonTextActive: {
      color: theme.colors.white,
    },
    emptyContainer: {
      alignItems: "center",
      padding: 32,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: "600",
      color: theme.colors.gray700,
      marginTop: 16,
      marginBottom: 8,
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
      fontSize: theme.typography.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    transactionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.sm,
      marginBottom: 8,
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    transactionIconIncome: {
      backgroundColor: theme.colors.success,
    },
    transactionIconExpense: {
      backgroundColor: theme.colors.error,
    },
    transactionContent: {
      flex: 1,
      marginRight: 12,
    },
    transactionDescription: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    transactionMeta: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    transactionMetaText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    transactionAmount: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: "600",
    },
    transactionAmountIncome: {
      color: theme.colors.success,
    },
    transactionAmountExpense: {
      color: theme.colors.error,
    },
    section: {
      marginTop: 24,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
    },
    accountItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.sm,
      marginBottom: 8,
    },
    accountContent: {
      flex: 1,
      marginLeft: 12,
    },
    accountName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    accountMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    paginationInfo: {
      padding: 16,
      alignItems: "center",
      marginTop: 24,
    },
    paginationText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    chartSection: {
      marginTop: 24,
      marginBottom: theme.spacing.xl,
      padding: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
    },
    chart: {
      marginVertical: 8,
      borderRadius: 16,
    },
  });
}
