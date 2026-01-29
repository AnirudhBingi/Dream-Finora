import React, { useState, useEffect, useMemo } from "react";
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
import { getChores, Chore } from "../api/choreApi";
import { Header } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { SkeletonChoreList } from "../components/SkeletonLoader";
import { useBottomNavPadding } from "../hooks/useBottomNavPadding";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { Icon } from "../components/Icon";
import { getChoreCategoryIcon } from "../utils/choreCategoryIcons";
import { HeaderOption } from "../components/Header";
import { useTheme } from "../theme";

interface ChoreHistoryScreenProps {
  onBack: () => void;
  onViewChore: (choreId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

// Category detection (same as ChoreListScreen)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Cleaning: [
    "clean",
    "vacuum",
    "sweep",
    "mop",
    "dust",
    "wipe",
    "bathroom",
    "kitchen",
    "floor",
    "dishes",
    "dishwasher",
  ],
  Cooking: [
    "cook",
    "meal",
    "dinner",
    "lunch",
    "breakfast",
    "recipe",
    "kitchen",
    "prepare",
    "food",
  ],
  Shopping: [
    "shop",
    "grocery",
    "store",
    "buy",
    "purchase",
    "market",
    "mall",
    "errand",
  ],
  Maintenance: [
    "fix",
    "repair",
    "maintenance",
    "broken",
    "install",
    "replace",
    "tool",
    "hardware",
  ],
  Laundry: ["laundry", "wash", "dry", "clothes", "clothing", "fold", "iron"],
  "Trash & Recycling": [
    "trash",
    "garbage",
    "recycle",
    "waste",
    "bin",
    "disposal",
  ],
  "Pet Care": ["pet", "dog", "cat", "walk", "feed", "animal", "vet"],
  "Yard Work": ["yard", "garden", "mow", "lawn", "plant", "weed", "outdoor"],
  Errands: ["errand", "pickup", "drop", "delivery", "post office", "bank"],
  Organization: ["organize", "sort", "arrange", "tidy", "declutter", "storage"],
};

function detectCategory(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  let bestMatch: { category: string; score: number } | null = null;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { category, score };
    }
  }

  return bestMatch && bestMatch.score >= 1 ? bestMatch.category : null;
}

function getStatusColor(
  status: string,
  colors: ReturnType<typeof useTheme>["theme"]["colors"],
): string {
  switch (status) {
    case "completed":
      return colors.success;
    case "assigned":
      return colors.primary;
    case "pending":
      return colors.warning;
    case "cancelled":
      return colors.error;
    default:
      return colors.gray500;
  }
}

function getUserDisplayName(user: any, currentUserId?: string): string {
  if (!user) return "Unknown";
  if (user.id === currentUserId) return "You";
  return user.profile?.displayName || user.email || "Unknown";
}

