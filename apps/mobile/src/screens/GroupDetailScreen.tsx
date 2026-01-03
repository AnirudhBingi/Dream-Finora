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
import { getGroupById, getGroupBalances, GroupWithExpenses, BalanceInfo } from '../api/groupApi';
import { createExpense, CreateExpenseDto } from '../api/expenseApi';

interface GroupDetailScreenProps {
  groupId: string;
  onCreateExpense: () => void;
  onBack: () => void;
  onSettings?: (groupId: string) => void;
}

export function GroupDetailScreen({
  groupId,
  onCreateExpense,
  onBack,
  onSettings,
}: GroupDetailScreenProps) {
  const { token, user } = useAuth();
  const [group, setGroup] = useState<GroupWithExpenses | null>(null);
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroupData();
  }, [token, groupId]);

  async function loadGroupData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [groupData, balancesData] = await Promise.all([
        getGroupById(token, groupId),
        getGroupBalances(token, groupId),
      ]);
      setGroup(groupData);
      setBalances(balancesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load circle');
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

  function getUserDisplayName(user: any): string {
    return user.profile?.displayName || user.email;
  }

  function isUserAdmin(): boolean {
    if (!group || !user) return false;
    const member = group.members.find(m => m.userId === user.id);
    return member?.role === 'ADMIN' || group.createdBy === user.id;
  }

  function isUserCreator(): boolean {
    return group?.createdBy === user?.id;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading circle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Circle not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={loadGroupData} />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              {isUserAdmin() && onSettings && (
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => onSettings(groupId)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="settings" size={24} color="#2563EB" />
                </TouchableOpacity>
              )}
            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateExpense}
              activeOpacity={0.7}
            >
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Chop a bill</Text>
            </TouchableOpacity>
            </View>
          </View>

          <View style={styles.groupHeader}>
            <Text style={styles.groupName}>{group.name}</Text>
            {group.description && (
              <Text style={styles.groupDescription}>{group.description}</Text>
            )}
            <Text style={styles.groupMembers}>
              {group.members.length} member{group.members.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {balances && (() => {
            const primaryCurrency = balances.primaryCurrency || 'USD';
            return (
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>Circle Balances</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>You owe:</Text>
                  <View style={styles.amountWithCurrency}>
                <Text style={[styles.balanceAmount, styles.balanceNegative]}>
                      {formatCurrency(balances.totalOwed, primaryCurrency)}
                </Text>
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>{primaryCurrency}</Text>
                    </View>
                  </View>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Owed to you:</Text>
                  <View style={styles.amountWithCurrency}>
                <Text style={[styles.balanceAmount, styles.balancePositive]}>
                      {formatCurrency(balances.totalOwedToUser, primaryCurrency)}
                </Text>
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>{primaryCurrency}</Text>
                    </View>
                  </View>
              </View>
              <View style={[styles.balanceRow, styles.netBalanceRow]}>
                <Text style={styles.balanceLabel}>Net:</Text>
                  <View style={styles.amountWithCurrency}>
                <Text
                  style={[
                    styles.balanceAmount,
                    balances.netBalance >= 0
                      ? styles.balancePositive
                      : styles.balanceNegative,
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
            );
          })()}

          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>Members</Text>
            {group.members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {getUserDisplayName(member.user).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                <Text style={styles.memberName}>
                      {member.userId === user?.id ? 'You' : getUserDisplayName(member.user)}
                </Text>
                    <Text style={styles.memberEmail}>{member.user.email}</Text>
                  </View>
                </View>
                <View style={styles.memberBadges}>
                {member.userId === group.createdBy && (
                    <View style={[styles.badge, styles.creatorBadge]}>
                      <MaterialIcons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.badgeText}>Creator</Text>
                    </View>
                  )}
                  {member.role === 'ADMIN' && member.userId !== group.createdBy && (
                    <View style={[styles.badge, styles.adminBadge]}>
                      <MaterialIcons name="admin-panel-settings" size={12} color="#2563EB" />
                      <Text style={styles.badgeText}>Admin</Text>
                    </View>
                )}
                </View>
              </View>
            ))}
          </View>

            <Text style={styles.sectionTitle}>Circle Billchops</Text>

          {group.expenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No billchops yet</Text>
              <Text style={styles.emptySubtext}>
                Create the first billchop for this circle!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={onCreateExpense}
              >
                <Text style={styles.emptyButtonText}>Chop a bill</Text>
              </TouchableOpacity>
            </View>
          ) : (
            group.expenses.map((expense) => (
              <View key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseHeader}>
                  <Text style={styles.expenseDescription}>
                    {expense.description}
                  </Text>
                  <Text style={styles.expenseAmount}>
                    {formatCurrency(expense.amount, expense.currency)}
                  </Text>
                </View>
                <View style={styles.splitsContainer}>
                  {expense.splits.map((split) => (
                    <View key={split.id} style={styles.splitRow}>
                      <Text style={styles.splitUser}>
                        {getUserDisplayName(split.user)}
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
              </View>
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
  backButton: {
    padding: 8, // sm: 8px
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16, // Body: 16px
    color: '#2563EB', // Primary Blue
    fontWeight: '500', // Medium
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 16, // Button: 16px horizontal
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24, // lg: 24px
  },
  errorText: {
    fontSize: 16, // Body: 16px
    color: '#EF4444', // Red-500
    marginBottom: 16, // md: 16px
    textAlign: 'center',
  },
  groupHeader: {
    marginBottom: 24, // lg: 24px
  },
  groupName: {
    fontSize: 32, // H1: 32px
    fontWeight: 'bold',
    color: '#111827', // Gray-900
    marginBottom: 8, // sm: 8px
    lineHeight: 38.4, // 1.2 line-height
  },
  groupDescription: {
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
    marginBottom: 8, // sm: 8px
    lineHeight: 24, // 1.5 line-height
  },
  groupMembers: {
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
  },
  balanceCard: {
    backgroundColor: '#F9FAFB', // Gray-50
    borderRadius: 12, // Card: 12px
    padding: 16, // md: 16px
    marginBottom: 24, // lg: 24px
  },
  balanceTitle: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    marginBottom: 16, // md: 16px
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
  balancePositive: {
    color: '#10B981', // Green-500 (Success)
  },
  balanceNegative: {
    color: '#EF4444', // Red-500 (Danger)
  },
  membersSection: {
    marginBottom: 24, // lg: 24px
  },
  sectionTitle: {
    fontSize: 24, // H2: 24px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    marginBottom: 16, // md: 16px
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB', // Gray-200
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16, // Body: 16px
    fontWeight: '500',
    color: '#111827', // Gray-900
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280', // Gray-500
  },
  memberBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creatorBadge: {
    backgroundColor: '#FEF3C7', // Amber-100
  },
  adminBadge: {
    backgroundColor: '#DBEAFE', // Blue-100
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
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
    alignItems: 'center',
    marginBottom: 8, // sm: 8px
  },
  expenseDescription: {
    fontSize: 18, // H4: 18px
    fontWeight: '500', // Medium
    color: '#111827', // Gray-900
    flex: 1,
  },
  expenseAmount: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
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
});

