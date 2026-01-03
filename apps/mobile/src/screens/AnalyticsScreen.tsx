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
  getLocalAnalytics,
  getHomeAnalytics,
  getCombinedAnalytics,
  ContextAnalytics,
  CombinedAnalytics,
} from '../api/analyticsApi';
import { getProfile, Profile } from '../api/profileApi';

interface AnalyticsScreenProps {
  onBack: () => void;
}

const screenWidth = Dimensions.get('window').width;

type AnalyticsContext = 'local' | 'home' | 'combined';

export function AnalyticsScreen({ onBack }: AnalyticsScreenProps) {
  const { token } = useAuth();
  const [context, setContext] = useState<AnalyticsContext>('local');
  const [analytics, setAnalytics] = useState<ContextAnalytics | CombinedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadData();
    loadProfile();
  }, [token, context]);

  async function loadProfile() {
    if (!token) return;
    try {
      const profileData = await getProfile(token);
      setProfile(profileData);
    } catch (err) {
      // Silently fail - currency will default to USD
      console.error('Failed to load profile:', err);
    }
  }

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      
      let data: ContextAnalytics | CombinedAnalytics;
      if (context === 'local') {
        data = await getLocalAnalytics(token, 6, 30);
      } else if (context === 'home') {
        data = await getHomeAnalytics(token, 6, 30);
      } else {
        data = await getCombinedAnalytics(token, 6, 30);
      }
      
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Get current analytics data based on context
  function getCurrentAnalytics(): ContextAnalytics | null {
    if (!analytics) return null;
    if (context === 'combined' && 'local' in analytics) {
      // For combined view, show local by default (can be enhanced to show both)
      return analytics.local;
    }
    return analytics as ContextAnalytics;
  }

  function getCurrencyForContext(): string {
    if (!profile) return 'USD';
    if (context === 'local') {
      return profile.primaryCurrency || 'USD';
    } else if (context === 'home') {
      return profile.homeCountryCurrency || 'USD';
    }
    // For combined, use primary currency
    return profile.primaryCurrency || 'USD';
  }

  function formatCurrency(amount: number, currency?: string): string {
    const displayCurrency = currency || getCurrencyForContext();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
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

  const currentAnalytics = getCurrentAnalytics();

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

          {/* Context Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, context === 'local' && styles.tabActive]}
              onPress={() => setContext('local')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, context === 'local' && styles.tabTextActive]}>
                Local
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, context === 'home' && styles.tabActive]}
              onPress={() => setContext('home')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, context === 'home' && styles.tabTextActive]}>
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, context === 'combined' && styles.tabActive]}
              onPress={() => setContext('combined')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, context === 'combined' && styles.tabTextActive]}>
                Combined
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadData}>
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
                {currentAnalytics.budgetPerformance && currentAnalytics.budgetPerformance.totalBudgets > 0 && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardTitle}>Budgets</Text>
                    <Text style={styles.summaryCardValue}>
                      {currentAnalytics.budgetPerformance.budgetsOnTrack} / {currentAnalytics.budgetPerformance.totalBudgets} on track
                    </Text>
                    <Text style={styles.summaryCardSubtext}>
                      {currentAnalytics.budgetPerformance.averageAdherence.toFixed(0)}% adherence
                    </Text>
                  </View>
                )}

                {/* Goals Progress Card */}
                {currentAnalytics.goalsProgress && currentAnalytics.goalsProgress.totalGoals > 0 && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardTitle}>Goals</Text>
                    <Text style={styles.summaryCardValue}>
                      {currentAnalytics.goalsProgress.completedGoals} / {currentAnalytics.goalsProgress.totalGoals} completed
                    </Text>
                    <Text style={styles.summaryCardSubtext}>
                      {currentAnalytics.goalsProgress.overallProgress.toFixed(0)}% overall progress
                    </Text>
                  </View>
                )}

                {/* Loan Summary Card */}
                {currentAnalytics.loanSummary && currentAnalytics.loanSummary.totalLoans > 0 && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardTitle}>Loans</Text>
                    <Text style={styles.summaryCardValue}>
                      {currentAnalytics.loanSummary.activeLoans} active
                    </Text>
                    <Text style={styles.summaryCardSubtext}>
                      {currentAnalytics.loanSummary.progressPercentage.toFixed(0)}% paid
                    </Text>
                  </View>
                )}
              </View>

              {/* Income vs Expenses Summary */}
              {currentAnalytics.incomeVsExpenses && (
                <View style={styles.incomeExpenseCard}>
                  <Text style={styles.sectionTitle}>Income vs Expenses</Text>
                  <View style={styles.incomeExpenseRow}>
                    <View style={styles.incomeExpenseItem}>
                      <Text style={styles.incomeExpenseLabel}>Total Income</Text>
                      <Text style={[styles.incomeExpenseValue, styles.positiveValue]}>
                        {formatCurrency(currentAnalytics.incomeVsExpenses.totalIncome)}
                      </Text>
                    </View>
                    <View style={styles.incomeExpenseItem}>
                      <Text style={styles.incomeExpenseLabel}>Total Expenses</Text>
                      <Text style={[styles.incomeExpenseValue, styles.negativeValue]}>
                        {formatCurrency(currentAnalytics.incomeVsExpenses.totalExpenses)}
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
                    Savings Rate: {currentAnalytics.incomeVsExpenses.savingsRate.toFixed(1)}%
                  </Text>
                </View>
              )}

              {/* Spending by Category - Pie Chart */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Spending by Category</Text>
                {currentAnalytics.spendingByCategory.length === 0 ? (
              <View style={styles.emptyChartContainer}>
                <Text style={styles.emptyChartText}>No spending data available</Text>
                <Text style={styles.emptyChartSubtext}>
                  Add expense transactions to see your spending breakdown
                </Text>
              </View>
            ) : (
              <>
                <PieChart
                  data={currentAnalytics.spendingByCategory.map((item, index) => ({
                    name: item.category,
                    amount: item.amount,
                    color: getChartColors(currentAnalytics.spendingByCategory.length)[index],
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
                  {currentAnalytics.spendingByCategory.map((item, index) => (
                    <View key={item.category} style={styles.categoryItem}>
                      <View style={styles.categoryRow}>
                        <View
                          style={[
                            styles.categoryColor,
                            { backgroundColor: getChartColors(currentAnalytics.spendingByCategory.length)[index] },
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
            <Text style={styles.sectionTitle}>Monthly Trends (Last 6 Months)</Text>
            {currentAnalytics.monthlyTrends.length === 0 ? (
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
                        currentAnalytics.monthlyTrends.reduce((sum, t) => sum + t.income, 0) / currentAnalytics.monthlyTrends.length
                      )}
                    </Text>
                  </View>
                  <View style={styles.trendSummaryItem}>
                    <Text style={styles.trendSummaryLabel}>Avg Expense</Text>
                    <Text style={[styles.trendSummaryValue, styles.trendSummaryValueNegative]}>
                      {formatCurrency(
                        currentAnalytics.monthlyTrends.reduce((sum, t) => sum + t.expense, 0) / currentAnalytics.monthlyTrends.length
                      )}
                    </Text>
                  </View>
                  <View style={styles.trendSummaryItem}>
                    <Text style={styles.trendSummaryLabel}>Avg Net</Text>
                    <Text
                      style={[
                        styles.trendSummaryValue,
                        currentAnalytics.monthlyTrends.reduce((sum, t) => sum + t.net, 0) / currentAnalytics.monthlyTrends.length >= 0
                          ? styles.trendSummaryValuePositive
                          : styles.trendSummaryValueNegative,
                      ]}
                    >
                      {formatCurrency(
                        currentAnalytics.monthlyTrends.reduce((sum, t) => sum + t.net, 0) / currentAnalytics.monthlyTrends.length
                      )}
                    </Text>
                  </View>
                </View>
                {/* Net balance chart */}
                <LineChart
                  data={{
                    labels: currentAnalytics.monthlyTrends.map((t) => formatMonth(t.month)),
                    datasets: [
                      {
                        data: currentAnalytics.monthlyTrends.map((t) => t.net),
                      },
                    ],
                  }}
                  width={screenWidth - 48}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => {
                      // Use green for positive, red for negative
                      const avgNet = currentAnalytics.monthlyTrends.reduce((sum, t) => sum + t.net, 0) / currentAnalytics.monthlyTrends.length;
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
            <Text style={styles.sectionTitle}>Balance Over Time (Last 30 Days)</Text>
            {currentAnalytics.balanceOverTime.length === 0 ? (
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
                    labels: currentAnalytics.balanceOverTime.map((b) => formatDate(b.date)),
                    datasets: [
                      {
                        data: currentAnalytics.balanceOverTime.map((b) => b.balance),
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
            </>
          )}
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
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  summaryCardSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  incomeExpenseCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  incomeExpenseItem: {
    alignItems: 'center',
    flex: 1,
  },
  incomeExpenseLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  incomeExpenseValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveValue: {
    color: '#10B981',
  },
  negativeValue: {
    color: '#EF4444',
  },
  savingsRateText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

