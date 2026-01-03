import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getExpenseHistory, ExpenseHistory } from '../api/expenseApi';

interface ExpenseHistoryScreenProps {
  expenseId: string;
  onBack: () => void;
}

export function ExpenseHistoryScreen({ expenseId, onBack }: ExpenseHistoryScreenProps) {
  const { token } = useAuth();
  const [history, setHistory] = useState<ExpenseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [expenseId, token]);

  async function loadHistory() {
    if (!token || !expenseId) return;

    try {
      setLoading(true);
      setError(null);
      const historyData = await getExpenseHistory(token, expenseId);
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expense history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function getUserDisplayName(historyItem: ExpenseHistory): string {
    return historyItem?.user?.profile?.displayName || historyItem?.user?.email || 'Unknown';
  }

  function getActionIcon(action: string): keyof typeof MaterialIcons.glyphMap {
    switch (action) {
      case 'created':
        return 'add-circle';
      case 'updated':
        return 'edit';
      case 'deleted':
        return 'delete';
      case 'settled':
        return 'check-circle';
      default:
        return 'info';
    }
  }

  function getActionColor(action: string): string {
    switch (action) {
      case 'created':
        return '#10B981'; // Green
      case 'updated':
        return '#2563EB'; // Blue
      case 'deleted':
        return '#EF4444'; // Red
      case 'settled':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  }

  function formatChanges(changes: any): string {
    if (!changes || typeof changes !== 'object') return '';
    
    const changeStrings: string[] = [];
    Object.keys(changes).forEach((key) => {
      const change = changes[key];
      if (change && typeof change === 'object' && 'before' in change && 'after' in change) {
        changeStrings.push(`${key}: ${change.before} → ${change.after}`);
      }
    });
    
    return changeStrings.join(', ');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Expense History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Expense History</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText} onPress={loadHistory}>
            Tap to retry
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense History</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadHistory} />
        }
      >
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No history available</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {history.map((item, index) => {
              const isLast = index === history.length - 1;
              const iconName = getActionIcon(item.action);
              const iconColor = getActionColor(item.action);
              const changesText = formatChanges(item.changes);

              return (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                      <MaterialIcons name={iconName} size={24} color={iconColor} />
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.historyCard}>
                      <View style={styles.historyHeader}>
                        <Text style={styles.actionText}>
                          {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                        </Text>
                        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.userText}>
                        by {getUserDisplayName(item)}
                      </Text>
                      {item.notes && (
                        <Text style={styles.notesText}>{item.notes}</Text>
                      )}
                      {changesText && (
                        <View style={styles.changesContainer}>
                          <Text style={styles.changesLabel}>Changes:</Text>
                          <Text style={styles.changesText}>{changesText}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
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
  retryText: {
    marginTop: 8,
    fontSize: 14,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  timeline: {
    flex: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
    minHeight: 40,
  },
  timelineContent: {
    flex: 1,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  userText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  changesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  changesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  changesText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'monospace',
  },
});

