import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getGroupById, getGroupBalances, GroupWithExpenses, BalanceInfo } from '../api/groupApi';
import { createExpense, CreateExpenseDto } from '../api/expenseApi';
import { getChores, Chore, getGroupChoreStats, GroupChoreStats, getGroupLeaderboard, LeaderboardEntry, getGroupAchievements, GroupAchievements, getGroupChoreHistory, GroupChoreHistoryEntry, getGroupAnalytics, GroupAnalytics } from '../api/choreApi';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { getAvatarUrl } from '../utils/avatar';
import { useBottomNavPadding } from '../hooks/useBottomNavPadding';

interface GroupDetailScreenProps {
  groupId: string;
  onCreateExpense: () => void;
  onCreateChore?: () => void;
  onViewChore?: (choreId: string) => void;
  onViewAllChores?: () => void;
  onBack: () => void;
  onViewExpense?: (expenseId: string) => void;
  onSettings?: (groupId: string) => void;
  onAddMember?: (groupId: string) => void;
  onSettleUp?: (payeeId: string, amount: number, payeeName: string, groupId: string) => void;
  onMessageGroup?: (groupId: string, groupName: string) => void;
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function GroupDetailScreen({
  groupId,
  onCreateExpense,
  onCreateChore,
  onViewChore,
  onViewAllChores,
  onBack,
  onViewExpense,
  onSettings,
  onAddMember,
  onSettleUp,
  onMessageGroup,
  onNavigateToUserProfile,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: GroupDetailScreenProps) {
  const { token, user } = useAuth();
  const [group, setGroup] = useState<GroupWithExpenses | null>(null);
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [chores, setChores] = useState<Chore[]>([]);
  const [choreStats, setChoreStats] = useState<GroupChoreStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'week' | 'month' | 'all-time'>('all-time');
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [groupAchievements, setGroupAchievements] = useState<GroupAchievements | null>(null);
  const [groupHistory, setGroupHistory] = useState<GroupChoreHistoryEntry[]>([]);
  const [groupAnalytics, setGroupAnalytics] = useState<GroupAnalytics | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const bottomNavPadding = useBottomNavPadding();

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!group?.members) return [];
    if (!memberSearchQuery.trim()) return group.members;
    
    const query = memberSearchQuery.toLowerCase();
    return group.members.filter((member) => {
      const displayName = getUserDisplayName(member.user).toLowerCase();
      const email = member.user?.email?.toLowerCase() || '';
      return displayName.includes(query) || email.includes(query);
    });
  }, [group?.members, memberSearchQuery]);

  useEffect(() => {
    loadGroupData();
  }, [token, groupId]);

  async function loadGroupData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [groupData, balancesData, choresData, statsData, leaderboardData, achievementsData, historyData, analyticsData] = await Promise.all([
        getGroupById(token, groupId),
        getGroupBalances(token, groupId),
        getChores(token, groupId, 5, 0), // Get first 5 chores for preview
        getGroupChoreStats(token, groupId).catch(() => null), // Don't fail if stats fail
        getGroupLeaderboard(token, groupId, 'all-time').catch(() => ({ leaderboard: [], period: 'all-time', groupId, updatedAt: new Date().toISOString() })), // Don't fail if leaderboard fails
        getGroupAchievements(token, groupId).catch(() => null),
        getGroupChoreHistory(token, groupId, 20).catch(() => []),
        getGroupAnalytics(token, groupId, 30).catch(() => null),
      ]);
      setGroup(groupData);
      setBalances(balancesData);
      setChoreStats(statsData);
      // Handle new leaderboard response format
      if (leaderboardData && typeof leaderboardData === 'object' && 'leaderboard' in leaderboardData) {
        setLeaderboard(leaderboardData.leaderboard);
        setLeaderboardPeriod(leaderboardData.period || 'all-time');
      } else if (Array.isArray(leaderboardData)) {
        // Fallback for old format
      setLeaderboard(leaderboardData);
      }
      setGroupAchievements(achievementsData);
      setGroupHistory(historyData);
      setGroupAnalytics(analyticsData);
      
      // Handle paginated or array response for chores
      let choresList: Chore[] = [];
      if (Array.isArray(choresData)) {
        choresList = choresData;
      } else if (choresData && typeof choresData === 'object' && 'chores' in choresData) {
        choresList = (choresData as any).chores || [];
      }
      setChores(choresList);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  function getUserDisplayName(user: any): string {
    if (!user) return 'Unknown';
    return user.profile?.displayName || user.email || 'Unknown';
  }

  function isUserAdmin(): boolean {
    if (!group || !user) return false;
    // Creator is always an admin
    if (group.createdBy === user?.id) return true;
    // Check if user is in members array with ADMIN role
    if (!group.members || !Array.isArray(group.members)) return false;
    const member = group.members.find(m => m.userId === user?.id);
    return member?.role === 'ADMIN';
  }

  function isUserCreator(): boolean {
    return group?.createdBy === user?.id;
  }

  // Prepare right actions for header (add expense/chore + message group)
  const rightActions = group ? (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {onMessageGroup && (
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => onMessageGroup(group.id, group.name)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Message group"
        >
          <MaterialIcons name="message" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      {onCreateChore && (
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={onCreateChore}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Create task"
        >
          <MaterialIcons name="task" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.headerActionButton}
        onPress={onCreateExpense}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Chop a bill"
      >
        <MaterialIcons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  ) : undefined;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Circle Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Circle Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error || 'Circle not found'} onRetry={loadGroupData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Circle Details"
        onBack={onBack}
        rightActions={rightActions}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavPadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadGroupData} />
        }
      >
        <View style={styles.content}>

          {/* Group Header Card */}
          <View style={styles.groupHeaderCard}>
            <View style={styles.groupHeaderContent}>
              <View style={{ position: 'relative' }}>
                <Avatar
                  avatarUrl={getAvatarUrl(group.avatarUrl || null)}
                  displayName={group.name}
                  size={64}
                />
                {/* Group Icon Badge */}
                {group.icon && (
                  <View style={styles.groupIconBadge}>
                    <MaterialIcons
                      name={group.icon as any}
                      size={16}
                      color="#6366F1"
                    />
                  </View>
                )}
              </View>
              <View style={styles.groupHeaderText}>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.description && (
                  <Text style={styles.groupDescription} numberOfLines={2}>
                    {group.description}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Combined Stats Section - Balance + Chores */}
          {(balances || choreStats) && (
            <View style={styles.combinedStatsSection}>
              {/* Balance Summary - Compact */}
              {balances && (balances.totalOwed > 0 || balances.totalOwedToUser > 0) && (
                <View style={styles.compactBalanceCard}>
                  <View style={styles.compactBalanceHeader}>
                    <View style={styles.compactBalanceRow}>
                      <View style={styles.compactBalanceItem}>
                        <Text style={styles.compactBalanceLabel}>You Owe</Text>
                        <Text style={styles.compactBalanceAmountRed}>
                          {formatCurrency(balances.totalOwed, balances.primaryCurrency || 'USD')}
                        </Text>
                      </View>
                      <View style={styles.compactBalanceDivider} />
                      <View style={styles.compactBalanceItem}>
                        <Text style={styles.compactBalanceLabel}>You're Owed</Text>
                        <Text style={styles.compactBalanceAmountGreen}>
                          {formatCurrency(balances.totalOwedToUser, balances.primaryCurrency || 'USD')}
                        </Text>
                      </View>
                    </View>
                    {balances.netBalance !== 0 && (
                      <View style={styles.netBalanceRow}>
                        <Icon 
                          name={balances.netBalance > 0 ? "trending-up" : "trending-down"} 
                          size={14} 
                          color={balances.netBalance > 0 ? "#10B981" : "#EF4444"} 
                        />
                        <Text style={[styles.netBalanceText, balances.netBalance > 0 ? styles.netBalanceTextPositive : styles.netBalanceTextNegative]}>
                          {balances.netBalance > 0 ? 'Ahead by' : 'Owe'} {formatCurrency(Math.abs(balances.netBalance), balances.primaryCurrency || 'USD')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Chore Stats Summary - Compact */}
              {choreStats && choreStats.totalCompleted > 0 && (
                <View style={styles.compactChoreStatsCard}>
                  <View style={styles.compactChoreStatsHeader}>
                    <View style={styles.compactChoreStatsRow}>
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons name="task" size={18} color="#6366F1" />
                        <Text style={styles.compactChoreStatsLabel}>Tasks</Text>
                        <Text style={styles.compactChoreStatsValue}>{choreStats.totalCompleted}</Text>
                      </View>
                      <View style={styles.compactChoreStatsDivider} />
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons name="stars" size={18} color="#F59E0B" />
                        <Text style={styles.compactChoreStatsLabel}>Points</Text>
                        <Text style={styles.compactChoreStatsValue}>{choreStats.totalPoints}</Text>
                      </View>
                      {choreStats.overallCompletionRate !== undefined && (
                        <>
                          <View style={styles.compactChoreStatsDivider} />
                          <View style={styles.compactChoreStatsItem}>
                            <MaterialIcons name="check-circle" size={18} color="#10B981" />
                            <Text style={styles.compactChoreStatsLabel}>Rate</Text>
                            <Text style={styles.compactChoreStatsValue}>{choreStats.overallCompletionRate}%</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                  
                  {/* Analytics Row */}
                  {choreStats.fairnessScore !== undefined && (
                    <View style={styles.analyticsRow}>
                      <View style={styles.analyticsItem}>
                        <MaterialIcons name="balance" size={16} color="#8B5CF6" />
                        <Text style={styles.analyticsLabel}>Fairness</Text>
                        <Text style={styles.analyticsValue}>{choreStats.fairnessScore}%</Text>
                      </View>
                      <View style={styles.analyticsDivider} />
                      <View style={styles.analyticsItem}>
                        <MaterialIcons name="schedule" size={16} color="#06B6D4" />
                        <Text style={styles.analyticsLabel}>Avg Time</Text>
                        <Text style={styles.analyticsValue}>
                          {choreStats.members.length > 0 
                            ? Math.round(
                                choreStats.members.reduce((sum, m) => sum + (m.avgCompletionTimeHours || 0), 0) / 
                                choreStats.members.filter(m => m.avgCompletionTimeHours > 0).length
                              ) || 0
                            : 0
                          }h
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Top Contributors - Show top 3 */}
                  {choreStats.members.length > 0 && (
                    <View style={styles.topContributorsSection}>
                      <Text style={styles.topContributorsTitle}>Top Contributors</Text>
                      <View style={styles.topContributorsList}>
                        {choreStats.members.slice(0, 3).map((member) => (
                          <View key={member.userId} style={styles.topContributorItem}>
                            <View style={styles.topContributorRank}>
                              <Text style={styles.topContributorRankText}>#{member.rank}</Text>
                            </View>
                            <Avatar
                              avatarUrl={getAvatarUrl(member.avatarUrl)}
                              displayName={member.displayName}
                              size={32}
                            />
                            <View style={styles.topContributorInfo}>
                              <Text style={styles.topContributorName} numberOfLines={1}>
                                {member.userId === user?.id ? 'You' : member.displayName}
                              </Text>
                              <View style={styles.topContributorPoints}>
                                <MaterialIcons name="stars" size={14} color="#F59E0B" />
                                <Text style={styles.topContributorPointsText}>{member.totalPoints} pts</Text>
                                <Text style={styles.topContributorTasksText}>• {member.totalCompleted} tasks</Text>
                                {member.completionRate !== undefined && (
                                  <Text style={styles.topContributorRateText}>• {member.completionRate}%</Text>
                                )}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Chore Leaderboard Section */}
          {leaderboard.length > 0 && (
            <View style={styles.leaderboardSectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <MaterialIcons name="leaderboard" size={20} color="#6366F1" />
                  <Text style={styles.sectionTitle}>Leaderboard</Text>
                </View>
                {/* Period Selector */}
                <View style={styles.periodSelector}>
                  {(['week', 'month', 'all-time'] as const).map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodButton,
                        leaderboardPeriod === period && styles.periodButtonActive,
                      ]}
                      onPress={async () => {
                        try {
                          const data = await getGroupLeaderboard(token!, groupId, period);
                          setLeaderboard(data.leaderboard);
                          setLeaderboardPeriod(period);
                        } catch (err) {
                          console.error('Failed to load leaderboard:', err);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.periodButtonText,
                          leaderboardPeriod === period && styles.periodButtonTextActive,
                        ]}
                      >
                        {period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'All Time'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
                {leaderboard.length > 3 && (
                  <TouchableOpacity
                  style={styles.expandButtonLeaderboard}
                    onPress={() => setShowFullLeaderboard(!showFullLeaderboard)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.expandButtonText}>
                      {showFullLeaderboard ? 'Show Less' : 'Show All'}
                    </Text>
                    <MaterialIcons 
                      name={showFullLeaderboard ? "expand-less" : "expand-more"} 
                      size={20} 
                      color="#6366F1" 
                    />
                  </TouchableOpacity>
                )}

              {/* Motivational Message for Current User */}
              {(() => {
                const currentUserEntry = leaderboard.find(e => e.userId === user?.id);
                if (currentUserEntry && currentUserEntry.rank > 1) {
                  const previousEntry = leaderboard[currentUserEntry.rank - 2];
                  const pointsBehind = previousEntry.totalPoints - currentUserEntry.totalPoints;
                  return (
                    <View key="motivational" style={styles.motivationalMessage}>
                      <MaterialIcons name="trending-up" size={20} color="#6366F1" />
                      <Text style={styles.motivationalText}>
                        {'You\'re #' + currentUserEntry.rank + '! ' + pointsBehind + ' points behind ' + previousEntry.displayName + '. Keep going! 💪'}
                      </Text>
              </View>
                  );
                }
                if (currentUserEntry && currentUserEntry.rank === 1) {
                  return (
                    <View key="motivational" style={styles.motivationalMessage}>
                      <MaterialIcons name="emoji-events" size={20} color="#FFD700" />
                      <Text style={styles.motivationalText}>
                        You're #1! 🏆 Keep up the great work!
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}

              <View style={styles.leaderboardList}>
                {(showFullLeaderboard ? leaderboard : leaderboard.slice(0, 3)).map((entry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  const rankColors: Record<number, string> = {
                    1: '#FFD700', // Gold
                    2: '#C0C0C0', // Silver
                    3: '#CD7F32', // Bronze
                  };
                  const rankColor = rankColors[entry.rank] || '#6B7280';

                  return (
                    <View 
                      key={entry.userId} 
                      style={[
                        styles.leaderboardItem,
                        isCurrentUser && styles.leaderboardItemCurrentUser,
                      ]}
                    >
                      <View style={styles.leaderboardRankContainer}>
                        {entry.rank <= 3 ? (
                          <View style={[styles.leaderboardRankBadge, { backgroundColor: rankColor }]}>
                            <MaterialIcons name="emoji-events" size={16} color="#FFFFFF" />
                          </View>
                        ) : (
                          <View style={styles.leaderboardRankNumber}>
                            <Text style={styles.leaderboardRankText}>#{entry.rank}</Text>
                          </View>
                        )}
                      </View>
                      
                      <Avatar
                        avatarUrl={getAvatarUrl(entry.avatarUrl)}
                        displayName={entry.displayName}
                        size={40}
                      />
                      
                      <View style={styles.leaderboardUserInfo}>
                        <View style={styles.leaderboardUserNameRow}>
                          <Text style={styles.leaderboardUserName} numberOfLines={1}>
                            {isCurrentUser ? 'You' : entry.displayName}
                          </Text>
                          {isCurrentUser && (
                            <View style={styles.currentUserBadge}>
                              <Text style={styles.currentUserBadgeText}>You</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.leaderboardStatsRow}>
                          {entry.totalCompleted !== undefined && (
                          <View style={styles.leaderboardStatItem}>
                              <MaterialIcons name="check-circle" size={14} color="#10B981" />
                              <Text style={styles.leaderboardStatText}>{entry.totalCompleted} done</Text>
                          </View>
                          )}
                          {entry.currentStreak !== undefined && entry.currentStreak > 0 && (
                            <View style={styles.leaderboardStatItem}>
                              <MaterialIcons name="local-fire-department" size={14} color="#EF4444" />
                              <Text style={styles.leaderboardStatText}>{entry.currentStreak}🔥</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      <View style={styles.leaderboardPointsContainer}>
                        <View style={styles.leaderboardPointsRow}>
                          <MaterialIcons name="stars" size={18} color="#F59E0B" />
                        <Text style={styles.leaderboardPointsText}>{entry.totalPoints}</Text>
                        </View>
                        <Text style={styles.leaderboardPointsLabel}>points</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {!showFullLeaderboard && leaderboard.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllLeaderboardButton}
                  onPress={() => setShowFullLeaderboard(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllLeaderboardText}>
                    View all {leaderboard.length} members
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color="#6366F1" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Group Achievements Section */}
          {groupAchievements && groupAchievements.achievements.length > 0 && (
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowAchievements(!showAchievements)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleRow}>
                  <MaterialIcons name="emoji-events" size={20} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>Group Achievements</Text>
                  <Text style={styles.achievementCount}>
                    {groupAchievements.achievements.filter(a => a.unlocked).length}/{groupAchievements.achievements.length}
                  </Text>
                </View>
                <MaterialIcons
                  name={showAchievements ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
              {showAchievements && (
                <View style={styles.achievementsGrid}>
                  {groupAchievements.achievements.map((achievement) => (
                    <View
                      key={achievement.id}
                      style={[
                        styles.achievementCard,
                        !achievement.unlocked && styles.achievementCardLocked,
                      ]}
                    >
                      <MaterialIcons
                        name={achievement.unlocked ? 'emoji-events' : 'lock'}
                        size={32}
                        color={achievement.unlocked ? '#F59E0B' : '#9CA3AF'}
                      />
                      <Text style={[styles.achievementName, !achievement.unlocked && styles.achievementNameLocked]}>
                        {achievement.name}
                      </Text>
                      <Text style={styles.achievementDescription}>{achievement.description}</Text>
                      {achievement.progress !== undefined && achievement.target && (
                        <View style={styles.achievementProgress}>
                          <View style={styles.progressBar}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>
                            {achievement.progress}/{achievement.target}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Group History Section */}
          {groupHistory.length > 0 && (
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowHistory(!showHistory)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleRow}>
                  <MaterialIcons name="history" size={20} color="#6366F1" />
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <Text style={styles.historyCount}>{groupHistory.length}</Text>
                </View>
                <MaterialIcons
                  name={showHistory ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
              {showHistory && (
                <View>
                  {groupHistory.slice(0, 10).map((entry) => (
                    <View key={entry.id} style={styles.historyItem}>
                      <View style={styles.historyIcon}>
                        <MaterialIcons
                          name={
                            entry.action === 'completed' ? 'check-circle' :
                            entry.action === 'created' ? 'add-circle' :
                            entry.action === 'assigned' ? 'person-add' :
                            'history'
                          }
                          size={20}
                          color="#6366F1"
                        />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyText}>
                          <Text style={styles.historyUserName}>
                            {entry.user.profile?.displayName || entry.user.email}
                          </Text>
                          {' '}{entry.action} {entry.choreTitle}
                        </Text>
                        <Text style={styles.historyTime}>
                          {new Date(entry.createdAt).toLocaleDateString()} at {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Group Analytics Section */}
          {groupAnalytics && (
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowAnalytics(!showAnalytics)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleRow}>
                  <MaterialIcons name="analytics" size={20} color="#8B5CF6" />
                  <Text style={styles.sectionTitle}>Analytics ({groupAnalytics.period} days)</Text>
                </View>
                <MaterialIcons
                  name={showAnalytics ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
              {showAnalytics && (
                <View>
                  <View style={styles.analyticsSummary}>
                    <View style={styles.analyticsSummaryItem}>
                      <Text style={styles.analyticsSummaryValue}>{groupAnalytics.totalCompletions}</Text>
                      <Text style={styles.analyticsSummaryLabel}>Completed</Text>
                    </View>
                    <View style={styles.analyticsSummaryItem}>
                      <Text style={styles.analyticsSummaryValue}>{groupAnalytics.totalPoints}</Text>
                      <Text style={styles.analyticsSummaryLabel}>Points</Text>
                    </View>
                    <View style={styles.analyticsSummaryItem}>
                      <Text style={styles.analyticsSummaryValue}>{groupAnalytics.categoryBreakdown.length}</Text>
                      <Text style={styles.analyticsSummaryLabel}>Categories</Text>
                    </View>
                  </View>
                  
                  {groupAnalytics.categoryBreakdown.length > 0 && (
                    <View style={styles.categoryBreakdown}>
                      <Text style={styles.analyticsSubtitle}>Category Breakdown</Text>
                      {groupAnalytics.categoryBreakdown.map((cat) => (
                        <View key={cat.category} style={styles.categoryItem}>
                          <Text style={styles.categoryName}>{cat.category}</Text>
                          <View style={styles.categoryStats}>
                            <Text style={styles.categoryCount}>{cat.count} tasks</Text>
                            <Text style={styles.categoryPoints}>{cat.points} pts</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Members Section Card */}
          <View style={styles.membersSectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Members</Text>
                <View style={styles.sectionTitleMeta}>
                  <Icon name="people" size={16} color="#6B7280" />
                  <Text style={styles.memberCountText}>
                    {group.members?.length || 0}
                  </Text>
                </View>
              </View>
              {onSettings && (
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => onSettings(groupId)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Circle settings"
                >
                  <Icon name="settings" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            {/* Member Search */}
            {group.members && group.members.length > 3 && (
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search members..."
                  value={memberSearchQuery}
                  onChangeText={setMemberSearchQuery}
                  placeholderTextColor="#9CA3AF"
                />
                {memberSearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setMemberSearchQuery('')}
                    style={styles.clearSearchButton}
                  >
                    <Icon name="close" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {(!group.members || group.members.length === 0) ? (
              <View style={styles.emptyMembersContainer}>
                <Icon name="people-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyMembersText}>No members yet</Text>
                <Text style={styles.emptyMembersSubtext}>
                  {isUserAdmin() 
                    ? 'Add members to start splitting bills together'
                    : 'Members will appear here once added'}
                </Text>
                {isUserAdmin() && onAddMember && (
                  <TouchableOpacity
                    style={styles.emptyAddButton}
                    onPress={() => onAddMember(groupId)}
                    activeOpacity={0.7}
                  >
                    <Icon name="person-add" size={20} color="#FFFFFF" />
                    <Text style={styles.emptyAddButtonText}>Add Your First Member</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : filteredMembers.length === 0 ? (
              <View style={styles.emptySearchContainer}>
                <Icon name="search-off" size={32} color="#9CA3AF" />
                <Text style={styles.emptySearchText}>No members found</Text>
                <Text style={styles.emptySearchSubtext}>
                  Try a different search term
                </Text>
              </View>
            ) : (
              filteredMembers.map((member) => {
              const isCurrentUser = member.userId === user?.id;
              
              // Calculate balance with this member within the group
              const memberBalance = balances ? (() => {
                const owedTo = balances.owedToUser.find(item => item?.user?.id === member.userId);
                const owedBy = balances.owedByUser.find(item => item?.user?.id === member.userId);
                const netBalance = (owedTo?.amount || 0) - (owedBy?.amount || 0);
                return { netBalance, owedTo: owedTo?.amount || 0, owedBy: owedBy?.amount || 0 };
              })() : null;
              
              return (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberRow}
                  onPress={() => {
                    if (!isCurrentUser && onNavigateToUserProfile) {
                      onNavigateToUserProfile(member.userId);
                    }
                  }}
                  activeOpacity={isCurrentUser ? 1 : 0.7}
                  disabled={isCurrentUser}
                >
                <View style={styles.memberInfo}>
                  <Avatar
                    avatarUrl={member.user?.profile?.avatarUrl}
                    displayName={getUserDisplayName(member.user)}
                    size={48}
                    borderWidth={2}
                    borderColor="#FFFFFF"
                  />
                  <View style={styles.memberDetails}>
                <Text style={styles.memberName}>
                        {isCurrentUser ? 'You' : getUserDisplayName(member.user)}
                </Text>
                      {!member.user?.profile?.displayName && member.user?.email && (
                        <Text style={styles.memberEmail}>{member.user.email}</Text>
                      )}
                      {/* Show balance with this member */}
                      {!isCurrentUser && memberBalance && Math.abs(memberBalance.netBalance) > 0.01 && (
                        <Text style={[
                          styles.memberBalance,
                          memberBalance.netBalance >= 0 ? styles.memberBalancePositive : styles.memberBalanceNegative
                        ]}>
                          {memberBalance.netBalance >= 0 
                            ? `Owes you ${formatCurrency(memberBalance.netBalance, balances?.primaryCurrency || 'USD')}`
                            : `You owe ${formatCurrency(Math.abs(memberBalance.netBalance), balances?.primaryCurrency || 'USD')}`}
                        </Text>
                      )}
                      {!isCurrentUser && memberBalance && Math.abs(memberBalance.netBalance) < 0.01 && (
                        <Text style={styles.memberBalanceSettled}>Settled up</Text>
                      )}
                  </View>
                </View>
                <View style={styles.memberBadges}>
                {member.userId === group.createdBy && (
                    <View style={[styles.badge, styles.creatorBadge]}>
                      <Icon name="star" size={12} color="#F59E0B" />
                      <Text style={styles.badgeText}>Creator</Text>
                    </View>
                  )}
                  {member.role === 'ADMIN' && member.userId !== group.createdBy && (
                    <View style={[styles.badge, styles.adminBadge]}>
                      <Icon name="admin-panel-settings" size={12} color="#6366F1" />
                      <Text style={styles.badgeText}>Admin</Text>
                    </View>
                )}
                {/* Settle Up Button */}
                {!isCurrentUser && onSettleUp && memberBalance && Math.abs(memberBalance.netBalance) > 0.01 && (
                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      const settleAmount = Math.abs(memberBalance.netBalance);
                      const memberName = getUserDisplayName(member.user);
                      onSettleUp(member.userId, settleAmount, memberName, groupId);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.settleButtonText}>Settle</Text>
                  </TouchableOpacity>
                )}
                </View>
                </TouchableOpacity>
              );
              })
            )}
          </View>

          {/* Chores Section Card */}
          {onCreateChore && (
            <View style={styles.choresSectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Tasks</Text>
                {chores.length > 0 && onViewAllChores && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={onViewAllChores}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllButtonText}>View All</Text>
                    <Icon name="chevron-right" size={16} color="#6366F1" />
                  </TouchableOpacity>
                )}
              </View>

              {chores.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No tasks yet</Text>
                  <Text style={styles.emptySubtext}>
                    Create the first task for this circle!
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={onCreateChore}
                  >
                    <Text style={styles.emptyButtonText}>Create Task</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                chores.map((chore) => {
                  const formatDate = (dateString: string): string => {
                    const date = new Date(dateString);
                    const now = new Date();
                    const diff = now.getTime() - date.getTime();
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    if (days === 0) return 'Today';
                    if (days === 1) return 'Yesterday';
                    if (days < 7) return `${days} days ago`;
                    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
                    return date.toLocaleDateString();
                  };

                  const getStatusColor = (status: string): string => {
                    switch (status) {
                      case 'pending':
                        return '#F59E0B';
                      case 'assigned':
                        return '#3B82F6';
                      case 'completed':
                        return '#10B981';
                      default:
                        return '#6B7280';
                    }
                  };

                  const getStatusText = (status: string): string => {
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
                  };

                  return (
                    <TouchableOpacity
                      key={chore.id}
                      style={styles.choreCard}
                      onPress={() => onViewChore && onViewChore(chore.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.choreHeader}>
                        <View style={styles.choreInfo}>
                          <Text style={styles.choreTitle} numberOfLines={1}>
                            {chore.title}
                          </Text>
                          <View style={styles.choreMeta}>
                            <Text style={styles.choreDate}>
                              {formatDate(chore.createdAt)}
                            </Text>
                            {chore.dueDate && (
                              <Text style={styles.choreDueDate}>
                                • Due {new Date(chore.dueDate).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={[styles.choreStatusBadge, { backgroundColor: getStatusColor(chore.status) }]}>
                          <Text style={styles.choreStatusText}>
                            {getStatusText(chore.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.choreFooter}>
                        <View style={styles.chorePointsContainer}>
                          <MaterialIcons name="stars" size={16} color="#F59E0B" />
                          <Text style={styles.chorePoints}>{chore.points} points</Text>
                        </View>
                        {chore.assignedToUser && (
                          <Text style={styles.choreAssigned}>
                            {chore.assignedToUser.id === user?.id 
                              ? 'Assigned to you' 
                              : `Assigned to ${chore.assignedToUser.profile?.displayName || chore.assignedToUser.email}`}
                          </Text>
                        )}
                      </View>

                      <Icon
                        name="chevron-right"
                        size={20}
                        color="#9CA3AF"
                        style={styles.chevron}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* Expenses Section Card */}
          <View style={styles.expensesSectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Billchops</Text>
              {group.expenses && group.expenses.length > 0 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => {
                    // TODO: Navigate to full expense list for this group
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllButtonText}>View All</Text>
                  <Icon name="chevron-right" size={16} color="#6366F1" />
                </TouchableOpacity>
              )}
            </View>

          {(!group.expenses || group.expenses.length === 0) ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No billchops yet</Text>
              <Text style={styles.emptySubtext}>
                Create the first billchop for this circle!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={onCreateExpense}
              >
                <Text style={styles.emptyButtonText}>Chop a bill</Text>
              </TouchableOpacity>
            </View>
          ) : (
            (group.expenses || []).map((expense) => {
              const paidByUser = expense.paidByUser || expense.createdByUser;
              const isCreator = expense.createdBy === user?.id;
              const formatDate = (dateString: string): string => {
                const date = new Date(dateString);
                const now = new Date();
                const diff = now.getTime() - date.getTime();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                if (days === 0) return 'Today';
                if (days === 1) return 'Yesterday';
                if (days < 7) return `${days} days ago`;
                if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
                return date.toLocaleDateString();
              };

              return (
                <TouchableOpacity
                  key={expense.id}
                  style={styles.expenseCard}
                  onPress={() => onViewExpense && onViewExpense(expense.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.expenseHeader}>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseDescription} numberOfLines={1}>
                        {expense.description}
                      </Text>
                      <View style={styles.expenseMeta}>
                        <Text style={styles.expenseDate}>
                          {formatDate(expense.date)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.expenseAmount}>
                      {formatCurrency(expense.amount, expense.currency)}
                    </Text>
                  </View>

                  <View style={styles.splitInfo}>
                    {paidByUser && (
                      <Text style={styles.splitText}>
                        {isCreator ? 'You' : getUserDisplayName(paidByUser)} paid {formatCurrency(expense.amount, expense.currency)}
                      </Text>
                    )}

                    {(expense.splits || []).length > 0 && (
                      <View style={styles.splitDetails}>
                        {(expense.splits || []).map((split) => {
                          const splitUser = split.user;
                          const isCurrentUser = split.userId === user?.id;
                          return (
                            <Text key={split.id} style={styles.splitDetailText}>
                              {isCurrentUser ? 'You' : getUserDisplayName(splitUser)}: {formatCurrency(split.amount, expense.currency)}
                              {split.isPaid && (
                                <Text style={styles.paidBadge}> • Paid</Text>
                              )}
                            </Text>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  <Icon
                    name="chevron-right"
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              );
            })
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
    // paddingBottom is handled by useBottomNavPadding hook
  },
  content: {
    paddingHorizontal: 16, // Reduced to 16px for better screen usage
    paddingTop: 16,
  },
  headerActionButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 16, // Button: 16px horizontal
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24, // lg: 24px
  },
  errorText: {
    fontSize: 16, // Body: 16px
    color: '#EF4444', // Red-500
    marginBottom: 16, // md: 16px
    textAlign: 'center',
  },
  groupHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  groupAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginRight: 16,
  },
  groupIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  groupHeaderText: {
    flex: 1,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 28.8,
    letterSpacing: -0.3,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 4,
  },
  groupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  groupMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceSection: {
    marginHorizontal: -16, // Extend to edges (negative margin to counteract content padding)
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  combinedStatsSection: {
    marginBottom: 16,
    gap: 12,
  },
  compactBalanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  compactBalanceHeader: {
    gap: 12,
  },
  compactBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  compactBalanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  compactBalanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactBalanceAmountRed: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
  },
  compactBalanceAmountGreen: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  compactBalanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  netBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  netBalanceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  netBalanceTextPositive: {
    color: '#10B981',
  },
  netBalanceTextNegative: {
    color: '#EF4444',
  },
  compactChoreStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  compactChoreStatsHeader: {
    marginBottom: 16,
  },
  compactChoreStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  compactChoreStatsItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  compactChoreStatsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactChoreStatsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  compactChoreStatsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  topContributorsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  topContributorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topContributorsList: {
    gap: 12,
  },
  topContributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topContributorRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topContributorRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  topContributorInfo: {
    flex: 1,
  },
  topContributorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  topContributorPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topContributorPointsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  topContributorTasksText: {
    fontSize: 13,
    color: '#6B7280',
  },
  topContributorRateText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  analyticsItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  analyticsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  analyticsDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  leaderboardSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  leaderboardList: {
    gap: 12,
    marginTop: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  leaderboardItemCurrentUser: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
    borderWidth: 1.5,
  },
  leaderboardRankContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardRankNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  leaderboardUserInfo: {
    flex: 1,
  },
  leaderboardUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  leaderboardUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  currentUserBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentUserBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  leaderboardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leaderboardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderboardStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  leaderboardPointsContainer: {
    alignItems: 'flex-end',
  },
  leaderboardPointsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  leaderboardPointsLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  leaderboardPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandButtonLeaderboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 8,
  },
  // Period Selector Styles
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#6366F1',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  // Motivational Message
  motivationalMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  motivationalText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  viewAllLeaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewAllLeaderboardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  balanceFlowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  netBalanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  netBalanceIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  netBalanceIndicatorPositive: {
    backgroundColor: '#D1FAE5',
  },
  netBalanceIndicatorNegative: {
    backgroundColor: '#FEE2E2',
  },
  netBalanceBannerText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  netBalanceBannerAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  netBalanceBannerAmountPositive: {
    color: '#10B981',
  },
  netBalanceBannerAmountNegative: {
    color: '#EF4444',
  },
  balanceFlowContainer: {
    flexDirection: 'row',
    minHeight: 110,
    position: 'relative',
  },
  balanceFlowSide: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  balanceFlowSideLeft: {
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    backgroundColor: '#FEF2F2',
  },
  balanceFlowSideRight: {
    backgroundColor: '#F0FDF4',
  },
  balanceFlowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  balanceFlowIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  balanceFlowLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceFlowAmountRed: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
  },
  balanceFlowAmountGreen: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  balanceFlowDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    zIndex: 10,
  },
  balanceFlowConnector: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    left: -22.5,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  membersSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  membersSection: {
    marginBottom: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptySearchText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // md: 16px
  },
  sectionTitle: {
    fontSize: 18, // Match ExpenseListScreen
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
    marginBottom: 0, // Remove default margin
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCountText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  settingsButton: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  addMemberButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  emptyMembersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyMembersText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyMembersSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16, // Body: 16px
    fontWeight: '500',
    color: '#111827', // Gray-900
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280', // Gray-500
  },
  memberBalance: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  memberBalancePositive: {
    color: '#10B981', // Green
  },
  memberBalanceNegative: {
    color: '#EF4444', // Red
  },
  memberBalanceSettled: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  memberBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  settleButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creatorBadge: {
    backgroundColor: '#FEF3C7', // Amber-100
  },
  adminBadge: {
    backgroundColor: '#EEF2FF', // Indigo-100
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  expensesSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  expensesSection: {
    marginTop: 0,
    marginBottom: 0,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32, // xl: 32px
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
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  expenseCard: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 24,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  expenseDate: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  splitInfo: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  splitText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  splitDetails: {
    marginTop: 4,
    gap: 4,
  },
  splitDetailText: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
    fontWeight: '500',
  },
  paidBadge: {
    color: '#10B981',
    fontWeight: '600',
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: 20,
  },
  choresSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  choreCard: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  choreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 24,
  },
  choreInfo: {
    flex: 1,
    marginRight: 12,
  },
  choreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  choreMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  choreDate: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  choreDueDate: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  choreStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  choreStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  choreFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  chorePointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chorePoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  choreAssigned: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Achievements styles
  achievementCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 8,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  achievementCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  achievementCardLocked: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 8,
    textAlign: 'center',
  },
  achievementNameLocked: {
    color: '#6B7280',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#78350F',
    textAlign: 'center',
    marginTop: 4,
  },
  achievementProgress: {
    width: '100%',
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#78350F',
    textAlign: 'center',
    fontWeight: '500',
  },
  // History styles
  historyCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 8,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  historyUserName: {
    fontWeight: '600',
    color: '#111827',
  },
  historyTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Analytics styles
  analyticsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  analyticsSummaryItem: {
    alignItems: 'center',
  },
  analyticsSummaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  analyticsSummaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  analyticsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
  },
  categoryBreakdown: {
    marginTop: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  categoryPoints: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
});

