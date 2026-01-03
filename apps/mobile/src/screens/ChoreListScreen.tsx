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
import { useAuth } from '../auth/authContext';
import { getChores, Chore } from '../api/choreApi';

interface ChoreListScreenProps {
  onCreateChore: () => void;
  onViewChore: (choreId: string) => void;
  onBack: () => void;
  groupId?: string;
}

export function ChoreListScreen({
  onCreateChore,
  onViewChore,
  onBack,
  groupId,
}: ChoreListScreenProps) {
  const { token, user } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChores();
  }, [token, groupId]);

  async function loadChores() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      console.log('[ChoreListScreen] Loading chores, groupId:', groupId);
      const choresData = await getChores(token, groupId);
      console.log('[ChoreListScreen] Loaded chores:', choresData.length);
      setChores(choresData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getUserDisplayName(user: Chore['createdByUser'], currentUserId?: string): string {
    if (user.id === currentUserId) {
      return 'you';
    }
    return user.profile?.displayName || user.email;
  }
  
  function getUserDisplayNameForAssigned(user: Chore['assignedToUser'], currentUserId?: string): string {
    if (!user) return 'Unassigned';
    if (user.id === currentUserId) {
      return 'you';
    }
    return user.profile?.displayName || user.email;
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={loadChores} />
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
            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateChore}
              activeOpacity={0.7}
            >
              <Text style={styles.createButtonText}>+ New Task</Text>
            </TouchableOpacity>
          </View>

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
                        Completed by {chore.completions[0].user?.id === user?.id ? 'you' : getUserDisplayName(chore.completions[0].user!, user?.id)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {chores.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tasks yet</Text>
              <Text style={styles.emptySubtext}>
                Create your first chore to get started!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={onCreateChore}
              >
                <Text style={styles.emptyButtonText}>Create Chore</Text>
              </TouchableOpacity>
            </View>
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
    // No paddingTop - SafeAreaView handles top spacing
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // md: 16px
  },
  backButton: {
    paddingVertical: 8, // sm: 8px
    paddingHorizontal: 4, // xs: 4px
    minHeight: 44, // Touch target
  },
  backButtonText: {
    fontSize: 16, // Body: 16px
    color: '#2563EB', // Primary Blue
    fontWeight: '500', // Medium
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
});

