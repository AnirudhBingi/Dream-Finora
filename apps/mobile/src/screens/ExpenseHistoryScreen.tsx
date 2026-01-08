import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getExpenseHistory, ExpenseHistory, getExpenses, Expense, getSettlements, Settlement } from '../api/expenseApi';
import { getRides, Ride } from '../api/rideApi';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { getAvatarUrl } from '../utils/avatar';

interface ExpenseHistoryScreenProps {
  expenseId?: string; // Made optional to support all history view
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

type TransactionType = 'expense' | 'settlement' | 'rideshare' | 'expense_history';

interface UnifiedTransaction {
  id: string;
  type: TransactionType;
  date: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  // Expense fields
  expense?: Expense;
  expenseHistory?: ExpenseHistory;
  // Settlement fields
  settlement?: Settlement;
  // Rideshare fields
  ride?: Ride;
  // Common fields
  description?: string;
  amount?: number;
  currency?: string;
}

export function ExpenseHistoryScreen({ 
  expenseId,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ExpenseHistoryScreenProps) {
  const { token, user } = useAuth();
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<TransactionType | 'all'>('all');

  useEffect(() => {
    loadHistory();
  }, [expenseId, token]);

  async function loadHistory() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      
      if (expenseId) {
        // Load history for specific expense
        const historyData = await getExpenseHistory(token, expenseId);
        const unified: UnifiedTransaction[] = historyData.map(item => ({
          id: item.id,
          type: 'expense_history',
          date: item.createdAt,
          createdAt: item.createdAt,
          user: item.user,
          expenseHistory: item,
          description: item.notes || undefined,
        }));
        setTransactions(unified);
      } else {
        // Load ALL billchop transactions
        // Use Promise.allSettled to handle partial failures gracefully
        const [expensesResult, settlementsResult, ridesResult] = await Promise.allSettled([
          getExpenses(token, 100, 0).catch(err => {
            console.error('[ExpenseHistoryScreen] Failed to load expenses:', err);
            return { expenses: [] };
          }),
          getSettlements(token).catch(err => {
            // Only log if it's not a "no settlements" case
            // "Expense not found" error from backend might mean no settlements exist
            if (err instanceof Error && !err.message.includes('Expense not found')) {
              console.error('[ExpenseHistoryScreen] Failed to load settlements:', err);
            }
            return [];
          }),
          getRides(token).catch(err => {
            console.error('[ExpenseHistoryScreen] Failed to load rides:', err);
            return [];
          }),
        ]);

        const expensesData = expensesResult.status === 'fulfilled' ? expensesResult.value : { expenses: [] };
        const settlementsData = settlementsResult.status === 'fulfilled' ? settlementsResult.value : [];
        const ridesData = ridesResult.status === 'fulfilled' ? ridesResult.value : [];

        const expenses = Array.isArray(expensesData) ? expensesData : expensesData.expenses || [];
        const unified: UnifiedTransaction[] = [];

        // Add expenses
        expenses.forEach((expense) => {
          unified.push({
            id: expense.id,
            type: 'expense',
            date: expense.createdAt,
            createdAt: expense.createdAt,
            user: expense.createdByUser,
            expense,
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency,
          });
        });

        // Add settlements
        settlementsData.forEach((settlement) => {
          unified.push({
            id: settlement.id,
            type: 'settlement',
            date: settlement.settledAt,
            createdAt: settlement.createdAt,
            user: settlement.payer,
            settlement,
            description: settlement.notes || `Settlement: ${settlement.payer.profile?.displayName || settlement.payer.email} paid ${settlement.payee.profile?.displayName || settlement.payee.email}`,
            amount: settlement.amount,
            currency: settlement.currency,
          });
        });

        // Add rideshare expenses
        // Include all rideshares (not just those with expenseId) as they are billchop-related transactions
        ridesData
          .filter(ride => ride.type === 'rideshare')
          .forEach((ride) => {
            unified.push({
              id: ride.id,
              type: 'rideshare',
              date: ride.createdAt,
              createdAt: ride.createdAt,
              user: ride.driver,
              ride,
              description: `Rideshare: ${ride.origin} → ${ride.destination}`,
              amount: ride.totalCost,
              currency: ride.currency,
            });
          });

        // Sort by date (newest first)
        unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(unified);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }).format(date);
  }

