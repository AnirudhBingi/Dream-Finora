import React, { useState, useEffect } from 'react';
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
import { getChoreStats, ChoreStats } from '../api/choreApi';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';

interface ChoreStatsScreenProps {
  onBack: () => void;
}

export function ChoreStatsScreen({ onBack }: ChoreStatsScreenProps) {
  const { token } = useAuth();
  const [stats, setStats] = useState<ChoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [token]);

  async function loadStats() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const statsData = await getChoreStats(token);
      setStats(statsData);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chore Stats</Text>
          <View style={styles.placeholder} />
        </View>
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (error && !stats) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chore Stats</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState message={error} onRetry={loadStats} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chore Stats</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadStats} />}
      >
        {stats && (
          <>
            {/* Stats Overview */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialIcons name="stars" size={32} color="#F59E0B" />
                <Text style={styles.statValue}>{stats.totalPoints}</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="check-circle" size={32} color="#10B981" />
                <Text style={styles.statValue}>{stats.totalCompleted}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="local-fire-department" size={32} color="#EF4444" />
                <Text style={styles.statValue}>{stats.currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="schedule" size={32} color="#3B82F6" />
                <Text style={styles.statValue}>{stats.onTimePercentage}%</Text>
                <Text style={styles.statLabel}>On Time</Text>
              </View>
            </View>

            {/* Achievements Section */}
            <View style={styles.section}>
              <View style={styles.achievementsHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Achievements</Text>
                  <Text style={styles.sectionSubtitle}>
                    {stats.achievements.filter(a => a.unlocked).length} of {stats.achievements.length} unlocked
                  </Text>
                </View>
              </View>

              {stats.achievements.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.achievementsScrollContent}
                  style={styles.achievementsScrollView}
                >
                  {stats.achievements.map((achievement) => (
                    <View
                      key={achievement.id}
                      style={[
                        styles.achievementCard,
                        achievement.unlocked ? styles.achievementCardUnlocked : styles.achievementCardLocked,
                      ]}
                    >
                      <View
                        style={[
                          styles.achievementIcon,
                          achievement.unlocked ? styles.achievementIconUnlocked : styles.achievementIconLocked,
                        ]}
                      >
                        {achievement.unlocked ? (
                          <MaterialIcons name="emoji-events" size={32} color="#F59E0B" />
                        ) : (
                          <MaterialIcons name="lock" size={32} color="#9CA3AF" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.achievementName,
                          !achievement.unlocked && styles.achievementNameLocked,
                        ]}
                        numberOfLines={1}
                      >
                        {achievement.name}
                      </Text>
                      <Text style={styles.achievementDescription} numberOfLines={2}>
                        {achievement.description}
                      </Text>
                      {achievement.unlocked && (
                        <View style={styles.unlockedBadge}>
                          <MaterialIcons name="check-circle" size={16} color="#10B981" />
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="emoji-events" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No achievements yet</Text>
                  <Text style={styles.emptySubtext}>Complete chores to unlock achievements!</Text>
                </View>
              )}
            </View>

            {/* Recent Completions */}
            {stats.recentCompletions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Completions</Text>
                <View style={styles.completionsList}>
                  {stats.recentCompletions.map((completion) => (
                    <View key={completion.id} style={styles.completionCard}>
                      <View style={styles.completionInfo}>
                        <Text style={styles.completionTitle}>{completion.choreTitle}</Text>
                        <Text style={styles.completionDate}>
                          {new Date(completion.completedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.completionPoints}>
                        <MaterialIcons name="stars" size={20} color="#F59E0B" />
                        <Text style={styles.completionPointsText}>+{completion.pointsEarned}</Text>
                        {completion.onTime && (
                          <MaterialIcons name="check-circle" size={16} color="#10B981" style={styles.onTimeIcon} />
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementsScrollView: {
    marginHorizontal: -16,
  },
  achievementsScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  achievementCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  achievementCardUnlocked: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  achievementCardLocked: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  achievementIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIconUnlocked: {
    backgroundColor: '#FEF3C7',
  },
  achievementIconLocked: {
    backgroundColor: '#F3F4F6',
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  achievementNameLocked: {
    color: '#6B7280',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  unlockedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  completionsList: {
    gap: 12,
  },
  completionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  completionInfo: {
    flex: 1,
    marginRight: 12,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  completionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  completionPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completionPointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  onTimeIcon: {
    marginLeft: 4,
  },
});

