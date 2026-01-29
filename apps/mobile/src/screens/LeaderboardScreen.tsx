import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getLeaderboard,
  getFriendsLeaderboard,
  getUserPosition,
  getTrustScoreRankHistory,
  getShareRank,
  LeaderboardUser,
  LeaderboardResponse,
  UserPosition,
  TrustScoreRankHistory,
} from "../api/trustScoreApi";
import { Header } from "../components/Header";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { useDataFetch } from "../hooks/useDataFetch";
import { SegmentedControl } from "../components/SegmentedControl";
import { EmptyState } from "../components/EmptyState";
import { useTheme } from "../theme";
import { useBottomNavPadding } from "../hooks/useBottomNavPadding";

type Category = "overall" | "expense" | "chore" | "community";
type ViewMode = "global" | "friends";

interface LeaderboardScreenProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  onViewUserProfile?: (userId: string) => void;
}

const CATEGORY_LABELS: Record<Category, string> = {
  overall: "Overall",
  expense: "Billchop",
  chore: "Chores",
  community: "SpaceV",
};

export function LeaderboardScreen({
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
  onViewUserProfile,
}: LeaderboardScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const bottomPadding = useBottomNavPadding(true);
  const [viewMode, setViewMode] = useState<ViewMode>("global");
  const [category, setCategory] = useState<Category>("overall");

  // Global leaderboard
  const {
    data: globalLeaderboard,
    loading: globalLoading,
    refreshing: globalRefreshing,
    error: globalError,
    refresh: globalRefresh,
    refetch: globalRefetch,
  } = useDataFetch<LeaderboardResponse>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getLeaderboard(token, {
        limit: 100,
        offset: 0,
        category,
      });
    },
    immediate: viewMode === "global",
    deps: [token, category],
  });

  // Friends leaderboard
  const {
    data: friendsLeaderboard,
    loading: friendsLoading,
    refreshing: friendsRefreshing,
    error: friendsError,
    refresh: friendsRefresh,
    refetch: friendsRefetch,
  } = useDataFetch<LeaderboardUser[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getFriendsLeaderboard(token);
    },
    immediate: viewMode === "friends",
    deps: [token],
  });

  // User position
  const { data: userPosition, loading: positionLoading } =
    useDataFetch<UserPosition>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        return getUserPosition(token, category);
      },
      immediate: viewMode === "global",
      deps: [token, category],
    });

  const { data: rankHistoryResponse, loading: rankHistoryLoading } =
    useDataFetch<{ history: TrustScoreRankHistory[] }>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        return getTrustScoreRankHistory(token, {
          category,
          period: "weekly",
          limit: 5,
        });
      },
      immediate: viewMode === "global",
      deps: [token, category],
    });

  const loading = viewMode === "global" ? globalLoading : friendsLoading;
  const refreshing =
    viewMode === "global" ? globalRefreshing : friendsRefreshing;
  const error = viewMode === "global" ? globalError : friendsError;
  const refresh = viewMode === "global" ? globalRefresh : friendsRefresh;
  const refetch = viewMode === "global" ? globalRefetch : friendsRefetch;

  const users =
    viewMode === "global"
      ? globalLeaderboard?.users || []
      : friendsLeaderboard || [];

  function getRankIcon(rank: number): keyof typeof MaterialIcons.glyphMap {
    if (rank === 1) return "emoji-events";
    if (rank === 2) return "looks-two";
    if (rank === 3) return "looks-3";
    return "person";
  }

  function getRankColor(rank: number): string {
    if (rank === 1) return theme.colors.warning;
    if (rank === 2) return theme.colors.gray400;
    if (rank === 3) return theme.colors.chartOrange;
    return theme.colors.textSecondary;
  }

  function getFinScoreColor(score: number): string {
    if (score >= 90) return theme.colors.success;
    if (score >= 70) return theme.colors.blue;
    if (score >= 50) return theme.colors.warning;
    return theme.colors.error;
  }

  function formatScore(score: number): string {
    return Math.round(score).toString();
  }

  function handleUserPress(userId: string) {
    if (onViewUserProfile) {
      onViewUserProfile(userId);
    }
  }

  async function handleShareRank() {
    if (!token) return;
    try {
      const response = await getShareRank(token, category);
      if (response.shareText) {
        await Share.share({ message: response.shareText });
      }
    } catch (err) {
      console.error("Failed to share rank", err);
    }
  }

  if (loading && users.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="FinScore Leaderboard"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && users.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="FinScore Leaderboard"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || "Failed to load leaderboard"}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="FinScore Leaderboard"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {/* View Mode Selector */}
        <View style={styles.viewModeContainer}>
          <SegmentedControl
            options={[
              { label: "Global", value: "global" },
              { label: "Friends", value: "friends" },
            ]}
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
          />
        </View>

        {/* Category Selector (only for global view) */}
        {viewMode === "global" && (
          <View style={styles.categoryContainer}>
            <View style={styles.categoryWrap}>
              {(["overall", "expense", "chore", "community"] as Category[]).map(
                (cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipSelected,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextSelected,
                      ]}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>
        )}

        {/* User Position Card (only for global view) */}
        {viewMode === "global" && userPosition && !positionLoading && (
          <View style={styles.positionCard}>
            <View style={styles.positionHeader}>
              <Text style={styles.positionCardTitle}>Your Position</Text>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareRank}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="share"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.positionInfo}>
              <View style={styles.positionStat}>
                <Text style={styles.positionStatLabel}>Rank</Text>
                <Text style={styles.positionStatValue}>
                  {userPosition.rank ? `#${userPosition.rank}` : "N/A"}
                </Text>
              </View>
              {userPosition.percentile !== null && (
                <View style={styles.positionStat}>
                  <Text style={styles.positionStatLabel}>Percentile</Text>
                  <Text style={styles.positionStatValue}>
                    Top {userPosition.percentile}%
                  </Text>
                </View>
              )}
              <View style={styles.positionStat}>
                <Text style={styles.positionStatLabel}>Total Users</Text>
                <Text style={styles.positionStatValue}>
                  {userPosition.totalUsers}
                </Text>
              </View>
            </View>
            {!rankHistoryLoading && rankHistoryResponse?.history?.length ? (
              <View style={styles.rankHistory}>
                <Text style={styles.rankHistoryTitle}>Recent Rank</Text>
                {rankHistoryResponse.history.map((entry) => (
                  <View key={entry.id} style={styles.rankHistoryRow}>
                    <Text style={styles.rankHistoryDate}>
                      {new Date(entry.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.rankHistoryValue}>#{entry.rank}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {/* Top 3 Podium */}
        {users.length >= 3 && (
          <View style={styles.podiumCard}>
            <Text style={styles.podiumTitle}>Top Performers</Text>
            <View style={styles.podiumRow}>
              {[users[1], users[0], users[2]].map((leaderboardUser, index) => {
                const rank = leaderboardUser.rank;
                const isCurrentUser = user?.id === leaderboardUser.userId;
                const isWinner = index === 1;

                return (
                  <TouchableOpacity
                    key={leaderboardUser.userId}
                    style={[
                      styles.podiumSlot,
                      isWinner && styles.podiumSlotWinner,
                    ]}
                    onPress={() => handleUserPress(leaderboardUser.userId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.podiumRankBadge}>
                      <MaterialIcons
                        name={getRankIcon(rank)}
                        size={18}
                        color={getRankColor(rank)}
                      />
                    </View>
                    <Avatar
                      avatarUrl={getAvatarUrl(leaderboardUser.avatarUrl)}
                      displayName={leaderboardUser.displayName}
                      size={isWinner ? 64 : 52}
                    />
                    <Text
                      style={[
                        styles.podiumName,
                        isCurrentUser && styles.userNameCurrent,
                      ]}
                      numberOfLines={1}
                    >
                      {isCurrentUser ? "You" : leaderboardUser.displayName}
                    </Text>
                    <Text
                      style={[
                        styles.podiumScore,
                        { color: getFinScoreColor(leaderboardUser.finscore) },
                      ]}
                    >
                      {formatScore(leaderboardUser.finscore)}
                    </Text>
                    <View
                      style={[
                        styles.podiumBase,
                        isWinner && styles.podiumBaseWinner,
                      ]}
                    >
                      <Text style={styles.podiumBaseText}>#{rank}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Leaderboard List */}
        {users.length === 0 ? (
          <EmptyState
            icon="emoji-events"
            title={
              viewMode === "global" ? "No users found" : "No friends found"
            }
            message={
              viewMode === "global"
                ? "Be the first to join the leaderboard!"
                : "Add friends to see how you compare"
            }
          />
        ) : (
          <View style={styles.leaderboardList}>
            {users
              .slice(users.length >= 3 ? 3 : 0)
              .map((leaderboardUser, index) => {
                const isCurrentUser = user?.id === leaderboardUser.userId;
                const rank = leaderboardUser.rank;
                const isTopThree = rank <= 3;

                return (
                  <TouchableOpacity
                    key={leaderboardUser.userId}
                    style={[
                      styles.leaderboardItem,
                      isTopThree && styles.leaderboardItemTop,
                      isCurrentUser && styles.leaderboardItemCurrent,
                    ]}
                    onPress={() => handleUserPress(leaderboardUser.userId)}
                    activeOpacity={0.7}
                  >
                    {/* Rank */}
                    <View style={styles.rankContainer}>
                      <View
                        style={[
                          styles.rankBadge,
                          isTopThree && styles.rankBadgeTop,
                          isCurrentUser && styles.rankBadgeCurrent,
                        ]}
                      >
                        {isTopThree ? (
                          <MaterialIcons
                            name={getRankIcon(rank)}
                            size={18}
                            color={getRankColor(rank)}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.rankText,
                              isCurrentUser && styles.rankTextCurrent,
                            ]}
                          >
                            #{rank}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Avatar */}
                    <Avatar
                      avatarUrl={getAvatarUrl(leaderboardUser.avatarUrl)}
                      displayName={leaderboardUser.displayName}
                      size={48}
                    />

                    {/* User Info */}
                    <View style={styles.userInfo}>
                      <Text
                        style={[
                          styles.userName,
                          isCurrentUser && styles.userNameCurrent,
                        ]}
                        numberOfLines={1}
                      >
                        {isCurrentUser ? "You" : leaderboardUser.displayName}
                      </Text>
                      {leaderboardUser.badge && (
                        <Text style={styles.userBadge}>
                          {leaderboardUser.badge}
                        </Text>
                      )}
                    </View>

                    {/* Score */}
                    <View style={styles.scoreContainer}>
                      <Text
                        style={[
                          styles.scoreValue,
                          { color: getFinScoreColor(leaderboardUser.finscore) },
                        ]}
                      >
                        {formatScore(leaderboardUser.finscore)}
                      </Text>
                      <Text style={styles.scoreLabel}>FinScore</Text>
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

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
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
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.xl,
    },
    viewModeContainer: {
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
      paddingBottom: theme.spacing.xs,
    },
    categoryContainer: {
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
    },
    categoryWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    categoryChip: {
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.spacing.md,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    categoryChipSelected: {
      backgroundColor: theme.colors.primary,
    },
    categoryChipText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    categoryChipTextSelected: {
      color: theme.colors.textInverse,
      fontWeight: theme.typography.fontWeight.bold,
    },
    positionCard: {
      backgroundColor: theme.colors.primaryBackground,
      marginHorizontal: theme.spacing.base,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.base,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    podiumCard: {
      marginHorizontal: theme.spacing.base,
      marginTop: theme.spacing.sm,
      padding: theme.spacing.base,
      borderRadius: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      ...theme.shadows.sm,
    },
    podiumTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
    },
    podiumRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    podiumSlot: {
      flex: 1,
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
    },
    podiumSlotWinner: {
      paddingVertical: theme.spacing.base,
    },
    podiumRankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      marginBottom: theme.spacing.xs,
    },
    podiumName: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    podiumScore: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    podiumBase: {
      marginTop: theme.spacing.sm,
      width: "80%",
      height: 22,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    podiumBaseWinner: {
      height: 30,
      backgroundColor: theme.colors.primaryBackground,
    },
    podiumBaseText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    positionCardTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    positionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    shareButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
    },
    shareButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.primary,
    },
    positionInfo: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    positionStat: {
      alignItems: "center",
    },
    positionStatLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    positionStatValue: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
    },
    rankHistory: {
      marginTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
      paddingTop: theme.spacing.sm,
    },
    rankHistoryTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    rankHistoryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.xs,
    },
    rankHistoryDate: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    rankHistoryValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    leaderboardList: {
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
    },
    leaderboardItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    leaderboardItemTop: {
      borderColor: theme.colors.primaryLight,
      backgroundColor: theme.colors.primaryBackground,
    },
    leaderboardItemCurrent: {
      borderColor: theme.colors.primaryLight,
      backgroundColor: theme.colors.primaryBackground,
    },
    rankContainer: {
      width: 40,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.base,
    },
    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    rankBadgeTop: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.primaryLight,
    },
    rankBadgeCurrent: {
      borderColor: theme.colors.primary,
    },
    rankText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textSecondary,
    },
    rankTextCurrent: {
      color: theme.colors.primary,
    },
    userInfo: {
      flex: 1,
      marginLeft: theme.spacing.base,
      justifyContent: "center",
    },
    userName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    userNameCurrent: {
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
    },
    userBadge: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.primary,
    },
    scoreContainer: {
      alignItems: "flex-end",
      justifyContent: "center",
      minWidth: 64,
    },
    scoreValue: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.xs,
    },
    scoreLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: theme.spacing.sm,
      margin: theme.spacing.base,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
