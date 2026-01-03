import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useAuth } from '../auth/authContext';
import {
  getSpendingByCategory,
  getMonthlyTrends,
  getBalanceOverTime,
  SpendingByCategory,
  MonthlyTrend,
  BalanceOverTime,
} from '../api/analyticsApi';

interface AnalyticsScreenProps {
  onBack: () => void;
}

const screenWidth = Dimensions.get('window').width;

export function AnalyticsScreen({ onBack }: AnalyticsScreenProps) {
  const { token } = useAuth();
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [balanceOverTime, setBalanceOverTime] = useState<BalanceOverTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [spendingData, trendsData, balanceData] = await Promise.all([
        getSpendingByCategory(token),
        getMonthlyTrends(token, 6),
        getBalanceOverTime(token, 30),
      ]);
      setSpendingByCategory(spendingData);
      setMonthlyTrends(trendsData);
      setBalanceOverTime(balanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function formatMonth(monthKey: string): string {
    const date = new Date(monthKey + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  function formatDate(dateKey: string): string {
    const date = new Date(dateKey);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Generate colors for pie chart (cycling through a palette)
  function getChartColors(count: number): string[] {
    const colors = [
      '#2563EB', // Primary Blue
      '#10B981', // Green
      '#EF4444', // Red
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#6366F1', // Indigo
    ];
    return colors.slice(0, count);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Primary Blue
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Gray-500
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#2563EB',
    },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Insights</Text>
            <View style={styles.headerSpacer} />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Spending by Category - Pie Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Wallet - Spending by Category</Text>
            {spendingByCategory.length === 0 ? (
              <View style={styles.emptyChartContainer}>
                <Text style={styles.emptyChartText}>No spending data available</Text>
                <Text style={styles.emptyChartSubtext}>
                  Add expense transactions to see your spending breakdown
                </Text>
              </View>
            ) : (
              <>
                <PieChart
                  data={spendingByCategory.map((item, index) => ({
                    name: item.category,
                    amount: item.amount,
                    color: getChartColors(spendingByCategory.length)[index],
                    legendFontColor: '#374151',
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
                            { backgroundColor: getChartColors(spendingByCategory.length)[index] },
                          ]}
                        />
                        <Text style={styles.categoryName} numberOfLines={1}>
                          {item.category}
                        </Text>
                      </View>
                      <View style={styles.categoryAmounts}>
                        <Text style={styles.categoryAmount}>{formatCurrency(item.amount)}</Text>
                        <Text style={styles.categoryPercentage}>({item.percentage.toFixed(1)}%)</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Monthly Trends - Line Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Wallet - Monthly Trends (Last 6 Months)</Text>
            {monthlyTrends.length === 0 ? (
              <View style={styles.emptyChartContainer}>
                <Text style={styles.emptyChartText}>No trend data available</Text>
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
                        monthlyTrends.reduce((sum, t) => sum + t.income, 0) / monthlyTrends.length
                      )}
                    </Text>
                  </View>
                  <View style={styles.trendSummaryItem}>
                    <Text style={styles.trendSummaryLabel}>Avg Expense</Text>
                    <Text style={[styles.trendSummaryValue, styles.trendSummaryValueNegative]}>
                      {formatCurrency(
                        monthlyTrends.reduce((sum, t) => sum + t.expense, 0) / monthlyTrends.length
                      )}
                    </Text>
                  </View>
                  <View style={styles.trendSummaryItem}>
                    <Text style={styles.trendSummaryLabel}>Avg Net</Text>
                    <Text
                      style={[
                        styles.trendSummaryValue,
                        monthlyTrends.reduce((sum, t) => sum + t.net, 0) / monthlyTrends.length >= 0
                          ? styles.trendSummaryValuePositive
                          : styles.trendSummaryValueNegative,
                      ]}
                    >
                      {formatCurrency(
                        monthlyTrends.reduce((sum, t) => sum + t.net, 0) / monthlyTrends.length
                      )}
                    </Text>
                  </View>
                </View>
                {/* Net balance chart */}
                <LineChart
                  data={{
                    labels: monthlyTrends.map((t) => formatMonth(t.month)),
                    datasets: [
                      {
                        data: monthlyTrends.map((t) => t.net),
                      },
                    ],
                  }}
                  width={screenWidth - 48}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => {
                      // Use green for positive, red for negative
                      const avgNet = monthlyTrends.reduce((sum, t) => sum + t.net, 0) / monthlyTrends.length;
                      if (avgNet >= 0) {
                        return `rgba(16, 185, 129, ${opacity})`; // Green
                      }
                      return `rgba(239, 68, 68, ${opacity})`; // Red
                    },
                  }}
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
                <Text style={styles.chartLabel}>Net Balance (Income - Expense)</Text>
              </>
            )}
          </View>

          {/* Balance Over Time - Line Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Wallet - Balance Over Time (Last 30 Days)</Text>
            {balanceOverTime.length === 0 ? (
              <View style={styles.emptyChartContainer}>
                <Text style={styles.emptyChartText}>No balance data available</Text>
                <Text style={styles.emptyChartSubtext}>
                  Add transactions to see your balance history
                </Text>
              </View>
            ) : (
              <>
                <LineChart
                  data={{
                    labels: balanceOverTime.map((b) => formatDate(b.date)),
                    datasets: [
                      {
                        data: balanceOverTime.map((b) => b.balance),
                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green
                        strokeWidth: 2,
                      },
                    ],
                    legend: ['Balance'],
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60, // Match back button width
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
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginBottom: 24,
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
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  emptyChartContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  emptyChartText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  emptyChartSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  categoryList: {
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  categoryAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 4,
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#6B7280',
  },
  trendSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  trendSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendSummaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  trendSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  trendSummaryValuePositive: {
    color: '#10B981',
  },
  trendSummaryValueNegative: {
    color: '#EF4444',
  },
  chartLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});

