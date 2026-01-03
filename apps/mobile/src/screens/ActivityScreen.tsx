import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getActivities, ActivityItem } from '../api/activityApi';

interface ActivityScreenProps {
  onBack: () => void;
  onViewExpense?: (expenseId: string) => void;
}

export function ActivityScreen({ onBack, onViewExpense }: ActivityScreenProps) {
  const { token } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, [token]);

  async function loadActivities() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const activitiesData = await getActivities(token, 100);
      setActivities(activitiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }).format(date);
  }

  function getUserDisplayName(activity: ActivityItem): string {
    return activity.user.profile?.displayName || activity.user.email;
  }

  function getActivityIcon(type: string, action: string): keyof typeof MaterialIcons.glyphMap {
    if (type === 'expense') {
      switch (action) {
        case 'created':
          return 'add-circle';
        case 'updated':
          return 'edit';
        case 'deleted':
          return 'delete';
        default:
          return 'receipt';
      }
    }
    if (type === 'settlement') {
      return 'check-circle';
    }
    if (type === 'chore') {
      return 'check-circle';
    }
    if (type === 'group') {
      return 'group';
    }
    if (type === 'listing') {
      return 'store';
    }
    if (type === 'friend') {
      return 'person-add';
    }
    if (type === 'finance') {
      return 'account-balance-wallet';
    }
    return 'info';
  }

  function getActivityColor(type: string, action: string): string {
    if (action === 'deleted') return '#EF4444';
    if (action === 'created' || action === 'settled' || action === 'completed') return '#10B981';
    if (action === 'updated' || action === 'edited') return '#2563EB';
    return '#6B7280';
  }

  function handleActivityPress(activity: ActivityItem) {
    // Only navigate if expense still exists (not deleted)
    if (activity.type === 'expense' && activity.metadata?.expenseId && activity.metadata?.isTappable !== false && onViewExpense) {
      onViewExpense(activity.metadata.expenseId);
    }
    // TODO: Add navigation for other activity types
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
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
          <Text style={styles.headerTitle}>Activity</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadActivities}>
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
        <Text style={styles.headerTitle}>Activity</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadActivities} />}
      >
        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>
              Your activities will appear here as you use the app
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {activities.map((activity, index) => {
              const isLast = index === activities.length - 1;
              const iconName = getActivityIcon(activity.type, activity.action);
              const iconColor = getActivityColor(activity.type, activity.action);
              const isTappable = activity.type === 'expense' && activity.metadata?.expenseId && activity.metadata?.isTappable;

              return (
                <TouchableOpacity
                  key={activity.id}
                  style={styles.timelineItem}
                  onPress={() => handleActivityPress(activity)}
                  disabled={!isTappable}
                  activeOpacity={isTappable ? 0.7 : 1}
                >
                  <View style={styles.timelineLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                      <MaterialIcons name={iconName} size={24} color={iconColor} />
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.activityCard}>
                      <View style={styles.activityHeader}>
                        <Text style={styles.activityTitle}>{activity.title}</Text>
                        <Text style={styles.activityTime}>{formatDate(activity.createdAt)}</Text>
                      </View>
                      <Text style={styles.activityDescription}>{activity.description}</Text>
                      {activity.metadata?.amount && (
                        <Text style={styles.activityAmount}>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: activity.metadata.currency || 'USD',
                          }).format(activity.metadata.amount)}
                        </Text>
                      )}
                      {isTappable && (
                        <View style={styles.tapHint}>
                          <Text style={styles.tapHintText}>Tap to view expense</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  tapHint: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tapHintText: {
    fontSize: 12,
    color: '#2563EB',
    fontStyle: 'italic',
  },
});

