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
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../auth/authContext';
import {
  getFinanceHistory,
  FinanceHistory,
  FinanceTransaction,
  FinanceAccount,
} from '../api/financeApi';
import { getLocalAnalytics, getHomeAnalytics, ContextAnalytics } from '../api/analyticsApi';
import { getProfile, Profile } from '../api/profileApi';
import { MaterialIcons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

interface FinanceHistoryScreenProps {
  context?: 'local' | 'home';
  onBack: () => void;
}

export function FinanceHistoryScreen({
  context: initialContext,
  onBack,
}: FinanceHistoryScreenProps) {
  const { token } = useAuth();
  const [history, setHistory] = useState<FinanceHistory | null>(null);
  const [balanceData, setBalanceData] = useState<ContextAnalytics | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<'local' | 'home' | undefined>(
    initialContext,
  );

  useEffect(() => {
    loadHistory();
    loadBalanceData();
    loadProfile();
  }, [token, selectedContext]);

  async function loadProfile() {
    if (!token) return;
    try {
      const profileData = await getProfile(token);
      setProfile(profileData);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }

  async function loadBalanceData() {
    if (!token || !selectedContext) return;

    try {
      const analytics = selectedContext === 'local'
        ? await getLocalAnalytics(token, 6, 30)
        : await getHomeAnalytics(token, 6, 30);
      setBalanceData(analytics);
    } catch (err) {
      console.error('Failed to load balance data:', err);
    }
  }

  async function loadHistory() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const historyData = await getFinanceHistory(token, selectedContext);
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finance history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = today.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
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
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const transactionGroups = history?.transactions
    ? groupByDate(history.transactions)
    : {};

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadHistory} />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Finance History</Text>
            <View style={styles.placeholder} />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadHistory}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Context Filter */}
          <View style={styles.contextToggle}>
            <TouchableOpacity
              style={[
                styles.contextButton,
                selectedContext === 'local' && styles.contextButtonActive,
              ]}
              onPress={() => setSelectedContext('local')}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="location-on"
                size={20}
                color={selectedContext === 'local' ? '#fff' : '#6B7280'}
              />
              <Text
                style={[
                  styles.contextButtonText,
                  selectedContext === 'local' && styles.contextButtonTextActive,
                ]}
              >
                Local
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.contextButton,
                selectedContext === 'home' && styles.contextButtonActive,
              ]}
              onPress={() => setSelectedContext('home')}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="home"
                size={20}
                color={selectedContext === 'home' ? '#fff' : '#6B7280'}
              />
              <Text
                style={[
                  styles.contextButtonText,
                  selectedContext === 'home' && styles.contextButtonTextActive,
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
                  selectedContext === undefined && styles.contextButtonTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
          </View>

          {/* Balance Over Time Chart */}
          {selectedContext && balanceData && balanceData.balanceOverTime.length > 0 && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Balance Over Time (Last 30 Days)</Text>
              <LineChart
                data={{
                  labels: balanceData.balanceOverTime.map((b) => formatDate(b.date)),
                  datasets: [
                    {
                      data: balanceData.balanceOverTime.map((b) => b.balance),
                      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green
                      strokeWidth: 2,
                    },
                  ],
                  legend: ['Balance'],
                }}
                width={screenWidth - 48}
                height={220}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#10B981',
                  },
                }}
                bezier
                style={styles.chart}
                withDots
                withShadow={false}
                formatYLabel={(value) => {
                  const num = parseFloat(value);
                  const currency = selectedContext === 'local'
                    ? (profile?.primaryCurrency || 'USD')
                    : (profile?.homeCountryCurrency || 'USD');
                  if (num >= 1000) {
                    return `${currency === 'USD' ? '$' : ''}${(num / 1000).toFixed(1)}k`;
                  }
                  return `${currency === 'USD' ? '$' : ''}${num.toFixed(0)}`;
                }}
              />
            </View>
          )}

          {/* Transaction History */}
          {history && history.transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={48} color="#D1D5DB" />
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
                        transaction.type === 'income'
                          ? styles.transactionIconIncome
                          : styles.transactionIconExpense,
                      ]}
                    >
                      <MaterialIcons
                        name={
                          transaction.type === 'income' ? 'arrow-downward' : 'arrow-upward'
                        }
                        size={20}
                        color="#fff"
                      />
                    </View>
                    <View style={styles.transactionContent}>
                      <Text style={styles.transactionDescription}>
                        {transaction.description ||
                          (transaction.type === 'income'
                            ? transaction.source || 'Income'
                            : transaction.category || 'Expense')}
                      </Text>
                      <View style={styles.transactionMeta}>
                        {transaction.type === 'income' && transaction.source && (
                          <Text style={styles.transactionMetaText}>{transaction.source} • </Text>
                        )}
                        {transaction.type === 'expense' && transaction.category && (
                          <Text style={styles.transactionMetaText}>{transaction.category} • </Text>
                        )}
                        <Text style={styles.transactionMetaText}>
                          {new Date(transaction.date).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                        {transaction.updatedAt !== transaction.createdAt && (
                          <>
                            <Text style={styles.transactionMetaText}> • </Text>
                            <MaterialIcons name="edit" size={12} color="#6B7280" />
                            <Text style={styles.transactionMetaText}> Edited</Text>
                          </>
                        )}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.transactionAmount,
                        transaction.type === 'income'
                          ? styles.transactionAmountIncome
                          : styles.transactionAmountExpense,
                      ]}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
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
              {history.accounts.map((account) => (
                <View key={account.id} style={styles.accountItem}>
                  <MaterialIcons name="account-balance-wallet" size={24} color="#2563EB" />
                  <View style={styles.accountContent}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountMeta}>
                      {formatCurrency(account.balance, account.currency)} • {account.context} •{' '}
                      {formatDate(account.updatedAt)}
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
                Showing {history.pagination.offset + history.transactions.length} of{' '}
                {history.pagination.total} transactions
              </Text>
            </View>
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
    marginBottom: 16,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 60,
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
    marginBottom: 16,
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
  contextToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  contextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  contextButtonActive: {
    backgroundColor: '#2563EB',
  },
  contextButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  contextButtonTextActive: {
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconIncome: {
    backgroundColor: '#10B981',
  },
  transactionIconExpense: {
    backgroundColor: '#EF4444',
  },
  transactionContent: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  transactionMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionAmountIncome: {
    color: '#10B981',
  },
  transactionAmountExpense: {
    color: '#EF4444',
  },
  section: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  accountContent: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  accountMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  paginationInfo: {
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  paginationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  chartSection: {
    marginTop: 24,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