export function ChoreHistoryScreen({
  onBack,
  onViewChore,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ChoreHistoryScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [choresList, setChoresList] = useState<Chore[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const bottomPadding = useBottomNavPadding(true);

  const headerOptions: HeaderOption[] = [];

  const {
    data: initialChores,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<Chore[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      const response = await getChores(token, undefined, limit, 0);

      let completedChores: Chore[] = [];
      if ("chores" in response) {
        completedChores = response.chores.filter(
          (chore) => chore.status === "completed",
        );
        setHasMore(response.hasMore);
        setOffset(response.chores.length);
      } else {
        completedChores = response.filter((c) => c.status === "completed");
        setHasMore(false);
      }

      setChoresList(completedChores);
      return completedChores;
    },
    immediate: true,
    deps: [token],
    transform: (data) => {
      setChoresList(data);
      return data;
    },
  });

  // Update local state when initialChores changes
  useEffect(() => {
    if (initialChores) {
      setChoresList(initialChores);
    }
  }, [initialChores]);

  async function loadMore() {
    if (loadingMore || !hasMore || !token) return;

    try {
      setLoadingMore(true);
      const response = await getChores(token, undefined, limit, offset);

      let newChores: Chore[] = [];
      if ("chores" in response) {
        newChores = response.chores.filter(
          (chore) => chore.status === "completed",
        );
        setHasMore(response.hasMore);
        setOffset((prev) => prev + response.chores.length);
      } else {
        newChores = response.filter((c) => c.status === "completed");
        setHasMore(false);
      }

      setChoresList((prev) => [...prev, ...newChores]);
    } catch (err) {
      console.error("Failed to load more chores:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  // Separate group and individual chores
  const { groupChores, individualChores } = useMemo(() => {
    const groups: Chore[] = [];
    const individual: Chore[] = [];

    choresList.forEach((chore: Chore) => {
      if (chore.groupId) {
        groups.push(chore);
      } else {
        individual.push(chore);
      }
    });

    return { groupChores: groups, individualChores: individual };
  }, [choresList]);

  if (loading && choresList.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Task History"
          onBack={onBack}
          useOptionsMenu={true}
          options={headerOptions}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <SkeletonChoreList />
      </SafeAreaView>
    );
  }

  if (error && choresList.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Task History"
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

  const allCompletedChores = [...groupChores, ...individualChores];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Task History"
        onBack={onBack}
        useOptionsMenu={true}
        options={headerOptions}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding + 16 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {allCompletedChores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="history"
                size={48}
                color={theme.colors.gray300}
              />
              <Text style={styles.emptyTitle}>No completed tasks</Text>
              <Text style={styles.emptyMessage}>
                Completed tasks will appear here after 24 hours
              </Text>
            </View>
          ) : (
            <View style={styles.choresContainer}>
              {allCompletedChores.map((chore) => renderChoreCard(chore))}

              {/* Load More */}
              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMore}
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  {loadingMore ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <>
                      <Text style={styles.loadMoreText}>Load More</Text>
                      <MaterialIcons
                        name="expand-more"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Render Chore Card with rich information (same as ChoreListScreen)
  function renderChoreCard(chore: Chore) {
    const category = detectCategory(chore.title, chore.description || "");
    const statusColor = getStatusColor(chore.status, theme.colors);
    const isMultipleAssignment =
      chore.assignmentType === "multiple" &&
      chore.assignments &&
      chore.assignments.length > 0;
    const isAssignedToMe =
      chore.assignedToUser?.id === user?.id ||
      chore.assignments?.some((a) => a.userId === user?.id);

    // Get group name if it's a group chore
    const groupNameDisplay = chore.group?.name || null;

    // Get creator name
    const creatorName = getUserDisplayName(chore.createdByUser, user?.id);

    // Check if rotation is enabled
    const hasRotation = chore.rotationEnabled;

    // Check if recurring
    const isRecurring = chore.isRecurring;

    // Due date info
    const dueDate = chore.dueDate ? new Date(chore.dueDate) : null;
    const completedDate = chore.completedAt
      ? new Date(chore.completedAt)
      : null;

    return (
      <TouchableOpacity
        key={chore.id}
        style={[
          styles.choreCard,
          isAssignedToMe && styles.choreCardHighlighted,
        ]}
        onPress={() => onViewChore(chore.id)}
        activeOpacity={0.7}
      >
        {/* Status Indicator Bar */}
        <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

        <View style={styles.choreCardContent}>
          {/* Header Row: Group/Individual Badge + Points */}
          <View style={styles.choreCardHeader}>
            <View style={styles.choreCardBadges}>
              {groupNameDisplay ? (
                <View style={styles.groupBadge}>
                  <Avatar
                    avatarUrl={getAvatarUrl(chore.group?.avatarUrl || null)}
                    displayName={groupNameDisplay}
                    size={32}
                  />
                  <Text style={styles.groupBadgeText} numberOfLines={1}>
                    {groupNameDisplay}
                  </Text>
                </View>
              ) : (
                <View style={styles.personalBadge}>
                  <MaterialIcons
                    name="person"
                    size={12}
                    color={theme.colors.success}
                  />
                  <Text style={styles.personalBadgeText}>Personal</Text>
                </View>
              )}

              {isRecurring && (
                <View style={styles.recurringBadge}>
                  <MaterialIcons
                    name="repeat"
                    size={12}
                    color={theme.colors.primaryDark}
                  />
                </View>
              )}

              {hasRotation && (
                <View style={styles.rotationBadge}>
                  <MaterialIcons
                    name="sync"
                    size={12}
                    color={theme.colors.warning}
                  />
                </View>
              )}
            </View>

            <View style={styles.pointsBadge}>
              <MaterialIcons
                name="stars"
                size={18}
                color={theme.colors.warning}
              />
              <Text style={styles.pointsText}>{chore.points}</Text>
            </View>
          </View>

          {/* Title Row */}
          <View style={styles.choreTitleRow}>
            <Icon
              name={getChoreCategoryIcon(category || chore.category)}
              size={22}
              color={theme.colors.gray700}
            />
            <Text style={styles.choreTitle} numberOfLines={2}>
              {chore.title}
            </Text>
          </View>

          {/* Description (if exists) */}
          {chore.description && (
            <Text style={styles.choreDescription} numberOfLines={1}>
              {chore.description}
            </Text>
          )}

          {/* Meta Row: Completed date, Created by */}
          <View style={styles.choreMetaRow}>
            {/* Completed Date */}
            {completedDate && (
              <View style={styles.completedDateBadge}>
                <MaterialIcons
                  name="check-circle"
                  size={12}
                  color={theme.colors.success}
                />
                <Text style={styles.completedDateText}>
                  Completed{" "}
                  {completedDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            )}

            {/* Created by */}
            <View style={styles.creatorInfo}>
              <MaterialIcons
                name="edit"
                size={12}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.creatorText}>by {creatorName}</Text>
            </View>
          </View>

          {/* Assignment Row */}
          <View style={styles.choreAssignmentRow}>
            {isMultipleAssignment ? (
              <View style={styles.multipleAssignment}>
                <View style={styles.avatarStack}>
                  {chore.assignments!.slice(0, 3).map((assignment, index) => (
                    <Avatar
                      key={assignment.id}
                      avatarUrl={getAvatarUrl(
                        assignment.user?.profile?.avatarUrl || null,
                      )}
                      displayName={
                        assignment.user?.profile?.displayName || "User"
                      }
                      size={36}
                      style={
                        [
                          styles.stackedAvatar,
                          {
                            marginLeft: index > 0 ? -12 : 0,
                            zIndex: 3 - index,
                          },
                        ] as any
                      }
                    />
                  ))}
                </View>
                <Text style={styles.assignmentCountText}>
                  {chore.assignments!.length} assigned
                </Text>
                {chore.assignments!.some((a) => a.userId === user?.id) && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>incl. you</Text>
                  </View>
                )}
              </View>
            ) : chore.assignedToUser ? (
              <View style={styles.singleAssignment}>
                <Avatar
                  avatarUrl={getAvatarUrl(
                    chore.assignedToUser.profile?.avatarUrl || null,
                  )}
                  displayName={getUserDisplayName(
                    chore.assignedToUser,
                    user?.id,
                  )}
                  size={36}
                />
                <Text style={styles.assignedToText}>
                  {getUserDisplayName(chore.assignedToUser, user?.id)}
                </Text>
                {chore.assignedToUser.id === user?.id && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>you</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.unassignedText}>Unassigned</Text>
            )}

            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor}20` },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                Completed
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
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
      paddingTop: theme.spacing.base,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing["5xl"],
      paddingHorizontal: theme.spacing["2xl"],
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.gray700,
      marginTop: theme.spacing.base,
      marginBottom: theme.spacing.sm,
    },
    emptyMessage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    choresContainer: {
      gap: theme.spacing.md,
    },
    choreCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.base,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    choreCardHighlighted: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    statusBar: {
      height: 4,
      width: "100%",
    },
    choreCardContent: {
      padding: theme.spacing.base,
    },
    choreCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    choreCardBadges: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    groupBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: theme.spacing.md,
      maxWidth: "60%",
    },
    groupBadgeText: {
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    personalBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      backgroundColor: theme.colors.successBackground,
      borderRadius: theme.spacing.md,
    },
    personalBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.success,
    },
    recurringBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.primaryBackground,
      justifyContent: "center",
      alignItems: "center",
    },
    rotationBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.warningBackground,
      justifyContent: "center",
      alignItems: "center",
    },
    pointsBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.colors.warningBackground,
      borderRadius: theme.spacing.md,
    },
    pointsText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.warning,
    },
    choreTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    choreTitle: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      lineHeight: 22,
    },
    choreDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      lineHeight: 20,
    },
    choreMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
      flexWrap: "wrap",
    },
    completedDateBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      backgroundColor: theme.colors.successBackground,
      borderRadius: theme.spacing.sm,
    },
    completedDateText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.success,
    },
    creatorInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    creatorText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    choreAssignmentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    multipleAssignment: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    avatarStack: {
      flexDirection: "row",
      alignItems: "center",
    },
    stackedAvatar: {
      borderWidth: 3,
      borderColor: theme.colors.white,
    },
    assignmentCountText: {
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    singleAssignment: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    assignedToText: {
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    unassignedText: {
      fontSize: theme.typography.fontSize.xs + 1,
      color: theme.colors.textTertiary,
      fontStyle: "italic",
    },
    youBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: theme.spacing.sm,
    },
    youBadgeText: {
      fontSize: theme.typography.fontSize.xs - 2,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.spacing.md,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
    },
    loadMoreButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.base,
      marginTop: theme.spacing.sm,
    },
    loadMoreText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
  });
