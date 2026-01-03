import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getExpenses, getBalances, Expense, BalanceInfo } from '../api/expenseApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';

interface ExpenseListScreenProps {
  onCreateExpense: () => void;
  onBack: () => void;
  onViewAnalytics?: () => void;
  onViewBalances?: () => void;
  onViewExpense?: (expenseId: string) => void;
  onViewFriends?: () => void;
  onViewGroups?: () => void;
}

export function ExpenseListScreen({ onCreateExpense, onBack, onViewAnalytics, onViewBalances, onViewExpense, onViewFriends, onViewGroups }: ExpenseListScreenProps) {
  const { token, user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
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
      console.log('[ExpenseListScreen] Loading expenses and balances...');
      const [expensesData, balancesData] = await Promise.all([
        getExpenses(token),
        getBalances(token),
      ]);
      console.log('[ExpenseListScreen] Loaded expenses:', expensesData.length);
      console.log('[ExpenseListScreen] Balance data:', {
        totalOwed: balancesData.totalOwed,
        totalOwedToUser: balancesData.totalOwedToUser,
        netBalance: balancesData.netBalance,
      });
      setExpenses(expensesData);
      setBalances(balancesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billchops');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  function getUserDisplayName(user: Expense['createdByUser']): string {
    if (user.id === user?.id) {
      return 'you';
    }
    return user.profile?.displayName || user.email;
  }
  
  function getUserDisplayNameForSplit(splitUser: { id: string; email: string; profile?: { displayName?: string } }): string {
    if (splitUser.id === user?.id) {
      return 'you';
    }
    return splitUser.profile?.displayName || splitUser.email;
  }


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading billchops...</Text>
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
            <View style={styles.headerRight}>
              {onViewAnalytics && (
                <TouchableOpacity
                  style={styles.analyticsButton}
                  onPress={onViewAnalytics}
                  activeOpacity={0.7}
                >
                  <Text style={styles.analyticsButtonText}>Analytics</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.createButton}
                onPress={onCreateExpense}
                activeOpacity={0.7}
              >
                <Text style={styles.createButtonText}>+ New</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {balances && (
            <TouchableOpacity
              style={styles.balanceCard}
              onPress={onViewBalances}
              activeOpacity={0.7}
            >
              <View style={styles.balanceCardHeader}>
              <Text style={styles.balanceTitle}>Your Balances</Text>
                {onViewBalances && (
                  <Text style={styles.balanceViewAll}>View All →</Text>
                )}
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>You owe:</Text>
                <Text style={[styles.balanceAmount, styles.balanceNegative]}>
                  {formatCurrency(balances.totalOwed)}
                </Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Owed to you:</Text>
                <Text style={[styles.balanceAmount, styles.balancePositive]}>
                  {formatCurrency(balances.totalOwedToUser)}
                </Text>
              </View>
              <View style={[styles.balanceRow, styles.netBalanceRow]}>
                <Text style={styles.balanceLabel}>Net:</Text>
                <Text
                  style={[
                    styles.balanceAmount,
                    balances.netBalance >= 0
                      ? styles.balancePositive
                      : styles.balanceNegative,
                  ]}
                >
                  {formatCurrency(Math.abs(balances.netBalance))}
                  {balances.netBalance >= 0 ? ' owed to you' : ' you owe'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {(onViewFriends || onViewGroups) && (
            <View style={styles.navigationCards}>
              {onViewFriends && (
                <TouchableOpacity
                  style={styles.navCard}
                  onPress={onViewFriends}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="people" size={24} color="#2563EB" />
                  <Text style={styles.navCardText}>Friends</Text>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
              {onViewGroups && (
                <TouchableOpacity
                  style={styles.navCard}
                  onPress={onViewGroups}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="group" size={24} color="#2563EB" />
                  <Text style={styles.navCardText}>Groups</Text>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.sectionTitle}>Recent Billchops</Text>

          {expenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No billchops yet</Text>
              <Text style={styles.emptySubtext}>
                Create your first billchop to get started!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={onCreateExpense}
              >
                <Text style={styles.emptyButtonText}>Chop a bill</Text>
              </TouchableOpacity>
            </View>
          ) : (
            expenses.map((expense) => (
              <TouchableOpacity
                key={expense.id}
                style={styles.expenseCard}
                onPress={() => onViewExpense?.(expense.id)}
                activeOpacity={0.7}
              >
                <View style={styles.expenseHeader}>
                  <View style={styles.expenseHeaderLeft}>
                  <Text style={styles.expenseDescription}>
                    {expense.description}
                  </Text>
                  <Text style={styles.expenseAmount}>
                    {formatCurrency(expense.amount, expense.currency)}
                  </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                </View>
                <Text style={styles.expenseCreator}>
                  Created by {expense.createdByUser.id === user?.id ? 'you' : getUserDisplayName(expense.createdByUser)}
                </Text>
                {expense.receiptUrl && (
                  <View style={styles.receiptContainer}>
                    <Text style={styles.receiptLabel}>📄 Receipt</Text>
                    <Image
                      source={{
                        uri: expense.receiptUrl.startsWith('http')
                          ? expense.receiptUrl
                          : `${getApiBaseUrl()}${expense.receiptUrl}`,
                      }}
                      style={styles.receiptThumbnail}
                      resizeMode="cover"
                    />
                  </View>
                )}
                <View style={styles.splitsContainer}>
                  {expense.splits.map((split) => (
                    <View key={split.id} style={styles.splitRow}>
                      <Text style={styles.splitUser}>
                        {getUserDisplayNameForSplit(split.user)}
                      </Text>
                      <Text
                        style={[
                          styles.splitAmount,
                          split.isPaid && styles.splitPaid,
                        ]}
                      >
                        {formatCurrency(split.amount, expense.currency)}
                        {split.isPaid ? ' ✓' : ''}
                      </Text>
                    </View>
                  ))}
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
    paddingBottom: 24, // lg: 24px
  },
  content: {
    paddingHorizontal: 24, // lg: 24px
    // No paddingTop - SafeAreaView handles top spacing
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // md: 16px
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyticsButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  analyticsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    paddingVertical: 8, // sm: 8px
    paddingHorizontal: 4, // xs: 4px
    minHeight: 44, // Touch target
  },
  backButtonText: {
    fontSize: 16, // Body: 16px
    color: '#2563EB', // Primary Blue
    fontWeight: '500', // Medium
  },
  createButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24, // lg: 24px
  },
  loadingText: {
    marginTop: 16, // md: 16px
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
  },
  errorContainer: {
    padding: 16, // md: 16px
    backgroundColor: '#FEF2F2', // Red-50
    borderRadius: 8, // Button: 8px
    marginBottom: 16, // md: 16px
  },
  errorText: {
    fontSize: 14, // Body: 14px
    color: '#EF4444', // Red-500
    marginBottom: 8, // sm: 8px
  },
  retryButton: {
    backgroundColor: '#EF4444', // Red-500
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  balanceCard: {
    backgroundColor: '#F9FAFB', // Gray-50
    borderRadius: 12, // Card: 12px
    padding: 16, // md: 16px
    marginBottom: 24, // lg: 24px
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // md: 16px
  },
  balanceTitle: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
  },
  balanceViewAll: {
    fontSize: 14, // Body: 14px
    color: '#2563EB', // Primary Blue
    fontWeight: '500', // Medium
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // sm: 8px
  },
  netBalanceRow: {
    marginTop: 8, // sm: 8px
    paddingTop: 8, // sm: 8px
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // Gray-200
  },
  balanceLabel: {
    fontSize: 16, // Body: 16px
    color: '#374151', // Gray-700
  },
  balanceAmount: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
  },
  balancePositive: {
    color: '#10B981', // Green-500 (Success)
  },
  balanceNegative: {
    color: '#EF4444', // Red-500 (Danger)
  },
  navigationCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  navCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navCardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 24, // H2: 24px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    marginBottom: 16, // md: 16px
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32, // xl: 32px
  },
  emptyText: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#374151', // Gray-700
    marginBottom: 8, // sm: 8px
  },
  emptySubtext: {
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
    textAlign: 'center',
    marginBottom: 24, // lg: 24px
  },
  emptyButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 12, // Card: 12px
    padding: 16, // md: 16px
    marginBottom: 16, // md: 16px
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8, // sm: 8px
  },
  expenseHeaderLeft: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 18, // H4: 18px
    fontWeight: '500', // Medium
    color: '#111827', // Gray-900
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
  },
  expenseCreator: {
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
    marginBottom: 12, // md: 12px (3 * 4px)
  },
  splitsContainer: {
    marginTop: 8, // sm: 8px
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4, // xs: 4px
  },
  splitUser: {
    fontSize: 14, // Body: 14px
    color: '#374151', // Gray-700
  },
  splitAmount: {
    fontSize: 16, // Body: 16px
    fontWeight: '500', // Medium
    color: '#374151', // Gray-700
  },
  splitPaid: {
    color: '#10B981', // Green-500 (Success)
  },
  receiptContainer: {
    marginTop: 12, // md: 12px
    marginBottom: 12, // md: 12px
    paddingTop: 12, // md: 12px
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // Gray-200
  },
  receiptLabel: {
    fontSize: 12, // Small: 12px
    color: '#6B7280', // Gray-500
    marginBottom: 8, // sm: 8px
    fontWeight: '500', // Medium
  },
  receiptThumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 8, // Button: 8px
  },
});

