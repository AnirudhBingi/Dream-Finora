import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getBalances, BalanceInfo } from '../api/expenseApi';
import { getUnreadCount } from '../api/notificationApi';

interface HomeScreenProps {
  onNavigateToProfile: () => void;
  onNavigateToExpenses: () => void;
  onNavigateToGroups: () => void;
  onNavigateToFinance: () => void;
  onNavigateToChores: () => void;
  onNavigateToRides: () => void;
  onNavigateToListings: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToActivity?: () => void;
  onNavigateToFriends?: () => void;
  onNavigateToNotifications?: () => void;
  refreshKey?: number; // Add refresh key to trigger balance refresh
}

export function HomeScreen({
  onNavigateToProfile,
  onNavigateToExpenses,
  onNavigateToGroups,
  onNavigateToFinance,
  onNavigateToChores,
  onNavigateToRides,
  onNavigateToListings,
  onNavigateToMessages,
  onNavigateToAnalytics,
  onNavigateToActivity,
  onNavigateToFriends,
  onNavigateToNotifications,
  refreshKey,
}: HomeScreenProps) {
  const { user, logout, token } = useAuth();
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (token) {
      loadBalances();
      loadUnreadCount();
    }
  }, [token, refreshKey]); // Refresh when token or refreshKey changes

  async function loadBalances() {
    if (!token) return;
    try {
      setLoading(true);
      console.log('[HomeScreen] Loading balances, refreshKey:', refreshKey);
      const balanceData = await getBalances(token);
      console.log('[HomeScreen] Balance data loaded:', {
        totalOwed: balanceData.totalOwed,
        totalOwedToUser: balanceData.totalOwedToUser,
        netBalance: balanceData.netBalance,
        owedByUserCount: balanceData.owedByUser.length,
        owedToUserCount: balanceData.owedToUser.length,
      });
      setBalances(balanceData);
    } catch (err) {
      console.error('[HomeScreen] Failed to load balances:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnreadCount() {
    if (!token) return;
    try {
      const count = await getUnreadCount(token);
      setUnreadCount(count);
    } catch (err) {
      console.error('[HomeScreen] Failed to load unread count:', err);
    }
  }

  async function handleLogout() {
    await logout();
  }

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
        <Text style={styles.title}>Dream Finora</Text>
        <Text style={styles.subtitle}>Welcome back!</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

        {/* Quick Stats Cards */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={[styles.statCard, styles.statCardGreen]}
              onPress={onNavigateToExpenses}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-downward" size={24} color="#10B981" />
              <Text style={styles.statLabel}>You're Owed</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#10B981" style={styles.statLoader} />
              ) : (
                <Text style={styles.statValue}>
                  {formatCurrency(totalOwedToUser, balances?.currency || 'USD')}
                </Text>
              )}
        </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, styles.statCardRed]}
              onPress={onNavigateToExpenses}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-upward" size={24} color="#EF4444" />
              <Text style={styles.statLabel}>You Owe</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#EF4444" style={styles.statLoader} />
              ) : (
                <Text style={styles.statValue}>
                  {formatCurrency(totalOwed, balances?.currency || 'USD')}
                </Text>
              )}
        </TouchableOpacity>
          </View>

          {!loading && netBalance !== 0 && (
            <View style={[styles.netBalanceCard, netBalance > 0 ? styles.netBalancePositive : styles.netBalanceNegative]}>
              <Text style={styles.netBalanceLabel}>
                {netBalance > 0 ? 'Net Balance' : 'Net Owed'}
              </Text>
              <Text style={styles.netBalanceValue}>
                {formatCurrency(Math.abs(netBalance), balances?.currency || 'USD')}
              </Text>
            </View>
          )}
        </View>

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
                <MaterialIcons name="people" size={24} color="#FFFFFF" />
                <Text style={styles.featureButtonText}>Friends</Text>
        </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.featureButton, styles.groupButton]}
              onPress={onNavigateToGroups}
              activeOpacity={0.7}
            >
              <MaterialIcons name="group" size={24} color="#FFFFFF" />
              <Text style={styles.featureButtonText}>Circles</Text>
        </TouchableOpacity>

        {onNavigateToMessages && (
              <TouchableOpacity
                style={[styles.featureButton, styles.messageButton]}
                onPress={onNavigateToMessages}
                activeOpacity={0.7}
              >
                <MaterialIcons name="message" size={24} color="#FFFFFF" />
                <Text style={styles.featureButtonText}>Messages</Text>
          </TouchableOpacity>
        )}

            {onNavigateToActivity && (
              <TouchableOpacity
                style={[styles.featureButton, styles.activityButton]}
                onPress={onNavigateToActivity}
                activeOpacity={0.7}
              >
                <MaterialIcons name="history" size={24} color="#FFFFFF" />
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
              <MaterialIcons name="account-balance-wallet" size={24} color="#FFFFFF" />
              <Text style={styles.featureButtonText}>My Wallet</Text>
            </TouchableOpacity>

        {onNavigateToAnalytics && (
              <TouchableOpacity
                style={[styles.featureButton, styles.analyticsButton]}
                onPress={onNavigateToAnalytics}
                activeOpacity={0.7}
              >
                <MaterialIcons name="insights" size={24} color="#FFFFFF" />
                <Text style={styles.featureButtonText}>Insights</Text>
          </TouchableOpacity>
        )}
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[styles.featureButton, styles.profileButton]}
              onPress={onNavigateToProfile}
              activeOpacity={0.7}
            >
              <MaterialIcons name="person" size={24} color="#FFFFFF" />
              <Text style={styles.featureButtonText}>My Space</Text>
            </TouchableOpacity>

            {onNavigateToNotifications && (
              <TouchableOpacity
                style={[styles.featureButton, styles.notificationButton]}
                onPress={onNavigateToNotifications}
                activeOpacity={0.7}
              >
                <View style={styles.notificationButtonContainer}>
                  <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featureButtonText}>Notifications</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.featureButton, styles.logoutButton]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <MaterialIcons name="logout" size={24} color="#FFFFFF" />
              <Text style={styles.featureButtonText}>Logout</Text>
        </TouchableOpacity>
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
    paddingBottom: 24,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  statsSection: {
    padding: 16,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  statCardRed: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLoader: {
    marginTop: 8,
  },
  netBalanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  netBalancePositive: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  netBalanceNegative: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  netBalanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  netBalanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
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
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  featureButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  friendButton: {
    backgroundColor: '#3B82F6',
  },
  groupButton: {
    backgroundColor: '#3B82F6',
  },
  messageButton: {
    backgroundColor: '#14B8A6',
  },
  activityButton: {
    backgroundColor: '#6B7280',
  },
  financeButton: {
    backgroundColor: '#8B5CF6',
  },
  analyticsButton: {
    backgroundColor: '#6366F1',
  },
  profileButton: {
    backgroundColor: '#2563EB',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
  },
});
