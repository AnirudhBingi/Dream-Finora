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
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getBalances, simplifyDebts, BalanceInfo, SimplifiedDebtsResponse } from '../api/expenseApi';
import { getAvatarUrl } from '../utils/avatar';

interface BalanceSummaryScreenProps {
  onBack: () => void;
  onSettleUp: (payeeId: string, amount: number, payeeName: string) => void;
}

export function BalanceSummaryScreen({ onBack, onSettleUp }: BalanceSummaryScreenProps) {
  const { token } = useAuth();
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebtsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSimplified, setShowSimplified] = useState(false);
  const [loadingSimplified, setLoadingSimplified] = useState(false);

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
      setError(err instanceof Error ? err.message : 'Failed to load balances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSimplifyDebts() {
    if (!token) return;

    try {
      setLoadingSimplified(true);
      const simplified = await simplifyDebts(token);
      setSimplifiedDebts(simplified);
      setShowSimplified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to simplify debts');
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

  const primaryCurrency = balances.primaryCurrency || 'USD';

  function getUserDisplayName(user: BalanceInfo['owedByUser'][0]['user']): string {
    return user.profile?.displayName || user.email;
  }

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
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
            <Text style={styles.headerTitle}>Balances</Text>
            <View style={styles.placeholder} />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Summary Card */}
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

          {/* Simplify Debts Button */}
          {(balances.totalOwed > 0 || balances.totalOwedToUser > 0) && (
            <TouchableOpacity
              style={styles.simplifyButton}
              onPress={handleSimplifyDebts}
              disabled={loadingSimplified}
              activeOpacity={0.7}
            >
              {loadingSimplified ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="account-tree" size={20} color="#fff" />
                  <Text style={styles.simplifyButtonText}>Simplify Debts</Text>
                  {simplifiedDebts && (
                    <Text style={styles.simplifyButtonSubtext}>
                      {simplifiedDebts.originalCount} → {simplifiedDebts.simplifiedCount} transactions
                    </Text>
                  )}
                </>
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
          {balances.owedToUser.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owed to You</Text>
              {balances.owedToUser.map((item, index) => (
                <View key={index} style={styles.personCard}>
                  <View style={styles.personInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getUserDisplayName(item.user).charAt(0).toUpperCase()}
                      </Text>
                    </View>
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
          {balances.owedByUser.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>You Owe</Text>
              {balances.owedByUser.map((item, index) => (
                <View key={index} style={styles.personCard}>
                  <View style={styles.personInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getUserDisplayName(item.user).charAt(0).toUpperCase()}
                      </Text>
                    </View>
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
          {balances.owedToUser.length === 0 && balances.owedByUser.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>All settled up! 🎉</Text>
              <Text style={styles.emptySubtext}>
                You don't owe anyone and no one owes you.
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
    marginTop: 16,
    marginBottom: 24,
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
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  netBalanceRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#374151',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '600',
  },
  amountWithCurrency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currencyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
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
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  simplifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  simplifyButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  simplifiedCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  simplifiedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  simplifiedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
  },
  simplifiedSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  simplifiedDebtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  simplifiedDebtText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  simplifiedDebtAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  personCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  personDetails: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  personAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
  },
  personAmountNegative: {
    color: '#EF4444',
  },
  settleButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  settleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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

