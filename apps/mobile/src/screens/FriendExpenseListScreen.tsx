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
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getExpenses, Expense, getBalances } from '../api/expenseApi';
import { getFriendChoreStats, FriendChoreStats } from '../api/choreApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonExpenseList } from '../components/SkeletonLoader';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { getAvatarUrl } from '../utils/avatar';

interface FriendExpenseListScreenProps {
  friendId: string;
  friendName: string;
  onBack: () => void;
  onViewExpense: (expenseId: string) => void;
  onCreateChore?: (friendId: string) => void;
  onCreateExpense?: (friendId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function FriendExpenseListScreen({
  friendId,
  friendName,
  onBack,
  onViewExpense,
  onCreateChore,
  onCreateExpense,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: FriendExpenseListScreenProps) {
  const { token, user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<{ owed: number; owedTo: number } | null>(null);
  const [choreStats, setChoreStats] = useState<FriendChoreStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, [token, friendId]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      // Get all expenses and filter for this friend
      const allExpensesData = await getExpenses(token);
      
      // Handle both array response and paginated response
      let allExpenses: Expense[] = [];
      if (Array.isArray(allExpensesData)) {
        allExpenses = allExpensesData;
      } else if (allExpensesData && typeof allExpensesData === 'object') {
        allExpenses = (allExpensesData as any).expenses || [];
      }
      
      // Filter expenses where this friend is involved (either as creator or in splits)
      const friendExpenses = allExpenses.filter(
        (expense) =>
          expense.createdBy === friendId ||
          (expense.splits || []).some((split) => split.userId === friendId)
      );

      setExpenses(friendExpenses);

      // Get balance for this friend
      try {
        const balancesData = await getBalances(token);
        const owedBy = balancesData.owedByUser.find(item => item?.user?.id === friendId);
        const owedTo = balancesData.owedToUser.find(item => item?.user?.id === friendId);
        setBalance({
          owed: Math.round((owedBy?.amount || 0) * 100) / 100,
          owedTo: Math.round((owedTo?.amount || 0) * 100) / 100,
        });
      } catch (err) {
        console.error('Failed to load balance:', err);
      }

      // Get chore stats for this friend
      try {
        const statsData = await getFriendChoreStats(token, friendId);
        setChoreStats(statsData);
      } catch (err) {
        console.error('Failed to load chore stats:', err);
        // Don't fail if stats fail
      }
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Filter and sort expenses
  useEffect(() => {
    let filtered = [...expenses];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus === 'paid') {
      filtered = filtered.filter(expense => {
        const friendSplit = expense.splits.find(split => split.userId === friendId);
        const currentUserSplit = expense.splits.find(split => split.userId === user?.id);
        return (friendSplit?.isPaid && currentUserSplit?.isPaid) || false;
      });
    } else if (filterStatus === 'unpaid') {
      filtered = filtered.filter(expense => {
        const friendSplit = expense.splits.find(split => split.userId === friendId);
        const currentUserSplit = expense.splits.find(split => split.userId === user?.id);
        return (!friendSplit?.isPaid || !currentUserSplit?.isPaid);
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return b.amount - a.amount;
      }
    });

    setFilteredExpenses(filtered);
  }, [expenses, searchQuery, filterStatus, sortBy, friendId, user?.id]);

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  }

  function getUserDisplayName(user: Expense['createdByUser']): string {
    if (user.id === user?.id) {
      return 'you';
    }
    return user.profile?.displayName || user.email;
  }

  function getFriendSplit(expense: Expense) {
    return expense.splits.find((split) => split.userId === friendId);
  }

  function getCurrentUserSplit(expense: Expense) {
    return expense.splits.find((split) => split.userId === user?.id);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title={friendName}
          onBack={onBack}
          rightActions={rightActions}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <SkeletonExpenseList count={5} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error && expenses.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title={friendName}
          onBack={onBack}
          rightActions={rightActions}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={loadData} />
      </SafeAreaView>
    );
  }

  // Prepare right actions for header (create chore/expense)
  const rightActions = (onCreateChore || onCreateExpense) ? (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {onCreateChore && (
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => onCreateChore(friendId)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Create task"
        >
          <MaterialIcons name="task" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      {onCreateExpense && (
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => onCreateExpense(friendId)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Chop a bill"
        >
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  ) : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title={friendName}
        onBack={onBack}
        rightActions={rightActions}
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

          {/* Combined Stats Section - Balance + Chores */}
          {(balance || choreStats) && (
            <View style={styles.combinedStatsSection}>
              {/* Balance Summary - Compact */}
              {balance && (balance.owed > 0 || balance.owedTo > 0) && (
                <View style={styles.compactBalanceCard}>
                  <View style={styles.compactBalanceHeader}>
                    <View style={styles.compactBalanceRow}>
                      <View style={styles.compactBalanceItem}>
                        <Text style={styles.compactBalanceLabel}>You Owe</Text>
                        <Text style={styles.compactBalanceAmountRed}>
                          {formatCurrency(balance.owed || 0)}
                        </Text>
                      </View>
                      <View style={styles.compactBalanceDivider} />
                      <View style={styles.compactBalanceItem}>
                        <Text style={styles.compactBalanceLabel}>You're Owed</Text>
                        <Text style={styles.compactBalanceAmountGreen}>
                          {formatCurrency(balance.owedTo || 0)}
                        </Text>
                      </View>
                    </View>
                    {balance.owedTo - balance.owed !== 0 && (
                      <View style={styles.netBalanceRow}>
                        <Icon 
                          name={(balance.owedTo - balance.owed) > 0 ? "trending-up" : "trending-down"} 
                          size={14} 
                          color={(balance.owedTo - balance.owed) > 0 ? "#10B981" : "#EF4444"} 
                        />
                        <Text style={[styles.netBalanceText, (balance.owedTo - balance.owed) > 0 ? styles.netBalanceTextPositive : styles.netBalanceTextNegative]}>
                          {(balance.owedTo - balance.owed) > 0 ? 'Ahead by' : 'Owe'} {formatCurrency(Math.abs(balance.owedTo - balance.owed))}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Chore Stats Summary - Compact */}
              {choreStats && choreStats.combinedTotalCompleted > 0 && (
                <View style={styles.compactChoreStatsCard}>
                  <View style={styles.compactChoreStatsHeader}>
                    <View style={styles.compactChoreStatsRow}>
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons name="task" size={18} color="#6366F1" />
                        <Text style={styles.compactChoreStatsLabel}>Tasks</Text>
                        <Text style={styles.compactChoreStatsValue}>{choreStats.combinedTotalCompleted}</Text>
                      </View>
                      <View style={styles.compactChoreStatsDivider} />
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons name="stars" size={18} color="#F59E0B" />
                        <Text style={styles.compactChoreStatsLabel}>Points</Text>
                        <Text style={styles.compactChoreStatsValue}>{choreStats.combinedTotalPoints}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Comparison Section - User vs Friend */}
                  <View style={styles.friendComparisonSection}>
                    <Text style={styles.friendComparisonTitle}>Contributions</Text>
                    <View style={styles.friendComparisonList}>
                      {/* User Stats */}
                      <View style={styles.friendComparisonItem}>
                        <View style={styles.friendComparisonInfo}>
                          <Text style={styles.friendComparisonName}>You</Text>
                          <View style={styles.friendComparisonPoints}>
                            <MaterialIcons name="stars" size={14} color="#F59E0B" />
                            <Text style={styles.friendComparisonPointsText}>{choreStats.userStats.totalPoints} pts</Text>
                            <Text style={styles.friendComparisonTasksText}>• {choreStats.userStats.totalCompleted} tasks</Text>
                          </View>
                        </View>
                      </View>
                      
                      {/* Friend Stats */}
                      <View style={styles.friendComparisonItem}>
                        <View style={styles.friendComparisonInfo}>
                          <Text style={styles.friendComparisonName}>{choreStats.friendName}</Text>
                          <View style={styles.friendComparisonPoints}>
                            <MaterialIcons name="stars" size={14} color="#F59E0B" />
                            <Text style={styles.friendComparisonPointsText}>{choreStats.friendStats.totalPoints} pts</Text>
                            <Text style={styles.friendComparisonTasksText}>• {choreStats.friendStats.totalCompleted} tasks</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Search and Filter Section */}
          <View style={styles.filterSection}>
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search expenses..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <MaterialIcons name="close" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.filterToggle}
              onPress={() => setShowFilters(!showFilters)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="filter-list" size={20} color={showFilters ? "#6366F1" : "#6B7280"} />
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={styles.filtersContainer}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Status:</Text>
                <View style={styles.filterChips}>
                  {(['all', 'paid', 'unpaid'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                      onPress={() => setFilterStatus(status)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Sort by:</Text>
                <View style={styles.filterChips}>
                  {(['date', 'amount'] as const).map((sort) => (
                    <TouchableOpacity
                      key={sort}
                      style={[styles.filterChip, sortBy === sort && styles.filterChipActive]}
                      onPress={() => setSortBy(sort)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterChipText, sortBy === sort && styles.filterChipTextActive]}>
                        {sort.charAt(0).toUpperCase() + sort.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {filteredExpenses.length === 0 && expenses.length > 0 ? (
            <EmptyState
              icon="search-off"
              title="No matching expenses"
              message={`No expenses match your search or filter criteria.`}
            />
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon="receipt"
              title="No Expenses"
              message={`No expenses shared with ${friendName} yet.`}
            />
          ) : (
          filteredExpenses.map((expense) => {
            const friendSplit = getFriendSplit(expense);
            const currentUserSplit = getCurrentUserSplit(expense);
            const isCreator = expense.createdBy === user?.id;
            const friendIsCreator = expense.createdBy === friendId;

            return (
              <TouchableOpacity
                key={expense.id}
                style={styles.expenseCard}
                onPress={() => onViewExpense(expense.id)}
                activeOpacity={0.7}
              >
                <View style={styles.expenseHeader}>
                  <View style={styles.expenseHeaderLeft}>
                    <View style={styles.expenseTitleRow}>
                      <Text style={styles.expenseDescription}>
                        {expense.description}
                      </Text>
                      {expense.group && (
                        <View style={styles.groupBadge}>
                          <Avatar
                            avatarUrl={getAvatarUrl(expense.group.avatarUrl || null)}
                            displayName={expense.group.name}
                            size={18}
                          />
                          <Text style={styles.groupBadgeText}>
                            {expense.group.name}
                          </Text>
                        </View>
                      )}
                      {!expense.group && (
                        <View style={styles.individualBadge}>
                          <MaterialIcons name="person" size={14} color="#6B7280" />
                          <Text style={styles.individualBadgeText}>
                            Individual
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.expenseAmount}>
                      {formatCurrency(expense.amount, expense.currency)}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                </View>
                <Text style={styles.expenseCreator}>
                  Created by {isCreator ? 'you' : friendIsCreator ? friendName : getUserDisplayName(expense.createdByUser)}
                </Text>
                <View style={styles.splitsContainer}>
                  {friendSplit && (
                    <View style={styles.splitRow}>
                      <View style={styles.splitUserInfo}>
                        <Avatar
                          avatarUrl={expense.createdByUser?.profile?.avatarUrl}
                          displayName={friendName}
                          size={32}
                        />
                        <Text style={styles.splitUser}>
                          {friendName}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.splitAmount,
                          friendSplit.isPaid && styles.splitPaid,
                        ]}
                      >
                        {formatCurrency(friendSplit.amount, expense.currency)}
                        {friendSplit.isPaid ? ' ✓' : ''}
                      </Text>
                    </View>
                  )}
                  {currentUserSplit && (
                    <View style={styles.splitRow}>
                      <View style={styles.splitUserInfo}>
                        <Avatar
                          avatarUrl={user?.profile?.avatarUrl}
                          displayName={user?.profile?.displayName || user?.email || 'You'}
                          size={32}
                        />
                        <Text style={styles.splitUser}>
                          You
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.splitAmount,
                          currentUserSplit.isPaid && styles.splitPaid,
                        ]}
                      >
                        {formatCurrency(currentUserSplit.amount, expense.currency)}
                        {currentUserSplit.isPaid ? ' ✓' : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
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
  balanceSection: {
    marginBottom: 16,
  },
  combinedStatsSection: {
    marginBottom: 16,
    gap: 12,
  },
  compactBalanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  compactBalanceHeader: {
    gap: 12,
  },
  compactBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  compactBalanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  compactBalanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactBalanceAmountRed: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
  },
  compactBalanceAmountGreen: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  compactBalanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  netBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  netBalanceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  netBalanceTextPositive: {
    color: '#10B981',
  },
  netBalanceTextNegative: {
    color: '#EF4444',
  },
  compactChoreStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  compactChoreStatsHeader: {
    marginBottom: 16,
  },
  compactChoreStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  compactChoreStatsItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  compactChoreStatsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactChoreStatsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  compactChoreStatsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  friendComparisonSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  friendComparisonTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendComparisonList: {
    gap: 12,
  },
  friendComparisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendComparisonInfo: {
    flex: 1,
  },
  friendComparisonName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  friendComparisonPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  friendComparisonPointsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  friendComparisonTasksText: {
    fontSize: 13,
    color: '#6B7280',
  },
  balanceFlowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  netBalanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  netBalanceIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  netBalanceIndicatorPositive: {
    backgroundColor: '#D1FAE5',
  },
  netBalanceIndicatorNegative: {
    backgroundColor: '#FEE2E2',
  },
  netBalanceBannerText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  netBalanceBannerAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  netBalanceBannerAmountPositive: {
    color: '#10B981',
  },
  netBalanceBannerAmountNegative: {
    color: '#EF4444',
  },
  balanceFlowContainer: {
    flexDirection: 'row',
    minHeight: 110,
    position: 'relative',
  },
  balanceFlowSide: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  balanceFlowSideLeft: {
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    backgroundColor: '#FEF2F2',
  },
  balanceFlowSideRight: {
    backgroundColor: '#F0FDF4',
  },
  balanceFlowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  balanceFlowIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  balanceFlowLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceFlowAmountRed: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
  },
  balanceFlowAmountGreen: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  balanceFlowDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
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
  filterSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  filterToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  splitsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  splitUser: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  splitAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  splitPaid: {
    color: '#10B981',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  expenseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
    flex: 1,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  groupBadgeText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  individualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  individualBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  expenseCreator: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  headerActionButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});

