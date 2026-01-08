import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getGroups, Group } from '../api/groupApi';
import { getExpenses, Expense, getBalances, BalanceInfo } from '../api/expenseApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { Header, HeaderOption } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { getAvatarUrl } from '../utils/avatar';

interface BillchopGroupsScreenProps {
  onBack: () => void;
  onViewGroup: (groupId: string) => void;
  onViewExpense: (expenseId: string) => void;
  onCreateCircle?: () => void; // New handler for create circle button
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function BillchopGroupsScreen({
  onBack,
  onViewGroup,
  onViewExpense,
  onCreateCircle,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: BillchopGroupsScreenProps) {
  const { token, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const [groupsData, expensesData, balancesData] = await Promise.all([
        getGroups(token),
        getExpenses(token),
        getBalances(token),
      ]);

      // Handle both array response and paginated response for groups
      let groupsList: Group[] = [];
      if (Array.isArray(groupsData)) {
        groupsList = groupsData;
      } else if (groupsData && typeof groupsData === 'object') {
        groupsList = (groupsData as any).groups || [];
      }
      setGroups(groupsList);

      // Handle both array response and paginated response for expenses
      let expensesList: Expense[] = [];
      if (Array.isArray(expensesData)) {
        expensesList = expensesData;
      } else if (expensesData && typeof expensesData === 'object') {
        expensesList = (expensesData as any).expenses || [];
      }
      // Debug logging
      console.log('[BillchopGroupsScreen] Loaded expenses:', expensesList.length);
      expensesList.forEach(expense => {
        console.log(`[BillchopGroupsScreen] Expense ${expense.id}: groupId=${expense.groupId}, description=${expense.description}`);
      });
      setExpenses(expensesList);
      setBalances(balancesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getGroupBalances(groupId: string): { totalOwed: number; totalOwedToUser: number; balances: Array<{ user: any; amount: number; isOwed: boolean }> } {
    if (!balances) return { totalOwed: 0, totalOwedToUser: 0, balances: [] };
    
    const groupBalances: Array<{ user: any; amount: number; isOwed: boolean }> = [];
    let totalOwed = 0;
    let totalOwedToUser = 0;

    // Get balances from owedByUser (user owes others) for this group
    balances.owedByUser.forEach((item) => {
      const groupBreakdown = item.breakdown?.byGroup?.find(g => g.groupId === groupId);
      if (groupBreakdown && groupBreakdown.amount > 0.01) {
        totalOwed += groupBreakdown.amount;
        groupBalances.push({
          user: item.user,
          amount: groupBreakdown.amount,
          isOwed: false, // User owes this person
        });
      }
    });

    // Get balances from owedToUser (others owe user) for this group
    balances.owedToUser.forEach((item) => {
      const groupBreakdown = item.breakdown?.byGroup?.find(g => g.groupId === groupId);
      if (groupBreakdown && groupBreakdown.amount > 0.01) {
        totalOwedToUser += groupBreakdown.amount;
        groupBalances.push({
          user: item.user,
          amount: groupBreakdown.amount,
          isOwed: true, // This person owes user
        });
      }
    });

    return { totalOwed, totalOwedToUser, balances: groupBalances };
  }

  function getNonGroupBalances(): { totalOwed: number; totalOwedToUser: number; balances: Array<{ user: any; amount: number; isOwed: boolean }> } {
    if (!balances) return { totalOwed: 0, totalOwedToUser: 0, balances: [] };
    
    const nonGroupBalances: Array<{ user: any; amount: number; isOwed: boolean }> = [];
    let totalOwed = 0;
    let totalOwedToUser = 0;

    // Get individual (non-group) balances
    balances.owedByUser.forEach((item) => {
      const individual = item.breakdown?.individual || 0;
      if (individual > 0.01) {
        totalOwed += individual;
        nonGroupBalances.push({
          user: item.user,
          amount: individual,
          isOwed: false,
        });
      }
    });

    balances.owedToUser.forEach((item) => {
      const individual = item.breakdown?.individual || 0;
      if (individual > 0.01) {
        totalOwedToUser += individual;
        nonGroupBalances.push({
          user: item.user,
          amount: individual,
          isOwed: true,
        });
      }
    });

    return { totalOwed, totalOwedToUser, balances: nonGroupBalances };
  }

  function getUserDisplayName(user: any): string {
    return user?.profile?.displayName || user?.email || 'Unknown';
  }

  function getGroupExpenses(groupId: string): Expense[] {
    if (!expenses || !Array.isArray(expenses)) return [];
    const filtered = expenses.filter((expense) => expense.groupId === groupId);
    // Debug logging
    if (filtered.length > 0) {
      console.log(`[BillchopGroupsScreen] Found ${filtered.length} expenses for group ${groupId}:`, filtered.map(e => ({ id: e.id, groupId: e.groupId, description: e.description })));
    }
    return filtered;
  }

  function getGroupTotal(groupId: string): number {
    const groupExpenses = getGroupExpenses(groupId);
    return groupExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter((group) =>
      group.name.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  // Header options for the options menu
  const headerOptions: HeaderOption[] = [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Circles"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading circles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Circles"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
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
          title="Circles"
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
          {/* Create New Circle Button */}
          {onCreateCircle && (
            <TouchableOpacity
              style={styles.createCircleButton}
              onPress={onCreateCircle}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.createCircleButtonText}>Create New Circle</Text>
            </TouchableOpacity>
          )}

          {/* Financial Stats Cards */}
          {groups.length > 0 && balances && (() => {
            // Calculate financial stats across all groups
            let totalNetBalance = 0;
            let totalOwedToUser = 0;
            let totalYouOwe = 0;
            let settledCount = 0;

            groups.forEach((group) => {
              const groupBalances = getGroupBalances(group.id);
              const netBalance = groupBalances.totalOwedToUser - groupBalances.totalOwed;
              totalNetBalance += netBalance;
              totalOwedToUser += groupBalances.totalOwedToUser;
              totalYouOwe += groupBalances.totalOwed;
              if (Math.abs(netBalance) < 0.01) {
                settledCount++;
              }
            });

            // Add non-group balances
            const nonGroupBalances = getNonGroupBalances();
            totalNetBalance += (nonGroupBalances.totalOwedToUser - nonGroupBalances.totalOwed);
            totalOwedToUser += nonGroupBalances.totalOwedToUser;
            totalYouOwe += nonGroupBalances.totalOwed;
            if (Math.abs(nonGroupBalances.totalOwedToUser - nonGroupBalances.totalOwed) < 0.01 && nonGroupBalances.balances.length > 0) {
              settledCount++;
            }

            const primaryCurrency = balances.primaryCurrency || 'USD';

            return (
              <View style={styles.statsContainer}>
                <TouchableOpacity 
                  style={[styles.statCard, styles.statCardActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statValue, styles.statValueActive]}>
                    {formatCurrency(totalNetBalance, primaryCurrency)}
                  </Text>
                  <Text style={[styles.statLabel, styles.statLabelActive]}>
                    Net Balance
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statCard]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statValue, styles.statValuePositive]}>
                    {formatCurrency(totalOwedToUser, primaryCurrency)}
                  </Text>
                  <Text style={styles.statLabel}>
                    Owed to You
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statCard]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statValue, styles.statValueNegative]}>
                    {formatCurrency(totalYouOwe, primaryCurrency)}
                  </Text>
                  <Text style={styles.statLabel}>
                    You Owe
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statCard]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statValue]}>
                    {settledCount}
                  </Text>
                  <Text style={styles.statLabel}>
                    Settled
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* Search Bar */}
          {groups.length > 0 && (
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search circles..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          )}

