import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart, BarChart } from "react-native-chart-kit";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getExpenseSpendingByCategory,
  getExpenseMonthlyTrends,
  ExpenseSpendingByCategory,
  ExpenseMonthlyTrend,
} from "../api/analyticsApi";
import { Header, HeaderOption } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { Icon } from "../components/Icon";
import { useTheme, chartColor } from "../theme";

interface BillchopAnalyticsScreenProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

const screenWidth = Dimensions.get("window").width;

export function BillchopAnalyticsScreen({
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: BillchopAnalyticsScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(6);

  interface AnalyticsData {
    spendingByCategory: ExpenseSpendingByCategory[];
    monthlyTrends: ExpenseMonthlyTrend[];
  }

  const { data, loading, refreshing, error, refresh, refetch } =
    useDataFetch<AnalyticsData>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        const [spendingData, trendsData] = await Promise.all([
          getExpenseSpendingByCategory(token),
          getExpenseMonthlyTrends(token, selectedPeriod),
        ]);
        return {
          spendingByCategory: spendingData,
          monthlyTrends: trendsData,
        };
      },
      immediate: true,
      deps: [token, selectedPeriod],
    });

  const spendingByCategory = data?.spendingByCategory ?? [];
  const monthlyTrends = data?.monthlyTrends ?? [];

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
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

  // Generate colors for pie chart (cycling through a palette)
  function getChartColors(count: number): string[] {
    const colors = [
      theme.colors.primary, // Indigo
      theme.colors.success, // Green
      theme.colors.error, // Red
      theme.colors.warning, // Amber
      theme.colors.primaryDark, // Purple/Darker Indigo
      theme.colors.chartPink, // Pink
      theme.colors.info, // Cyan/Blue
      theme.colors.chartLime, // Lime
      theme.colors.chartOrange, // Orange
      theme.colors.blue, // Blue
    ];
    return colors.slice(0, count);
  }

  const totalSpending = useMemo(() => {
    return spendingByCategory.reduce((sum, item) => sum + item.amount, 0);
  }, [spendingByCategory]);

  const averageMonthly = useMemo(() => {
    if (monthlyTrends.length === 0) return 0;
    return (
      monthlyTrends.reduce((sum, t) => sum + t.amount, 0) / monthlyTrends.length
    );
  }, [monthlyTrends]);

  // Header options for the options menu
  const headerOptions: HeaderOption[] = [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Billchop Analytics"
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
        >
          <View style={styles.content}>
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <SkeletonLoader width="100%" height={80} borderRadius={16} />
              </View>
              <View style={styles.summaryCard}>
                <SkeletonLoader width="100%" height={80} borderRadius={16} />
              </View>
            </View>
            <View style={styles.section}>
              <SkeletonLoader
                width="60%"
                height={24}
                borderRadius={4}
                style={{ marginBottom: 16 }}
              />
              <SkeletonLoader width="100%" height={220} borderRadius={16} />
            </View>
            <View style={styles.section}>
              <SkeletonLoader
                width="60%"
                height={24}
                borderRadius={4}
                style={{ marginBottom: 16 }}
              />
              <SkeletonLoader width="100%" height={220} borderRadius={16} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const chartConfig = {
    backgroundColor: theme.colors.background,
    backgroundGradientFrom: theme.colors.white,
    backgroundGradientTo: theme.colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => chartColor(theme.colors.primary, opacity),
    labelColor: (opacity = 1) =>
      chartColor(theme.colors.textSecondary, opacity),
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: theme.colors.primary,
    },
    strokeWidth: 3,
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Billchop Analytics"
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.content}>
          {error &&
            spendingByCategory.length === 0 &&
            monthlyTrends.length === 0 && (
              <ErrorState message={error} onRetry={refetch} />
            )}

          {error &&
            (spendingByCategory.length > 0 || monthlyTrends.length > 0) && (
              <View style={styles.errorBanner}>
                <MaterialIcons
                  name="error-outline"
                  size={20}
                  color={theme.colors.error}
                />
                <Text style={styles.errorBannerText}>{error}</Text>
                <TouchableOpacity
                  onPress={refetch}
                  style={styles.errorRetryButton}
                >
                  <Text style={styles.errorRetryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

          {/* Summary Cards */}
          {!loading &&
            !error &&
            (spendingByCategory.length > 0 || monthlyTrends.length > 0) && (
              <View style={styles.summaryCards}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Icon
                      name="account-balance-wallet"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.summaryCardLabel}>Total Spending</Text>
                  </View>
                  <Text style={styles.summaryCardValue}>
                    {formatCurrency(totalSpending)}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Icon
                      name="trending-up"
                      size={20}
                      color={theme.colors.success}
                    />
                    <Text style={styles.summaryCardLabel}>Avg Monthly</Text>
                  </View>
                  <Text style={styles.summaryCardValue}>
                    {formatCurrency(averageMonthly)}
                  </Text>
                </View>
              </View>
            )}

          {/* Spending by Category - Pie Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            {spendingByCategory.length === 0 ? (
              <EmptyState
                icon="pie-chart"
                title="No spending data"
                message="Add split expenses with categories to see your spending breakdown."
              />
            ) : (
              <>
                <PieChart
                  data={spendingByCategory.map((item, index) => ({
                    name: item.category,
                    amount: item.amount,
                    color: getChartColors(spendingByCategory.length)[index],
                    legendFontColor: theme.colors.gray700,
                    legendFontSize: 12,
                  }))}
                  width={screenWidth - 48}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute // Show absolute values instead of percentages
                />
                <View style={styles.categoryList}>
                  {spendingByCategory.map((item, index) => (
                    <View key={item.category} style={styles.categoryItem}>
                      <View style={styles.categoryRow}>
                        <View
                          style={[
                            styles.categoryColor,
                            {
                              backgroundColor: getChartColors(
                                spendingByCategory.length,
                              )[index],
                            },
                          ]}
                        />
                        <Text style={styles.categoryName} numberOfLines={1}>
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
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Monthly Trends - Bar Chart */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Monthly Trends</Text>
              <View style={styles.periodSelector}>
                {[3, 6, 12].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.periodButtonSelected,
                    ]}
                    onPress={() => {
                      setSelectedPeriod(period);
                      refetch();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        selectedPeriod === period &&
                          styles.periodButtonTextSelected,
                      ]}
                    >
                      {period}M
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {monthlyTrends.length === 0 ? (
              <EmptyState
                icon="trending-up"
                title="No trend data"
                message="Add split expenses to see your spending trends over time."
              />
            ) : (
              <>
                {/* Monthly spending bar chart */}
                <BarChart
                  data={{
                    labels: monthlyTrends.map((t) => formatMonth(t.month)),
                    datasets: [
                      {
                        data: monthlyTrends.map((t) => t.amount),
                      },
                    ],
                  }}
                  width={screenWidth - 48}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={chartConfig}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  fromZero
                />
                <Text style={styles.chartLabel}>
                  Monthly Split Expense Amount
                </Text>
              </>
            )}
          </View>
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
      paddingBottom: theme.spacing["2xl"],
    },
    content: {
      paddingHorizontal: theme.spacing.base,
      paddingTop: 16,
    },
    summaryCards: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 24,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    summaryCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    summaryCardLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    summaryCardValue: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
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
      color: theme.colors.textSecondary,
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.errorBackground,
      borderRadius: theme.spacing.md,
      padding: 12,
      marginBottom: theme.spacing.base,
      gap: 8,
    },
    errorBannerText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
    },
    errorRetryButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.error,
      borderRadius: 6,
    },
    errorRetryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    section: {
      marginBottom: 28,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.base,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
    },
    periodSelector: {
      flexDirection: "row",
      gap: 6,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 10,
      padding: 4,
    },
    periodButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      minHeight: 32,
      justifyContent: "center",
      alignItems: "center",
    },
    periodButtonSelected: {
      backgroundColor: theme.colors.primary,
    },
    periodButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    periodButtonTextSelected: {
      color: theme.colors.white,
    },
    chart: {
      marginVertical: 8,
      borderRadius: 16,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    categoryList: {
      marginTop: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 16,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
    },
    categoryColor: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginRight: 10,
      borderWidth: 2,
      borderColor: theme.colors.white,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 1,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    categoryName: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      flex: 1,
      fontWeight: theme.typography.fontWeight.medium,
    },
    categoryAmounts: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    categoryAmount: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
    },
    categoryPercentage: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    chartLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: 8,
    },
  });
}
