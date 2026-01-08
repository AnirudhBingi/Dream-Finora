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
  getGoals,
  deleteGoal,
  FinancialGoal,
} from '../api/financeApi';
import { getProfile, Profile } from '../api/profileApi';
import { MaterialIcons } from '@expo/vector-icons';
import { SkeletonGoalList } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { Header } from '../components/Header';

interface GoalsScreenProps {
  context: 'local' | 'home';
  onCreateGoal: () => void;
  onViewGoal: (goalId: string) => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function GoalsScreen({
  context,
  onCreateGoal,
  onViewGoal,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: GoalsScreenProps) {
  const { token } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('USD');
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>('USD');

  useEffect(() => {
    loadGoals();
    loadProfile();
  }, [token, context, statusFilter]);

  async function loadProfile() {
    if (!token) return;
    try {
      const profile = await getProfile(token);
      if (profile) {
        setPrimaryCurrency(profile.primaryCurrency || 'USD');
        setHomeCountryCurrency(profile.homeCountryCurrency || 'USD');
      } else {
        setPrimaryCurrency('USD');
        setHomeCountryCurrency('USD');
      }
    } catch (err) {
      setPrimaryCurrency('USD');
      setHomeCountryCurrency('USD');
    }
  }

  async function loadGoals() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getGoals(token, context, statusFilter === 'all' ? undefined : statusFilter);
      setGoals(data);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleDelete(goalId: string, goalName: string) {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goalName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await deleteGoal(token, goalId);
              loadGoals();
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

  function formatCurrency(amount: number): string {
    const displayCurrency = context === 'local' ? primaryCurrency : homeCountryCurrency;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(amount);
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

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title={context === 'local' ? 'Local Goals' : 'Home Country Goals'}
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading goals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title={context === 'local' ? 'Local Goals' : 'Home Country Goals'}
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadGoals} />
        }
      >
        <View style={styles.content}>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadGoals}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Status Filter */}
          <View style={styles.filterContainer}>
            {['all', 'active', 'completed', 'paused'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  statusFilter === status && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(status)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === status && styles.filterChipTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={onCreateGoal}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Create Goal</Text>
          </TouchableOpacity>

          {goals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="flag" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No goals yet</Text>
              <Text style={styles.emptySubtext}>
                Create a financial goal to track your progress for{' '}
                {context === 'local' ? 'local' : 'home country'} finances!
              </Text>
            </View>
          ) : (
            goals.map((goal) => {
              const percentage = getProgressPercentage(goal);
              const remaining = goal.targetAmount - goal.currentAmount;
              const statusColor = getStatusColor(goal.status);
              const priorityColor = getPriorityColor(goal.priority);

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalCard}
                  onPress={() => onViewGoal(goal.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.goalHeader}>
                    <View style={styles.goalHeaderLeft}>
                      <View style={styles.goalTitleRow}>
                        <MaterialIcons
                          name={getCategoryIcon(goal.category) as any}
                          size={24}
                          color={statusColor}
                        />
                        <Text style={styles.goalName}>{goal.name}</Text>
                      </View>
                      <View style={styles.goalMetaRow}>
                        <View
                          style={[
                            styles.priorityBadge,
                            { backgroundColor: priorityColor + '20' },
                          ]}
                        >
                          <Text style={[styles.priorityText, { color: priorityColor }]}>
                            {goal.priority.toUpperCase()}
                          </Text>
                        </View>
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

                  <View style={styles.progressContainer}>
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
                    <View style={styles.progressText}>
                      <Text style={styles.progressAmount}>
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </Text>
                      <Text style={styles.progressPercentage}>{percentage.toFixed(0)}%</Text>
                    </View>
                  </View>

                  <View style={styles.goalFooter}>
                    <Text style={styles.remainingText}>
                      {remaining >= 0 ? 'Remaining: ' : 'Exceeded by: '}
                      <Text style={styles.remainingAmount}>{formatCurrency(Math.abs(remaining))}</Text>
                    </Text>
                    {goal.targetDate && (
                      <Text style={styles.targetDateText}>
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(goal.id, goal.name);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="delete" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
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
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
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
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
    minHeight: 56,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  goalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  goalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  goalCategory: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressAmount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  goalFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  remainingText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  remainingAmount: {
    fontWeight: '600',
    color: '#111827',
  },
  targetDateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 12,
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

