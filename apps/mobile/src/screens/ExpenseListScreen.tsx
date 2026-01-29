import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text as RNText,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getExpenses, getBalances, Expense, BalanceInfo } from '../api/expenseApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { Text } from '../components/Text';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SkeletonExpenseList } from '../components/SkeletonLoader';
import { Icon } from '../components/Icon';
import { getAvatarUrl } from '../utils/avatar';
import { useTheme } from '../theme';

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
  const { theme, resolvedMode } = useTheme();
  const styles = React.useMemo(() => createStyles(theme, resolvedMode), [theme, resolvedMode]);
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

  // Animation values for glassy card
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Start shimmer animation loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

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
      <>
        <Header
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScreenWrapper>
          <SkeletonExpenseList count={5} />
        </ScreenWrapper>
      </>
    );
  }

  return (
    <>
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
                <MaterialIcons name="analytics" size={24} color={theme.colors.white} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerPrimaryButton}
              onPress={onCreateExpense}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Create new expense"
            >
              <MaterialIcons name="add" size={24} color={theme.colors.white} />
            </TouchableOpacity>
          </>
        }
      />

      <ScreenWrapper
        scroll
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => await loadData(true)}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
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

          {error && (
            <View style={styles.errorContainer}>
              <RNText style={styles.errorText}>{error}</RNText>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadData(true)}>
                <RNText style={styles.retryButtonText}>Retry</RNText>
              </TouchableOpacity>
            </View>
          )}

          {balances && (balances.totalOwed > 0 || balances.totalOwedToUser > 0) && (
            <View style={styles.balanceSection}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onViewBalances?.();
                  }}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  style={styles.balanceFlowCard}
                >
                  {/* Enhanced glassy gradient overlay */}
                  <LinearGradient
                    colors={[
                      'rgba(255, 255, 255, 0.15)',
                      'rgba(255, 255, 255, 0.05)',
                      'rgba(255, 255, 255, 0.01)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.glassOverlay}
                  />
                  
                  {/* Animated shimmer effect */}
                  <Animated.View
                    style={[
                      styles.shimmerOverlay,
                      {
                        opacity: shimmerAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0, 0.3, 0],
                        }),
                        transform: [
                          {
                            translateX: shimmerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-400, 400],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        'transparent',
                        'rgba(255, 255, 255, 0.3)',
                        'transparent',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.shimmerGradient}
                    />
                  </Animated.View>
                {/* Top Section - Net Balance Indicator */}
                {balances.netBalance !== 0 && (
                  <View style={styles.netBalanceBanner}>
                    <View style={[styles.netBalanceIndicator, balances.netBalance > 0 ? styles.netBalanceIndicatorPositive : styles.netBalanceIndicatorNegative]}>
                      <Icon 
                        name={balances.netBalance > 0 ? "trending-up" : "trending-down"} 
                        size={16} 
                        color={balances.netBalance > 0 ? theme.colors.success : theme.colors.error} 
                      />
                    </View>
                    <RNText style={styles.netBalanceBannerText}>
                      {balances.netBalance > 0 ? 'You\'re ahead by' : 'You owe'}
                    </RNText>
                    <RNText style={[styles.netBalanceBannerAmount, balances.netBalance > 0 ? styles.netBalanceBannerAmountPositive : styles.netBalanceBannerAmountNegative]}>
                      {formatCurrency(Math.abs(balances.netBalance), balances.primaryCurrency || 'USD')}
                    </RNText>
                  </View>
                )}

                {/* Main Balance Flow */}
                <View style={styles.balanceFlowContainer}>
                  {/* Left: You Owe */}
                  <View style={[styles.balanceFlowSide, styles.balanceFlowSideLeft]}>
                    <View style={styles.balanceFlowHeader}>
                      <View style={styles.balanceFlowIconContainer}>
                        <Icon name="arrow-up" size={16} color={theme.colors.error} />
                      </View>
                      <RNText style={styles.balanceFlowLabel}>YOU OWE</RNText>
                    </View>
                    <RNText style={styles.balanceFlowAmountRed}>
                      {formatCurrency(balances.totalOwed, balances.primaryCurrency || 'USD')}
                    </RNText>
                  </View>

                  {/* Center Divider with Floating Action */}
                  <View style={styles.balanceFlowDivider}>
                    <TouchableOpacity
                      style={styles.balanceFlowConnector}
                      onPress={onCreateExpense}
                      activeOpacity={0.8}
                    >
                      <Icon name="add" size={20} color={theme.colors.accentForeground} />
                    </TouchableOpacity>
                  </View>

                  {/* Right: You're Owed */}
                  <View style={[styles.balanceFlowSide, styles.balanceFlowSideRight]}>
                    <View style={styles.balanceFlowHeader}>
                      <RNText style={styles.balanceFlowLabel}>YOU'RE OWED</RNText>
                      <View style={styles.balanceFlowIconContainer}>
                        <Icon name="arrow-down" size={16} color="#10B981" />
                      </View>
                    </View>
                    <RNText style={styles.balanceFlowAmountGreen}>
                      {formatCurrency(balances.totalOwedToUser, balances.primaryCurrency || 'USD')}
                    </RNText>
                  </View>
                </View>
                </Pressable>
              </Animated.View>
            </View>
          )}

          {(onViewFriends || onViewGroups) && (
            <View style={styles.navigationSection}>
              <Text variant="h4" style={styles.sectionTitle}>Quick Access</Text>
              <View style={styles.navigationCards}>
                {onViewFriends && (
                  <TouchableOpacity
                    style={styles.navCard}
                    onPress={onViewFriends}
                    activeOpacity={0.7}
                  >
                    <View style={styles.navCardIconContainer}>
                      <Icon name="friends" size={20} color={theme.colors.blueLight} />
                    </View>
                    <RNText style={styles.navCardText}>Friends</RNText>
                    <MaterialIcons name="chevron-right" size={20} color={theme.colors.iconDefault} />
                  </TouchableOpacity>
                )}
                {onViewGroups && (
                  <TouchableOpacity
                    style={styles.navCard}
                    onPress={onViewGroups}
                    activeOpacity={0.7}
                  >
                    <View style={styles.navCardIconContainer}>
                      <Icon name="groups" size={20} color={theme.colors.primary} />
                    </View>
                    <RNText style={styles.navCardText}>Circles</RNText>
                    <MaterialIcons name="chevron-right" size={20} color={theme.colors.iconDefault} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.expensesSection}>
            <View style={styles.sectionHeader}>
              <Text variant="h4" style={styles.sectionTitle}>Recent Billchops</Text>
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
                      <RNText style={styles.expenseDescription}>
                        {expense.description}
                      </RNText>
                      <RNText style={styles.expenseAmount}>
                        {formatCurrency(expense.amount, expense.currency)}
                      </RNText>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={theme.colors.iconDefault} />
                  </View>
                  <RNText style={styles.expenseCreator}>
                    Created by {expense?.createdByUser?.id === user?.id ? 'you' : getUserDisplayName(expense.createdByUser, user?.id)}
                  </RNText>
                  {expense.receiptUrl && (
                    <View style={styles.receiptContainer}>
                      <RNText style={styles.receiptLabel}>📄 Receipt</RNText>
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
                      const userForSplit = split?.user ? {
                        id: split.user.id,
                        email: split.user.email,
                        profile: split.user.profile?.displayName ? {
                          displayName: split.user.profile.displayName,
                        } : undefined,
                      } : undefined;
                      const displayName = getUserDisplayNameForSplit(userForSplit);
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
                                  <RNText style={styles.splitAvatarText}>{initials}</RNText>
                                </View>
                              )}
                            </View>
                            <RNText style={styles.splitUser}>
                              {displayName}
                            </RNText>
                          </View>
                          <RNText
                            style={[
                              styles.splitAmount,
                              ...(split?.isPaid ? [styles.splitPaid] : []),
                            ]}
                          >
                            {formatCurrency(split?.amount || 0, expense.currency)}
                            {split?.isPaid ? ' ✓' : ''}
                          </RNText>
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
                    <ActivityIndicator size="small" color={theme.colors.blue} />
                    ) : (
                    <RNText style={styles.loadMoreButtonText}>Load More</RNText>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
      </ScreenWrapper>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme'], resolvedMode: ReturnType<typeof useTheme>["resolvedMode"]) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    // paddingBottom will be set dynamically by ScreenWrapper
  },
  content: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
  },
  headerActionButton: {
    padding: theme.spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerPrimaryButton: {
    padding: theme.spacing.sm,
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
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.base,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.errorBackground,
    borderRadius: theme.radii.button,
    marginBottom: theme.spacing.base,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  retryButton: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.radii.button,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: theme.colors.accentForeground,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
  balanceSection: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing.md,
  },
  balanceFlowCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 24, // Larger radius for liquid feel
    overflow: 'hidden', // Changed to hidden for gradient overlay
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
    borderWidth: 2,
    borderColor: resolvedMode === 'light' 
      ? 'rgba(0, 0, 0, 0.08)' 
      : 'rgba(255, 255, 255, 0.15)',
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -100,
    right: -100,
    bottom: 0,
    zIndex: 1,
  },
  shimmerGradient: {
    flex: 1,
    width: 200,
    transform: [{ skewX: '-20deg' }],
  },
  netBalanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.base,
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // More visible glassy overlay
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 2, // Above gradient overlay
  },
  netBalanceIndicator: {
    width: 24,
    height: 24,
    borderRadius: theme.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  netBalanceIndicatorPositive: {
    backgroundColor: theme.colors.successBackground,
  },
  netBalanceIndicatorNegative: {
    backgroundColor: theme.colors.errorBackground,
  },
  netBalanceBannerText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  netBalanceBannerAmount: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
  },
  netBalanceBannerAmountPositive: {
    color: theme.colors.success,
  },
  netBalanceBannerAmountNegative: {
    color: theme.colors.error,
  },
  balanceFlowContainer: {
    flexDirection: 'row',
    minHeight: 110,
    position: 'relative',
    zIndex: 2, // Above gradient overlay
  },
  balanceFlowSide: {
    flex: 1,
    padding: theme.spacing.base,
    justifyContent: 'space-between',
  },
  balanceFlowSideLeft: {
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(255, 255, 255, 0.08)', // Subtle divider
    backgroundColor: 'transparent', // Transparent to show gradient
  },
  balanceFlowSideRight: {
    backgroundColor: 'transparent', // Transparent to show gradient
  },
  balanceFlowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  balanceFlowIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // More glassy background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.white,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  balanceFlowLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceFlowAmountRed: {
    fontSize: theme.typography.fontSize["2xl"],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.error,
  },
  balanceFlowAmountGreen: {
    fontSize: theme.typography.fontSize["2xl"],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success,
  },
  balanceFlowDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    zIndex: 10,
  },
  balanceFlowConnector: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    borderWidth: 4,
    borderColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    left: -22.5,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  navigationSection: {
    marginBottom: theme.spacing.lg,
  },
  navigationCards: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  navCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 14,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.black,
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
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCardText: {
    flex: 1,
    fontSize: 15,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.md,
    letterSpacing: -0.2,
  },
  expensesSection: {
    marginTop: theme.spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionHeaderButton: {
    padding: theme.spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: theme.spacing["2xl"],
  },
  emptyText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  emptyButton: {
    backgroundColor: theme.colors.blue,
    borderRadius: theme.radii.button,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 44,
  },
  emptyButtonText: {
    color: theme.colors.accentForeground,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
  expenseCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  expenseHeaderLeft: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  expenseAmount: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  expenseCreator: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  splitsContainer: {
    marginTop: theme.spacing.sm,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  splitUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  splitAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    overflow: 'hidden',
    backgroundColor: theme.colors.primaryBackground,
  },
  splitAvatarImage: {
    width: '100%',
    height: '100%',
  },
  splitAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitAvatarText: {
    color: theme.colors.accentForeground,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  splitUser: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  splitAmount: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  splitPaid: {
    color: theme.colors.success,
  },
  receiptContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  receiptLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  receiptThumbnail: {
    width: '100%',
    height: 150,
    borderRadius: theme.radii.button,
  },
  loadMoreButton: {
    backgroundColor: theme.colors.blue,
    borderRadius: theme.radii.button,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  loadMoreButtonText: {
    color: theme.colors.accentForeground,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
});

