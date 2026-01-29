import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getChoreStats, ChoreStats } from "../api/choreApi";
import { SkeletonDetailScreen } from "../components/SkeletonLoader";
import { ErrorState } from "../components/ErrorState";
import { Header } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { HeaderOption } from "../components/Header";
import { useTheme } from "../theme";
import { useDataFetch } from "../hooks/useDataFetch";

type Period = "week" | "month" | "all-time";

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("all-time");

  const {
    data: stats,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<ChoreStats>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getChoreStats(token);
    },
    immediate: true,
    deps: [token],
  });

  const headerOptions: HeaderOption[] = [];

  // Filter completions and calculate period-specific stats
  const periodStats = useMemo(() => {
    if (!stats) return null;

    const now = new Date();
    let startDate: Date | null = null;

    if (selectedPeriod === "week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (selectedPeriod === "month") {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    }

    // Filter recent completions by period
    const filteredCompletions = startDate
      ? stats.recentCompletions.filter(
          (c) => new Date(c.completedAt) >= startDate!,
        )
      : stats.recentCompletions;

    // Calculate period-specific totals
    const periodPoints = filteredCompletions.reduce(
      (sum, c) => sum + c.pointsEarned,
      0,
    );
    const periodCompleted = filteredCompletions.length;
    const periodOnTime = filteredCompletions.filter((c) => c.onTime).length;
    const periodOnTimePercentage =
      periodCompleted > 0
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
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Your Stats"
          onBack={onBack}
          useOptionsMenu={true}
          options={headerOptions}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const displayStats = periodStats || stats;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {displayStats && (
          <View style={styles.content}>
            {/* Period Selector */}
            <View style={styles.periodSelector}>
              {(["week", "month", "all-time"] as Period[]).map((period) => (
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
                      selectedPeriod === period &&
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

            {/* Stats Overview */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: theme.colors.warningBackground },
                  ]}
                >
                  <MaterialIcons
                    name="stars"
                    size={24}
                    color={theme.colors.warning}
                  />
                </View>
                <Text style={styles.statValue}>{displayStats.totalPoints}</Text>
                <Text style={styles.statLabel}>
                  {selectedPeriod === "all-time" ? "Total Points" : "Points"}
                </Text>
              </View>

              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: theme.colors.successBackground },
                  ]}
                >
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color={theme.colors.success}
                  />
                </View>
                <Text style={styles.statValue}>
                  {displayStats.totalCompleted}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>

              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: theme.colors.errorBackground },
                  ]}
                >
                  <MaterialIcons
                    name="local-fire-department"
                    size={24}
                    color={theme.colors.error}
                  />
                </View>
                <Text style={styles.statValue}>
                  {displayStats.currentStreak}
                </Text>
                <Text style={styles.statLabel}>Day Streak</Text>
                <Text style={styles.statNote}>All-time</Text>
              </View>

              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: theme.colors.primaryBackground },
                  ]}
                >
                  <MaterialIcons
                    name="schedule"
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.statValue}>
                  {displayStats.onTimePercentage}%
                </Text>
                <Text style={styles.statLabel}>On Time</Text>
              </View>
            </View>

            {/* Achievements Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Achievements</Text>
                  <Text style={styles.sectionSubtitle}>
                    {displayStats.achievements.filter((a) => a.unlocked).length}{" "}
                    of {displayStats.achievements.length} unlocked
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
                        achievement.unlocked
                          ? styles.achievementCardUnlocked
                          : styles.achievementCardLocked,
                      ]}
                    >
                      {achievement.unlocked && (
                        <View style={styles.unlockedBadge}>
                          <MaterialIcons
                            name="check-circle"
                            size={16}
                            color={theme.colors.success}
                          />
                        </View>
                      )}
                      <View
                        style={[
                          styles.achievementIcon,
                          achievement.unlocked
                            ? styles.achievementIconUnlocked
                            : styles.achievementIconLocked,
                        ]}
                      >
                        {achievement.unlocked ? (
                          <MaterialIcons
                            name="emoji-events"
                            size={32}
                            color={theme.colors.warning}
                          />
                        ) : (
                          <MaterialIcons
                            name="lock"
                            size={32}
                            color={theme.colors.textTertiary}
                          />
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
                      <Text
                        style={styles.achievementDescription}
                        numberOfLines={2}
                      >
                        {achievement.description}
                      </Text>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <Text style={styles.unlockedDate}>
                          Unlocked{" "}
                          {new Date(achievement.unlockedAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyStateCard}>
                  <MaterialIcons
                    name="emoji-events"
                    size={48}
                    color={theme.colors.textTertiary}
                  />
                  <Text style={styles.emptyText}>No achievements yet</Text>
                  <Text style={styles.emptySubtext}>
                    Complete tasks to unlock achievements!
                  </Text>
                </View>
              )}
            </View>

            {/* Recent Completions */}
            {displayStats.recentCompletions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {selectedPeriod === "all-time"
                    ? "Recent Completions"
                    : `${selectedPeriod === "week" ? "This Week" : "This Month"}'s Completions`}
                </Text>
                <View style={styles.completionsList}>
                  {displayStats.recentCompletions.map((completion) => (
                    <View key={completion.id} style={styles.completionCard}>
                      <View style={styles.completionInfo}>
                        <View style={styles.completionHeader}>
                          <MaterialIcons
                            name="task"
                            size={18}
                            color={theme.colors.primary}
                          />
                          <Text
                            style={styles.completionTitle}
                            numberOfLines={1}
                          >
                            {completion.choreTitle}
                          </Text>
                        </View>
                        <Text style={styles.completionDate}>
                          {new Date(completion.completedAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </Text>
                      </View>
                      <View style={styles.completionPoints}>
                        <MaterialIcons
                          name="stars"
                          size={20}
                          color={theme.colors.warning}
                        />
                        <Text style={styles.completionPointsText}>
                          +{completion.pointsEarned}
                        </Text>
                        {completion.onTime && (
                          <View style={styles.onTimeBadge}>
                            <MaterialIcons
                              name="schedule"
                              size={12}
                              color={theme.colors.success}
                            />
                            <Text style={styles.onTimeText}>On time</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              selectedPeriod !== "all-time" && (
                <View style={styles.section}>
                  <View style={styles.emptyStateCard}>
                    <MaterialIcons
                      name="check-circle-outline"
                      size={48}
                      color={theme.colors.textTertiary}
                    />
                    <Text style={styles.emptyText}>
                      No completions this period
                    </Text>
                    <Text style={styles.emptySubtext}>
                      Complete tasks to see your progress here!
                    </Text>
                  </View>
                </View>
              )
            )}
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
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing["2xl"],
    },
    content: {
      paddingHorizontal: theme.spacing.base,
      paddingTop: 16,
    },
    periodSelector: {
      flexDirection: "row",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 4,
      marginBottom: theme.spacing.base,
      gap: 4,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
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
      borderRadius: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    periodButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    periodButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.gray500,
    },
    periodButtonTextActive: {
      color: theme.colors.white,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      minWidth: "47%",
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
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
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.sm,
    },
    statValue: {
      fontSize: 32,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.gray500,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statNote: {
      fontSize: 10,
      color: theme.colors.textTertiary,
      marginTop: 2,
      fontStyle: "italic",
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      marginBottom: theme.spacing.base,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      fontWeight: theme.typography.fontWeight.medium,
    },
    achievementsScrollView: {
      marginHorizontal: -16,
    },
    achievementsScrollContent: {
      paddingHorizontal: theme.spacing.base,
      gap: 12,
    },
    achievementCard: {
      width: 180,
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      alignItems: "center",
      borderWidth: 2,
      position: "relative",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
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
      borderColor: theme.colors.warning,
      backgroundColor: theme.colors.warningBackground,
    },
    achievementCardLocked: {
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
      opacity: 0.7,
    },
    unlockedBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: theme.colors.success,
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    achievementIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    achievementIconUnlocked: {
      backgroundColor: theme.colors.warningBackground,
    },
    achievementIconLocked: {
      backgroundColor: theme.colors.backgroundTertiary,
    },
    achievementName: {
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: 6,
      textAlign: "center",
    },
    achievementNameLocked: {
      color: theme.colors.gray500,
    },
    achievementDescription: {
      fontSize: 12,
      color: theme.colors.gray500,
      textAlign: "center",
      lineHeight: 16,
      marginBottom: 4,
    },
    unlockedDate: {
      fontSize: 10,
      color: theme.colors.success,
      fontWeight: "600",
      marginTop: 4,
    },
    emptyStateCard: {
      alignItems: "center",
      padding: 48,
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyText: {
      marginTop: 16,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: "600",
      color: theme.colors.gray700,
    },
    emptySubtext: {
      marginTop: 8,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      textAlign: "center",
    },
    completionsList: {
      gap: 12,
    },
    completionCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
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
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    completionTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    completionDate: {
      fontSize: 12,
      color: theme.colors.gray500,
      marginLeft: 26,
    },
    completionPoints: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    completionPointsText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.warning,
    },
    onTimeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginLeft: 8,
      paddingVertical: 2,
      paddingHorizontal: 6,
      backgroundColor: theme.colors.successBackground,
      borderRadius: theme.spacing.sm,
    },
    onTimeText: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.colors.success,
    },
  });
