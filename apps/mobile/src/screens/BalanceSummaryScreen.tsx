import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getBalances, simplifyDebts, BalanceInfo, SimplifiedDebtsResponse } from '../api/expenseApi';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { Avatar } from '../components/Avatar';

interface BalanceSummaryScreenProps {
  onBack: () => void;
  onSettleUp: (payeeId: string, amount: number, payeeName: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function BalanceSummaryScreen({ 
  onBack, 
  onSettleUp,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: BalanceSummaryScreenProps) {
  const { token } = useAuth();
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebtsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSimplified, setShowSimplified] = useState(false);
  const [loadingSimplified, setLoadingSimplified] = useState(false);
  const [sortBy, setSortBy] = useState<'amount' | 'name'>('amount');
  const [showSortOptions, setShowSortOptions] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const balancesData = await getBalances(token);
      setBalances(balancesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load balances';
      console.error('[BalanceSummaryScreen] Load balances error:', err);
      
      // Handle specific error cases
      if (errorMessage.includes('Expense not found') || errorMessage.includes('expense not found')) {
        setError('Some expense data is missing or corrupted. Please contact support if this issue persists.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSimplifyDebts() {
    if (!token) return;

    try {
      setLoadingSimplified(true);
      setError(null);
      
      // First, refresh balances to ensure we have the latest data
      const balancesData = await getBalances(token);
      setBalances(balancesData);
      
      // Check if there are any balances to simplify
      if (!balancesData || (balancesData.totalOwed === 0 && balancesData.totalOwedToUser === 0)) {
        setError('No debts to simplify. All balances are settled.');
        return;
      }
      
      const simplified = await simplifyDebts(token);
      
      // Validate the response
      if (!simplified || !simplified.simplifiedDebts) {
        throw new Error('Invalid response from server');
      }
      
      // Check if there are any simplified debts
      if (!simplified.simplifiedDebts || simplified.simplifiedDebts.length === 0) {
        setError('No debts can be simplified at this time.');
        return;
      }
      
      // Check if all users are present in the response
      const hasMissingUsers = simplified.simplifiedDebts.some(
        debt => !debt.fromUser || !debt.toUser
      );
      
      if (hasMissingUsers) {
        throw new Error('Some users are not available in the simplified debt calculation');
      }
      
      setSimplifiedDebts(simplified);
      setShowSimplified(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to simplify debts';
      // Only log to console, don't show toast (error banner is already displayed)
      if (__DEV__) {
        console.error('[BalanceSummaryScreen] Simplify debts error:', err);
      }
      
      // Check for various error types - prioritize Expense not found
      if (errorMessage.includes('Expense not found') || 
          errorMessage.includes('expense not found')) {
        setError('Unable to simplify debts. Some expense data is missing or corrupted. Please refresh the page. If the issue persists, some expenses may need to be cleaned up.');
      } else if (errorMessage.includes('User not found') || 
          errorMessage.includes('not available') ||
          errorMessage.includes('Invalid response')) {
        setError('Unable to simplify debts. Some users may not be available. Please refresh and try again.');
      } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        setError('Your session has expired. Please log in again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(`Failed to simplify debts: ${errorMessage}`);
      }
      setShowSimplified(false);
    } finally {
      setLoadingSimplified(false);
    }
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  const primaryCurrency = balances?.primaryCurrency || 'USD';

  function getUserDisplayName(user: BalanceInfo['owedByUser'][0]['user']): string {
    return user.profile?.displayName || user.email;
  }

  // Sort balances
  const sortedOwedToUser = useMemo(() => {
    if (!balances) return [];
    const sorted = [...balances.owedToUser];
    if (sortBy === 'amount') {
      return sorted.sort((a, b) => b.amount - a.amount);
    } else {
      return sorted.sort((a, b) => {
        const nameA = getUserDisplayName(a.user).toLowerCase();
        const nameB = getUserDisplayName(b.user).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
  }, [balances?.owedToUser, sortBy]);

  const sortedOwedByUser = useMemo(() => {
    if (!balances) return [];
    const sorted = [...balances.owedByUser];
    if (sortBy === 'amount') {
      return sorted.sort((a, b) => b.amount - a.amount);
    } else {
      return sorted.sort((a, b) => {
        const nameA = getUserDisplayName(a.user).toLowerCase();
        const nameB = getUserDisplayName(b.user).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
  }, [balances?.owedByUser, sortBy]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading balances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!balances) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No balance data available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Balances"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        rightAction={
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortOptions(!showSortOptions)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="sort" size={24} color="#6366F1" />
          </TouchableOpacity>
        }
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

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sort Options */}
          {showSortOptions && (
            <View style={styles.sortOptionsContainer}>
              <Text style={styles.sortOptionsTitle}>Sort by</Text>
              <View style={styles.sortOptionsRow}>
                {(['amount', 'name'] as const).map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    style={[styles.sortOption, sortBy === sort && styles.sortOptionActive]}
                    onPress={() => {
                      setSortBy(sort);
                      setShowSortOptions(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortOptionText, sortBy === sort && styles.sortOptionTextActive]}>
                      {sort === 'amount' ? 'Amount' : 'Name'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Summary Card */}
          {balances && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Your Balances</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>You owe:</Text>
                <View style={styles.amountWithCurrency}>
                  <Text style={[styles.summaryAmount, styles.summaryNegative]}>
                    {formatCurrency(balances.totalOwed, primaryCurrency)}
                  </Text>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>{primaryCurrency}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Owed to you:</Text>
                <View style={styles.amountWithCurrency}>
                  <Text style={[styles.summaryAmount, styles.summaryPositive]}>
                    {formatCurrency(balances.totalOwedToUser, primaryCurrency)}
                  </Text>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>{primaryCurrency}</Text>
                  </View>
                </View>
              </View>
              
              <View style={[styles.summaryRow, styles.netBalanceRow]}>
                <Text style={styles.summaryLabel}>Net balance:</Text>
                <View style={styles.amountWithCurrency}>
                  <Text
                    style={[
                      styles.summaryAmount,
                      balances.netBalance >= 0
                        ? styles.summaryPositive
                        : styles.summaryNegative,
                    ]}
                  >
                    {formatCurrency(Math.abs(balances.netBalance), primaryCurrency)}
                    {balances.netBalance >= 0 ? ' owed to you' : ' you owe'}
                  </Text>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>{primaryCurrency}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Simplify Debts Button */}
          {balances && (balances.totalOwed > 0 || balances.totalOwedToUser > 0) && (
            <TouchableOpacity
              style={styles.simplifyButton}
              onPress={handleSimplifyDebts}
              disabled={loadingSimplified}
              activeOpacity={0.7}
            >
              {loadingSimplified ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.simplifyButtonContent}>
                  <MaterialIcons name="account-tree" size={18} color="#fff" />
                  <View style={styles.simplifyButtonTextContainer}>
                    <Text style={styles.simplifyButtonText}>Simplify Debts</Text>
                    {simplifiedDebts && (
                      <Text style={styles.simplifyButtonSubtext}>
                        {simplifiedDebts.originalCount} → {simplifiedDebts.simplifiedCount} transactions
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Simplified Debts View */}
          {showSimplified && simplifiedDebts && simplifiedDebts.simplifiedDebts.length > 0 && (
            <View style={styles.simplifiedCard}>
              <View style={styles.simplifiedHeader}>
                <Text style={styles.simplifiedTitle}>Simplified Debts</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowSimplified(false)}
                >
                  <MaterialIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.simplifiedSubtext}>
                This reduces {simplifiedDebts.originalCount} transactions to {simplifiedDebts.simplifiedCount}
              </Text>
              {simplifiedDebts.simplifiedDebts.map((debt, index) => (
                <View key={index} style={styles.simplifiedDebtRow}>
                  <Text style={styles.simplifiedDebtText}>
                    {getUserDisplayName(debt.fromUser)} → {getUserDisplayName(debt.toUser)}
                  </Text>
                  <Text style={styles.simplifiedDebtAmount}>
                    {formatCurrency(debt.amount, primaryCurrency)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Owed to You Section */}
          {balances && sortedOwedToUser.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owed to You</Text>
              {sortedOwedToUser.map((item, index) => (
                <View key={index} style={styles.personCard}>
                  <View style={styles.personInfo}>
                    <Avatar
                      avatarUrl={item.user?.profile?.avatarUrl}
                      displayName={getUserDisplayName(item.user)}
                      size={40}
                    />
                    <View style={styles.personDetails}>
                      <Text style={styles.personName}>
                        {getUserDisplayName(item.user)}
                      </Text>
                      <Text style={styles.personAmount}>
                        {formatCurrency(item.amount, primaryCurrency)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() => onSettleUp(item?.user?.id || '', item.amount, getUserDisplayName(item.user))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.settleButtonText}>Settle Up</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* You Owe Section */}
          {balances && sortedOwedByUser.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>You Owe</Text>
              {sortedOwedByUser.map((item, index) => (
                <View key={index} style={styles.personCard}>
                  <View style={styles.personInfo}>
                    <Avatar
                      avatarUrl={item.user?.profile?.avatarUrl}
                      displayName={getUserDisplayName(item.user)}
                      size={40}
                    />
                    <View style={styles.personDetails}>
                      <Text style={styles.personName}>
                        {getUserDisplayName(item.user)}
                      </Text>
                      <Text style={[styles.personAmount, styles.personAmountNegative]}>
                        {formatCurrency(item.amount, primaryCurrency)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() => onSettleUp(item?.user?.id || '', item.amount, getUserDisplayName(item.user))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.settleButtonText}>Settle Up</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {balances && balances.owedToUser.length === 0 && balances.owedByUser.length === 0 && (
            <EmptyState
              icon="check-circle"
              title="All settled up! 🎉"
              message="You don't owe anyone and no one owes you. Keep up the great work!"
            />
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sortButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortOptionsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sortOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  sortOptionActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  sortOptionTextActive: {
    color: '#FFFFFF',
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  netBalanceRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountWithCurrency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currencyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  summaryPositive: {
    color: '#10B981',
  },
  summaryNegative: {
    color: '#EF4444',
  },
  simplifyButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 44,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  simplifyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  simplifyButtonTextContainer: {
    flex: 1,
  },
  simplifyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  simplifyButtonSubtext: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.9,
    marginTop: 2,
  },
  simplifiedCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  simplifiedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  simplifiedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  closeButton: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
  },
  simplifiedSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  simplifiedDebtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  simplifiedDebtText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  simplifiedDebtAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  personCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  personDetails: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  personAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: -0.3,
  },
  personAmountNegative: {
    color: '#EF4444',
  },
  settleButton: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