  function formatFullDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  function getUserDisplayName(transaction: UnifiedTransaction): string {
    return transaction.user?.profile?.displayName || transaction.user?.email || 'Unknown';
  }

  function getTransactionIcon(type: TransactionType): keyof typeof MaterialIcons.glyphMap {
    switch (type) {
      case 'expense':
        return 'receipt';
      case 'settlement':
        return 'account-balance-wallet';
      case 'rideshare':
        return 'directions-car';
      case 'expense_history':
        return 'history';
      default:
        return 'info';
    }
  }

  function getTransactionColor(type: TransactionType): string {
    switch (type) {
      case 'expense':
        return '#6366F1'; // Indigo
      case 'settlement':
        return '#10B981'; // Green
      case 'rideshare':
        return '#F59E0B'; // Amber
      case 'expense_history':
        return '#6366F1'; // Indigo
      default:
        return '#6B7280'; // Gray
    }
  }

  function getTransactionLabel(type: TransactionType): string {
    switch (type) {
      case 'expense':
        return 'Expense';
      case 'settlement':
        return 'Settlement';
      case 'rideshare':
        return 'Rideshare';
      case 'expense_history':
        return 'History';
      default:
        return 'Transaction';
    }
  }

  function getActionIcon(action: string): keyof typeof MaterialIcons.glyphMap {
    switch (action) {
      case 'created':
        return 'add-circle';
      case 'updated':
        return 'edit';
      case 'deleted':
        return 'delete';
      case 'settled':
        return 'check-circle';
      default:
        return 'info';
    }
  }

