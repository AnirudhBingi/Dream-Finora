import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getChoreStats, ChoreStats } from '../api/choreApi';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { HeaderOption } from '../components/Header';

type Period = 'week' | 'month' | 'all-time';

interface ChoreStatsScreenProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function ChoreStatsScreen({ 
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ChoreStatsScreenProps) {
  const { token } = useAuth();
  const [stats, setStats] = useState<ChoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all-time');

  const headerOptions: HeaderOption[] = [];

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

  async function handleRefresh() {
    setRefreshing(true);
    await loadStats();
  }

  // Filter completions and calculate period-specific stats
  const periodStats = useMemo(() => {
    if (!stats) return null;

    const now = new Date();
    let startDate: Date | null = null;

    if (selectedPeriod === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (selectedPeriod === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    }

    // Filter recent completions by period
    const filteredCompletions = startDate
      ? stats.recentCompletions.filter(c => new Date(c.completedAt) >= startDate!)
      : stats.recentCompletions;

    // Calculate period-specific totals
    const periodPoints = filteredCompletions.reduce((sum, c) => sum + c.pointsEarned, 0);
    const periodCompleted = filteredCompletions.length;
    const periodOnTime = filteredCompletions.filter(c => c.onTime).length;
    const periodOnTimePercentage = periodCompleted > 0 
      ? Math.round((periodOnTime / periodCompleted) * 100) 
      : 0;

    return {
      totalPoints: periodPoints,
      totalCompleted: periodCompleted,
      onTimePercentage: periodOnTimePercentage,
      recentCompletions: filteredCompletions,
      // Keep all-time stats for achievements and streak
      currentStreak: stats.currentStreak,
      achievements: stats.achievements,
    };
  }, [stats, selectedPeriod]);

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Your Stats"
          onBack={onBack}
          useOptionsMenu={true}
          options={headerOptions}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (error && !stats) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Your Stats"
          onBack={onBack}
          useOptionsMenu={true}
          options={headerOptions}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={loadStats} />
      </SafeAreaView>
    );
  }

  const displayStats = periodStats || stats;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Your Stats"
        onBack={onBack}
        useOptionsMenu={true}
        options={headerOptions}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {displayStats && (
          <View style={styles.content}>
            {/* Period Selector */}
            <View style={styles.periodSelector}>
              {(['week', 'month', 'all-time'] as Period[]).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonActive,
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      selectedPeriod === period && styles.periodButtonTextActive,
                    ]}
                  >
                    {period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'All Time'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stats Overview */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialIcons name="stars" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{displayStats.totalPoints}</Text>
                <Text style={styles.statLabel}>
                  {selectedPeriod === 'all-time' ? 'Total Points' : 'Points'}
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
                  <MaterialIcons name="check-circle" size={24} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{displayStats.totalCompleted}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialIcons name="local-fire-department" size={24} color="#EF4444" />
                </View>
                <Text style={styles.statValue}>{displayStats.currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
                <Text style={styles.statNote}>All-time</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#EEF2FF' }]}>
                  <MaterialIcons name="schedule" size={24} color="#6366F1" />
                </View>
                <Text style={styles.statValue}>{displayStats.onTimePercentage}%</Text>
                <Text style={styles.statLabel}>On Time</Text>
              </View>
            </View>

            {/* Achievements Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Achievements</Text>
                  <Text style={styles.sectionSubtitle}>
                    {displayStats.achievements.filter(a => a.unlocked).length} of {displayStats.achievements.length} unlocked
                  </Text>
                </View>
              </View>

              {displayStats.achievements.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.achievementsScrollContent}
                  style={styles.achievementsScrollView}
                >
                  {displayStats.achievements.map((achievement) => (
                    <View
                      key={achievement.id}
                      style={[
                        styles.achievementCard,
                        achievement.unlocked ? styles.achievementCardUnlocked : styles.achievementCardLocked,
                      ]}
                    >
                      {achievement.unlocked && (
                        <View style={styles.unlockedBadge}>
                          <MaterialIcons name="check-circle" size={16} color="#10B981" />
                        </View>
                      )}
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
                      {achievement.unlocked && achievement.unlockedAt && (
                        <Text style={styles.unlockedDate}>
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyStateCard}>
                  <MaterialIcons name="emoji-events" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No achievements yet</Text>
                  <Text style={styles.emptySubtext}>Complete tasks to unlock achievements!</Text>
                </View>
              )}
            </View>

            {/* Recent Completions */}
            {displayStats.recentCompletions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {selectedPeriod === 'all-time' ? 'Recent Completions' : `${selectedPeriod === 'week' ? 'This Week' : 'This Month'}'s Completions`}
                </Text>
                <View style={styles.completionsList}>
                  {displayStats.recentCompletions.map((completion) => (
                    <View key={completion.id} style={styles.completionCard}>
                      <View style={styles.completionInfo}>
                        <View style={styles.completionHeader}>
                          <MaterialIcons name="task" size={18} color="#6366F1" />
                          <Text style={styles.completionTitle} numberOfLines={1}>
                            {completion.choreTitle}
                          </Text>
                        </View>
                        <Text style={styles.completionDate}>
                          {new Date(completion.completedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                      <View style={styles.completionPoints}>
                        <MaterialIcons name="stars" size={20} color="#F59E0B" />
                        <Text style={styles.completionPointsText}>+{completion.pointsEarned}</Text>
                        {completion.onTime && (
                          <View style={styles.onTimeBadge}>
                            <MaterialIcons name="schedule" size={12} color="#10B981" />
                            <Text style={styles.onTimeText}>On time</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : selectedPeriod !== 'all-time' && (
              <View style={styles.section}>
                <View style={styles.emptyStateCard}>
                  <MaterialIcons name="check-circle-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No completions this period</Text>
                  <Text style={styles.emptySubtext}>
                    Complete tasks to see your progress here!
                  </Text>
                </View>
              </View>
            )}
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
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
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#6366F1',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
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
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
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
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statNote: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  achievementsScrollView: {
    marginHorizontal: -16,
  },
  achievementsScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  achievementCard: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
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
    fontWeight: '700',
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
    marginBottom: 4,
  },
  unlockedDate: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  emptyStateCard: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    borderRadius: 16,
    padding: 16,
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
  completionInfo: {
    flex: 1,
    marginRight: 12,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  completionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  completionDate: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 26,
  },
  completionPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completionPointsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
  },
  onTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  onTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
});
