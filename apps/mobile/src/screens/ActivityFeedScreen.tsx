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
import { getActivityFeed, ActivityItem } from '../api/activityApi';

interface ActivityFeedScreenProps {
  onBack: () => void;
  onViewExpense?: (expenseId: string) => void;
  onViewChore?: (choreId: string) => void;
  onViewGroup?: (groupId: string) => void;
  onViewSpaceV?: (spacevId: string) => void;
  onViewRide?: (rideId: string) => void;
}

export function ActivityFeedScreen({
  onBack,
  onViewExpense,
  onViewChore,
  onViewGroup,
  onViewSpaceV,
  onViewRide,
}: ActivityFeedScreenProps) {
  const { token } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [token, selectedFilter]);

  async function loadActivities() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getActivityFeed(token, 50, 0, selectedFilter === 'all' ? undefined : selectedFilter);
      setActivities(data.activities);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleFilter(filter: string) {
    setSelectedFilter(filter);
  }

  function handleActivityPress(activity: ActivityItem) {
    if (activity.data?.expenseId && onViewExpense) {
      onViewExpense(activity.data.expenseId);
    } else if (activity.data?.choreId && onViewChore) {
      onViewChore(activity.data.choreId);
    } else if (activity.data?.groupId && onViewGroup) {
      onViewGroup(activity.data.groupId);
    } else if (activity.data?.listingId && onViewSpaceV) {
      onViewSpaceV(activity.data.listingId);
    } else if (activity.data?.rideId && onViewRide) {
      onViewRide(activity.data.rideId);
    }
  }

  function getActivityIcon(type: string): string {
    switch (type) {
      case 'expense_created':
        return 'receipt';
      case 'chore_created':
      case 'chore_completed':
        return 'task';
      case 'group_created':
        return 'group';
      case 'listing_created':
        return 'list';
      case 'ride_created':
        return 'directions-car';
      default:
        return 'history';
    }
  }

  function getActivityColor(type: string): string {
    switch (type) {
      case 'expense_created':
        return '#2563EB'; // Blue
      case 'chore_created':
        return '#F59E0B'; // Amber
      case 'chore_completed':
        return '#10B981'; // Green
      case 'group_created':
        return '#8B5CF6'; // Purple
      case 'listing_created':
        return '#06B6D4'; // Cyan
      case 'ride_created':
        return '#2563EB'; // Blue
      default:
        return '#6B7280'; // Gray
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
    return date.toLocaleDateString();
  }

  function groupActivitiesByDate(activities: ActivityItem[]): { date: string; items: ActivityItem[] }[] {
    const groups: Map<string, ActivityItem[]> = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      date.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);

      let dateLabel: string;
      if (diffDays === 0) {
        dateLabel = 'Today';
      } else if (diffDays === 1) {
        dateLabel = 'Yesterday';
      } else if (diffDays < 7) {
        dateLabel = date.toLocaleDateString('en-US', { weekday: 'long' });
      } else {
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
      }

      if (!groups.has(dateLabel)) {
        groups.set(dateLabel, []);
      }
      groups.get(dateLabel)!.push(activity);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }

  const groupedActivities = groupActivitiesByDate(activities);

  const filterTypes = [
    { key: 'all', label: 'All' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'chores', label: 'Chores' },
    { key: 'groups', label: 'Groups' },
    { key: 'listings', label: 'Listings' },
    { key: 'rides', label: 'Rides' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading activity feed...</Text>
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
          <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Feed</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filterTypes.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedFilter === filter.key && styles.filterChipSelected,
            ]}
            onPress={() => handleFilter(filter.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter.key && styles.filterChipTextSelected,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadActivities} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadActivities}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No activities</Text>
            <Text style={styles.emptySubtext}>
              Your activity feed will appear here as you use the app.
            </Text>
          </View>
        ) : (
          groupedActivities.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{group.date}</Text>
              {group.items.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={styles.activityCard}
                  onPress={() => handleActivityPress(activity)}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: `${getActivityColor(activity.type)}20` },
                      ]}
                    >
                      <MaterialIcons
                        name={getActivityIcon(activity.type) as any}
                        size={24}
                        color={getActivityColor(activity.type)}
                      />
                    </View>
                    <View style={styles.activityText}>
                      <Text style={styles.activityDescription}>{activity.description}</Text>
                      {activity.user && (
                        <Text style={styles.activityUser}>
                          {activity?.user?.profile?.displayName || activity?.user?.email || 'Unknown'}
                        </Text>
                      )}
                      <Text style={styles.activityTime}>{formatDate(activity.timestamp)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
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
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginLeft: 8,
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  filterContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    margin: 16,
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
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
    marginTop: 64,
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
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityText: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  activityUser: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