  function getActionColor(action: string): string {
    switch (action) {
      case 'created':
        return '#10B981'; // Green
      case 'updated':
        return '#6366F1'; // Indigo
      case 'deleted':
        return '#EF4444'; // Red
      case 'settled':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  }

  function getActionLabel(action: string): string {
    switch (action) {
      case 'created':
        return 'Created';
      case 'updated':
        return 'Updated';
      case 'deleted':
        return 'Deleted';
      case 'settled':
        return 'Settled';
      default:
        return action.charAt(0).toUpperCase() + action.slice(1);
    }
  }

  const filteredTransactions = useMemo(() => {
    if (selectedTab === 'all') return transactions;
    return transactions.filter(t => t.type === selectedTab);
  }, [transactions, selectedTab]);

  const availableTabs = useMemo(() => {
    if (expenseId) {
      // For specific expense, only show history filter
      return ['all', 'expense_history'] as const;
    }
    // For all history, show all transaction types
    const types = new Set(transactions.map(t => t.type));
    const tabs: Array<TransactionType | 'all'> = ['all'];
    // Ensure we always show Expense, Settlement, and Rideshare tabs if they exist
    if (types.has('expense')) tabs.push('expense');
    if (types.has('settlement')) tabs.push('settlement');
    if (types.has('rideshare')) tabs.push('rideshare');
    if (types.has('expense_history')) tabs.push('expense_history');
    return tabs as const;
  }, [transactions, expenseId]);

  function formatChanges(changes: any): Array<{ field: string; before: string; after: string }> {
    if (!changes || typeof changes !== 'object') return [];
    
    if (changes.settlementId) {
      const items: Array<{ field: string; before: string; after: string }> = [];
      if (changes.amount) {
        items.push({
          field: 'Settlement Amount',
          before: '',
          after: `${changes.amount} ${changes.currency || 'USD'}`,
        });
      }
      if (changes.paymentMethod) {
        items.push({
          field: 'Payment Method',
          before: '',
          after: changes.paymentMethod,
        });
      }
      return items;
    }
    
    const changeItems: Array<{ field: string; before: string; after: string }> = [];
    Object.keys(changes).forEach((key) => {
      const change = changes[key];
      if (change && typeof change === 'object' && 'before' in change && 'after' in change) {
        changeItems.push({
          field: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          before: String(change.before || ''),
          after: String(change.after || ''),
        });
      }
    });
    
    return changeItems;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title={expenseId ? "Expense History" : "All Billchop History"}
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title={expenseId ? "Expense History" : "All Billchop History"}
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadHistory}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title={expenseId ? "Expense History" : "All Billchop History"}
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              loadHistory();
            }}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >
        <View style={styles.content}>
          {/* Tab Filters */}
          {!expenseId && availableTabs.length > 1 && (
            <View style={styles.tabSection}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabContainer}
              >
                {availableTabs.map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, selectedTab === tab && styles.tabSelected]}
                    onPress={() => setSelectedTab(tab)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabText, selectedTab === tab && styles.tabTextSelected]}>
                      {tab === 'all' ? 'All' : getTransactionLabel(tab as TransactionType)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {filteredTransactions.length === 0 ? (
            <EmptyState
              icon="history"
              title={selectedTab !== 'all' ? `No ${getTransactionLabel(selectedTab as TransactionType)} transactions` : "No history available"}
              message={selectedTab !== 'all' ? `Try selecting a different filter or check back later.` : "No billchop transactions found."}
            />
          ) : (
            <View style={styles.historyList}>
              {filteredTransactions.map((transaction) => {
                const isCurrentUser = transaction.user?.id === user?.id;
                const iconColor = transaction.type === 'expense_history' 
                  ? getActionColor(transaction.expenseHistory?.action || '')
                  : getTransactionColor(transaction.type);
                const iconName = transaction.type === 'expense_history'
                  ? getActionIcon(transaction.expenseHistory?.action || '')
                  : getTransactionIcon(transaction.type);
                const avatarUrl = getAvatarUrl(transaction.user?.profile?.avatarUrl || null);
                const displayName = getUserDisplayName(transaction);
                const initials = displayName.charAt(0).toUpperCase();

                return (
                  <View key={transaction.id} style={styles.historyCard}>
                    {/* Header with icon and action */}
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
                        <Icon name={iconName} size={20} color={iconColor} />
                      </View>
                      <View style={styles.headerContent}>
                        <View style={styles.headerTop}>
                          <Text style={styles.actionLabel}>
                            {transaction.type === 'expense_history' 
                              ? getActionLabel(transaction.expenseHistory?.action || '')
                              : getTransactionLabel(transaction.type)}
                          </Text>
                          {isCurrentUser && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youBadgeText}>You</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.userInfo}>
                          <View style={styles.userAvatar}>
                            {avatarUrl ? (
                              <Image 
                                source={{ uri: avatarUrl }} 
                                style={styles.avatarImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{initials}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.userText}>
                            {isCurrentUser ? 'You' : displayName}
                          </Text>
                          <Text style={styles.timeText}> • {formatDate(transaction.date)}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Expense Details - More Valuable Information */}
                    {transaction.expense && (
                      <View style={styles.expenseDetailsBox}>
                        <View style={styles.expenseDetailRow}>
                          <Text style={styles.expenseDetailLabel}>Created by:</Text>
                          <Text style={styles.expenseDetailValue}>
                            {transaction.expense.createdByUser?.profile?.displayName || transaction.expense.createdByUser?.email || 'Unknown'}
                          </Text>
                        </View>
                        {transaction.expense.category && (
                          <View style={styles.expenseDetailRow}>
                            <Text style={styles.expenseDetailLabel}>Category:</Text>
                            <Text style={styles.expenseDetailValue}>{transaction.expense.category}</Text>
                          </View>
                        )}
                        {transaction.expense.splits && transaction.expense.splits.length > 0 && (
                          <View style={styles.expenseDetailRow}>
                            <Text style={styles.expenseDetailLabel}>Participants:</Text>
                            <Text style={styles.expenseDetailValue}>
                              {transaction.expense.splits.length} {transaction.expense.splits.length === 1 ? 'person' : 'people'}
                            </Text>
                          </View>
                        )}
                        {transaction.expense.group && (
                          <View style={styles.expenseDetailRow}>
                            <Text style={styles.expenseDetailLabel}>Group:</Text>
                            <Text style={styles.expenseDetailValue}>{transaction.expense.group.name}</Text>
                          </View>
                        )}
                        <View style={styles.expenseAmountRow}>
                          <Text style={styles.expenseAmountLabel}>Amount:</Text>
                          <Text style={styles.expenseAmountValue}>
                            {formatCurrency(transaction.expense.amount, transaction.expense.currency)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Description/Amount for non-expense transactions */}
                    {!transaction.expense && (transaction.description || transaction.amount) && (
                      <View style={styles.descriptionBox}>
                        {transaction.description && (
                          <Text style={styles.descriptionText}>{transaction.description}</Text>
                        )}
                        {transaction.amount && (
                          <Text style={styles.amountText}>
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Notes (for expense history) */}
                    {transaction.expenseHistory?.notes && (
                      <View style={styles.notesBox}>
                        <MaterialIcons name="note" size={16} color="#6366F1" />
                        <Text style={styles.notesText}>{transaction.expenseHistory.notes}</Text>
                      </View>
                    )}

                    {/* Changes (for expense history) */}
                    {transaction.expenseHistory?.changes && (() => {
                      const changeItems = formatChanges(transaction.expenseHistory.changes);
                      if (changeItems.length === 0) return null;
                      return (
                        <View style={styles.changesBox}>
                          <View style={styles.changesHeader}>
                            <MaterialIcons name="edit" size={16} color="#6366F1" />
                            <Text style={styles.changesTitle}>Changes Made</Text>
                          </View>
                          {changeItems.map((change, idx) => (
                            <View key={idx} style={styles.changeRow}>
                              <Text style={styles.changeField}>{change.field}</Text>
                              {change.before ? (
                                <View style={styles.changeValues}>
                                  <View style={styles.changeValueBox}>
                                    <Text style={styles.changeBefore}>{change.before}</Text>
                                  </View>
                                  <MaterialIcons name="arrow-forward" size={16} color="#9CA3AF" />
                                  <View style={[styles.changeValueBox, styles.changeValueBoxNew]}>
                                    <Text style={styles.changeAfter}>{change.after}</Text>
                                  </View>
                                </View>
                              ) : (
                                <View style={[styles.changeValueBox, styles.changeValueBoxNew]}>
                                  <Text style={styles.changeAfter}>{change.after}</Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      );
                    })()}

                    {/* Settlement details */}
                    {transaction.settlement && (
                      <View style={styles.settlementBox}>
                        <View style={styles.settlementRow}>
                          <Text style={styles.settlementLabel}>Payment Method:</Text>
                          <Text style={styles.settlementValue}>{transaction.settlement.paymentMethod}</Text>
                        </View>
                        <View style={styles.settlementRow}>
                          <Text style={styles.settlementLabel}>From:</Text>
                          <Text style={styles.settlementValue}>
                            {transaction.settlement.payer.profile?.displayName || transaction.settlement.payer.email}
                          </Text>
                        </View>
                        <View style={styles.settlementRow}>
                          <Text style={styles.settlementLabel}>To:</Text>
                          <Text style={styles.settlementValue}>
                            {transaction.settlement.payee.profile?.displayName || transaction.settlement.payee.email}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Rideshare details */}
                    {transaction.ride && (
                      <View style={styles.rideshareBox}>
                        <View style={styles.rideshareRow}>
                          <MaterialIcons name="place" size={16} color="#F59E0B" />
                          <Text style={styles.rideshareText}>{transaction.ride.origin}</Text>
                        </View>
                        <MaterialIcons name="arrow-downward" size={16} color="#9CA3AF" style={styles.arrowIcon} />
                        <View style={styles.rideshareRow}>
                          <MaterialIcons name="place" size={16} color="#F59E0B" />
                          <Text style={styles.rideshareText}>{transaction.ride.destination}</Text>
                        </View>
                        {transaction.ride.distance && (
                          <View style={styles.rideshareRow}>
                            <Text style={styles.rideshareLabel}>Distance:</Text>
                            <Text style={styles.rideshareValue}>{transaction.ride.distance.toFixed(1)} miles</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Full date tooltip */}
                    <Text style={styles.fullDate}>{formatFullDate(transaction.date)}</Text>
                  </View>
                );
              })}
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
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
    marginTop: 16,
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
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabSection: {
    marginBottom: 24,
  },
  tabContainer: {
    gap: 12,
    paddingRight: 16,
  },
  tab: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 44,
  },
  tabSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  youBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EEF2FF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  userText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  expenseDetailsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  expenseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expenseDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  expenseDetailValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  expenseAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  expenseAmountLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  expenseAmountValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  descriptionBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 4,
  },
  amountText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  changesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  changesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  changesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  changeRow: {
    marginBottom: 12,
    gap: 8,
  },
  changeField: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  changeValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  changeValueBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  changeValueBoxNew: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  changeBefore: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  changeAfter: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  settlementBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  settlementLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  settlementValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  rideshareBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  rideshareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rideshareText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  rideshareLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  rideshareValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  arrowIcon: {
    marginLeft: 8,
    marginBottom: 4,
  },
  fullDate: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
});

