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
import { getExpenses, Expense } from '../api/expenseApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';

interface FriendExpenseListScreenProps {
  friendId: string;
  friendName: string;
  onBack: () => void;
  onViewExpense: (expenseId: string) => void;
}

export function FriendExpenseListScreen({
  friendId,
  friendName,
  onBack,
  onViewExpense,
}: FriendExpenseListScreenProps) {
  const { token, user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token, friendId]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      // Get all expenses and filter for this friend
      const allExpenses = await getExpenses(token);
      
      // Filter expenses where this friend is involved (either as creator or in splits)
      const friendExpenses = allExpenses.filter(
        (expense) =>
          expense.createdBy === friendId ||
          expense.splits.some((split) => split.userId === friendId)
      );

      setExpenses(friendExpenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
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
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {friendName}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading expenses...</Text>
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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {friendName}
          </Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {friendName}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
      >
        {expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Expenses</Text>
            <Text style={styles.emptyText}>
              No expenses shared with {friendName} yet
            </Text>
          </View>
        ) : (
          expenses.map((expense) => {
            const friendSplit = getFriendSplit(expense);
            const currentUserSplit = getCurrentUserSplit(expense);
            const isCreator = expense.createdBy === user?.id;
            const friendIsCreator = expense.createdBy === friendId;

            return (
              <TouchableOpacity
                key={expense.id}
                style={styles.expenseCard}
                onPress={() => onViewExpense(expense.id)}
              >
                <View style={styles.expenseHeader}>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseDescription} numberOfLines={1}>
                      {expense.description}
                    </Text>
                    <View style={styles.expenseMeta}>
                      <Text style={styles.expenseDate}>
                        {formatDate(expense.date)}
                      </Text>
                      {expense.group && (
                        <View style={styles.groupBadge}>
                          <MaterialIcons name="group" size={12} color="#6B7280" />
                          <Text style={styles.groupBadgeText}>
                            {expense.group.name}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.expenseAmount}>
                    {formatCurrency(expense.amount, expense.currency)}
                  </Text>
                </View>

                <View style={styles.splitInfo}>
                  {friendIsCreator ? (
                    <Text style={styles.splitText}>
                      {friendName} paid {formatCurrency(expense.amount, expense.currency)}
                    </Text>
                  ) : isCreator ? (
                    <Text style={styles.splitText}>
                      You paid {formatCurrency(expense.amount, expense.currency)}
                    </Text>
                  ) : null}

                  {friendSplit && currentUserSplit && (
                    <View style={styles.splitDetails}>
                      <Text style={styles.splitDetailText}>
                        {friendName}: {formatCurrency(friendSplit.amount, expense.currency)}
                        {friendSplit.isPaid && (
                          <Text style={styles.paidBadge}> • Paid</Text>
                        )}
                      </Text>
                      <Text style={styles.splitDetailText}>
                        You: {formatCurrency(currentUserSplit.amount, expense.currency)}
                        {currentUserSplit.isPaid && (
                          <Text style={styles.paidBadge}> • Paid</Text>
                        )}
                      </Text>
                    </View>
                  )}
                </View>

                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color="#9CA3AF"
                  style={styles.chevron}
                />
              </TouchableOpacity>
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
    flex: 1,
    textAlign: 'center',
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
  expenseCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  expenseDate: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  groupBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  splitInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  splitText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  splitDetails: {
    marginTop: 4,
  },
  splitDetailText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  paidBadge: {
    color: '#10B981',
    fontWeight: '600',
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
});

