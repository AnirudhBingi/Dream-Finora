import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import {
  getExpenseSpendingByCategory,
  getExpenseMonthlyTrends,
  ExpenseSpendingByCategory,
  ExpenseMonthlyTrend,
} from '../api/analyticsApi';
import { Header, HeaderOption } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Icon } from '../components/Icon';

interface BillchopAnalyticsScreenProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

const screenWidth = Dimensions.get('window').width;

export function BillchopAnalyticsScreen({ 
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: BillchopAnalyticsScreenProps) {
  const { token } = useAuth();
  const [spendingByCategory, setSpendingByCategory] = useState<ExpenseSpendingByCategory[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<ExpenseMonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(6);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [spendingData, trendsData] = await Promise.all([
        getExpenseSpendingByCategory(token),
        getExpenseMonthlyTrends(token, selectedPeriod),
      ]);
      setSpendingByCategory(spendingData);
      setMonthlyTrends(trendsData);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
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

  // Generate colors for pie chart (cycling through a palette)
  function getChartColors(count: number): string[] {
    const colors = [
      '#6366F1', // Indigo
      '#10B981', // Green
      '#EF4444', // Red
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#3B82F6', // Blue
    ];
    return colors.slice(0, count);
  }

  const totalSpending = useMemo(() => {
    return spendingByCategory.reduce((sum, item) => sum + item.amount, 0);
  }, [spendingByCategory]);

  const averageMonthly = useMemo(() => {
    if (monthlyTrends.length === 0) return 0;
    return monthlyTrends.reduce((sum, t) => sum + t.amount, 0) / monthlyTrends.length;
  }, [monthlyTrends]);

  // Header options for the options menu
  const headerOptions: HeaderOption[] = [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Billchop Analytics"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
              <SkeletonLoader width="60%" height={24} borderRadius={4} style={{ marginBottom: 16 }} />
              <SkeletonLoader width="100%" height={220} borderRadius={16} />
            </View>
            <View style={styles.section}>
              <SkeletonLoader width="60%" height={24} borderRadius={4} style={{ marginBottom: 16 }} />
              <SkeletonLoader width="100%" height={220} borderRadius={16} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`, // Indigo
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Gray-500
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#6366F1',
    },
    strokeWidth: 3,
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
            onRefresh={loadData}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >
        <View style={styles.content}>
          {error && (spendingByCategory.length === 0 && monthlyTrends.length === 0) && (
            <ErrorState message={error} onRetry={loadData} />
          )}
          
          {error && (spendingByCategory.length > 0 || monthlyTrends.length > 0) && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={20} color="#EF4444" />
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity onPress={loadData} style={styles.errorRetryButton}>
                <Text style={styles.errorRetryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Summary Cards */}
          {!loading && !error && (spendingByCategory.length > 0 || monthlyTrends.length > 0) && (
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <Icon name="account-balance-wallet" size={20} color="#6366F1" />
                  <Text style={styles.summaryCardLabel}>Total Spending</Text>
                </View>
                <Text style={styles.summaryCardValue}>
                  {formatCurrency(totalSpending)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <Icon name="trending-up" size={20} color="#10B981" />
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

          {/* Monthly Trends - Bar Chart */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Monthly Trends</Text>
              <View style={styles.periodSelector}>
                {[3, 6, 12].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodButton, selectedPeriod === period && styles.periodButtonSelected]}
                    onPress={() => {
                      setSelectedPeriod(period);
                      loadData();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextSelected]}>
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
                  chartConfig={chartConfig}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  fromZero
                  formatYLabel={(value) => {
                    const num = parseFloat(value);
                    if (num >= 1000) {
                      return `$${(num / 1000).toFixed(1)}k`;
                    }
                    return `$${num.toFixed(0)}`;
                  }}
                />
                <Text style={styles.chartLabel}>Monthly Split Expense Amount</Text>
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
    paddingBottom: 32,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryCardLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  errorRetryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  errorRetryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodButtonSelected: {
    backgroundColor: '#6366F1',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextSelected: {
    color: '#FFFFFF',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    fontSize: 14,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  categoryAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  categoryPercentage: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chartLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});

