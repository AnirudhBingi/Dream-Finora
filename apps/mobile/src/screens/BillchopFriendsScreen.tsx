import React, { useEffect, useState, useMemo, useRef } from 'react';
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
import { getFriends } from '../api/friendApi';
import { getBalances, BalanceInfo, getExpenses, Expense } from '../api/expenseApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { Header, HeaderOption } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';

interface BillchopFriendsScreenProps {
  onBack: () => void;
  onViewFriendExpenses: (friendId: string, friendName: string) => void;
  onSettleUp?: (payeeId: string, amount: number, payeeName: string) => void;
  onAddNewFriends?: () => void; // New handler for add friends button
  onMessageFriend?: (friendId: string, friendName: string) => void; // New handler for messaging
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function BillchopFriendsScreen({ 
  onBack, 
  onViewFriendExpenses,
  onSettleUp,
  onAddNewFriends,
  onMessageFriend,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: BillchopFriendsScreenProps) {
  const { token, user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'owe-you' | 'you-owe' | 'settled'>('all');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      
      const [friendsData, balancesData, expensesData] = await Promise.all([
        getFriends(token),
        fetch(`${getApiBaseUrl()}/expenses/balances`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).then(res => res.json()),
        getExpenses(token, 100, 0),
      ]);

      setFriends(friendsData);
      setBalances(balancesData);
      
      // Handle both array and paginated response
      if (Array.isArray(expensesData)) {
        setExpenses(expensesData);
      } else {
        setExpenses((expensesData as any).expenses || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getUserDisplayName(friend: any): string {
    return friend.friend?.profile?.displayName || friend.friend?.email || 'Unknown';
  }


  function getBalanceForFriend(friendId: string): { 
    owed: number; 
    owedTo: number; 
    breakdown: { 
      owed: { byGroup?: Array<{ groupId: string; groupName: string; amount: number }>; rideshare?: number; individual?: number }; 
      owedTo: { byGroup?: Array<{ groupId: string; groupName: string; amount: number }>; rideshare?: number; individual?: number } 
    } 
  } {
    if (!balances || !friendId) return { 
      owed: 0, 
      owedTo: 0, 
      breakdown: { 
        owed: {}, 
        owedTo: {} 
      } 
    };

    // Find balance entries that match this friend's user ID
    const owedBy = balances.owedByUser.find(item => {
      const userId = item?.user?.id;
      return userId && userId === friendId;
    });
    const owedTo = balances.owedToUser.find(item => {
      const userId = item?.user?.id;
      return userId && userId === friendId;
    });

    // Round amounts to 2 decimal places
    const result = {
      owed: Math.round((owedBy?.amount || 0) * 100) / 100,
      owedTo: Math.round((owedTo?.amount || 0) * 100) / 100,
      breakdown: {
        owed: owedBy?.breakdown || {},
        owedTo: owedTo?.breakdown || {},
      },
    };

    // Debug logging
    if (result.owed !== 0 || result.owedTo !== 0) {
      const user = owedBy?.user || owedTo?.user;
      const friendName = user?.profile?.displayName || user?.email || 'Unknown';
      console.log('[BillchopFriendsScreen] Balance for friend:', {
        friendId,
        friendName,
        owed: result.owed,
        owedTo: result.owedTo,
        netBalance: result.owedTo - result.owed,
        breakdown: result.breakdown,
      });
    }

    return result;
  }

  const filteredFriends = useMemo(() => {
    let result = friends;
    
    // Apply filter
    if (filter !== 'all') {
      result = result.filter(friend => {
        const friendUserId = friend?.friend?.id || friend?.friendId || '';
        const balance = getBalanceForFriend(friendUserId);
        const netBalance = balance.owedTo - balance.owed;
        
        if (filter === 'owe-you') return netBalance > 0.01;
        if (filter === 'you-owe') return netBalance < -0.01;
        if (filter === 'settled') return Math.abs(netBalance) < 0.01;
        return true;
      });
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(friend => {
        const name = getUserDisplayName(friend).toLowerCase();
        return name.includes(query);
      });
    }
    
    return result;
  }, [friends, searchQuery, filter]);

  // Get recent expenses for a friend (last 2)
  function getRecentExpensesForFriend(friendId: string): Expense[] {
    if (!expenses || !Array.isArray(expenses)) return [];
    return expenses
      .filter(expense => {
        // Check if friend is in splits
        return expense.splits?.some(split => split.userId === friendId) || 
               expense.paidBy === friendId ||
               expense.createdBy === friendId;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 2);
  }

  // Calculate financial stats
  const financialStats = useMemo(() => {
    const friendsList = Array.isArray(friends) ? friends : [];
    if (!balances) {
      return { 
        totalOwedToYou: 0, 
        totalYouOwe: 0, 
        netBalance: 0,
        unsettledCount: 0 
      };
    }
    
    let totalOwedToYou = 0;
    let totalYouOwe = 0;
    let unsettledCount = 0;
    
    friendsList.forEach(friend => {
      const friendUserId = friend?.friend?.id || friend?.friendId || '';
      const balance = getBalanceForFriend(friendUserId);
      const netBalance = balance.owedTo - balance.owed;
      
      if (netBalance > 0.01) {
        totalOwedToYou += netBalance;
        unsettledCount++;
      } else if (netBalance < -0.01) {
        totalYouOwe += Math.abs(netBalance);
        unsettledCount++;
      }
    });
    
    return { 
      totalOwedToYou, 
      totalYouOwe, 
      netBalance: totalOwedToYou - totalYouOwe,
      unsettledCount 
    };
  }, [friends, balances]);

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  // Header options for the options menu
  const headerOptions: HeaderOption[] = [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Friends & Balances"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Friends & Balances"
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
        title="Friends & Balances"
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
          {/* Add New Friends Button */}
          {onAddNewFriends && (
            <TouchableOpacity
              style={styles.addNewFriendsButton}
              onPress={onAddNewFriends}
              activeOpacity={0.8}
            >
              <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.addNewFriendsButtonText}>Add New Friends</Text>
            </TouchableOpacity>
          )}

          {/* Financial Stats Cards */}
          {friends.length > 0 && balances && (
            <View style={styles.statsContainer}>
              <TouchableOpacity 
                style={[styles.statCard, filter === 'all' && styles.statCardActive]}
                onPress={() => setFilter('all')}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, filter === 'all' && styles.statValueActive]}>
                  {formatCurrency(financialStats.netBalance, balances.currency || 'USD')}
                </Text>
                <Text style={[styles.statLabel, filter === 'all' && styles.statLabelActive]}>
                  Net Balance
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statCard, filter === 'owe-you' && styles.statCardActive]}
                onPress={() => setFilter('owe-you')}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, styles.statValuePositive, filter === 'owe-you' && styles.statValueActive]}>
                  {formatCurrency(financialStats.totalOwedToYou, balances.currency || 'USD')}
                </Text>
                <Text style={[styles.statLabel, filter === 'owe-you' && styles.statLabelActive]}>
                  Owed to You
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statCard, filter === 'you-owe' && styles.statCardActive]}
                onPress={() => setFilter('you-owe')}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, styles.statValueNegative, filter === 'you-owe' && styles.statValueActive]}>
                  {formatCurrency(financialStats.totalYouOwe, balances.currency || 'USD')}
                </Text>
                <Text style={[styles.statLabel, filter === 'you-owe' && styles.statLabelActive]}>
                  You Owe
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statCard, filter === 'settled' && styles.statCardActive]}
                onPress={() => setFilter('settled')}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, filter === 'settled' && styles.statValueActive]}>
                  {friends.length - financialStats.unsettledCount}
                </Text>
                <Text style={[styles.statLabel, filter === 'settled' && styles.statLabelActive]}>
                  Settled
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar */}
          {friends.length > 0 && (
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#6B7280" />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search friends..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => {
                  setSearchQuery('');
                  searchInputRef.current?.blur();
                }}>
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {filteredFriends.length === 0 ? (
            <EmptyState
              icon={searchQuery ? "search" : "people"}
              title={searchQuery ? "No friends found" : "No Friends Yet"}
              message={searchQuery ? "Try adjusting your search query." : "Add friends to start splitting expenses with them."}
              actionLabel={!searchQuery && onAddNewFriends ? "Add Friends" : undefined}
              onAction={!searchQuery && onAddNewFriends ? onAddNewFriends : undefined}
            />
          ) : (
            filteredFriends.map((friend) => {
            const friendName = getUserDisplayName(friend);
            // Get the actual friend user ID (not the friendship ID)
            const friendUserId = friend?.friend?.id || friend?.friendId || '';
            const balance = getBalanceForFriend(friendUserId);
            const netBalance = balance.owedTo - balance.owed;

            return (
              <TouchableOpacity
                key={friend?.id}
                style={styles.friendCard}
                onPress={() => onViewFriendExpenses(friendUserId, friendName)}
                activeOpacity={0.7}
              >
                {/* Top row with name and action buttons */}
                <View style={styles.cardHeader}>
                  <Text style={styles.friendName}>{friendName}</Text>
                  <View style={styles.cardActions}>
                    {onMessageFriend && (
                      <TouchableOpacity
                        style={styles.messageButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          onMessageFriend(friendUserId, friendName);
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="chat" size={18} color="#6366F1" />
                      </TouchableOpacity>
                    )}
                    {onSettleUp && netBalance !== 0 && (
                      <TouchableOpacity
                        style={styles.settleButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          const settleAmount = Math.abs(netBalance);
                          onSettleUp(friendUserId, settleAmount, friendName);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.settleButtonText}>Settle</Text>
                      </TouchableOpacity>
                    )}
                    <Icon name="chevron-right" size={20} color="#9CA3AF" />
                  </View>
                </View>

                {/* Main content */}
                <View style={styles.friendInfo}>
                  <Avatar
                    avatarUrl={friend?.friend?.profile?.avatarUrl}
                    displayName={friendName}
                    size={48}
                  />
                  <View style={styles.friendDetails}>
                    {/* Balance Status */}
                    {netBalance !== 0 ? (
                      <View style={styles.balanceRow}>
                        <Icon 
                          name={netBalance > 0 ? "arrow-down" : "arrow-up"} 
                          size={14} 
                          color={netBalance > 0 ? "#10B981" : "#EF4444"} 
                        />
                        <Text
                          style={[
                            styles.balanceText,
                            netBalance > 0 ? styles.positiveBalance : styles.negativeBalance,
                          ]}
                        >
                          {netBalance > 0
                            ? `Owes you ${formatCurrency(Math.abs(netBalance), balances?.currency || 'USD')}`
                            : `You owe ${formatCurrency(Math.abs(netBalance), balances?.currency || 'USD')}`}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.settledText}>Settled up</Text>
                    )}
                    
                    {/* Recent Expenses Preview - Show first, more important */}
                    {(() => {
                      const recentExpenses = getRecentExpensesForFriend(friendUserId);
                      if (recentExpenses.length === 0) return null;
                      return (
                        <View style={styles.recentExpensesContainer}>
                          <Text style={styles.recentExpensesLabel}>Recent</Text>
                          {recentExpenses.map((expense, idx) => (
                            <Text key={expense.id} style={styles.recentExpenseText} numberOfLines={1}>
                              {expense.description} • {formatCurrency(expense.amount, expense.currency)}
                            </Text>
                          ))}
                        </View>
                      );
                    })()}
                    
                    {/* Detailed breakdown - Collapsed by default, less prominent */}
                    {netBalance !== 0 && balance.breakdown && (
                      <View style={styles.breakdownContainer}>
                        {balance.breakdown.owedTo && (
                          <>
                            {balance.breakdown.owedTo.byGroup && Array.isArray(balance.breakdown.owedTo.byGroup) && balance.breakdown.owedTo.byGroup.filter(group => group.amount > 0.01).map((group) => (
                              <Text key={group.groupId} style={styles.breakdownDetailText}>
                                {friendName} owes you {formatCurrency(group.amount)} in "{group.groupName}"
                              </Text>
                            ))}
                            {balance.breakdown.owedTo.individual && balance.breakdown.owedTo.individual > 0.01 && (
                              <Text style={styles.breakdownDetailText}>
                                {friendName} owes you {formatCurrency(balance.breakdown.owedTo.individual)} in non-group expenses
                              </Text>
                            )}
                            {balance.breakdown.owedTo.rideshare && balance.breakdown.owedTo.rideshare > 0.01 && (
                              <Text style={styles.breakdownDetailText}>
                                {friendName} owes you {formatCurrency(balance.breakdown.owedTo.rideshare)} in rideshare
                              </Text>
                            )}
                          </>
                        )}
                        {balance.breakdown.owed && (
                          <>
                            {balance.breakdown.owed.byGroup && Array.isArray(balance.breakdown.owed.byGroup) && balance.breakdown.owed.byGroup.filter(group => group.amount > 0.01).map((group) => (
                              <Text key={group.groupId} style={[styles.breakdownDetailText, styles.breakdownOwedText]}>
                                You owe {friendName} {formatCurrency(group.amount)} in "{group.groupName}"
                              </Text>
                            ))}
                            {balance.breakdown.owed.individual && balance.breakdown.owed.individual > 0.01 && (
                              <Text style={[styles.breakdownDetailText, styles.breakdownOwedText]}>
                                You owe {friendName} {formatCurrency(balance.breakdown.owed.individual)} in non-group expenses
                              </Text>
                            )}
                            {balance.breakdown.owed.rideshare && balance.breakdown.owed.rideshare > 0.01 && (
                              <Text style={[styles.breakdownDetailText, styles.breakdownOwedText]}>
                                You owe {friendName} {formatCurrency(balance.breakdown.owed.rideshare)} in rideshare
                              </Text>
                            )}
                          </>
                        )}
                      </View>
                    )}
                  </View>
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
  settleButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
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
  friendCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  friendDetails: {
    flex: 1,
    flexShrink: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
    flex: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settledText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  breakdownContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  breakdownDetailText: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 3,
    lineHeight: 16,
  },
  breakdownOwedText: {
    color: '#F59E0B',
  },
  positiveBalance: {
    color: '#EF4444',
  },
  negativeBalance: {
    color: '#10B981',
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
  recentExpensesContainer: {
    marginTop: 8,
  },
  recentExpensesLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentExpenseText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
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
  addNewFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
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
  addNewFriendsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

