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
import { MaterialIcons } from "@expo/vector-icons";
import { PieChart, BarChart, LineChart } from "react-native-chart-kit";
import { useAuth } from "../auth/authContext";
import {
  getLocalAnalytics,
  getHomeAnalytics,
  getCombinedAnalytics,
  ContextAnalytics,
  CombinedAnalytics,
} from "../api/analyticsApi";
import { getProfile, Profile } from "../api/profileApi";
import { Header } from "../components/Header";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme, chartColor } from "../theme";

interface AnalyticsScreenProps {
  onBack: () => void;
  onViewRideAnalytics?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

const screenWidth = Dimensions.get("window").width;

type AnalyticsContext = "local" | "home" | "combined";

export function AnalyticsScreen({
  onBack,
  onViewRideAnalytics,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: AnalyticsScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [context, setContext] = useState<AnalyticsContext>("local");
  const [profile, setProfile] = useState<Profile | null>(null);

  const {
    data: analytics,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<ContextAnalytics | CombinedAnalytics>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      if (context === "local") {
        return getLocalAnalytics(token, 6, 30);
      } else if (context === "home") {
        return getHomeAnalytics(token, 6, 30);
      } else {
        return getCombinedAnalytics(token, 6, 30);
      }
    },
    immediate: true,
    deps: [token, context],
  });

  useEffect(() => {
    async function loadProfile() {
      if (!token) return;
      try {
        const profileData = await getProfile(token);
        setProfile(profileData || null);
      } catch (err) {
        // Silently fail - currency will default to USD
        console.error("Failed to load profile:", err);
        setProfile(null);
      }
    }
    loadProfile();
  }, [token]);

  // Get current analytics data based on context
  function getCurrentAnalytics(): ContextAnalytics | null {
    if (!analytics) return null;
    if (context === "combined" && "combined" in analytics) {
      // For combined view, show the combined analytics
      const combined = analytics.combined;
      // Ensure all array properties exist
      if (combined) {
        return {
          ...combined,
          spendingByCategory: combined.spendingByCategory || [],
          monthlyTrends: combined.monthlyTrends || [],
          balanceOverTime: combined.balanceOverTime || [],
        };
      }
      return null;
    }
    const current = analytics as ContextAnalytics;
    // Ensure all array properties exist
    return {
      ...current,
      spendingByCategory: current.spendingByCategory || [],
      monthlyTrends: current.monthlyTrends || [],
      balanceOverTime: current.balanceOverTime || [],
    };
  }

  function getCurrencyForContext(): string {
    if (!profile) return "USD";
    if (context === "local") {
      return profile.primaryCurrency || "USD";
    } else if (context === "home") {
      return profile.homeCountryCurrency || "USD";
    }
    // For combined, use primary currency
    return profile.primaryCurrency || "USD";
  }

