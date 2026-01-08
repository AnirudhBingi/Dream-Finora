import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../auth/authContext';
import { getBalances, BalanceInfo } from '../api/expenseApi';
import { getBalance, BalanceInfo as FinanceBalanceInfo } from '../api/financeApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { useBottomNavPadding } from '../hooks/useBottomNavPadding';

interface HomeScreenProps {
  onNavigateToProfile: () => void;
  onNavigateToExpenses: () => void;
  onNavigateToGroups: () => void;
  onNavigateToFinance: () => void;
  onNavigateToChores: () => void;
  onNavigateToRides: () => void;
  onNavigateToSpaceV: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToActivity?: () => void;
  onNavigateToFriends?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  refreshKey?: number; // Add refresh key to trigger balance refresh
}

export function HomeScreen({
  onNavigateToProfile,
  onNavigateToExpenses,
  onNavigateToGroups,
  onNavigateToFinance,
  onNavigateToChores,
  onNavigateToRides,
  onNavigateToSpaceV,
  onNavigateToMessages,
  onNavigateToAnalytics,
  onNavigateToActivity,
  onNavigateToFriends,
  onNavigateToNotifications,
  onNavigateToSettings,
  refreshKey,
}: HomeScreenProps) {
  const { user, token } = useAuth();
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [financeBalance, setFinanceBalance] = useState<FinanceBalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const bottomPadding = useBottomNavPadding(true);

  useEffect(() => {
    if (token) {
      loadBalances();
    }
  }, [token, refreshKey]); // Refresh when token or refreshKey changes

  async function loadBalances(silent = false) {
    if (!token) return;
    try {
      if (!silent) {
        setLoading(true);
      }
      console.log('[HomeScreen] Loading balances, refreshKey:', refreshKey);
      const [balanceData, financeData] = await Promise.all([
        getBalances(token),
        getBalance(token, 'local', false).catch(() => null), // Get local finance balance, don't include billchop
      ]);
      console.log('[HomeScreen] Balance data loaded:', {
        totalOwed: balanceData.totalOwed,
        totalOwedToUser: balanceData.totalOwedToUser,
        netBalance: balanceData.netBalance,
        owedByUserCount: balanceData.owedByUser.length,
        owedToUserCount: balanceData.owedToUser.length,
      });
      setBalances(balanceData);
      setFinanceBalance(financeData);
    } catch (err) {
      console.error('[HomeScreen] Failed to load balances:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadBalances(true);
  }, [token]);


  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  // totalOwed = how much user owes others
  // totalOwedToUser = how much others owe the user
  const totalOwed = balances?.totalOwed || 0;
  const totalOwedToUser = balances?.totalOwedToUser || 0;
  const netBalance = totalOwedToUser - totalOwed; // Positive = user is owed, Negative = user owes
  const personalFinanceBalance = financeBalance?.totalBalance || 0;
  const personalFinanceCurrency = financeBalance?.localCurrency || balances?.currency || 'USD';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Fixed Header */}
      <Header
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >

        {/* Unified Balance Flow Card */}
        {loading ? (
          <View style={styles.balanceSection}>
            <View style={styles.balanceFlowCard}>
              <View style={styles.balanceFlowContainer}>
                <View style={[styles.balanceFlowSide, styles.balanceFlowSideLeft]}>
                  <ActivityIndicator size="small" color="#EF4444" style={styles.balanceFlowLoader} />
                </View>
                <View style={styles.balanceFlowDivider} />
                <View style={[styles.balanceFlowSide, styles.balanceFlowSideRight]}>
                  <ActivityIndicator size="small" color="#10B981" style={styles.balanceFlowLoader} />
                </View>
              </View>
            </View>
          </View>
        ) : (totalOwed > 0 || totalOwedToUser > 0 || personalFinanceBalance !== 0) ? (
          <View style={styles.balanceSection}>
            <View style={styles.balanceFlowCard}>
              {/* Top Section - Net Balance Indicator */}
              {netBalance !== 0 && (
                <View style={styles.netBalanceBanner}>
                  <View style={[styles.netBalanceIndicator, netBalance > 0 ? styles.netBalanceIndicatorPositive : styles.netBalanceIndicatorNegative]}>
                    <Icon 
                      name={netBalance > 0 ? "trending-up" : "trending-down"} 
                      size={16} 
                      color={netBalance > 0 ? "#10B981" : "#EF4444"} 
                    />
                  </View>
                  <Text style={styles.netBalanceBannerText}>
                    {netBalance > 0 ? 'You\'re ahead by' : 'You owe'}
                  </Text>
                  <Text style={[styles.netBalanceBannerAmount, netBalance > 0 ? styles.netBalanceBannerAmountPositive : styles.netBalanceBannerAmountNegative]}>
                    {formatCurrency(Math.abs(netBalance), balances?.currency || 'USD')}
                  </Text>
                </View>
              )}

              {/* Main Balance Flow - Billchop Balances */}
              {(totalOwed > 0 || totalOwedToUser > 0) && (
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
                      {formatCurrency(totalOwed, balances?.currency || 'USD')}
                    </Text>
                  </View>

                  {/* Center Divider with Floating Action */}
                  <View style={styles.balanceFlowDivider}>
                    <TouchableOpacity
                      style={styles.balanceFlowConnector}
                      onPress={onNavigateToExpenses}
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
                      {formatCurrency(totalOwedToUser, balances?.currency || 'USD')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Personal Finance Balance Section */}
              {personalFinanceBalance !== 0 && (
                <View style={styles.personalFinanceSection}>
                  <View style={styles.personalFinanceDivider} />
                  <TouchableOpacity
                    style={styles.personalFinanceRow}
                    onPress={onNavigateToFinance}
                    activeOpacity={0.8}
                  >
                    <View style={styles.personalFinanceHeader}>
                      <View style={styles.personalFinanceIconContainer}>
                        <Icon name="account-balance-wallet" size={18} color="#6366F1" />
                      </View>
                      <Text style={styles.personalFinanceLabel}>PERSONAL FINANCE</Text>
                    </View>
                    <Text style={styles.personalFinanceAmount}>
                      {formatCurrency(personalFinanceBalance, personalFinanceCurrency)}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.balanceSection}>
            <EmptyState
              icon="account-balance-wallet"
              title="No balances yet"
              message="Start splitting bills with friends or add transactions to see your balances here."
              actionLabel="Create Billchop"
              onAction={onNavigateToExpenses}
            />
          </View>
        )}

        {/* Social Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>
          <View style={styles.buttonGrid}>
            {onNavigateToFriends && (
              <TouchableOpacity
                style={[styles.featureButton, styles.friendButton]}
                onPress={onNavigateToFriends}
                activeOpacity={0.7}
              >
                <Icon name="friends" size={20} color="#FFFFFF" />
                <Text style={styles.featureButtonText}>Friends</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.featureButton, styles.groupButton]}
              onPress={onNavigateToGroups}
              activeOpacity={0.7}
            >
              <Icon name="groups" size={20} color="#FFFFFF" />
              <Text style={styles.featureButtonText}>Circles</Text>
            </TouchableOpacity>
            {onNavigateToMessages && (
              <TouchableOpacity
                style={[styles.featureButton, styles.messageButton]}
                onPress={onNavigateToMessages}
                activeOpacity={0.7}
              >
                <Icon name="messages" size={20} color="#FFFFFF" />
                <Text style={styles.featureButtonText}>Messages</Text>
              </TouchableOpacity>
            )}
            {onNavigateToActivity && (
              <TouchableOpacity
                style={[styles.featureButton, styles.activityButton]}
                onPress={onNavigateToActivity}
                activeOpacity={0.7}
              >
                <Icon name="activity" size={20} color="#FFFFFF" />
                <Text style={styles.featureButtonText}>Activity</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Finance & Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Finance & Tools</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[styles.featureButton, styles.financeButton]}
              onPress={onNavigateToFinance}
              activeOpacity={0.7}
            >
              <Icon name="finance" size={20} color="#FFFFFF" />
              <Text style={styles.featureButtonText}>My Wallet</Text>
            </TouchableOpacity>
            {onNavigateToAnalytics && (
              <TouchableOpacity
                style={[styles.featureButton, styles.analyticsButton]}
                onPress={onNavigateToAnalytics}
                activeOpacity={0.7}
              >
                <Icon name="analytics" size={20} color="#FFFFFF" />
                <Text style={styles.featureButtonText}>Insights</Text>
              </TouchableOpacity>
            )}
          </View>
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
    // paddingBottom will be set dynamically via useBottomNavPadding
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationButton: {
    backgroundColor: '#8B5CF6',
  },
  notificationButtonContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
  },
  balanceSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.3,
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
  balanceFlowLoader: {
    marginBottom: 8,
  },
  personalFinanceSection: {
    paddingTop: 12,
  },
  personalFinanceDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  personalFinanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  personalFinanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personalFinanceIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personalFinanceLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  personalFinanceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366F1',
  },
  personalFinanceLoader: {
    marginRight: 8,
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
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureButton: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  friendButton: {
    backgroundColor: '#3B82F6',
  },
  groupButton: {
    backgroundColor: '#6366F1',
  },
  messageButton: {
    backgroundColor: '#06B6D4',
  },
  activityButton: {
    backgroundColor: '#8B5CF6',
  },
  financeButton: {
    backgroundColor: '#8B5CF6',
  },
  analyticsButton: {
    backgroundColor: '#6366F1',
  },
});
