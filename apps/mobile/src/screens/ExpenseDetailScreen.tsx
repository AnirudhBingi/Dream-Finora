import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getExpenseById, deleteExpense, Expense } from '../api/expenseApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';

interface ExpenseDetailScreenProps {
  expenseId: string;
  onBack: () => void;
  onEdit?: (expenseId: string) => void;
  onNavigateToUserProfile?: (userId: string) => void;
}

export function ExpenseDetailScreen({ expenseId, onBack, onEdit, onNavigateToUserProfile }: ExpenseDetailScreenProps) {
  const { token, user } = useAuth();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExpense();
  }, [expenseId, token]);

  async function loadExpense() {
    if (!token || !expenseId) return;

    try {
      setLoading(true);
      setError(null);
      const expenseData = await getExpenseById(token, expenseId);
      setExpense(expenseData);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
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

  function getUserDisplayName(user: Expense['createdByUser']): string {
    return user.profile?.displayName || user.email;
  }

  function isExpenseOwner(): boolean {
    return user?.id === expense?.createdBy;
  }

  async function handleDeleteExpense() {
    if (!token || !expense) return;

    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(token, expense.id);
              Alert.alert('Success', 'Expense deleted successfully', [
                { text: 'OK', onPress: onBack },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete expense');
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense Details</Text>
          <View style={styles.placeholder} />
        </View>
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense Details</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState message={error} onRetry={loadExpense} />
      </SafeAreaView>
    );
  }

  if (error || !expense) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Expense not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadExpense}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadExpense} />}
      >
        {/* Main Info Card */}
        <View style={styles.card}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amount}>{formatCurrency(expense.amount, expense.currency)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{expense.description}</Text>
          </View>

          {expense.category && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.value}>{expense.category}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Created by</Text>
            {expense.createdByUser && expense.createdByUser.id !== user?.id ? (
              <TouchableOpacity
                onPress={() => {
                  if (onNavigateToUserProfile && expense.createdByUser?.id) {
                    onNavigateToUserProfile(expense.createdByUser.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.value, styles.linkText]}>{getUserDisplayName(expense.createdByUser)}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.value}>{getUserDisplayName(expense.createdByUser)}</Text>
            )}
          </View>

          {expense.paidByUser && (
            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <MaterialIcons name="payment" size={16} color="#6B7280" />
                <Text style={styles.label}>Paid by</Text>
              </View>
              <View style={styles.paidByContainer}>
                {expense.paidByUser.id !== user?.id ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (onNavigateToUserProfile && expense.paidByUser?.id) {
                        onNavigateToUserProfile(expense.paidByUser.id);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.value, styles.linkText]}>{getUserDisplayName(expense.paidByUser)}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.value}>{getUserDisplayName(expense.paidByUser)}</Text>
                )}
                {expense.paidBy === expense.createdBy && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Creator</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.labelWithIcon}>
              <MaterialIcons
                name={
                  expense.splitType === 'EQUAL' ? 'equalizer' :
                  expense.splitType === 'CUSTOM' ? 'edit' :
                  'percent'
                }
                size={16}
                color="#6B7280"
              />
              <Text style={styles.label}>Split type</Text>
            </View>
            <Text style={styles.value}>
              {expense.splitType === 'EQUAL' ? 'Equal' :
               expense.splitType === 'CUSTOM' ? 'Custom' :
               'Percentage'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>
              {new Date(expense.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {expense.group && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Group</Text>
              <Text style={styles.value}>{expense.group.name}</Text>
            </View>
          )}
        </View>

        {/* Receipt Card */}
        {expense.receiptUrl && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Receipt</Text>
            <Image
              source={{
                uri: expense.receiptUrl.startsWith('http')
                  ? expense.receiptUrl
                  : `${getApiBaseUrl()}${expense.receiptUrl}`,
              }}
              style={styles.receiptImage}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Splits Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Splits</Text>
          <View style={styles.splitsList}>
            {expense.splits.map((split) => (
              <View key={split.id} style={styles.splitRow}>
                <View style={styles.splitLeft}>
                  {split.user?.id && split.user.id !== user?.id ? (
                    <TouchableOpacity
                      onPress={() => {
                        if (onNavigateToUserProfile && split.user?.id) {
                          onNavigateToUserProfile(split.user.id);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.splitUserName, styles.linkText]}>{getUserDisplayName(split.user)}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.splitUserName}>{getUserDisplayName(split.user)}</Text>
                  )}
                  {split.isPaid && (
                    <View style={styles.paidBadge}>
                      <MaterialIcons name="check-circle" size={14} color="#10B981" />
                      <Text style={styles.paidText}>Paid</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.splitAmount,
                    split.isPaid && styles.splitAmountPaid,
                  ]}
                >
                  {formatCurrency(split.amount, expense.currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isExpenseOwner() && (
            <>
              {onEdit && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => onEdit(expense.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Edit expense"
                  accessibilityHint="Opens the edit expense screen"
                >
                  <MaterialIcons name="edit" size={20} color="#2563EB" accessible={false} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDeleteExpense}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Delete expense"
                accessibilityHint="Permanently deletes this expense"
              >
                <MaterialIcons name="delete-outline" size={20} color="#EF4444" accessible={false} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '600',
    color: '#111827',
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  splitsList: {
    gap: 12,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  splitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitUserName: {
    fontSize: 16,
    color: '#111827',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  splitAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  splitAmountPaid: {
    color: '#10B981',
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#2563EB',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2563EB',
  },
  deleteButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EF4444',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paidByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  linkText: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
});

