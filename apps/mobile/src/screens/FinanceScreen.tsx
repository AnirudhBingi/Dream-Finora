import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/authContext';
import {
  getBalance,
  getCombinedBalance,
  getTransactions,
  BalanceInfo,
  CombinedBalanceInfo,
  FinanceTransaction,
} from '../api/financeApi';
import { getProfile } from '../api/profileApi';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';

interface FinanceScreenProps {
  onAddIncome: (context: 'local' | 'home') => void;
  onAddExpense: (context: 'local' | 'home') => void;
  onViewBudgets: (context: 'local' | 'home') => void;
  onViewGoals: (context: 'local' | 'home') => void;
  onViewLoans: (context: 'local' | 'home') => void;
  onViewAdvisor: (context: 'local' | 'home') => void;
  onEditTransaction?: (transactionId: string) => void;
  onViewHistory?: (context?: 'local' | 'home') => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function FinanceScreen({
  onAddIncome,
  onAddExpense,
  onViewBudgets,
  onViewGoals,
  onViewLoans,
  onViewAdvisor,
  onEditTransaction,
  onViewHistory,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: FinanceScreenProps) {
  const { token } = useAuth();
  const [context, setContext] = useState<'local' | 'home'>('local');
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [combinedBalance, setCombinedBalance] = useState<CombinedBalanceInfo | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('USD');
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>('USD');

  useEffect(() => {
    loadCurrencies();
    loadData();
  }, [token, context]);

  async function loadCurrencies() {
    if (!token) return;

    try {
      const profile = await getProfile(token);
      if (profile) {
        setPrimaryCurrency(profile.primaryCurrency || 'USD');
        setHomeCountryCurrency(profile.homeCountryCurrency || 'USD');
      } else {
        // Default to USD if profile is null
        setPrimaryCurrency('USD');
        setHomeCountryCurrency('USD');
      }
    } catch (err) {
      // Default to USD if loading fails
      setPrimaryCurrency('USD');
      setHomeCountryCurrency('USD');
    }
  }

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const currency = context === 'local' ? primaryCurrency : homeCountryCurrency;
      const [balanceData, transactionsData, combinedBalanceData] = await Promise.all([
        getBalance(token, context, context === 'local', currency), // Include Billchop for local
        getTransactions(token, context, context === 'local'), // Include Billchop for local
        getCombinedBalance(token, primaryCurrency), // Get combined balance with currency conversion
      ]);
      setBalance(balanceData);
      setCombinedBalance(combinedBalanceData);
      setTransactions(transactionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatCurrency(amount: number | undefined | null, currency?: string): string {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
    const displayCurrency = currency || (context === 'local' ? primaryCurrency : homeCountryCurrency) || 'USD';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: displayCurrency,
      }).format(amount);
    } catch (e) {
      // Fallback if currency format fails
      return `$${amount.toFixed(2)}`;
    }
  }

