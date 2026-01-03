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
import { getChores, Chore, getChoreStats, ChoreStats } from '../api/choreApi';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonChoreList } from '../components/SkeletonLoader';

interface ChoreListScreenProps {
  onCreateChore: () => void;
  onViewChore: (choreId: string) => void;
  onBack: () => void;
  onViewStats?: () => void;
  groupId?: string;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function ChoreListScreen({
  onCreateChore,
  onViewChore,
  onBack,
  onViewStats,
  groupId,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ChoreListScreenProps) {
  const { token, user } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [stats, setStats] = useState<ChoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadChores(true);
    loadStats();
  }, [token, groupId]);

  async function loadChores(reset: boolean = false) {
    if (!token) return;

    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      console.log('[ChoreListScreen] Loading chores, groupId:', groupId);
      const currentOffset = reset ? 0 : offset;
      const choresData = await getChores(token, groupId, limit, currentOffset);
      
      // Handle paginated response
      let choresList: Chore[];
      let paginationInfo: { hasMore: boolean; total: number } | null = null;
      
      if (Array.isArray(choresData)) {
        choresList = choresData;
      } else {
        choresList = choresData.chores || [];
        paginationInfo = {
          hasMore: choresData.hasMore || false,
          total: choresData.total || 0,
        };
      }
      
      console.log('[ChoreListScreen] Loaded chores:', choresList.length);
      
      if (reset) {
        setChores(choresList);
        setOffset(limit);
      } else {
        setChores(prev => [...prev, ...choresList]);
        setOffset(prev => prev + limit);
      }
      
      if (paginationInfo) {
        setHasMore(paginationInfo.hasMore);
      }
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    await loadChores(false);
  }