        {/* Circles */}
        {filteredGroups && Array.isArray(filteredGroups) && filteredGroups.length > 0 && filteredGroups.map((group) => {
          const groupBalances = getGroupBalances(group.id);
          const netBalance = groupBalances.totalOwedToUser - groupBalances.totalOwed;
          const groupExpenses = getGroupExpenses(group.id);
          const groupTotal = getGroupTotal(group.id);
          const recentExpenses = groupExpenses
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 2);
          const memberCount = group.members?.length || 0;

          return (
            <View key={group.id} style={styles.groupCard}>
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => onViewGroup(group.id)}
                activeOpacity={0.7}
              >
                <Avatar
                  avatarUrl={getAvatarUrl(group.avatarUrl || null)}
                  displayName={group.name}
                  size={48}
                />
                <View style={styles.groupHeaderContent}>
                  <View style={styles.groupNameRow}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    {groupTotal > 0 && (
                      <Text style={styles.totalExpensesText}>
                        {formatCurrency(groupTotal)}
                      </Text>
                    )}
                  </View>
                  
                  {/* Balance */}
                  {Math.abs(netBalance) > 0.01 && (
                    <Text style={[styles.groupBalance, netBalance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
                      {netBalance >= 0 ? 'you are owed' : 'you owe'} {formatCurrency(Math.abs(netBalance))}
                    </Text>
                  )}
                  {Math.abs(netBalance) < 0.01 && groupExpenses.length > 0 && (
                    <Text style={styles.groupBalance}>All settled up</Text>
                  )}
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Member Avatars Preview */}
              {(() => {
                // Get all members from the group - current user should already be in the list
                const allMembers = [...(group.members || [])];
                
                // Debug: Log members to verify current user is included
                if (user && allMembers.length > 0) {
                  const currentUserFound = allMembers.find(m => {
                    const memberUserId = String(m.userId || m.user?.id || '');
                    const currentUserId = String(user.id || '');
                    return memberUserId === currentUserId && memberUserId !== '';
                  });
                  if (!currentUserFound) {
                    console.log('[BillchopGroupsScreen] Current user NOT found in members!', {
                      currentUserId: user.id,
                      memberIds: allMembers.map(m => ({ userId: m.userId, userid: m.user?.id })),
                      groupId: group.id,
                      groupName: group.name,
                    });
                  }
                }
                
                if (allMembers.length === 0) return null;
                
                return (
                  <View style={styles.membersContainer}>
                    <Text style={styles.membersLabel}>Members</Text>
                    <View style={styles.membersAvatars}>
                      {allMembers.slice(0, 6).map((member, index) => {
                        const memberUserId = String(member.userId || member.user?.id || '');
                        const currentUserId = String(user?.id || '');
                        const isCurrentUser = memberUserId === currentUserId && memberUserId !== '';
                        
                        // Use getAvatarUrl utility to properly format avatar URL (same as ProfileScreen)
                        const avatarUrl = getAvatarUrl(member.user?.profile?.avatarUrl || null);
                        const displayName = member.user?.profile?.displayName || member.user?.email || 'Unknown';
                        
                        return (
                          <View key={member.id || `member-${memberUserId}-${index}`} style={styles.memberAvatar}>
                            {avatarUrl ? (
                              <Image 
                                source={{ uri: avatarUrl }} 
                                style={styles.memberAvatarImage}
                                resizeMode="cover"
                                onError={(e) => {
                                  console.log('[BillchopGroupsScreen] Avatar load error for member:', {
                                    memberUserId,
                                    isCurrentUser,
                                    avatarUrl,
                                    error: e.nativeEvent.error,
                                  });
                                }}
                              />
                            ) : (
                              <View style={styles.memberAvatarPlaceholder}>
                                <Text style={styles.memberAvatarText}>
                                  {displayName.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                      {allMembers.length > 6 && (
                        <View style={[styles.memberAvatar, styles.memberAvatarMore]}>
                          <Text style={styles.memberAvatarMoreText}>+{allMembers.length - 6}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}

              {/* Recent Expenses */}
              {recentExpenses.length > 0 && (
                <View style={styles.recentExpensesContainer}>
                  <Text style={styles.recentExpensesLabel}>Recent expenses</Text>
                  {recentExpenses.map((expense) => (
                    <TouchableOpacity
                      key={expense.id}
                      style={styles.recentExpenseItem}
                      onPress={() => onViewExpense(expense.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.recentExpenseInfo}>
                        <Text style={styles.recentExpenseDescription} numberOfLines={1}>
                          {expense.description}
                        </Text>
                        <Text style={styles.recentExpenseDate}>
                          {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={styles.recentExpenseAmount}>
                        {formatCurrency(expense.amount, expense.currency)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Individual balances within group */}
              {groupBalances.balances.length > 0 && (
                <View style={styles.balancesList}>
                  {groupBalances.balances.slice(0, 3).map((balance, index) => (
                    <View key={index} style={styles.balanceItem}>
                      <Text style={[styles.balanceItemText, balance.isOwed ? styles.balanceItemPositive : styles.balanceItemNegative]}>
                        {balance.isOwed 
                          ? `${getUserDisplayName(balance.user) || 'Unknown'} owes you ${formatCurrency(balance.amount || 0)}`
                          : `You owe ${getUserDisplayName(balance.user) || 'Unknown'} ${formatCurrency(balance.amount || 0)}`}
                      </Text>
                    </View>
                  ))}
                  {groupBalances.balances.length > 3 && (
                    <Text style={styles.moreBalancesText}>
                      {`Plus ${groupBalances.balances.length - 3} more ${groupBalances.balances.length - 3 !== 1 ? 'balances' : 'balance'}`}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Non-group expenses section */}
        {(() => {
          const nonGroupBalances = getNonGroupBalances();
          const netBalance = nonGroupBalances.totalOwedToUser - nonGroupBalances.totalOwed;
          if (nonGroupBalances.balances.length === 0) return null;

          return (
            <View style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={styles.groupIconContainer}>
                  <MaterialIcons name="receipt" size={24} color="#10B981" />
                </View>
                <View style={styles.groupHeaderContent}>
                  <Text style={styles.groupName}>Non-circle expenses</Text>
                  <Text style={[styles.groupBalance, netBalance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
                    {netBalance >= 0 ? 'you are owed' : 'you owe'} {formatCurrency(Math.abs(netBalance))}
                  </Text>
                </View>
              </View>

              {/* Individual balances for non-group */}
              <View style={styles.balancesList}>
                {nonGroupBalances.balances.slice(0, 3).map((balance, index) => (
                  <View key={index} style={styles.balanceItem}>
                    <Text style={[styles.balanceItemText, balance.isOwed ? styles.balanceItemPositive : styles.balanceItemNegative]}>
                      {balance.isOwed 
                        ? `${getUserDisplayName(balance.user) || 'Unknown'} owes you ${formatCurrency(balance.amount || 0)}`
                        : `You owe ${getUserDisplayName(balance.user) || 'Unknown'} ${formatCurrency(balance.amount || 0)}`}
                    </Text>
                  </View>
                ))}
                {nonGroupBalances.balances.length > 3 && (
                  <Text style={styles.moreBalancesText}>
                    {`Plus ${nonGroupBalances.balances.length - 3} more ${nonGroupBalances.balances.length - 3 !== 1 ? 'balances' : 'balance'}`}
                  </Text>
                )}
              </View>
            </View>
          );
        })()}

          {/* Empty state if no groups and no balances */}
          {filteredGroups.length === 0 && searchQuery ? (
            <EmptyState
              icon="search"
              title="No circles found"
              message="Try adjusting your search query."
            />
          ) : filteredGroups.length === 0 && (!balances || (balances.owedByUser.length === 0 && balances.owedToUser.length === 0)) ? (
            <EmptyState
              icon="group"
              title="No Circles Yet"
              message="Create a circle to start splitting expenses with multiple people."
              actionLabel={onCreateCircle ? "Create Circle" : undefined}
              onAction={onCreateCircle}
            />
          ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
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
  statCardActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statValueActive: {
    color: '#6366F1',
  },
  statValuePositive: {
    color: '#10B981',
  },
  statValueNegative: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  statLabelActive: {
    color: '#6366F1',
    fontWeight: '600',
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
    backgroundColor: '#6366F1',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
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
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  summaryPositive: {
    color: '#10B981',
  },
  summaryNegative: {
    color: '#EF4444',
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
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
  groupIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  groupHeaderContent: {
    flex: 1,
  },
  groupBalance: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  balancePositive: {
    color: '#10B981',
  },
  balanceNegative: {
    color: '#F59E0B',
  },
  balancesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  balanceItem: {
    paddingVertical: 8,
  },
  balanceItemText: {
    fontSize: 14,
    lineHeight: 20,
  },
  balanceItemPositive: {
    color: '#10B981',
  },
  balanceItemNegative: {
    color: '#F59E0B',
  },
  moreBalancesText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  groupSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupDetails: {
    flex: 1,
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
    flex: 1,
  },
  totalExpensesText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: -0.2,
  },
  membersContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 4,
  },
  membersLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  membersAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    alignSelf: 'flex-start',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  memberAvatarMore: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarMoreText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  recentExpensesContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  recentExpensesLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentExpenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 6,
  },
  recentExpenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  recentExpenseDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  recentExpenseDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  recentExpenseAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  groupMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  expensesList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  expenseItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseItemDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  expenseItemDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  expenseItemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  createCircleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  createCircleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
    marginRight: 4,
  },
});