  function formatCurrency(amount: number, currency?: string): string {
    const displayCurrency = currency || getCurrencyForContext();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function formatMonth(monthKey: string): string {
    const date = new Date(monthKey + "-01");
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  function formatDate(dateKey: string): string {
    const date = new Date(dateKey);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Generate colors for pie chart (cycling through a palette)
  function getChartColors(count: number): string[] {
    const colors = [
      theme.colors.blue, // Primary Blue
      theme.colors.success, // Green
      theme.colors.error, // Red
      theme.colors.warning, // Amber
      theme.colors.primary, // Purple
      theme.colors.chartPink, // Pink
      theme.colors.info, // Cyan/Blue
      theme.colors.chartLime, // Lime
      theme.colors.chartOrange, // Orange
      theme.colors.primaryDark, // Indigo
    ];
    return colors.slice(0, count);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Insights"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chartConfig = {
    backgroundColor: theme.colors.background,
    backgroundGradientFrom: theme.colors.background,
    backgroundGradientTo: theme.colors.background,
    decimalPlaces: 0,
    color: (opacity = 1) => {
      const blue = parseInt(theme.colors.blue.replace("#", ""), 16);
      const r = (blue >> 16) & 255;
      const g = (blue >> 8) & 255;
      const b = blue & 255;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    labelColor: (opacity = 1) => {
      const gray = parseInt(theme.colors.textSecondary.replace("#", ""), 16);
      const r = (gray >> 16) & 255;
      const g = (gray >> 8) & 255;
      const b = gray & 255;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    style: {
      borderRadius: theme.spacing.md,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: theme.colors.blue,
    },
  };

  const currentAnalytics = getCurrentAnalytics();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Insights"
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
          {/* Context Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, context === "local" && styles.tabActive]}
              onPress={() => setContext("local")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  context === "local" && styles.tabTextActive,
                ]}
              >
                Local
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, context === "home" && styles.tabActive]}
              onPress={() => setContext("home")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  context === "home" && styles.tabTextActive,
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, context === "combined" && styles.tabActive]}
              onPress={() => setContext("combined")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  context === "combined" && styles.tabTextActive,
                ]}
              >
                Combined
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!currentAnalytics && !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No analytics data available</Text>
            </View>
          )}

          {currentAnalytics && (
            <>
              {/* Summary Cards */}
              <View style={styles.summaryCards}>
                {/* Budget Performance Card */}
                {currentAnalytics.budgetPerformance &&
                  currentAnalytics.budgetPerformance.totalBudgets > 0 && (
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryCardTitle}>Budgets</Text>
                      <Text style={styles.summaryCardValue}>
                        {currentAnalytics.budgetPerformance.budgetsOnTrack} /{" "}
                        {currentAnalytics.budgetPerformance.totalBudgets} on
                        track
                      </Text>
                      <Text style={styles.summaryCardSubtext}>
                        {currentAnalytics.budgetPerformance.averageAdherence.toFixed(
                          0,
                        )}
                        % adherence
                      </Text>
                    </View>
                  )}

                {/* Goals Progress Card */}
                {currentAnalytics.goalsProgress &&
                  currentAnalytics.goalsProgress.totalGoals > 0 && (
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryCardTitle}>Goals</Text>
                      <Text style={styles.summaryCardValue}>
                        {currentAnalytics.goalsProgress.completedGoals} /{" "}
                        {currentAnalytics.goalsProgress.totalGoals} completed
                      </Text>
                      <Text style={styles.summaryCardSubtext}>
                        {currentAnalytics.goalsProgress.overallProgress.toFixed(
                          0,
                        )}
                        % overall progress
                      </Text>
                    </View>
                  )}

                {/* Loan Summary Card */}
                {currentAnalytics.loanSummary &&
                  currentAnalytics.loanSummary.totalLoans > 0 && (
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryCardTitle}>Loans</Text>
                      <Text style={styles.summaryCardValue}>
                        {currentAnalytics.loanSummary.activeLoans} active
                      </Text>
                      <Text style={styles.summaryCardSubtext}>
                        {currentAnalytics.loanSummary.progressPercentage.toFixed(
                          0,
                        )}
                        % paid
                      </Text>
                    </View>
                  )}
              </View>

              {/* Quick Access to Other Analytics */}
              {onViewRideAnalytics && (
                <View style={styles.quickAccessSection}>
                  <TouchableOpacity
                    style={styles.quickAccessCard}
                    onPress={onViewRideAnalytics}
                    activeOpacity={0.7}
                  >
                    <View style={styles.quickAccessIcon}>
                      <MaterialIcons
                        name="directions-car"
                        size={24}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.quickAccessContent}>
                      <Text style={styles.quickAccessTitle}>
                        Ride Analytics
                      </Text>
                      <Text style={styles.quickAccessSubtitle}>
                        View ride statistics, trends, and insights
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={theme.colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Income vs Expenses Summary */}
              {currentAnalytics.incomeVsExpenses && (
                <View style={styles.incomeExpenseCard}>
                  <Text style={styles.sectionTitle}>Income vs Expenses</Text>
                  <View style={styles.incomeExpenseRow}>
                    <View style={styles.incomeExpenseItem}>
                      <Text style={styles.incomeExpenseLabel}>
                        Total Income
                      </Text>
                      <Text
                        style={[
                          styles.incomeExpenseValue,
                          styles.positiveValue,
                        ]}
                      >
                        {formatCurrency(
                          currentAnalytics.incomeVsExpenses.totalIncome,
                        )}
                      </Text>
                    </View>
                    <View style={styles.incomeExpenseItem}>
                      <Text style={styles.incomeExpenseLabel}>
                        Total Expenses
                      </Text>
                      <Text
                        style={[
                          styles.incomeExpenseValue,
                          styles.negativeValue,
                        ]}
                      >
                        {formatCurrency(
                          currentAnalytics.incomeVsExpenses.totalExpenses,
                        )}
                      </Text>
                    </View>
                    <View style={styles.incomeExpenseItem}>
                      <Text style={styles.incomeExpenseLabel}>Net</Text>
                      <Text
                        style={[
                          styles.incomeExpenseValue,
                          currentAnalytics.incomeVsExpenses.net >= 0
                            ? styles.positiveValue
                            : styles.negativeValue,
                        ]}
                      >
                        {formatCurrency(currentAnalytics.incomeVsExpenses.net)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.savingsRateText}>
                    Savings Rate:{" "}
                    {currentAnalytics.incomeVsExpenses.savingsRate.toFixed(1)}%
                  </Text>
                </View>
              )}

              {/* Spending by Category - Pie Chart */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Spending by Category</Text>
                {!currentAnalytics.spendingByCategory ||
                currentAnalytics.spendingByCategory.length === 0 ? (
                  <View style={styles.emptyChartContainer}>
                    <Text style={styles.emptyChartText}>
                      No spending data available
                    </Text>
                    <Text style={styles.emptyChartSubtext}>
                      Add expense transactions to see your spending breakdown
                    </Text>
                  </View>
                ) : (
                  <>
                    <PieChart
                      data={currentAnalytics.spendingByCategory.map(
                        (item, index) => ({
                          name: item.category,
                          amount: item.amount,
                          color: getChartColors(
                            currentAnalytics.spendingByCategory.length,
                          )[index],
                          legendFontColor: theme.colors.gray700,
                          legendFontSize: 12,
                        }),
                      )}
                      width={screenWidth - 48}
                      height={220}
                      chartConfig={chartConfig}
                      accessor="amount"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      absolute // Show absolute values instead of percentages
                    />
                    <View style={styles.categoryList}>
                      {currentAnalytics.spendingByCategory.map(
                        (item, index) => (
                          <View key={item.category} style={styles.categoryItem}>
                            <View style={styles.categoryRow}>
                              <View
                                style={[
                                  styles.categoryColor,
                                  {
                                    backgroundColor: getChartColors(
                                      currentAnalytics.spendingByCategory
                                        .length,
                                    )[index],
                                  },
                                ]}
                              />
                              <Text
                                style={styles.categoryName}
                                numberOfLines={1}
                              >
                                {item.category}
                              </Text>
                            </View>
                            <View style={styles.categoryAmounts}>
                              <Text style={styles.categoryAmount}>
                                {formatCurrency(item.amount)}
                              </Text>
                              <Text style={styles.categoryPercentage}>
                                ({item.percentage.toFixed(1)}%)
                              </Text>
                            </View>
                          </View>
                        ),
                      )}
                    </View>
                  </>
                )}
              </View>

              {/* Monthly Trends - Bar Chart */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Monthly Trends (Last 6 Months)
                </Text>
                {!currentAnalytics.monthlyTrends ||
                currentAnalytics.monthlyTrends.length === 0 ? (
                  <View style={styles.emptyChartContainer}>
                    <Text style={styles.emptyChartText}>
                      No trend data available
                    </Text>
                    <Text style={styles.emptyChartSubtext}>
                      Add income and expense transactions to see trends
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Summary cards */}
                    <View style={styles.trendSummary}>
                      <View style={styles.trendSummaryItem}>
                        <Text style={styles.trendSummaryLabel}>Avg Income</Text>
                        <Text style={styles.trendSummaryValue}>
                          {formatCurrency(
                            currentAnalytics.monthlyTrends.length > 0
                              ? currentAnalytics.monthlyTrends.reduce(
                                  (sum, t) => sum + t.income,
                                  0,
                                ) / currentAnalytics.monthlyTrends.length
                              : 0,
                          )}
                        </Text>
                      </View>
                      <View style={styles.trendSummaryItem}>
                        <Text style={styles.trendSummaryLabel}>
                          Avg Expense
                        </Text>
                        <Text
                          style={[
                            styles.trendSummaryValue,
                            styles.trendSummaryValueNegative,
                          ]}
                        >
                          {formatCurrency(
                            currentAnalytics.monthlyTrends.length > 0
                              ? currentAnalytics.monthlyTrends.reduce(
                                  (sum, t) => sum + t.expense,
                                  0,
                                ) / currentAnalytics.monthlyTrends.length
                              : 0,
                          )}
                        </Text>
                      </View>
                      <View style={styles.trendSummaryItem}>
                        <Text style={styles.trendSummaryLabel}>Avg Net</Text>
                        <Text
                          style={[
                            styles.trendSummaryValue,
                            currentAnalytics.monthlyTrends.length > 0 &&
                            currentAnalytics.monthlyTrends.reduce(
                              (sum, t) => sum + t.net,
                              0,
                            ) /
                              currentAnalytics.monthlyTrends.length >=
                              0
                              ? styles.trendSummaryValuePositive
                              : styles.trendSummaryValueNegative,
                          ]}
                        >
                          {formatCurrency(
                            currentAnalytics.monthlyTrends.length > 0
                              ? currentAnalytics.monthlyTrends.reduce(
                                  (sum, t) => sum + t.net,
                                  0,
                                ) / currentAnalytics.monthlyTrends.length
                              : 0,
                          )}
                        </Text>
                      </View>
                    </View>
                    {/* Net balance bar chart */}
                    <BarChart
                      data={{
                        labels: currentAnalytics.monthlyTrends.map((t) =>
                          formatMonth(t.month),
                        ),
                        datasets: [
                          {
                            data: currentAnalytics.monthlyTrends.map(
                              (t) => t.net,
                            ),
                          },
                        ],
                      }}
                      width={screenWidth - 48}
                      height={220}
                      yAxisLabel=""
                      yAxisSuffix=""
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => {
                          // Use green for positive, red for negative
                          const avgNet =
                            currentAnalytics.monthlyTrends.length > 0
                              ? currentAnalytics.monthlyTrends.reduce(
                                  (sum, t) => sum + t.net,
                                  0,
                                ) / currentAnalytics.monthlyTrends.length
                              : 0;
                          if (avgNet >= 0) {
                            return chartColor(theme.colors.success, opacity);
                          }
                          return chartColor(theme.colors.error, opacity);
                        },
                      }}
                      style={styles.chart}
                      showValuesOnTopOfBars
                      fromZero
                    />
                    <Text style={styles.chartLabel}>
                      Net Balance (Income - Expense)
                    </Text>
                  </>
                )}
              </View>

              {/* Balance Over Time - Line Chart */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Balance Over Time (Last 30 Days)
                </Text>
                {!currentAnalytics.balanceOverTime ||
                currentAnalytics.balanceOverTime.length === 0 ? (
                  <View style={styles.emptyChartContainer}>
                    <Text style={styles.emptyChartText}>
                      No balance data available
                    </Text>
                    <Text style={styles.emptyChartSubtext}>
                      Add transactions to see your balance history
                    </Text>
                  </View>
                ) : (
                  <>
                    <LineChart
                      data={{
                        labels: currentAnalytics.balanceOverTime.map((b) =>
                          formatDate(b.date),
                        ),
                        datasets: [
                          {
                            data: currentAnalytics.balanceOverTime.map(
                              (b) => b.balance,
                            ),
                            color: (opacity = 1) =>
                              chartColor(theme.colors.success, opacity),
                            strokeWidth: 2,
                          },
                        ],
                        legend: ["Balance"],
                      }}
                      width={screenWidth - 48}
                      height={220}
                      chartConfig={chartConfig}
                      bezier
                      style={styles.chart}
                      withDots
                      withShadow={false}
                      formatYLabel={(value) => {
                        const num = parseFloat(value);
                        if (num >= 1000) {
                          return `$${(num / 1000).toFixed(1)}k`;
                        }
                        return `$${num.toFixed(0)}`;
                      }}
                    />
                    <Text style={styles.chartLabel}>Account Balance</Text>
                  </>
                )}
              </View>
            </>
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
      backgroundColor: theme.colors.backgroundSecondary,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
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
      padding: 24,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.gray500,
    },
    errorContainer: {
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: 8,
      marginBottom: 24,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: 8,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.medium,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
    },
    quickAccessSection: {
      marginBottom: theme.spacing.base,
    },
    quickAccessCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      ...theme.shadows.sm,
      gap: theme.spacing.md,
    },
    quickAccessIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primaryBackground,
      justifyContent: "center",
      alignItems: "center",
    },
    quickAccessContent: {
      flex: 1,
    },
    quickAccessTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    quickAccessSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    chart: {
      marginVertical: 8,
      borderRadius: theme.spacing.md,
    },
    emptyChartContainer: {
      padding: 32,
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
    },
    emptyChartText: {
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      marginBottom: 8,
    },
    emptyChartSubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      textAlign: "center",
    },
    categoryList: {
      marginTop: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
      padding: theme.spacing.base,
    },
    categoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
    },
    categoryColor: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    categoryName: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      flex: 1,
    },
    categoryAmounts: {
      flexDirection: "row",
      alignItems: "center",
    },
    categoryAmount: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginRight: 4,
    },
    categoryPercentage: {
      fontSize: 12,
      color: theme.colors.gray500,
    },
    trendSummary: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: theme.spacing.base,
      padding: theme.spacing.base,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
    },
    trendSummaryItem: {
      alignItems: "center",
      flex: 1,
    },
    trendSummaryLabel: {
      fontSize: 12,
      color: theme.colors.gray500,
      marginBottom: 4,
    },
    trendSummaryValue: {
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    trendSummaryValuePositive: {
      color: theme.colors.success,
    },
    trendSummaryValueNegative: {
      color: theme.colors.error,
    },
    chartLabel: {
      fontSize: 12,
      color: theme.colors.gray500,
      textAlign: "center",
      marginTop: 8,
    },
    tabsContainer: {
      flexDirection: "row",
      marginBottom: 24,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      alignItems: "center",
      minHeight: 44,
      justifyContent: "center",
    },
    tabActive: {
      backgroundColor: theme.colors.background,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    tabText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray500,
    },
    tabTextActive: {
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    summaryCards: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 24,
      gap: 12,
    },
    summaryCard: {
      flex: 1,
      minWidth: "30%",
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
      padding: theme.spacing.base,
      marginBottom: 12,
    },
    summaryCardTitle: {
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray500,
      marginBottom: 8,
    },
    summaryCardValue: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    summaryCardSubtext: {
      fontSize: 12,
      color: theme.colors.gray500,
    },
    incomeExpenseCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
      padding: theme.spacing.base,
      marginBottom: 24,
    },
    incomeExpenseRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 12,
    },
    incomeExpenseItem: {
      alignItems: "center",
      flex: 1,
    },
    incomeExpenseLabel: {
      fontSize: 12,
      color: theme.colors.gray500,
      marginBottom: 4,
    },
    incomeExpenseValue: {
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    positiveValue: {
      color: theme.colors.success,
    },
    negativeValue: {
      color: theme.colors.error,
    },
    savingsRateText: {
      fontSize: 12,
      color: theme.colors.gray500,
      textAlign: "center",
      marginTop: 12,
    },
    emptyContainer: {
      padding: 32,
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.gray500,
    },
  });
