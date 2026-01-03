import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/authContext';
import {
  getGoalById,
  deleteGoal,
  deleteContribution,
  FinancialGoal,
  GoalContribution,
} from '../api/financeApi';
import { MaterialIcons } from '@expo/vector-icons';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';

interface GoalDetailScreenProps {
  goalId: string;
  onEdit: () => void;
  onAddContribution: () => void;
  onBack: () => void;
}

export function GoalDetailScreen({
  goalId,
  onEdit,
  onAddContribution,
  onBack,
}: GoalDetailScreenProps) {
  const { token } = useAuth();
  const [goal, setGoal] = useState<FinancialGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGoal();
  }, [token, goalId]);

  async function loadGoal() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getGoalById(token, goalId);
      setGoal(data);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    if (!goal) return;

    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await deleteGoal(token, goalId);
              onBack();
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete goal',
              );
            }
          },
        },
      ],
    );
  }

  async function handleDeleteContribution(contributionId: string) {
    if (!token || !goal) return;

    Alert.alert(
      'Delete Contribution',
      'Are you sure you want to delete this contribution?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContribution(token, goalId, contributionId);
              loadGoal();
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete contribution',
              );
            }
          },
        },
      ],
    );
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getProgressPercentage(goal: FinancialGoal): number {
    if (goal.targetAmount <= 0) return 0;
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'paused':
        return '#F59E0B';
      case 'cancelled':
        return '#6B7280';
      case 'active':
        return '#2563EB';
      default:
        return '#6B7280';
    }
  }

  function getCategoryIcon(category: string): string {
    switch (category) {
      case 'savings':
        return 'savings';
      case 'debt':
        return 'credit-card';
      case 'purchase':
        return 'shopping-bag';
      case 'investment':
        return 'trending-up';
      default:
        return 'account-balance-wallet';
    }
  }

  function calculateDaysRemaining(targetDate: string | null | undefined): number | null {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Goal Details</Text>
          <View style={styles.placeholder} />
        </View>
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (error || !goal) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Goal Details</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState message={error || 'Goal not found'} onRetry={loadGoal} />
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Goal not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const percentage = getProgressPercentage(goal);
  const remaining = goal.targetAmount - goal.currentAmount;
  const statusColor = getStatusColor(goal.status);
  const daysRemaining = calculateDaysRemaining(goal.targetDate);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadGoal} />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={onEdit}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={20} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadGoal}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Goal Header */}
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleRow}>
              <MaterialIcons
                name={getCategoryIcon(goal.category) as any}
                size={32}
                color={statusColor}
              />
              <View style={styles.goalTitleText}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalCategory}>{goal.category}</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor + '20' },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {goal.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Progress Section */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercentage}>{percentage.toFixed(0)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>
            <View style={styles.progressAmounts}>
              <View>
                <Text style={styles.progressAmountLabel}>Current</Text>
                <Text style={styles.progressAmount}>{formatCurrency(goal.currentAmount)}</Text>
              </View>
              <View>
                <Text style={styles.progressAmountLabel}>Target</Text>
                <Text style={styles.progressAmount}>{formatCurrency(goal.targetAmount)}</Text>
              </View>
              <View>
                <Text style={styles.progressAmountLabel}>
                  {remaining >= 0 ? 'Remaining' : 'Exceeded'}
                </Text>
                <Text style={styles.progressAmount}>
                  {formatCurrency(Math.abs(remaining))}
                </Text>
              </View>
            </View>
          </View>

          {/* Goal Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Priority</Text>
              <Text style={styles.infoValue}>{goal.priority.toUpperCase()}</Text>
            </View>
            {goal.targetDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Target Date</Text>
                <Text style={styles.infoValue}>{formatDate(goal.targetDate)}</Text>
                {daysRemaining !== null && (
                  <Text style={[
                    styles.daysRemaining,
                    daysRemaining < 0 && styles.daysRemainingOverdue,
                  ]}>
                    {daysRemaining >= 0 ? `${daysRemaining} days left` : `${Math.abs(daysRemaining)} days overdue`}
                  </Text>
                )}
              </View>
            )}
            {goal.account && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account</Text>
                <Text style={styles.infoValue}>{goal.account.name}</Text>
              </View>
            )}
          </View>

          {/* Add Contribution Button */}
          {goal.status === 'active' && (
            <TouchableOpacity
              style={styles.addContributionButton}
              onPress={onAddContribution}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.addContributionButtonText}>Add Contribution</Text>
            </TouchableOpacity>
          )}

          {/* Contributions Section */}
          <View style={styles.contributionsSection}>
            <Text style={styles.sectionTitle}>
              Contributions ({goal.contributions?.length || 0})
            </Text>
            {!goal.contributions || goal.contributions.length === 0 ? (
              <View style={styles.emptyContributions}>
                <MaterialIcons name="payment" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No contributions yet</Text>
                <Text style={styles.emptySubtext}>
                  Add contributions to track your progress towards this goal
                </Text>
              </View>
            ) : (
              goal.contributions.map((contribution: GoalContribution) => (
                <View key={contribution.id} style={styles.contributionCard}>
                  <View style={styles.contributionHeader}>
                    <View style={styles.contributionLeft}>
                      <Text style={styles.contributionAmount}>
                        {formatCurrency(contribution.amount)}
                      </Text>
                      <Text style={styles.contributionDate}>
                        {formatDate(contribution.date)}
                      </Text>
                      {contribution.notes && (
                        <Text style={styles.contributionNotes}>{contribution.notes}</Text>
                      )}
                      {contribution.transaction && (
                        <View style={styles.transactionLink}>
                          <MaterialIcons name="receipt" size={14} color="#6B7280" />
                          <Text style={styles.transactionLinkText}>
                            Linked to transaction
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteContributionButton}
                      onPress={() => handleDeleteContribution(contribution.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="delete" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
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
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  goalTitleText: {
    flex: 1,
  },
  goalName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  goalCategory: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressAmountLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  progressAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  daysRemaining: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
    marginLeft: 'auto',
  },
  daysRemainingOverdue: {
    color: '#EF4444',
  },
  addContributionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
    minHeight: 56,
  },
  addContributionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contributionsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyContributions: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  contributionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  contributionLeft: {
    flex: 1,
  },
  contributionAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  contributionDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  contributionNotes: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },
  transactionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  transactionLinkText: {
    fontSize: 12,
    color: '#6B7280',
  },
  deleteContributionButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

