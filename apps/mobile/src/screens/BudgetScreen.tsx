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
  getBudgets,
  deleteBudget,
  Budget,
  BudgetTracking,
} from '../api/financeApi';
import { MaterialIcons } from '@expo/vector-icons';

interface BudgetScreenProps {
  context: 'local' | 'home';
  onCreateBudget: () => void;
  onEditBudget: (budgetId: string) => void;
  onBack: () => void;
}

export function BudgetScreen({
  context,
  onCreateBudget,
  onEditBudget,
  onBack,
}: BudgetScreenProps) {
  const { token } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBudgets();
  }, [token, context]);

  async function loadBudgets() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getBudgets(token, context);
      setBudgets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleDelete(budgetId: string, budgetName: string) {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete "${budgetName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await deleteBudget(token, budgetId);
              loadBudgets();
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete budget',
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

  function getStatusColor(status: string): string {
    switch (status) {
      case 'exceeded':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      case 'on_track':
        return '#10B981';
      default:
        return '#6B7280';
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case 'exceeded':
        return 'Exceeded';
      case 'warning':
        return 'Warning';
      case 'on_track':
        return 'On Track';
      default:
        return 'Unknown';
    }
  }

  function getProgressPercentage(tracking: BudgetTracking | undefined, amount: number): number {
    if (!tracking) return 0;
    return amount > 0 ? Math.min((tracking.spent / amount) * 100, 100) : 0;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading budgets...</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={loadBudgets} />
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
            <Text style={styles.headerTitle}>
              {context === 'local' ? 'Local' : 'Home Country'} Budgets
            </Text>
            <View style={styles.placeholder} />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadBudgets}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.createButton}
            onPress={onCreateBudget}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Create Budget</Text>
          </TouchableOpacity>

          {budgets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="account-balance-wallet" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No budgets yet</Text>
              <Text style={styles.emptySubtext}>
                Create a budget to track your spending for{' '}
                {context === 'local' ? 'local' : 'home country'} finances!
              </Text>
            </View>
          ) : (
            budgets.map((budget) => {
              const tracking = budget.currentTracking || {
                spent: 0,
                budgeted: budget.amount,
                status: 'on_track' as const,
              };
              const percentage = getProgressPercentage(tracking, budget.amount);
              const remaining = budget.amount - tracking.spent;
              const statusColor = getStatusColor(tracking.status);

              return (
                <TouchableOpacity
                  key={budget.id}
                  style={styles.budgetCard}
                  onPress={() => onEditBudget(budget.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.budgetHeader}>
                    <View style={styles.budgetHeaderLeft}>
                      <Text style={styles.budgetName}>{budget.name}</Text>
                      {budget.category && (
                        <Text style={styles.budgetCategory}>{budget.category}</Text>
                      )}
                      <Text style={styles.budgetPeriod}>
                        {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} • {formatCurrency(budget.amount)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor + '20' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getStatusText(tracking.status)}
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
                        {formatCurrency(tracking.spent)} / {formatCurrency(budget.amount)}
                      </Text>
                      <Text style={styles.progressPercentage}>{percentage.toFixed(0)}%</Text>
                    </View>
                  </View>

                  <View style={styles.budgetFooter}>
                    <Text style={styles.remainingText}>
                      {remaining >= 0 ? 'Remaining: ' : 'Over by: '}
                      <Text style={styles.remainingAmount}>{formatCurrency(Math.abs(remaining))}</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(budget.id, budget.name);
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 60,
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
  budgetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  budgetHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  budgetName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  budgetCategory: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  budgetPeriod: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
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
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  remainingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  remainingAmount: {
    fontWeight: '600',
    color: '#111827',
  },
  deleteButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

