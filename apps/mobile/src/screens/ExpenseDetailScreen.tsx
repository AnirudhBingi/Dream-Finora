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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getExpenseById, deleteExpense, Expense } from '../api/expenseApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { Header, HeaderOption } from '../components/Header';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { getAvatarUrl } from '../utils/avatar';

interface ExpenseDetailScreenProps {
  expenseId: string;
  onBack: () => void;
  onEdit?: (expenseId: string) => void;
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function ExpenseDetailScreen({ 
  expenseId, 
  onBack, 
  onEdit,
  onNavigateToUserProfile,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ExpenseDetailScreenProps) {
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

  // Prepare header options menu
  const headerOptions: HeaderOption[] = [];
  if (expense && isExpenseOwner()) {
    if (onEdit) {
      headerOptions.push({
        label: 'Edit',
        icon: 'edit',
        onPress: () => onEdit(expense.id),
      });
    }
    headerOptions.push({
      label: 'Delete',
      icon: 'delete',
      onPress: handleDeleteExpense,
      danger: true,
    });
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
        <Header
          title="Expense Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Expense Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <ErrorState message={error} onRetry={loadExpense} />
      </SafeAreaView>
    );
  }

  if (error || !expense) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Expense Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
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
      <Header
        title="Expense Details"
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
            onRefresh={loadExpense}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >
        <View style={styles.content}>
          {/* Hero Amount Card */}
          <View style={styles.heroCard}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amount}>{formatCurrency(expense.amount, expense.currency)}</Text>
            <Text style={styles.description}>{expense.description}</Text>
          </View>


          {/* Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Details</Text>
            
            {expense.category && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons name="category" size={18} color="#6B7280" />
                  <Text style={styles.label}>Category</Text>
                </View>
                <Text style={styles.value}>{expense.category}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons name="person" size={18} color="#6B7280" />
                <Text style={styles.label}>Created by</Text>
              </View>
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
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons name="payment" size={18} color="#6B7280" />
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

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons
                  name={
                    expense.splitType === 'EQUAL' ? 'equalizer' :
                    expense.splitType === 'CUSTOM' ? 'edit' :
                    'percent'
                  }
                  size={18}
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

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons name="calendar-today" size={18} color="#6B7280" />
                <Text style={styles.label}>Date</Text>
              </View>
              <Text style={styles.value}>
                {new Date(expense.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            {expense.group && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons name="group" size={18} color="#6B7280" />
                  <Text style={styles.label}>Group</Text>
                </View>
                <View style={styles.groupInfoContainer}>
                  <Avatar
                    avatarUrl={getAvatarUrl(expense.group.avatarUrl || null)}
                    displayName={expense.group.name}
                    size={28}
                  />
                <Text style={styles.value}>{expense.group.name}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Receipt Card */}
          {expense.receiptUrl && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Receipt</Text>
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

          {/* Splits Card - Redesigned to be more visual */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Splits</Text>
            <View style={styles.splitsList}>
              {expense.splits.map((split, index) => {
                const avatarUrl = getAvatarUrl(split.user?.profile?.avatarUrl || null);
                const displayName = getUserDisplayName(split.user);
                const initials = displayName.charAt(0).toUpperCase();
                const isYou = split.userId === user?.id;
                
                return (
                  <View key={split.id} style={[
                    styles.splitCard,
                    index === expense.splits.length - 1 && styles.splitCardLast
                  ]}>
                    <View style={styles.splitHeader}>
                      <View style={styles.splitUserInfo}>
                        <View style={[styles.avatar, split.isPaid && styles.avatarPaid]}>
                          {avatarUrl ? (
                            <Image 
                              source={{ uri: avatarUrl }} 
                              style={styles.avatarImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.avatarPlaceholder}>
                              <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.splitUserDetails}>
                          {split.user?.id && split.user.id !== user?.id ? (
                            <TouchableOpacity
                              onPress={() => {
                                if (onNavigateToUserProfile && split.user?.id) {
                                  onNavigateToUserProfile(split.user.id);
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.splitUserName, styles.linkText]}>
                                {isYou ? 'You' : displayName}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.splitUserName}>
                              {isYou ? 'You' : displayName}
                            </Text>
                          )}
                          {split.isPaid && (
                            <View style={styles.paidBadge}>
                              <MaterialIcons name="check-circle" size={12} color="#10B981" />
                              <Text style={styles.paidText}>Paid</Text>
                            </View>
                          )}
                        </View>
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
                  </View>
                );
              })}
            </View>
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
    paddingBottom: 32,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 18,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'right',
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
    color: '#6366F1',
    textDecorationLine: 'underline',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  splitsList: {
    gap: 8,
  },
  splitCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  splitCardLast: {
    marginBottom: 0,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  avatarPaid: {
    borderColor: '#10B981',
  },
  groupInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitUserDetails: {
    flex: 1,
    gap: 4,
  },
  splitUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  splitAmountPaid: {
    color: '#10B981',
  },
});