  function formatDate(dateString: string | undefined | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="My Wallet"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading finances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="My Wallet"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
      >
        <View style={styles.content}>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Context Toggle */}
          <View style={styles.contextToggle}>
            <TouchableOpacity
              style={[
                styles.contextButton,
                context === 'local' && styles.contextButtonActive,
              ]}
              onPress={() => setContext('local')}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="location-on"
                size={20}
                color={context === 'local' ? '#fff' : '#6B7280'}
              />
              <Text
                style={[
                  styles.contextButtonText,
                  context === 'local' && styles.contextButtonTextActive,
                ]}
              >
                Local Finance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.contextButton,
                context === 'home' && styles.contextButtonActive,
              ]}
              onPress={() => setContext('home')}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="home"
                size={20}
                color={context === 'home' ? '#fff' : '#6B7280'}
              />
              <Text
                style={[
                  styles.contextButtonText,
                  context === 'home' && styles.contextButtonTextActive,
                ]}
              >
                Home Country
              </Text>
            </TouchableOpacity>
          </View>

          {/* Combined Total Balance Card */}
          {combinedBalance && (
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>Total Available Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(combinedBalance.combinedTotal, primaryCurrency)}
              </Text>
              <View style={styles.balanceBreakdown}>
                <Text style={styles.balanceSubtext}>
                  Local ({combinedBalance.localBalance.currency || 'USD'}): {formatCurrency(combinedBalance.localBalance.amount, combinedBalance.localBalance.currency)}
                </Text>
                <Text style={styles.balanceSubtext}>
                  Home ({combinedBalance.homeBalance.currency || 'USD'}): {formatCurrency(combinedBalance.homeBalance.amount, combinedBalance.homeBalance.currency)}
                  {combinedBalance.homeBalance.currency !== primaryCurrency ? (
                    <Text style={styles.balanceSubtext}> ≈ {formatCurrency(combinedBalance.homeBalance.convertedAmount, primaryCurrency)}</Text>
                  ) : null}
                </Text>
              </View>
            </View>
          )}

          {/* Context-Specific Balance Card */}
          {balance && (
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>
                {context === 'local' ? 'Local' : 'Home Country'} Balance
              </Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(balance.totalBalance)}
              </Text>
              {context === 'local' && balance.billchopBalance && balance.billchopBalance > 0 ? (
                <View style={styles.balanceBreakdown}>
                  <Text style={styles.balanceSubtext}>
                    Finance: {formatCurrency(balance.totalBalance - balance.billchopBalance)}
                  </Text>
                  <Text style={styles.balanceSubtext}>
                    Billchop: {formatCurrency(balance.billchopBalance)}
                  </Text>
                  <Text style={styles.balanceTotal}>
                    Total Available: {formatCurrency(balance.totalAvailableBalance)}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.moneyInButton]}
              onPress={() => onAddIncome(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-downward" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Money In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.spentOnButton]}
              onPress={() => onAddExpense(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-upward" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Spent On</Text>
            </TouchableOpacity>
          </View>

          {/* Budgets, Goals & Loans Buttons */}
          <View style={styles.financeActionsContainer}>
            <TouchableOpacity
              style={styles.financeActionButton}
              onPress={() => onViewBudgets(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="account-balance-wallet" size={24} color="#2563EB" />
              <Text style={styles.financeActionButtonText}>Budgets</Text>
              <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.financeActionButton}
              onPress={() => onViewGoals(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="flag" size={24} color="#10B981" />
              <Text style={styles.financeActionButtonText}>Goals</Text>
              <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.financeActionButton}
              onPress={() => onViewLoans(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="account-balance" size={24} color="#F59E0B" />
              <Text style={styles.financeActionButtonText}>Loans</Text>
              <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.financeActionButton}
              onPress={() => onViewAdvisor(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="psychology" size={24} color="#8B5CF6" />
              <Text style={styles.financeActionButtonText}>AI Advisor</Text>
              <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Transactions List */}
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <View style={styles.transactionsHeaderActions}>
              {onViewHistory && (
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => onViewHistory(context)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="history" size={20} color="#2563EB" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => {
                  // TODO: Add filter options (all, income, expense)
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="filter-list" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="receipt-long" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first transaction to start tracking your{' '}
                {context === 'local' ? 'local' : 'home country'} finances!
              </Text>
              <View style={styles.emptyActionButtons}>
                <TouchableOpacity
                  style={[styles.emptyActionButton, styles.emptyMoneyInButton]}
                  onPress={() => onAddIncome(context)}
                >
                  <MaterialIcons name="arrow-downward" size={20} color="#fff" />
                  <Text style={styles.emptyActionButtonText}>Money In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.emptyActionButton, styles.emptySpentOnButton]}
                  onPress={() => onAddExpense(context)}
                >
                  <MaterialIcons name="arrow-upward" size={20} color="#fff" />
                  <Text style={styles.emptyActionButtonText}>Spent On</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionCard}
                activeOpacity={0.7}
                onPress={() => onEditTransaction?.(transaction.id)}
              >
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionIcon,
                        transaction.type === 'income'
                          ? styles.transactionIconIncome
                          : styles.transactionIconExpense,
                      ]}
                    >
                      <MaterialIcons
                        name={transaction.type === 'income' ? 'arrow-downward' : 'arrow-upward'}
                        size={20}
                        color="#fff"
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription} numberOfLines={1}>
                        {transaction.description || 
                         (transaction.type === 'income' 
                           ? transaction.source || 'Income'
                           : transaction.category || 'Expense')}
                      </Text>
                      <View style={styles.transactionMeta}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                          {transaction.type === 'income' && transaction.source && (
                            <Text style={styles.transactionMetaText}>{transaction.source} • </Text>
                          )}
                          {transaction.type === 'expense' && transaction.category && (
                            <Text style={styles.transactionMetaText}>{transaction.category} • </Text>
                          )}
                          {transaction.date && (
                            <Text style={styles.transactionMetaText}>{formatDate(transaction.date)}</Text>
                          )}
                          {transaction.expenseSplit && (
                            <>
                              <Text style={styles.transactionMetaText}> • </Text>
                              <MaterialIcons name="receipt" size={12} color="#6B7280" />
                              <Text style={styles.transactionMetaText}> Billchop</Text>
                            </>
                          )}
                        </View>
                      </View>
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
              </TouchableOpacity>
            ))
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
  balanceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  balanceTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  balanceBreakdown: {
    width: '100%',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  balanceSubtext: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  balanceTotal: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  financeActionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  financeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 56,
  },
  financeActionButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    minHeight: 56,
  },
  moneyInButton: {
    backgroundColor: '#10B981',
  },
  spentOnButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsHeaderActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  historyButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  filterButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 24,
  },
  emptyActionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  emptyActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    minHeight: 44,
  },
  emptyMoneyInButton: {
    backgroundColor: '#10B981',
  },
  emptySpentOnButton: {
    backgroundColor: '#EF4444',
  },
  emptyActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
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
  transactionInfo: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: '600',
  },
  transactionAmountIncome: {
    color: '#10B981',
  },
  transactionAmountExpense: {
    color: '#EF4444',
  },
});
