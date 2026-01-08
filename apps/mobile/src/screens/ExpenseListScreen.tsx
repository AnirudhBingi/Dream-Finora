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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getExpenses, getBalances, Expense, BalanceInfo } from '../api/expenseApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonExpenseList } from '../components/SkeletonLoader';
import { Icon } from '../components/Icon';
import { useBottomNavPadding } from '../hooks/useBottomNavPadding';
import { getAvatarUrl } from '../utils/avatar';

interface ExpenseListScreenProps {
  onCreateExpense: () => void;
  onBack: () => void;
  onViewAnalytics?: () => void;
  onViewBalances?: () => void;
  onViewExpense?: (expenseId: string) => void;
  onViewExpenseHistory?: () => void;
  onViewFriends?: () => void;
  onViewGroups?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function ExpenseListScreen({ 
  onCreateExpense, 
  onBack, 
  onViewAnalytics, 
  onViewBalances, 
  onViewExpense,
  onViewExpenseHistory,
  onViewFriends, 
  onViewGroups,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ExpenseListScreenProps) {
  const { token, user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const bottomPadding = useBottomNavPadding(true);

  useEffect(() => {
    loadData(true); // Initial load should show skeleton
  }, [token]);

  async function loadData(reset: boolean = false) {
    if (!token) return;

    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      console.log('[ExpenseListScreen] Loading expenses and balances...');
      const currentOffset = reset ? 0 : offset;
      const [expensesData, balancesData] = await Promise.all([
        getExpenses(token, limit, currentOffset),
        getBalances(token),
      ]);
      
      // Handle paginated response
      let expensesList: Expense[];
      let paginationInfo: { hasMore: boolean; total: number } | null = null;
      
      if (Array.isArray(expensesData)) {
        expensesList = expensesData;
      } else {
        expensesList = expensesData.expenses || [];
        paginationInfo = {
          hasMore: expensesData.hasMore || false,
          total: expensesData.total || 0,
        };
      }
      
      console.log('[ExpenseListScreen] Loaded expenses:', expensesList.length);
      console.log('[ExpenseListScreen] Balance data:', {
        totalOwed: balancesData.totalOwed,
        totalOwedToUser: balancesData.totalOwedToUser,
        netBalance: balancesData.netBalance,
      });
      
      if (reset) {
        setExpenses(expensesList);
        setOffset(limit);
      } else {
        setExpenses(prev => [...prev, ...expensesList]);
        setOffset(prev => prev + limit);
      }
      
      if (paginationInfo) {
        setHasMore(paginationInfo.hasMore);
      }
      
      setBalances(balancesData);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    await loadData(false);
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  function getUserDisplayName(user: Expense['createdByUser'], currentUserId?: string): string {
    if (!user) return 'Unknown';
    if (user?.id === currentUserId) {
      return 'you';
    }
    return user?.profile?.displayName || user?.email || 'Unknown';
  }
  
  function getUserDisplayNameForSplit(splitUser?: { id: string; email: string; profile?: { displayName?: string } }): string {
    if (!splitUser) return 'Unknown';
    if (splitUser?.id === user?.id) {
      return 'you';
    }
    return splitUser?.profile?.displayName || splitUser?.email || 'Unknown';
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Fixed Header with Primary Actions */}
      <Header
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        rightActions={
          <>
            {onViewAnalytics && (
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={onViewAnalytics}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="View Analytics"
              >
                <MaterialIcons name="analytics" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerPrimaryButton}
              onPress={onCreateExpense}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Create new expense"
            >
              <MaterialIcons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            if (hasMore && !loadingMore) {
              loadMore();
            }
          }
        }}
        scrollEventThrottle={400}
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

          {balances && (balances.totalOwed > 0 || balances.totalOwedToUser > 0) && (
            <View style={styles.balanceSection}>
              <TouchableOpacity
                style={styles.balanceFlowCard}
                onPress={onViewBalances}
                activeOpacity={0.9}
              >
                {/* Top Section - Net Balance Indicator */}
                {balances.netBalance !== 0 && (
                  <View style={styles.netBalanceBanner}>
                    <View style={[styles.netBalanceIndicator, balances.netBalance > 0 ? styles.netBalanceIndicatorPositive : styles.netBalanceIndicatorNegative]}>
                      <Icon 
                        name={balances.netBalance > 0 ? "trending-up" : "trending-down"} 
                        size={16} 
                        color={balances.netBalance > 0 ? "#10B981" : "#EF4444"} 
                      />
                    </View>
                    <Text style={styles.netBalanceBannerText}>
                      {balances.netBalance > 0 ? 'You\'re ahead by' : 'You owe'}
                    </Text>
                    <Text style={[styles.netBalanceBannerAmount, balances.netBalance > 0 ? styles.netBalanceBannerAmountPositive : styles.netBalanceBannerAmountNegative]}>
                      {formatCurrency(Math.abs(balances.netBalance), balances.currency || 'USD')}
                    </Text>
                  </View>
                )}

                {/* Main Balance Flow */}
                <View style={styles.balanceFlowContainer}>
                  {/* Left: You Owe */}
                  <View style={[styles.balanceFlowSide, styles.balanceFlowSideLeft]}>
                    <View style={styles.balanceFlowHeader}>
                      <View style={styles.balanceFlowIconContainer}>
                        <Icon name="arrow-up" size={16} color="#EF4444" />
                      </View>
                      <Text style={styles.balanceFlowLabel}>YOU OWE</Text>
                    </View>
                    <Text style={styles.balanceFlowAmountRed}>
                      {formatCurrency(balances.totalOwed, balances.currency || 'USD')}
                    </Text>
                  </View>

                  {/* Center Divider with Floating Action */}
                  <View style={styles.balanceFlowDivider}>
                    <TouchableOpacity
                      style={styles.balanceFlowConnector}
                      onPress={onCreateExpense}
                      activeOpacity={0.8}
                    >
                      <Icon name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Right: You're Owed */}
                  <View style={[styles.balanceFlowSide, styles.balanceFlowSideRight]}>
                    <View style={styles.balanceFlowHeader}>
                      <Text style={styles.balanceFlowLabel}>YOU'RE OWED</Text>
                      <View style={styles.balanceFlowIconContainer}>
                        <Icon name="arrow-down" size={16} color="#10B981" />
                      </View>
                    </View>
                    <Text style={styles.balanceFlowAmountGreen}>
                      {formatCurrency(balances.totalOwedToUser, balances.currency || 'USD')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {(onViewFriends || onViewGroups) && (
            <View style={styles.navigationSection}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <View style={styles.navigationCards}>
                {onViewFriends && (
                  <TouchableOpacity
                    style={styles.navCard}
                    onPress={onViewFriends}
                    activeOpacity={0.7}
                  >
                    <View style={styles.navCardIconContainer}>
                      <Icon name="friends" size={20} color="#3B82F6" />
                    </View>
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
                    <View style={styles.navCardIconContainer}>
                      <Icon name="groups" size={20} color="#6366F1" />
                    </View>
                    <Text style={styles.navCardText}>Circles</Text>
                    <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.expensesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Billchops</Text>
              {onViewExpenseHistory && (
                <TouchableOpacity
                  style={styles.sectionHeaderButton}
                  onPress={onViewExpenseHistory}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="history" size={20} color="#6366F1" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {expenses.length === 0 ? (
            <EmptyState
              icon="receipt"
              title="No billchops yet"
              message="Create your first billchop to start splitting bills with friends!"
              actionLabel="Chop a bill"
              onAction={onCreateExpense}
            />
          ) : (
            <>
              {expenses.map((expense) => (
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
                    Created by {expense?.createdByUser?.id === user?.id ? 'you' : getUserDisplayName(expense.createdByUser, user?.id)}
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
                    {(expense.splits || []).map((split) => {
                      const avatarUrl = getAvatarUrl(split?.user?.profile?.avatarUrl || null);
                      const displayName = getUserDisplayNameForSplit(split?.user);
                      const initials = displayName.charAt(0).toUpperCase();
                      return (
                        <View key={split?.id || ''} style={styles.splitRow}>
                          <View style={styles.splitUserInfo}>
                            <View style={styles.splitAvatar}>
                              {avatarUrl ? (
                                <Image 
                                  source={{ uri: avatarUrl }} 
                                  style={styles.splitAvatarImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.splitAvatarPlaceholder}>
                                  <Text style={styles.splitAvatarText}>{initials}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.splitUser}>
                              {displayName}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.splitAmount,
                              split?.isPaid && styles.splitPaid,
                            ]}
                          >
                            {formatCurrency(split?.amount || 0, expense.currency)}
                            {split?.isPaid ? ' ✓' : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              ))}
              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMore}
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Text style={styles.loadMoreButtonText}>Load More</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
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
    // paddingBottom will be set dynamically via useBottomNavPadding
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  headerPrimaryButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
  balanceSection: {
    padding: 16,
    paddingBottom: 12,
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
    zIndex: 10,
  },
  balanceFlowConnector: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    left: -22.5,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  navigationSection: {
    marginBottom: 20,
  },
  navigationCards: {
    flexDirection: 'row',
    gap: 12,
  },
  navCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
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
  navCardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCardText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
    letterSpacing: -0.2,
  },
  expensesSection: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  sectionHeaderButton: {
    padding: 4,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.2,
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
    marginBottom: 12,
    marginTop: 4,
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
  splitUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  splitAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#6366F1',
    overflow: 'hidden',
    backgroundColor: '#EEF2FF',
  },
  splitAvatarImage: {
    width: '100%',
    height: '100%',
  },
  splitAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  loadMoreButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

