import React, { useState, useMemo } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getGroupById,
  getGroupBalances,
  GroupWithExpenses,
  BalanceInfo,
} from "../api/groupApi";
import { createExpense, CreateExpenseDto } from "../api/expenseApi";
import {
  getChores,
  Chore,
  getGroupChoreStats,
  GroupChoreStats,
  getGroupLeaderboard,
  LeaderboardEntry,
  getGroupAchievements,
  GroupAchievements,
  getGroupChoreHistory,
  GroupChoreHistoryEntry,
  getGroupAnalytics,
  GroupAnalytics,
} from "../api/choreApi";
import { SkeletonDetailScreen } from "../components/SkeletonLoader";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { useBottomNavPadding } from "../hooks/useBottomNavPadding";
import { useTheme } from "../theme";

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
  onSettleUp?: (
    payeeId: string,
    amount: number,
    payeeName: string,
    groupId: string,
  ) => void;
  onMessageGroup?: (groupId: string, groupName: string) => void;
  onViewFeed?: (groupId: string) => void;
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
  onViewFeed,
  onNavigateToUserProfile,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: GroupDetailScreenProps) {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<
    "week" | "month" | "all-time"
  >("all-time");
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [expenseFilter, setExpenseFilter] = useState<"all" | "rides">("all");
  const bottomNavPadding = useBottomNavPadding();

  interface GroupDetailData {
    group: GroupWithExpenses;
    balances: BalanceInfo;
    chores: Chore[];
    choreStats: GroupChoreStats | null;
    leaderboard: LeaderboardEntry[];
    leaderboardPeriod: "week" | "month" | "all-time";
    groupAchievements: GroupAchievements | null;
    groupHistory: GroupChoreHistoryEntry[];
    groupAnalytics: GroupAnalytics | null;
  }

  const { data, loading, refreshing, error, refresh, refetch } =
    useDataFetch<GroupDetailData>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        const [
          groupData,
          balancesData,
          choresData,
          statsData,
          leaderboardData,
          achievementsData,
          historyData,
          analyticsData,
        ] = await Promise.all([
          getGroupById(token, groupId),
          getGroupBalances(token, groupId),
          getChores(token, groupId, 5, 0), // Get first 5 chores for preview
          getGroupChoreStats(token, groupId).catch(() => null),
          getGroupLeaderboard(token, groupId, "all-time").catch(() => ({
            leaderboard: [],
            period: "all-time" as const,
            groupId,
            updatedAt: new Date().toISOString(),
          })),
          getGroupAchievements(token, groupId).catch(() => null),
          getGroupChoreHistory(token, groupId, 20).catch(() => []),
          getGroupAnalytics(token, groupId, 30).catch(() => null),
        ]);

        // Handle paginated or array response for chores
        let choresList: Chore[] = [];
        if (Array.isArray(choresData)) {
          choresList = choresData;
        } else if (
          choresData &&
          typeof choresData === "object" &&
          "chores" in choresData
        ) {
          choresList = (choresData as any).chores || [];
        }

        // Handle leaderboard response format
        let leaderboard: LeaderboardEntry[] = [];
        let period: "week" | "month" | "all-time" = "all-time";
        if (
          leaderboardData &&
          typeof leaderboardData === "object" &&
          "leaderboard" in leaderboardData
        ) {
          leaderboard = leaderboardData.leaderboard;
          period = (leaderboardData.period || "all-time") as
            | "week"
            | "month"
            | "all-time";
        } else if (Array.isArray(leaderboardData)) {
          leaderboard = leaderboardData;
        }
        setLeaderboardPeriod(period);

        return {
          group: groupData,
          balances: balancesData,
          chores: choresList,
          choreStats: statsData,
          leaderboard,
          leaderboardPeriod: period,
          groupAchievements: achievementsData,
          groupHistory: historyData,
          groupAnalytics: analyticsData,
        };
      },
      immediate: true,
      deps: [token, groupId],
    });

  const group = data?.group ?? null;
  const balances = data?.balances ?? null;
  const chores = data?.chores ?? [];
  const choreStats = data?.choreStats ?? null;
  const leaderboard = data?.leaderboard ?? [];
  const groupAchievements = data?.groupAchievements ?? null;
  const groupHistory = data?.groupHistory ?? [];
  const groupAnalytics = data?.groupAnalytics ?? null;

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!group?.members) return [];
    if (!memberSearchQuery.trim()) return group.members;

    const query = memberSearchQuery.toLowerCase();
    return group.members.filter((member) => {
      const displayName = getUserDisplayName(member.user).toLowerCase();
      const email = member.user?.email?.toLowerCase() || "";
      return displayName.includes(query) || email.includes(query);
    });
  }, [group?.members, memberSearchQuery]);

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function getUserDisplayName(user: any): string {
    if (!user) return "Unknown";
    return user.profile?.displayName || user.email || "Unknown";
  }

  function isUserAdmin(): boolean {
    if (!group || !user) return false;
    // Creator is always an admin
    if (group.createdBy === user?.id) return true;
    // Check if user is in members array with ADMIN role
    if (!group.members || !Array.isArray(group.members)) return false;
    const member = group.members.find((m) => m.userId === user?.id);
    return member?.role === "ADMIN";
  }

  function isUserCreator(): boolean {
    return group?.createdBy === user?.id;
  }

  // Prepare right actions for header (add expense/chore + message group)
  const rightActions = group ? (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {onViewFeed && (
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => onViewFeed(group.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open circle feed"
        >
          <MaterialIcons
            name="dynamic-feed"
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
      )}
      {onMessageGroup && (
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => onMessageGroup(group.id, group.name)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Message group"
        >
          <MaterialIcons
            name="message"
            size={24}
            color={theme.colors.textInverse}
          />
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
          <MaterialIcons
            name="task"
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.headerActionButton}
        onPress={onCreateExpense}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Chop a bill"
      >
        <MaterialIcons name="add" size={24} color={theme.colors.textInverse} />
      </TouchableOpacity>
    </View>
  ) : undefined;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Circle Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error || "Circle not found"} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomNavPadding },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View style={styles.content}>
          {/* Group Header Card */}
          <View style={styles.groupHeaderCard}>
            <View style={styles.groupHeaderContent}>
              <View style={{ position: "relative" }}>
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
                      color={theme.colors.primary}
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
            {onViewFeed && (
              <TouchableOpacity
                style={styles.groupFeedButton}
                onPress={() => onViewFeed(group.id)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="dynamic-feed"
                  size={20}
                  color={theme.colors.textInverse}
                />
                <Text style={styles.groupFeedButtonText}>Open Circle Feed</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Combined Stats Section - Balance + Chores + Rides */}
          {(balances || choreStats || group?.stats?.rides) && (
            <View style={styles.combinedStatsSection}>
              {/* Balance Summary - Compact */}
              {balances &&
                (balances.totalOwed > 0 || balances.totalOwedToUser > 0) && (
                  <View style={styles.compactBalanceCard}>
                    <View style={styles.compactBalanceHeader}>
                      <View style={styles.compactBalanceRow}>
                        <View style={styles.compactBalanceItem}>
                          <Text style={styles.compactBalanceLabel}>
                            You Owe
                          </Text>
                          <Text style={styles.compactBalanceAmountRed}>
                            {formatCurrency(
                              balances.totalOwed,
                              balances.primaryCurrency || "USD",
                            )}
                          </Text>
                        </View>
                        <View style={styles.compactBalanceDivider} />
                        <View style={styles.compactBalanceItem}>
                          <Text style={styles.compactBalanceLabel}>
                            You're Owed
                          </Text>
                          <Text style={styles.compactBalanceAmountGreen}>
                            {formatCurrency(
                              balances.totalOwedToUser,
                              balances.primaryCurrency || "USD",
                            )}
                          </Text>
                        </View>
                      </View>
                      {balances.netBalance !== 0 && (
                        <View style={styles.netBalanceRow}>
                          <Icon
                            name={
                              balances.netBalance > 0
                                ? "trending-up"
                                : "trending-down"
                            }
                            size={14}
                            color={
                              balances.netBalance > 0
                                ? theme.colors.success
                                : theme.colors.error
                            }
                          />
                          <Text
                            style={[
                              styles.netBalanceText,
                              balances.netBalance > 0
                                ? styles.netBalanceTextPositive
                                : styles.netBalanceTextNegative,
                            ]}
                          >
                            {balances.netBalance > 0 ? "Ahead by" : "Owe"}{" "}
                            {formatCurrency(
                              Math.abs(balances.netBalance),
                              balances.primaryCurrency || "USD",
                            )}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

              {/* Ride Stats Summary - Compact */}
              {group?.stats?.rides && group.stats.rides.totalRides > 0 && (
                <View style={styles.compactChoreStatsCard}>
                  <View style={styles.compactChoreStatsHeader}>
                    <View style={styles.compactChoreStatsRow}>
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons
                          name="directions-car"
                          size={18}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.compactChoreStatsLabel}>Rides</Text>
                        <Text style={styles.compactChoreStatsValue}>
                          {group.stats.rides.totalRides}
                        </Text>
                      </View>
                      <View style={styles.compactChoreStatsDivider} />
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons
                          name="attach-money"
                          size={18}
                          color={theme.colors.success}
                        />
                        <Text style={styles.compactChoreStatsLabel}>Spent</Text>
                        <Text style={styles.compactChoreStatsValue}>
                          {formatCurrency(group.stats.rides.totalSpent, "USD")}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Chore Stats Summary - Compact */}
              {choreStats && choreStats.totalCompleted > 0 && (
                <View style={styles.compactChoreStatsCard}>
                  <View style={styles.compactChoreStatsHeader}>
                    <View style={styles.compactChoreStatsRow}>
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons
                          name="task"
                          size={18}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.compactChoreStatsLabel}>Tasks</Text>
                        <Text style={styles.compactChoreStatsValue}>
                          {choreStats.totalCompleted}
                        </Text>
                      </View>
                      <View style={styles.compactChoreStatsDivider} />
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons
                          name="stars"
                          size={18}
                          color={theme.colors.warning}
                        />
                        <Text style={styles.compactChoreStatsLabel}>
                          Points
                        </Text>
                        <Text style={styles.compactChoreStatsValue}>
                          {choreStats.totalPoints}
                        </Text>
                      </View>
                      {choreStats.overallCompletionRate !== undefined && (
                        <>
                          <View style={styles.compactChoreStatsDivider} />
                          <View style={styles.compactChoreStatsItem}>
                            <MaterialIcons
                              name="check-circle"
                              size={18}
                              color={theme.colors.success}
                            />
                            <Text style={styles.compactChoreStatsLabel}>
                              Rate
                            </Text>
                            <Text style={styles.compactChoreStatsValue}>
                              {choreStats.overallCompletionRate}%
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Analytics Row */}
                  {choreStats.fairnessScore !== undefined && (
                    <View style={styles.analyticsRow}>
                      <View style={styles.analyticsItem}>
                        <MaterialIcons
                          name="balance"
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.analyticsLabel}>Fairness</Text>
                        <Text style={styles.analyticsValue}>
                          {choreStats.fairnessScore}%
                        </Text>
                      </View>
                      <View style={styles.analyticsDivider} />
                      <View style={styles.analyticsItem}>
                        <MaterialIcons
                          name="schedule"
                          size={16}
                          color={theme.colors.blue}
                        />
                        <Text style={styles.analyticsLabel}>Avg Time</Text>
                        <Text style={styles.analyticsValue}>
                          {choreStats.members.length > 0
                            ? Math.round(
                                choreStats.members.reduce(
                                  (sum, m) =>
                                    sum + (m.avgCompletionTimeHours || 0),
                                  0,
                                ) /
                                  choreStats.members.filter(
                                    (m) => m.avgCompletionTimeHours > 0,
                                  ).length,
                              ) || 0
                            : 0}
                          h
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Top Contributors - Show top 3 */}
                  {choreStats.members.length > 0 && (
                    <View style={styles.topContributorsSection}>
                      <Text style={styles.topContributorsTitle}>
                        Top Contributors
                      </Text>
                      <View style={styles.topContributorsList}>
                        {choreStats.members.slice(0, 3).map((member) => (
                          <View
                            key={member.userId}
                            style={styles.topContributorItem}
                          >
                            <View style={styles.topContributorRank}>
                              <Text style={styles.topContributorRankText}>
                                #{member.rank}
                              </Text>
                            </View>
                            <Avatar
                              avatarUrl={getAvatarUrl(member.avatarUrl)}
                              displayName={member.displayName}
                              size={32}
                            />
                            <View style={styles.topContributorInfo}>
                              <Text
                                style={styles.topContributorName}
                                numberOfLines={1}
                              >
                                {member.userId === user?.id
                                  ? "You"
                                  : member.displayName}
                              </Text>
                              <View style={styles.topContributorPoints}>
                                <MaterialIcons
                                  name="stars"
                                  size={14}
                                  color={theme.colors.warning}
                                />
                                <Text style={styles.topContributorPointsText}>
                                  {member.totalPoints} pts
                                </Text>
                                <Text style={styles.topContributorTasksText}>
                                  • {member.totalCompleted} tasks
                                </Text>
                                {member.completionRate !== undefined && (
                                  <Text style={styles.topContributorRateText}>
                                    • {member.completionRate}%
                                  </Text>
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
                  <MaterialIcons
                    name="leaderboard"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Leaderboard</Text>
                </View>
                {/* Period Selector */}
                <View style={styles.periodSelector}>
                  {(["week", "month", "all-time"] as const).map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodButton,
                        leaderboardPeriod === period &&
                          styles.periodButtonActive,
                      ]}
                      onPress={async () => {
                        try {
                          const data = await getGroupLeaderboard(
                            token!,
                            groupId,
                            period,
                          );
                          // Leaderboard state updated via refetch
                          refetch();
                          setLeaderboardPeriod(period);
                        } catch (err) {
                          console.error("Failed to load leaderboard:", err);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.periodButtonText,
                          leaderboardPeriod === period &&
                            styles.periodButtonTextActive,
                        ]}
                      >
                        {period === "week"
                          ? "Week"
                          : period === "month"
                            ? "Month"
                            : "All Time"}
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
                    {showFullLeaderboard ? "Show Less" : "Show All"}
                  </Text>
                  <MaterialIcons
                    name={showFullLeaderboard ? "expand-less" : "expand-more"}
                    size={20}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              )}

              {/* Motivational Message for Current User */}
              {(() => {
                const currentUserEntry = leaderboard.find(
                  (e) => e.userId === user?.id,
                );
                if (currentUserEntry && currentUserEntry.rank > 1) {
                  const previousEntry = leaderboard[currentUserEntry.rank - 2];
                  const pointsBehind =
                    previousEntry.totalPoints - currentUserEntry.totalPoints;
                  return (
                    <View key="motivational" style={styles.motivationalMessage}>
                      <MaterialIcons
                        name="trending-up"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.motivationalText}>
                        {"You're #" +
                          currentUserEntry.rank +
                          "! " +
                          pointsBehind +
                          " points behind " +
                          previousEntry.displayName +
                          ". Keep going! 💪"}
                      </Text>
                    </View>
                  );
                }
                if (currentUserEntry && currentUserEntry.rank === 1) {
                  return (
                    <View key="motivational" style={styles.motivationalMessage}>
                      <MaterialIcons
                        name="emoji-events"
                        size={20}
                        color={theme.colors.warning}
                      />
                      <Text style={styles.motivationalText}>
                        You're #1! 🏆 Keep up the great work!
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}

              <View style={styles.leaderboardList}>
                {(showFullLeaderboard
                  ? leaderboard
                  : leaderboard.slice(0, 3)
                ).map((entry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  const rankColors: Record<number, string> = {
                    1: theme.colors.warning, // Gold
                    2: theme.colors.gray300, // Silver
                    3: theme.colors.warning, // Bronze (using warning as closest match)
                  };
                  const rankColor =
                    rankColors[entry.rank] || theme.colors.textSecondary;

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
                          <View
                            style={[
                              styles.leaderboardRankBadge,
                              { backgroundColor: rankColor },
                            ]}
                          >
                            <MaterialIcons
                              name="emoji-events"
                              size={16}
                              color={theme.colors.textInverse}
                            />
                          </View>
                        ) : (
                          <View style={styles.leaderboardRankNumber}>
                            <Text style={styles.leaderboardRankText}>
                              #{entry.rank}
                            </Text>
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
                          <Text
                            style={styles.leaderboardUserName}
                            numberOfLines={1}
                          >
                            {isCurrentUser ? "You" : entry.displayName}
                          </Text>
                          {isCurrentUser && (
                            <View style={styles.currentUserBadge}>
                              <Text style={styles.currentUserBadgeText}>
                                You
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.leaderboardStatsRow}>
                          {entry.totalCompleted !== undefined && (
                            <View style={styles.leaderboardStatItem}>
                              <MaterialIcons
                                name="check-circle"
                                size={14}
                                color={theme.colors.success}
                              />
                              <Text style={styles.leaderboardStatText}>
                                {entry.totalCompleted} done
                              </Text>
                            </View>
                          )}
                          {entry.currentStreak !== undefined &&
                            entry.currentStreak > 0 && (
                              <View style={styles.leaderboardStatItem}>
                                <MaterialIcons
                                  name="local-fire-department"
                                  size={14}
                                  color={theme.colors.error}
                                />
                                <Text style={styles.leaderboardStatText}>
                                  {entry.currentStreak}🔥
                                </Text>
                              </View>
                            )}
                        </View>
                      </View>

                      <View style={styles.leaderboardPointsContainer}>
                        <View style={styles.leaderboardPointsRow}>
                          <MaterialIcons
                            name="stars"
                            size={18}
                            color={theme.colors.warning}
                          />
                          <Text style={styles.leaderboardPointsText}>
                            {entry.totalPoints}
                          </Text>
                        </View>
                        <Text style={styles.leaderboardPointsLabel}>
                          points
                        </Text>
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
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.primary}
                  />
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
                  <MaterialIcons
                    name="emoji-events"
                    size={20}
                    color={theme.colors.warning}
                  />
                  <Text style={styles.sectionTitle}>Group Achievements</Text>
                  <Text style={styles.achievementCount}>
                    {
                      groupAchievements.achievements.filter((a) => a.unlocked)
                        .length
                    }
                    /{groupAchievements.achievements.length}
                  </Text>
                </View>
                <MaterialIcons
                  name={showAchievements ? "expand-less" : "expand-more"}
                  size={24}
                  color={theme.colors.textSecondary}
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
                        name={achievement.unlocked ? "emoji-events" : "lock"}
                        size={32}
                        color={
                          achievement.unlocked
                            ? theme.colors.warning
                            : theme.colors.textTertiary
                        }
                      />
                      <Text
                        style={[
                          styles.achievementName,
                          !achievement.unlocked && styles.achievementNameLocked,
                        ]}
                      >
                        {achievement.name}
                      </Text>
                      <Text style={styles.achievementDescription}>
                        {achievement.description}
                      </Text>
                      {achievement.progress !== undefined &&
                        achievement.target && (
                          <View style={styles.achievementProgress}>
                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%`,
                                  },
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
                  <MaterialIcons
                    name="history"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <Text style={styles.historyCount}>{groupHistory.length}</Text>
                </View>
                <MaterialIcons
                  name={showHistory ? "expand-less" : "expand-more"}
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              {showHistory && (
                <View>
                  {groupHistory.slice(0, 10).map((entry) => (
                    <View key={entry.id} style={styles.historyItem}>
                      <View style={styles.historyIcon}>
                        <MaterialIcons
                          name={
                            entry.action === "completed"
                              ? "check-circle"
                              : entry.action === "created"
                                ? "add-circle"
                                : entry.action === "assigned"
                                  ? "person-add"
                                  : "history"
                          }
                          size={20}
                          color={theme.colors.primary}
                        />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyText}>
                          <Text style={styles.historyUserName}>
                            {entry.user.profile?.displayName ||
                              entry.user.email}
                          </Text>{" "}
                          {entry.action} {entry.choreTitle}
                        </Text>
                        <Text style={styles.historyTime}>
                          {new Date(entry.createdAt).toLocaleDateString()} at{" "}
                          {new Date(entry.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                  <MaterialIcons
                    name="analytics"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.sectionTitle}>
                    Analytics ({groupAnalytics.period} days)
                  </Text>
                </View>
                <MaterialIcons
                  name={showAnalytics ? "expand-less" : "expand-more"}
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              {showAnalytics && (
                <View>
                  <View style={styles.analyticsSummary}>
                    <View style={styles.analyticsSummaryItem}>
                      <Text style={styles.analyticsSummaryValue}>
                        {groupAnalytics.totalCompletions}
                      </Text>
                      <Text style={styles.analyticsSummaryLabel}>
                        Completed
                      </Text>
                    </View>
                    <View style={styles.analyticsSummaryItem}>
                      <Text style={styles.analyticsSummaryValue}>
                        {groupAnalytics.totalPoints}
                      </Text>
                      <Text style={styles.analyticsSummaryLabel}>Points</Text>
                    </View>
                    <View style={styles.analyticsSummaryItem}>
                      <Text style={styles.analyticsSummaryValue}>
                        {groupAnalytics.categoryBreakdown.length}
                      </Text>
                      <Text style={styles.analyticsSummaryLabel}>
                        Categories
                      </Text>
                    </View>
                  </View>

                  {groupAnalytics.categoryBreakdown.length > 0 && (
                    <View style={styles.categoryBreakdown}>
                      <Text style={styles.analyticsSubtitle}>
                        Category Breakdown
                      </Text>
                      {groupAnalytics.categoryBreakdown.map((cat) => (
                        <View key={cat.category} style={styles.categoryItem}>
                          <Text style={styles.categoryName}>
                            {cat.category}
                          </Text>
                          <View style={styles.categoryStats}>
                            <Text style={styles.categoryCount}>
                              {cat.count} tasks
                            </Text>
                            <Text style={styles.categoryPoints}>
                              {cat.points} pts
                            </Text>
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
                  <Icon
                    name="people"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
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
                  <Icon
                    name="settings"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Member Search */}
            {group.members && group.members.length > 3 && (
              <View style={styles.searchContainer}>
                <Icon
                  name="search"
                  size={20}
                  color={theme.colors.textTertiary}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search members..."
                  value={memberSearchQuery}
                  onChangeText={setMemberSearchQuery}
                  placeholderTextColor={theme.colors.textTertiary}
                />
                {memberSearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setMemberSearchQuery("")}
                    style={styles.clearSearchButton}
                  >
                    <Icon
                      name="close"
                      size={18}
                      color={theme.colors.textTertiary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {!group.members || group.members.length === 0 ? (
              <View style={styles.emptyMembersContainer}>
                <Icon
                  name="people-outline"
                  size={48}
                  color={theme.colors.textTertiary}
                />
                <Text style={styles.emptyMembersText}>No members yet</Text>
                <Text style={styles.emptyMembersSubtext}>
                  {isUserAdmin()
                    ? "Add members to start splitting bills together"
                    : "Members will appear here once added"}
                </Text>
                {isUserAdmin() && onAddMember && (
                  <TouchableOpacity
                    style={styles.emptyAddButton}
                    onPress={() => onAddMember(groupId)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name="person-add"
                      size={20}
                      color={theme.colors.textInverse}
                    />
                    <Text style={styles.emptyAddButtonText}>
                      Add Your First Member
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : filteredMembers.length === 0 ? (
              <View style={styles.emptySearchContainer}>
                <Icon
                  name="search-off"
                  size={32}
                  color={theme.colors.textTertiary}
                />
                <Text style={styles.emptySearchText}>No members found</Text>
                <Text style={styles.emptySearchSubtext}>
                  Try a different search term
                </Text>
              </View>
            ) : (
              filteredMembers.map((member) => {
                const isCurrentUser = member.userId === user?.id;

                // Calculate balance with this member within the group
                const memberBalance = balances
                  ? (() => {
                      const owedTo = balances.owedToUser.find(
                        (item: BalanceInfo["owedToUser"][number]) =>
                          item?.user?.id === member.userId,
                      );
                      const owedBy = balances.owedByUser.find(
                        (item: BalanceInfo["owedByUser"][number]) =>
                          item?.user?.id === member.userId,
                      );
                      const netBalance =
                        (owedTo?.amount || 0) - (owedBy?.amount || 0);
                      return {
                        netBalance,
                        owedTo: owedTo?.amount || 0,
                        owedBy: owedBy?.amount || 0,
                      };
                    })()
                  : null;

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
                        borderColor={theme.colors.textInverse}
                      />
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>
                          {isCurrentUser
                            ? "You"
                            : getUserDisplayName(member.user)}
                        </Text>
                        {!member.user?.profile?.displayName &&
                          member.user?.email && (
                            <Text style={styles.memberEmail}>
                              {member.user.email}
                            </Text>
                          )}
                        {/* Show balance with this member */}
                        {!isCurrentUser &&
                          memberBalance &&
                          Math.abs(memberBalance.netBalance) > 0.01 && (
                            <Text
                              style={[
                                styles.memberBalance,
                                memberBalance.netBalance >= 0
                                  ? styles.memberBalancePositive
                                  : styles.memberBalanceNegative,
                              ]}
                            >
                              {memberBalance.netBalance >= 0
                                ? `Owes you ${formatCurrency(memberBalance.netBalance, balances?.primaryCurrency || "USD")}`
                                : `You owe ${formatCurrency(Math.abs(memberBalance.netBalance), balances?.primaryCurrency || "USD")}`}
                            </Text>
                          )}
                        {!isCurrentUser &&
                          memberBalance &&
                          Math.abs(memberBalance.netBalance) < 0.01 && (
                            <Text style={styles.memberBalanceSettled}>
                              Settled up
                            </Text>
                          )}
                      </View>
                    </View>
                    <View style={styles.memberBadges}>
                      {member.userId === group.createdBy && (
                        <View style={[styles.badge, styles.creatorBadge]}>
                          <Icon
                            name="star"
                            size={12}
                            color={theme.colors.warning}
                          />
                          <Text style={styles.badgeText}>Creator</Text>
                        </View>
                      )}
                      {member.role === "ADMIN" &&
                        member.userId !== group.createdBy && (
                          <View style={[styles.badge, styles.adminBadge]}>
                            <Icon
                              name="admin-panel-settings"
                              size={12}
                              color={theme.colors.primary}
                            />
                            <Text style={styles.badgeText}>Admin</Text>
                          </View>
                        )}
                      {/* Settle Up Button */}
                      {!isCurrentUser &&
                        onSettleUp &&
                        memberBalance &&
                        Math.abs(memberBalance.netBalance) > 0.01 && (
                          <TouchableOpacity
                            style={styles.settleButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              const settleAmount = Math.abs(
                                memberBalance.netBalance,
                              );
                              const memberName = getUserDisplayName(
                                member.user,
                              );
                              onSettleUp(
                                member.userId,
                                settleAmount,
                                memberName,
                                groupId,
                              );
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
                    <Icon
                      name="chevron-right"
                      size={16}
                      color={theme.colors.primary}
                    />
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
                    if (days === 0) return "Today";
                    if (days === 1) return "Yesterday";
                    if (days < 7) return `${days} days ago`;
                    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
                    return date.toLocaleDateString();
                  };

                  const getStatusColor = (status: string): string => {
                    switch (status) {
                      case "pending":
                        return theme.colors.warning;
                      case "assigned":
                        return theme.colors.blue;
                      case "completed":
                        return theme.colors.success;
                      default:
                        return theme.colors.textSecondary;
                    }
                  };

                  const getStatusText = (status: string): string => {
                    switch (status) {
                      case "pending":
                        return "Unassigned";
                      case "assigned":
                        return "Assigned";
                      case "completed":
                        return "Completed";
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
                                • Due{" "}
                                {new Date(chore.dueDate).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View
                          style={[
                            styles.choreStatusBadge,
                            { backgroundColor: getStatusColor(chore.status) },
                          ]}
                        >
                          <Text style={styles.choreStatusText}>
                            {getStatusText(chore.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.choreFooter}>
                        <View style={styles.chorePointsContainer}>
                          <MaterialIcons
                            name="stars"
                            size={16}
                            color={theme.colors.warning}
                          />
                          <Text style={styles.chorePoints}>
                            {chore.points} points
                          </Text>
                        </View>
                        {chore.assignedToUser && (
                          <Text style={styles.choreAssigned}>
                            {chore.assignedToUser.id === user?.id
                              ? "Assigned to you"
                              : `Assigned to ${chore.assignedToUser.profile?.displayName || chore.assignedToUser.email}`}
                          </Text>
                        )}
                      </View>

                      <Icon
                        name="chevron-right"
                        size={20}
                        color={theme.colors.textTertiary}
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
              <View style={styles.expenseFilterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    expenseFilter === "all" && styles.filterButtonActive,
                  ]}
                  onPress={() => setExpenseFilter("all")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      expenseFilter === "all" && styles.filterButtonTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    expenseFilter === "rides" && styles.filterButtonActive,
                  ]}
                  onPress={() => setExpenseFilter("rides")}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="directions-car"
                    size={14}
                    color={
                      expenseFilter === "rides"
                        ? theme.colors.textInverse
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.filterButtonText,
                      expenseFilter === "rides" &&
                        styles.filterButtonTextActive,
                    ]}
                  >
                    Rides
                  </Text>
                </TouchableOpacity>
                {group.expenses && group.expenses.length > 0 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => {
                      // TODO: Navigate to full expense list for this group
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllButtonText}>View All</Text>
                    <Icon
                      name="chevron-right"
                      size={16}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {(() => {
              // Filter expenses based on filter state
              const filteredExpenses = (group.expenses || []).filter(
                (expense) => {
                  if (expenseFilter === "rides") {
                    return (
                      expense.rideId !== null && expense.rideId !== undefined
                    );
                  }
                  return true;
                },
              );

              return filteredExpenses.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {expenseFilter === "rides"
                      ? "No ride expenses yet"
                      : "No billchops yet"}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {expenseFilter === "rides"
                      ? "Create a ride to see expenses here!"
                      : "Create the first billchop for this circle!"}
                  </Text>
                  {expenseFilter !== "rides" && (
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={onCreateExpense}
                    >
                      <Text style={styles.emptyButtonText}>Chop a bill</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                filteredExpenses.map((expense) => {
                  // Expense in GroupWithExpenses doesn't have createdByUser, use optional chaining
                  const paidByUser = (expense as any).createdByUser;
                  const isCreator =
                    ((expense as any).createdByUser?.id ||
                      (expense as any).createdBy) === user?.id;
                  const formatDate = (dateString: string): string => {
                    const date = new Date(dateString);
                    const now = new Date();
                    const diff = now.getTime() - date.getTime();
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    if (days === 0) return "Today";
                    if (days === 1) return "Yesterday";
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
                          <View style={styles.expenseDescriptionRow}>
                            <Text
                              style={styles.expenseDescription}
                              numberOfLines={1}
                            >
                              {expense.description}
                            </Text>
                            {expense.rideId && (
                              <View style={styles.rideBadge}>
                                <MaterialIcons
                                  name="directions-car"
                                  size={14}
                                  color={theme.colors.primary}
                                />
                                <Text style={styles.rideBadgeText}>Ride</Text>
                              </View>
                            )}
                          </View>
                          {expense.ride && (
                            <Text style={styles.rideRoute} numberOfLines={1}>
                              {expense.ride.origin} → {expense.ride.destination}
                            </Text>
                          )}
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
                            {isCreator ? "You" : getUserDisplayName(paidByUser)}{" "}
                            paid{" "}
                            {formatCurrency(expense.amount, expense.currency)}
                          </Text>
                        )}

                        {(expense.splits || []).length > 0 && (
                          <View style={styles.splitDetails}>
                            {(expense.splits || []).map((split) => {
                              const splitUser = split.user;
                              const isCurrentUser = split.userId === user?.id;
                              return (
                                <Text
                                  key={split.id}
                                  style={styles.splitDetailText}
                                >
                                  {isCurrentUser
                                    ? "You"
                                    : getUserDisplayName(splitUser)}
                                  :{" "}
                                  {formatCurrency(
                                    split.amount,
                                    expense.currency,
                                  )}
                                  {split.isPaid && (
                                    <Text style={styles.paidBadge}>
                                      {" "}
                                      • Paid
                                    </Text>
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
                        color={theme.colors.textTertiary}
                      />
                    </TouchableOpacity>
                  );
                })
              );
            })()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      // paddingBottom is handled by useBottomNavPadding hook
    },
    content: {
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
    },
    headerActionButton: {
      padding: theme.spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 22,
      backgroundColor: theme.colors.overlayLight,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.blue,
      borderRadius: 8,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      minHeight: 44,
    },
    createButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    errorText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      marginBottom: theme.spacing.base,
      textAlign: "center",
    },
    groupHeaderCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    groupHeaderContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    groupIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryBackground,
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.base,
      position: "relative",
    },
    groupAvatarImage: {
      width: 64,
      height: 64,
      borderRadius: 16,
      marginRight: theme.spacing.base,
    },
    groupIconBadge: {
      position: "absolute",
      bottom: -2,
      right: theme.spacing.sm,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.background,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
      ...theme.shadows.sm,
    },
    groupHeaderText: {
      flex: 1,
    },
    groupFeedButton: {
      marginTop: theme.spacing.base,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    groupFeedButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    groupName: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
      lineHeight: 28.8,
      letterSpacing: -0.3,
    },
    groupDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginTop: theme.spacing.xs,
    },
    groupMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap",
    },
    groupMetaItem: {
      flexDirection: "row",
      alignItems: "center",
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
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    compactBalanceHeader: {
      gap: theme.spacing.md,
    },
    compactBalanceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    compactBalanceItem: {
      flex: 1,
      alignItems: "center",
    },
    compactBalanceLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    compactBalanceAmountRed: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.error,
    },
    compactBalanceAmountGreen: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.success,
    },
    compactBalanceDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.base,
    },
    netBalanceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray100,
    },
    netBalanceText: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    netBalanceTextPositive: {
      color: theme.colors.success,
    },
    netBalanceTextNegative: {
      color: theme.colors.error,
    },
    compactChoreStatsCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    compactChoreStatsHeader: {
      marginBottom: theme.spacing.base,
    },
    compactChoreStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    compactChoreStatsItem: {
      flex: 1,
      alignItems: "center",
      gap: 6,
    },
    compactChoreStatsLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    compactChoreStatsValue: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    compactChoreStatsDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.base,
    },
    topContributorsSection: {
      marginTop: theme.spacing.base,
      paddingTop: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray100,
    },
    topContributorsTitle: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.md,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    topContributorsList: {
      gap: theme.spacing.md,
    },
    topContributorItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    topContributorRank: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.backgroundTertiary,
      justifyContent: "center",
      alignItems: "center",
    },
    topContributorRankText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textSecondary,
    },
    topContributorInfo: {
      flex: 1,
    },
    topContributorName: {
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    topContributorPoints: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    topContributorPointsText: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.warning,
    },
    topContributorTasksText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    topContributorRateText: {
      fontSize: 13,
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    analyticsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray100,
    },
    analyticsItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    analyticsLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    analyticsValue: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    analyticsDivider: {
      width: 1,
      height: 24,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.sm,
    },
    leaderboardSectionCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    expandButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    expandButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    leaderboardList: {
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    leaderboardItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 12,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    leaderboardItemCurrentUser: {
      backgroundColor: theme.colors.primaryBackground,
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
    },
    leaderboardRankContainer: {
      width: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    leaderboardRankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    leaderboardRankNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.backgroundTertiary,
      justifyContent: "center",
      alignItems: "center",
    },
    leaderboardRankText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textSecondary,
    },
    leaderboardUserInfo: {
      flex: 1,
    },
    leaderboardUserNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    leaderboardUserName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    currentUserBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: 8,
    },
    currentUserBadgeText: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textInverse,
      textTransform: "uppercase",
    },
    leaderboardStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    leaderboardStatItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    leaderboardStatText: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.warning,
    },
    leaderboardPointsContainer: {
      alignItems: "flex-end",
    },
    leaderboardPointsText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    leaderboardPointsLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 2,
    },
    leaderboardPointsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    expandButtonLeaderboard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    // Period Selector Styles
    periodSelector: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.base,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 12,
      padding: theme.spacing.xs,
    },
    periodButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    periodButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    periodButtonText: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    periodButtonTextActive: {
      color: theme.colors.textInverse,
    },
    // Motivational Message
    motivationalMessage: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: 12,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.base,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    motivationalText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
    },
    viewAllLeaderboardButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.md,
      marginTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    viewAllLeaderboardText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    balanceFlowCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      overflow: "visible",
      ...theme.shadows.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    netBalanceBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.base,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    netBalanceIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    netBalanceIndicatorPositive: {
      backgroundColor: theme.colors.successBackground,
    },
    netBalanceIndicatorNegative: {
      backgroundColor: theme.colors.errorBackground,
    },
    netBalanceBannerText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    netBalanceBannerAmount: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    netBalanceBannerAmountPositive: {
      color: theme.colors.success,
    },
    netBalanceBannerAmountNegative: {
      color: theme.colors.error,
    },
    balanceFlowContainer: {
      flexDirection: "row",
      minHeight: 110,
      position: "relative",
    },
    balanceFlowSide: {
      flex: 1,
      padding: theme.spacing.base,
      justifyContent: "space-between",
    },
    balanceFlowSideLeft: {
      borderRightWidth: 1,
      borderRightColor: theme.colors.gray100,
      backgroundColor: theme.colors.errorBackground,
    },
    balanceFlowSideRight: {
      backgroundColor: theme.colors.successBackground,
    },
    balanceFlowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    balanceFlowIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
      ...theme.shadows.sm,
    },
    balanceFlowLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    balanceFlowAmountRed: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.error,
    },
    balanceFlowAmountGreen: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.success,
    },
    balanceFlowDivider: {
      width: 1,
      backgroundColor: theme.colors.border,
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      zIndex: 10,
    },
    balanceFlowConnector: {
      position: "absolute",
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      borderWidth: 3,
      borderColor: theme.colors.white,
      justifyContent: "center",
      alignItems: "center",
      left: -22.5,
      ...theme.shadows.lg,
    },
    membersSectionCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    membersSection: {
      marginBottom: 0,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    clearSearchButton: {
      padding: theme.spacing.xs,
    },
    emptySearchContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.xl,
    },
    emptySearchText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginTop: theme.spacing.md,
    },
    emptySearchSubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.base,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 0,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    sectionTitleMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    memberCountText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    settingsButton: {
      padding: theme.spacing.sm,
      minWidth: 36,
      minHeight: 36,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 18,
    },
    addMemberButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.primaryBackground,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    addMemberButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    emptyMembersContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      marginTop: 8,
    },
    emptyMembersText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.gray700,
      marginTop: 16,
    },
    emptyMembersSubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
      textAlign: "center",
    },
    emptyAddButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 16,
    },
    emptyAddButtonText: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.white,
    },
    memberRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    memberInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: 12,
    },
    memberDetails: {
      flex: 1,
    },
    memberName: {
      fontSize: 16, // Body: 16px
      fontWeight: "500",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    memberEmail: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    memberBalance: {
      fontSize: 14,
      fontWeight: "600",
      marginTop: 4,
    },
    memberBalancePositive: {
      color: theme.colors.success,
    },
    memberBalanceNegative: {
      color: theme.colors.error,
    },
    memberBalanceSettled: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      marginTop: 4,
    },
    memberBadges: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 0,
    },
    settleButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      minHeight: 36,
      justifyContent: "center",
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
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
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    creatorBadge: {
      backgroundColor: theme.colors.warningBackground,
    },
    adminBadge: {
      backgroundColor: theme.colors.primaryBackground,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.gray700,
    },
    sectionCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    expensesSectionCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    expensesSection: {
      marginTop: 0,
      marginBottom: 0,
    },
    viewAllButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    viewAllButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    emptyContainer: {
      alignItems: "center",
      padding: theme.spacing["2xl"],
    },
    emptyText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.sm,
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.xl,
    },
    emptyButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
    },
    emptyButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    expenseCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: 14,
      borderRadius: 12,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      position: "relative",
    },
    expenseHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: theme.spacing.sm,
      paddingRight: theme.spacing.xl,
    },
    expenseInfo: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    expenseDescriptionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: 6,
      flexWrap: "wrap",
    },
    expenseDescription: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
      flex: 1,
    },
    rideBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      backgroundColor: theme.colors.primaryBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: 12,
    },
    rideBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    rideRoute: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs / 2,
      marginBottom: theme.spacing.xs / 2,
    },
    expenseFilterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    filterButtonTextActive: {
      color: theme.colors.white,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    expenseMeta: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    expenseDate: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    expenseAmount: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
    },
    splitInfo: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    splitText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 6,
      fontWeight: theme.typography.fontWeight.medium,
    },
    splitDetails: {
      marginTop: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    splitDetailText: {
      fontSize: 13,
      color: theme.colors.gray700,
      marginTop: 2,
      fontWeight: theme.typography.fontWeight.medium,
    },
    paidBadge: {
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    chevron: {
      position: "absolute",
      right: theme.spacing.base,
      top: 20,
    },
    choresSectionCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    choreCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: 14,
      borderRadius: 12,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      position: "relative",
    },
    choreHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: theme.spacing.sm,
      paddingRight: theme.spacing.xl,
    },
    choreInfo: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    choreTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 6,
      letterSpacing: -0.2,
    },
    choreMeta: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    choreDate: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    choreDueDate: {
      fontSize: 13,
      color: theme.colors.warning,
      fontWeight: theme.typography.fontWeight.medium,
    },
    choreStatusBadge: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 4,
    },
    choreStatusText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textInverse,
      fontWeight: theme.typography.fontWeight.medium,
    },
    choreFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    chorePointsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    chorePoints: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.warning,
    },
    choreAssigned: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    // Achievements styles
    achievementCount: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.warning,
      marginLeft: theme.spacing.sm,
    },
    achievementsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
      marginTop: theme.spacing.base,
    },
    achievementCard: {
      flex: 1,
      minWidth: "47%",
      backgroundColor: theme.colors.warningBackground,
      borderRadius: 12,
      padding: theme.spacing.base,
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.warning,
    },
    achievementCardLocked: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderColor: theme.colors.border,
    },
    achievementName: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.gray800,
      marginTop: theme.spacing.sm,
      textAlign: "center",
    },
    achievementNameLocked: {
      color: theme.colors.textSecondary,
    },
    achievementDescription: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray800,
      textAlign: "center",
      marginTop: theme.spacing.xs,
    },
    achievementProgress: {
      width: "100%",
      marginTop: theme.spacing.md,
    },
    progressBar: {
      height: 6,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: theme.spacing.xs,
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.colors.warning,
      borderRadius: 3,
    },
    progressText: {
      fontSize: 11,
      color: theme.colors.gray800,
      textAlign: "center",
      fontWeight: theme.typography.fontWeight.medium,
    },
    // History styles
    historyCount: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
    historyItem: {
      flexDirection: "row",
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    historyIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryBackground,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
    },
    historyContent: {
      flex: 1,
    },
    historyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.xs,
    },
    historyUserName: {
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    historyTime: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    // Analytics styles
    analyticsSummary: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: theme.spacing.base,
      paddingVertical: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    analyticsSummaryItem: {
      alignItems: "center",
    },
    analyticsSummaryValue: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    analyticsSummaryLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    analyticsSubtitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.base,
      marginBottom: theme.spacing.md,
    },
    categoryBreakdown: {
      marginTop: theme.spacing.base,
    },
    categoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray100,
    },
    categoryName: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
    },
    categoryStats: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    categoryCount: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    categoryPoints: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.warning,
    },
  });
