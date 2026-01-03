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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getGroups, Group } from '../api/groupApi';
import { getExpenses, Expense } from '../api/expenseApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';

interface BillchopGroupsScreenProps {
  onBack: () => void;
  onViewGroup: (groupId: string) => void;
  onViewExpense: (expenseId: string) => void;
}

export function BillchopGroupsScreen({
  onBack,
  onViewGroup,
  onViewExpense,
}: BillchopGroupsScreenProps) {
  const { token, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
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

      const [groupsData, expensesData] = await Promise.all([
        getGroups(token),
        getExpenses(token),
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
      setExpenses(expensesList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getGroupExpenses(groupId: string): Expense[] {
    if (!expenses || !Array.isArray(expenses)) return [];
    return expenses.filter((expense) => expense.groupId === groupId);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Groups</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Groups</Text>
          <View style={styles.placeholder} />
        </View>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Groups</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
      >
        {groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptyText}>
              Create a group to start splitting expenses with multiple people
            </Text>
          </View>
        ) : (
          groups && Array.isArray(groups) && groups.map((group) => {
            const groupExpenses = getGroupExpenses(group.id);
            const totalAmount = getGroupTotal(group.id);
            const expenseCount = groupExpenses.length;

            return (
              <View key={group.id} style={styles.groupSection}>
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => onViewGroup(group.id)}
                >
                  <View style={styles.groupInfo}>
                    <View style={styles.groupIcon}>
                      <MaterialIcons name="group" size={24} color="#2563EB" />
                    </View>
                    <View style={styles.groupDetails}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupMeta}>
                        {expenseCount} expense{expenseCount !== 1 ? 's' : ''} •{' '}
                        {formatCurrency(totalAmount)}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                </TouchableOpacity>

                {groupExpenses.length > 0 && (
                  <View style={styles.expensesList}>
                    {groupExpenses.slice(0, 3).map((expense) => (
                      <TouchableOpacity
                        key={expense.id}
                        style={styles.expenseItem}
                        onPress={() => onViewExpense(expense.id)}
                      >
                        <View style={styles.expenseItemInfo}>
                          <Text style={styles.expenseItemDescription} numberOfLines={1}>
                            {expense.description}
                          </Text>
                          <Text style={styles.expenseItemDate}>
                            {new Date(expense.date).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={styles.expenseItemAmount}>
                          {formatCurrency(expense.amount, expense.currency)}
                        </Text>
                        <MaterialIcons
                          name="chevron-right"
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    ))}
                    {groupExpenses.length > 3 && (
                      <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => onViewGroup(group.id)}
                      >
                        <Text style={styles.viewAllText}>
                          View all {groupExpenses.length} expenses
                        </Text>
                        <MaterialIcons name="arrow-forward" size={16} color="#2563EB" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  groupSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
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
    color: '#2563EB',
    fontWeight: '600',
    marginRight: 4,
  },
});