  async function loadStats() {
    if (!token || !onViewStats) return; // Only load stats if onViewStats is provided

    try {
      const statsData = await getChoreStats(token);
      setStats(statsData);
    } catch (err) {
      console.error('[ChoreListScreen] Failed to load stats:', err);
      // Don't show error for stats, just fail silently
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadChores(true), loadStats()]);
  }

  function getUserDisplayName(user: Chore['createdByUser'], currentUserId?: string): string {
    if (!user) return 'Unknown';
    if (user.id === currentUserId) {
      return 'you';
    }
    return user?.profile?.displayName || user?.email || 'Unknown';
  }
  
  function getUserDisplayNameForAssigned(user: Chore['assignedToUser'], currentUserId?: string): string {
    if (!user) return 'Unassigned';
    if (user?.id === currentUserId) {
      return 'you';
    }
    return user?.profile?.displayName || user?.email || 'Unknown';
  }

  function getStatusColor(status: Chore['status']): string {
    switch (status) {
      case 'pending':
        return '#F59E0B'; // Amber-500
      case 'assigned':
        return '#3B82F6'; // Blue-500
      case 'completed':
        return '#10B981'; // Green-500
      default:
        return '#6B7280'; // Gray-500
    }
  }

  function getStatusText(status: Chore['status']): string {
    switch (status) {
      case 'pending':
        return 'Unassigned';
      case 'assigned':
        return 'Assigned';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  }

  const pendingChores = chores.filter((c) => c.status === 'pending');
  const assignedChores = chores.filter((c) => c.status === 'assigned');
  const completedChores = chores.filter((c) => c.status === 'completed');

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={loadChores} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Fixed Header */}
      <Header
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Action Button - moved from header */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateChore}
              activeOpacity={0.7}
            >
              <Text style={styles.createButtonText}>+ New Task</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats Card */}
          {onViewStats && stats && (
            <TouchableOpacity
              style={styles.statsCard}
              onPress={onViewStats}
              activeOpacity={0.8}
            >
              <View style={styles.statsCardHeader}>
                <View style={styles.statsCardTitleContainer}>
                  <MaterialIcons name="emoji-events" size={24} color="#F59E0B" />
                  <Text style={styles.statsCardTitle}>Your Progress</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <MaterialIcons name="stars" size={20} color="#F59E0B" />
                  <Text style={styles.statValue}>{stats.totalPoints}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.statValue}>{stats.totalCompleted}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="local-fire-department" size={20} color="#EF4444" />
                  <Text style={styles.statValue}>{stats.currentStreak}</Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </View>
              </View>
              {stats.achievements.filter(a => a.unlocked).length > 0 && (
                <View style={styles.achievementsBadge}>
                  <MaterialIcons name="workspace-premium" size={16} color="#F59E0B" />
                  <Text style={styles.achievementsText}>
                    {stats.achievements.filter(a => a.unlocked).length} Achievement{stats.achievements.filter(a => a.unlocked).length !== 1 ? 's' : ''} Unlocked
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadChores}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {pendingChores.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Unassigned ({pendingChores.length})</Text>
              {pendingChores.map((chore) => (
                <TouchableOpacity
                  key={chore.id}
                  style={styles.choreCard}
                  onPress={() => onViewChore(chore.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.choreHeader}>
                    <Text style={styles.choreTitle}>{chore.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(chore.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(chore.status)}</Text>
                    </View>
                  </View>
                  {chore.description && (
                    <Text style={styles.choreDescription}>{chore.description}</Text>
                  )}
                  <View style={styles.choreFooter}>
                    <Text style={styles.chorePoints}>
                      {chore.points} points (+{Math.round(chore.points * 0.5)} bonus)
                    </Text>
                    {chore.group && (
                      <Text style={styles.choreGroup}>{chore.group.name}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {assignedChores.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Assigned ({assignedChores.length})</Text>
              {assignedChores.map((chore) => (
                <TouchableOpacity
                  key={chore.id}
                  style={styles.choreCard}
                  onPress={() => onViewChore(chore.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.choreHeader}>
                    <Text style={styles.choreTitle}>{chore.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(chore.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(chore.status)}</Text>
                    </View>
                  </View>
                  {chore.description && (
                    <Text style={styles.choreDescription}>{chore.description}</Text>
                  )}
                  <View style={styles.choreFooter}>
                    <Text style={styles.chorePoints}>{chore.points} points</Text>
                    {chore.assignedToUser && (
                      <Text style={styles.choreAssigned}>
                        Assigned to {getUserDisplayNameForAssigned(chore.assignedToUser, user?.id)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {completedChores.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Completed ({completedChores.length})</Text>
              {completedChores.map((chore) => (
                <TouchableOpacity
                  key={chore.id}
                  style={styles.choreCard}
                  onPress={() => onViewChore(chore.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.choreHeader}>
                    <Text style={[styles.choreTitle, styles.completedTitle]}>{chore.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(chore.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(chore.status)}</Text>
                    </View>
                  </View>
                  {chore.description && (
                    <Text style={styles.choreDescription}>{chore.description}</Text>
                  )}
                  <View style={styles.choreFooter}>
                    <Text style={styles.chorePoints}>
                      {chore.completions?.[0]?.pointsEarned || chore.points} points earned
                    </Text>
                    {chore.completions?.[0]?.user && (
                      <Text style={styles.choreCompleted}>
                        Completed by {chore.completions[0].user?.id === user?.id ? 'you' : (chore.completions[0].user?.profile?.displayName || chore.completions[0].user?.email || 'Unknown')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {chores.length === 0 && (
            <EmptyState
              icon="task"
              title="No tasks yet"
              message="Create your first chore to get started!"
              actionLabel="Create Chore"
              onAction={onCreateChore}
            />
          )}
          {hasMore && chores.length > 0 && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={loadMore}
              disabled={loadingMore}
              activeOpacity={0.7}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Text style={styles.loadMoreButtonText}>Load More</Text>
              )}
            </TouchableOpacity>
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
    paddingBottom: 24, // lg: 24px
  },
  content: {
    paddingHorizontal: 24, // lg: 24px
    paddingTop: 16, // md: 16px
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24, // lg: 24px
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16, // md: 16px
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
  },
  errorContainer: {
    padding: 16, // md: 16px
    backgroundColor: '#FEF2F2', // Red-50
    borderRadius: 8, // Button: 8px
    marginBottom: 16, // md: 16px
  },
  errorText: {
    fontSize: 14, // Body: 14px
    color: '#EF4444', // Red-500
    marginBottom: 8, // sm: 8px
  },
  retryButton: {
    backgroundColor: '#EF4444', // Red-500
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  sectionTitle: {
    fontSize: 24, // H2: 24px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    marginTop: 24, // lg: 24px
    marginBottom: 16, // md: 16px
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32, // xl: 32px
    marginTop: 24, // lg: 24px
  },
  emptyText: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#374151', // Gray-700
    marginBottom: 8, // sm: 8px
  },
  emptySubtext: {
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
    textAlign: 'center',
    marginBottom: 24, // lg: 24px
  },
  emptyButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  choreCard: {
    backgroundColor: '#fff',
    borderRadius: 12, // Card: 12px
    padding: 16, // md: 16px
    marginBottom: 16, // md: 16px
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
  },
  choreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // sm: 8px
  },
  choreTitle: {
    fontSize: 18, // H4: 18px
    fontWeight: '500', // Medium
    color: '#111827', // Gray-900
    flex: 1,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  statusBadge: {
    paddingVertical: 4, // xs: 4px
    paddingHorizontal: 8, // sm: 8px
    borderRadius: 4, // xs: 4px
  },
  statusText: {
    fontSize: 12, // Small: 12px
    color: '#fff',
    fontWeight: '500', // Medium
  },
  choreDescription: {
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
    marginBottom: 8, // sm: 8px
  },
  choreFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8, // sm: 8px
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // Gray-200
  },
  chorePoints: {
    fontSize: 14, // Body: 14px
    color: '#2563EB', // Primary Blue
    fontWeight: '500', // Medium
  },
  choreGroup: {
    fontSize: 12, // Small: 12px
    color: '#6B7280', // Gray-500
  },
  choreAssigned: {
    fontSize: 12, // Small: 12px
    color: '#6B7280', // Gray-500
  },
  choreCompleted: {
    fontSize: 12, // Small: 12px
    color: '#10B981', // Green-500
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  achievementsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    justifyContent: 'center',
  },
  achievementsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  placeholder: {
    width: 24,
  },
  loadMoreButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

