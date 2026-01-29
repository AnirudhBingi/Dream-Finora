import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text as RNText,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getChores, Chore, getChoreStats, ChoreStats } from "../api/choreApi";
import { Header } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { SkeletonChoreList } from "../components/SkeletonLoader";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { Icon } from "../components/Icon";
import {
  SegmentedControl,
  SegmentedControlOption,
} from "../components/SegmentedControl";
import { StatsCard, StatItem } from "../components/StatsCard";
import {
  getChoreCategoryIcon,
  getChoreCategoryMaterialIcon,
} from "../utils/choreCategoryIcons";
import { useTheme } from "../theme";

interface ChoreListScreenProps {
  onCreateChore: () => void;
  onViewChore: (choreId: string) => void;
  onBack: () => void;
  onViewStats?: () => void;
  onViewHistory?: () => void;
  groupId?: string;
  groupName?: string;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

// Enhanced category detection (matches CreateChoreScreen)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Bathroom Cleaning": [
    "bathroom",
    "toilet",
    "shower",
    "sink",
    "mirror",
    "bath",
    "restroom",
  ],
  "Kitchen Cleaning": [
    "kitchen",
    "dishes",
    "dishwasher",
    "sink",
    "counter",
    "stove",
    "oven",
    "fridge",
    "microwave",
  ],
  Vacuum: ["vacuum", "vacuuming", "carpet", "rug", "floor"],
  Dusting: ["dust", "dusting", "shelves", "furniture", "surfaces"],
  Mopping: ["mop", "mopping", "floor", "tile", "hardwood"],
  Windows: ["window", "windows", "glass", "clean windows"],
  "Deep Clean": ["deep clean", "spring clean", "thorough", "detailed"],
  Cooking: [
    "cook",
    "cooking",
    "meal",
    "dinner",
    "lunch",
    "breakfast",
    "recipe",
    "prepare",
    "food",
  ],
  "Meal Prep": ["meal prep", "prep", "preparation", "batch cooking"],
  Baking: ["bake", "baking", "cake", "bread", "cookies", "pastry"],
  Grilling: ["grill", "grilling", "bbq", "barbecue", "outdoor cooking"],
  "Grocery Shopping": ["grocery", "groceries", "supermarket", "food shopping"],
  Shopping: ["shop", "store", "buy", "purchase", "mall", "retail"],
  "Pickup/Delivery": ["pickup", "delivery", "pick up", "drop off", "package"],
  "Post Office": ["post office", "mail", "postal", "package", "letter"],
  Bank: ["bank", "banking", "atm", "deposit", "withdrawal"],
  Pharmacy: ["pharmacy", "prescription", "medicine", "drugstore"],
  "Home Maintenance": [
    "maintenance",
    "repair",
    "fix",
    "broken",
    "install",
    "replace",
  ],
  Plumbing: ["plumbing", "plumber", "pipe", "faucet", "leak", "drain"],
  Electrical: ["electrical", "electric", "wiring", "outlet", "switch", "light"],
  Painting: ["paint", "painting", "brush", "wall", "room"],
  Carpentry: ["carpentry", "wood", "saw", "drill", "furniture", "cabinet"],
  Laundry: ["laundry", "wash", "washing", "clothes", "clothing"],
  Folding: ["fold", "folding", "clothes", "laundry"],
  Ironing: ["iron", "ironing", "press", "wrinkles"],
  "Trash & Recycling": [
    "trash",
    "garbage",
    "recycle",
    "waste",
    "bin",
    "disposal",
    "rubbish",
  ],
  Compost: ["compost", "composting", "organic waste"],
  "Pet Care": ["pet", "animal", "feed", "feeding"],
  "Dog Walk": ["walk", "dog walk", "walking", "dog", "puppy"],
  "Pet Grooming": ["groom", "grooming", "bath", "brush", "pet bath"],
  "Yard Work": ["yard", "outdoor", "outside"],
  Mowing: ["mow", "mowing", "lawn", "grass", "mower"],
  Gardening: [
    "garden",
    "gardening",
    "plant",
    "planting",
    "flower",
    "vegetable",
  ],
  "Snow Removal": ["snow", "shovel", "snow removal", "snow shoveling"],
  Raking: ["rake", "raking", "leaves", "leaf"],
  Organization: [
    "organize",
    "organization",
    "sort",
    "arrange",
    "tidy",
    "declutter",
  ],
  Packing: ["pack", "packing", "box", "boxes", "move"],
  Unpacking: ["unpack", "unpacking", "unbox", "unboxing"],
  Childcare: ["childcare", "babysitting", "kids", "children", "child"],
  School: ["school", "homework", "project", "assignment"],
  "Car Wash": ["car wash", "wash car", "vehicle wash"],
  "Car Maintenance": [
    "car maintenance",
    "vehicle maintenance",
    "oil change",
    "tire",
    "car repair",
  ],
  Exercise: ["exercise", "workout", "gym", "fitness", "run", "jog"],
  Appointment: ["appointment", "doctor", "dentist", "meeting"],
  Other: ["other", "misc", "miscellaneous"],
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

type MainTab = "groups" | "individual";
type FilterTab = "all" | "assigned" | "unassigned";

export function ChoreListScreen({
  onCreateChore,
  onViewChore,
  onBack,
  onViewStats,
  onViewHistory,
  groupId,
  groupName,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ChoreListScreenProps) {
  const { theme, resolvedMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, resolvedMode), [theme, resolvedMode]);
  const { token, user } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>(
    groupId ? "groups" : "groups",
  );
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 50;

  // Animation values for FAB
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;

  // Animation value for card shimmer
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Start shimmer animation loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleFabPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(fabScale, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(fabRotation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleFabPressOut = () => {
    Animated.parallel([
      Animated.spring(fabScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(fabRotation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fabRotationDeg = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  // Fetch chores (initial load and refresh)
  const { loading, refreshing, error, refresh, refetch } = useDataFetch<
    Chore[]
  >({
    fetchFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const data = await getChores(token, groupId, limit, 0);
      // Handle paginated response
      let choresList: Chore[] = [];
      if (Array.isArray(data)) {
        setHasMore(false);
        choresList = data;
      } else {
        setHasMore(data.hasMore || false);
        choresList = data.chores || [];
      }
      setChores(choresList);
      setOffset(choresList.length);
      return choresList;
    },
    immediate: true,
    deps: [token, groupId],
  });

  // Fetch stats separately (optional, only if onViewStats is provided)
  const { data: stats } = useDataFetch<ChoreStats | null>({
    fetchFn: async () => {
      if (!token || !onViewStats) return null;
      return getChoreStats(token);
    },
    immediate: !!onViewStats,
    deps: [token],
  });

  // Handle refresh
  const handleRefresh = async () => {
    setOffset(0);
    setHasMore(false);
    await refresh();
  };

  // Handle load more
  async function loadMore() {
    if (loadingMore || !hasMore || !token) return;

    try {
      setLoadingMore(true);
      const nextOffset = offset;
      const data = await getChores(token, groupId, limit, nextOffset);

      let newChores: Chore[] = [];
      if (Array.isArray(data)) {
        newChores = data;
        setHasMore(false);
      } else {
        newChores = data.chores || [];
        setHasMore(data.hasMore || false);
      }

      // Append to existing chores
      if (newChores.length > 0) {
        setChores((prev) => [...prev, ...newChores]);
        setOffset((prev) => prev + newChores.length);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more chores:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  function getUserDisplayName(userData: any, currentUserId?: string): string {
    if (!userData) return "Unknown";
    if (userData?.id === currentUserId) {
      return "You";
    }
    return userData?.profile?.displayName || userData?.email || "Unknown";
  }

  function getStatusColor(status: Chore["status"]): string {
    switch (status) {
      case "pending":
        return theme.colors.warning;
      case "assigned":
        return theme.colors.primary;
      case "completed":
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  }

  // Separate chores into groups and individual
  const { groupChores, individualChores } = useMemo(() => {
    const groups: Chore[] = [];
    const individual: Chore[] = [];

    chores.forEach((chore) => {
      if (chore.groupId) {
        groups.push(chore);
      } else {
        individual.push(chore);
      }
    });

    return { groupChores: groups, individualChores: individual };
  }, [chores]);

  // Get current tab's chores
  const currentTabChores =
    mainTab === "groups" ? groupChores : individualChores;

  // Filter out completed chores older than 24 hours
  const activeChores = useMemo(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return currentTabChores.filter((chore) => {
      // Keep all non-completed chores
      if (chore.status !== "completed") return true;

      // For completed chores, only keep if completed within last 24 hours
      if (chore.completedAt) {
        const completedDate = new Date(chore.completedAt);
        return completedDate >= twentyFourHoursAgo;
      }

      // If no completedAt date, exclude it (shouldn't happen but safety check)
      return false;
    });
  }, [currentTabChores]);

  // Filter based on active filter
  const filteredChores = useMemo(() => {
    if (activeFilter === "all") return activeChores;
    if (activeFilter === "assigned") {
      return activeChores.filter(
        (chore) =>
          chore.status === "assigned" ||
          (chore.status === "pending" &&
            (chore.assignedTo ||
              (chore.assignments && chore.assignments.length > 0))),
      );
    }
    if (activeFilter === "unassigned") {
      return activeChores.filter(
        (chore) =>
          chore.status === "pending" &&
          !chore.assignedTo &&
          (!chore.assignments || chore.assignments.length === 0),
      );
    }
    return activeChores;
  }, [activeChores, activeFilter]);

  // Count for filters
  const filterCounts = useMemo(() => {
    const assignedCount = activeChores.filter(
      (c) =>
        c.status === "assigned" ||
        (c.status === "pending" &&
          (c.assignedTo || (c.assignments && c.assignments.length > 0))),
    ).length;

    const unassignedCount = activeChores.filter(
      (c) =>
        c.status === "pending" &&
        !c.assignedTo &&
        (!c.assignments || c.assignments.length === 0),
    ).length;

    return {
      all: activeChores.length,
      assigned: assignedCount,
      unassigned: unassignedCount,
    };
  }, [activeChores]);

  if (loading && (!chores || chores.length === 0)) {
    return (
      <>
        <Header
          title="Tasks"
          onBack={onBack}
          rightActions={
            onViewHistory ? (
              <TouchableOpacity
                style={styles.headerHistoryButton}
                onPress={onViewHistory}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="history"
                  size={24}
                  color={theme.colors.white}
                />
              </TouchableOpacity>
            ) : undefined
          }
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScreenWrapper>
          <SkeletonChoreList />
        </ScreenWrapper>
      </>
    );
  }

  if (error && chores.length === 0) {
    return (
      <>
        <Header
          title="Tasks"
          onBack={onBack}
          rightActions={
            onViewHistory ? (
              <TouchableOpacity
                style={styles.headerHistoryButton}
                onPress={onViewHistory}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="history"
                  size={24}
                  color={theme.colors.white}
                />
              </TouchableOpacity>
            ) : undefined
          }
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScreenWrapper>
          <ErrorState message={error} onRetry={refetch} />
        </ScreenWrapper>
      </>
    );
  }

  return (
    <>
      <Header
        title={groupName ? `Tasks - ${groupName}` : "Tasks"}
        onBack={onBack}
        rightActions={
          onViewHistory ? (
            <TouchableOpacity
              style={styles.headerHistoryButton}
              onPress={onViewHistory}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="history"
                size={24}
                color={theme.colors.white}
              />
            </TouchableOpacity>
          ) : undefined
        }
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <ScreenWrapper
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        }
      >
          {/* Stats Card with Glassy Effect - Consistent gap from Header */}
          {onViewStats && stats && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onViewStats?.();
              }}
              style={styles.statsCardWrapper}
            >
              {/* Glassy gradient overlay */}
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.12)',
                  'rgba(255, 255, 255, 0.04)',
                  'rgba(255, 255, 255, 0.01)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsGlassOverlay}
              />

              {/* Animated shimmer */}
              <Animated.View
                style={[
                  styles.statsShimmerOverlay,
                  {
                    opacity: shimmerAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 0.2, 0],
                    }),
                    transform: [
                      {
                        translateX: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-300, 300],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    'transparent',
                    'rgba(255, 255, 255, 0.25)',
                    'transparent',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.statsShimmerGradient}
                />
              </Animated.View>

              <View style={styles.statsCardContent}>
                <View style={styles.statItem}>
                  <MaterialIcons name="stars" size={24} color={theme.colors.warning} />
                  <RNText style={styles.statValue}>{stats.totalPoints}</RNText>
                  <RNText style={styles.statLabel}>pts</RNText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="check-circle" size={24} color={theme.colors.success} />
                  <RNText style={styles.statValue}>{stats.totalCompleted}</RNText>
                  <RNText style={styles.statLabel}>done</RNText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="local-fire-department" size={24} color={theme.colors.error} />
                  <RNText style={styles.statValue}>{stats.currentStreak}</RNText>
                  <RNText style={styles.statLabel}>streak</RNText>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} style={styles.statsChevron} />
              </View>
            </Pressable>
          )}

          {/* Main Tabs: Groups | Individual */}
          <SegmentedControl
            options={[
              {
                value: "groups",
                label: "Groups",
                icon: "groups",
                badge: groupChores.length > 0 ? groupChores.length : undefined,
              },
              {
                value: "individual",
                label: "Individual",
                icon: "person",
                badge:
                  individualChores.length > 0
                    ? individualChores.length
                    : undefined,
              },
            ]}
            value={mainTab}
            onChange={(value) => {
              setMainTab(value as MainTab);
              setActiveFilter("all");
            }}
            style={styles.mainTabs}
          />

          {/* Filter Tabs: All | Assigned | Unassigned - Always visible */}
          <View style={styles.filterTabs}>
            {(["all", "assigned", "unassigned"] as FilterTab[]).map(
              (filter) => {
                const count = filterCounts[filter];
                const isActive = activeFilter === filter;

                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterTab,
                      isActive && styles.filterTabActive,
                    ]}
                    onPress={() => setActiveFilter(filter)}
                    activeOpacity={0.7}
                  >
                    <RNText
                      style={[
                        styles.filterTabText,
                        isActive && styles.filterTabTextActive,
                      ]}
                    >
                      {filter === "all"
                        ? "All"
                        : filter === "assigned"
                          ? "Assigned"
                          : "Unassigned"}
                    </RNText>
                    <View
                      style={[
                        styles.filterTabBadge,
                        isActive && styles.filterTabBadgeActive,
                      ]}
                    >
                      <RNText
                        style={[
                          styles.filterTabBadgeText,
                          isActive && styles.filterTabBadgeTextActive,
                        ]}
                      >
                        {count}
                      </RNText>
                    </View>
                  </TouchableOpacity>
                );
              },
            )}
          </View>

          {/* Chores List */}
          {filteredChores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name={mainTab === "groups" ? "groups" : "person"}
                size={48}
                color={theme.colors.borderDark}
              />
              <RNText style={styles.emptyTitle}>
                {activeFilter === "all"
                  ? `No ${mainTab === "groups" ? "group" : "individual"} tasks`
                  : `No ${activeFilter} tasks`}
              </RNText>
              <RNText style={styles.emptyMessage}>
                {mainTab === "groups"
                  ? "Create a task in a group to see it here"
                  : "Create a personal task to get started"}
              </RNText>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={onCreateChore}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="add"
                  size={20}
                  color={theme.colors.white}
                />
                <RNText style={styles.emptyButtonText}>Create Task</RNText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.choresContainer}>
              {filteredChores.map((chore) => renderChoreCard(chore))}

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
                      <RNText style={styles.loadMoreText}>Load More</RNText>
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
      </ScreenWrapper>

      {/* Floating Action Button - Positioned outside ScreenWrapper to avoid bottom nav overlap */}
      <Animated.View
        style={[
          styles.fab,
          {
            transform: [
              { scale: fabScale },
              { rotate: fabRotationDeg },
            ],
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onCreateChore();
          }}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          style={styles.fabPressable}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <MaterialIcons name="add" size={28} color={theme.colors.white} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </>
  );

  // Render Chore Card with rich information
  function renderChoreCard(chore: Chore) {
    const category = detectCategory(chore.title, chore.description || "");
    const statusColor = getStatusColor(chore.status);
    const isMultipleAssignment =
      chore.assignmentType === "multiple" &&
      chore.assignments &&
      chore.assignments.length > 0;
    const isOpenAssignment = chore.assignmentType === "open";
    const isPending = chore.status === "pending";
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
    const isOverdue =
      dueDate && dueDate < new Date() && chore.status !== "completed";

    return (
      <Pressable
        key={chore.id}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onViewChore(chore.id);
        }}
        style={({ pressed }) => [
          styles.choreCard,
          pressed && styles.choreCardPressed,
        ]}
      >
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
                <RNText style={styles.groupBadgeText} numberOfLines={1}>
                  {groupNameDisplay}
                </RNText>
              </View>
            ) : (
              <View style={styles.personalBadge}>
                <MaterialIcons
                  name="person"
                  size={12}
                  color={theme.colors.success}
                />
                <RNText style={styles.personalBadgeText}>Personal</RNText>
              </View>
            )}

            {isRecurring && (
              <View style={styles.recurringBadge}>
                <MaterialIcons
                  name="repeat"
                  size={12}
                  color={theme.colors.primary}
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
            <RNText style={styles.pointsText}>{chore.points}</RNText>
          </View>
        </View>

        {/* Title Row */}
        <View style={styles.choreTitleRow}>
          <MaterialIcons
            name={
              getChoreCategoryMaterialIcon(category || chore.category) as any
            }
            size={22}
            color={theme.colors.iconDefault}
          />
          <RNText style={styles.choreTitle} numberOfLines={2}>
            {chore.title}
          </RNText>
        </View>

        {/* Description (if exists) */}
        {chore.description && (
          <RNText style={styles.choreDescription} numberOfLines={1}>
            {chore.description}
          </RNText>
        )}

        {/* Meta Row: Due date, Assignment info */}
        <View style={styles.choreMetaRow}>
          {/* Due Date */}
          {dueDate && (
            <View
              style={[styles.dueDateBadge, isOverdue && styles.dueDateOverdue]}
            >
              <MaterialIcons
                name="schedule"
                size={12}
                color={
                  isOverdue ? theme.colors.error : theme.colors.textSecondary
                }
              />
              <RNText
                style={[
                  styles.dueDateText,
                  isOverdue && styles.dueDateTextOverdue,
                ]}
              >
                {dueDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </RNText>
            </View>
          )}

          {/* Created by */}
          <View style={styles.creatorInfo}>
            <MaterialIcons
              name="edit"
              size={12}
              color={theme.colors.textTertiary}
            />
            <RNText style={styles.creatorText}>by {creatorName}</RNText>
          </View>
        </View>

        {/* Assignment Row */}
        <View style={styles.choreAssignmentRow}>
          {isPending && isOpenAssignment ? (
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              style={styles.grabButtonWrapper}
            >
              <LinearGradient
                colors={[theme.colors.success, '#059669']} // Success green gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.grabButton}
              >
                <MaterialIcons
                  name="pan-tool"
                  size={14}
                  color={theme.colors.white}
                />
                <RNText style={styles.grabButtonText}>Grab Task</RNText>
              </LinearGradient>
            </Pressable>
          ) : isMultipleAssignment ? (
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
                        { marginLeft: index > 0 ? -12 : 0, zIndex: 3 - index },
                      ] as any
                    }
                  />
                ))}
              </View>
              <RNText style={styles.assignmentCountText}>
                {chore.assignments!.length} assigned
              </RNText>
              {chore.assignments!.some((a) => a.userId === user?.id) && (
                <View style={styles.youBadge}>
                  <RNText style={styles.youBadgeText}>incl. you</RNText>
                </View>
              )}
            </View>
          ) : chore.assignedToUser ? (
            <View style={styles.singleAssignment}>
              <Avatar
                avatarUrl={getAvatarUrl(
                  chore.assignedToUser.profile?.avatarUrl || null,
                )}
                displayName={getUserDisplayName(chore.assignedToUser, user?.id)}
                size={36}
              />
              <RNText style={styles.assignedToText}>
                {getUserDisplayName(chore.assignedToUser, user?.id)}
              </RNText>
            </View>
          ) : (
            <RNText style={styles.unassignedText}>Unassigned</RNText>
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
            <RNText style={[styles.statusText, { color: statusColor }]}>
              {chore.status === "pending"
                ? "Open"
                : chore.status === "assigned"
                  ? "In Progress"
                  : "Done"}
            </RNText>
          </View>
        </View>
      </Pressable>
    );
  }
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"], resolvedMode: ReturnType<typeof useTheme>["resolvedMode"]) =>
  StyleSheet.create({
    // Glassy Stats Card
    statsCardWrapper: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.xl,
      marginTop: theme.spacing.headerContentGap || theme.spacing.base, // Consistent gap from Header
      marginBottom: theme.spacing.lg,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
        },
        android: {
          elevation: 6,
        },
      }),
      borderWidth: 2,
      borderColor: resolvedMode === 'light' 
        ? 'rgba(0, 0, 0, 0.08)' 
        : 'rgba(255, 255, 255, 0.12)',
    },
    statsGlassOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    statsShimmerOverlay: {
      position: 'absolute',
      top: 0,
      left: -100,
      right: -100,
      bottom: 0,
      zIndex: 1,
    },
    statsShimmerGradient: {
      flex: 1,
      width: 150,
      transform: [{ skewX: '-20deg' }],
    },
    statsCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.base,
      paddingHorizontal: theme.spacing.md,
      zIndex: 2,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    statValue: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    statLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.xs,
    },
    statsChevron: {
      marginLeft: theme.spacing.xs,
    },

    // Header
    headerHistoryButton: {
      padding: theme.spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 22,
      backgroundColor: theme.colors.overlayLight,
    },

    // Main Tabs Container (wrapper for SegmentedControl)
    mainTabs: {
      marginBottom: theme.spacing.xl,
    },

    // Filter Tabs
    filterTabs: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.base,
    },
    filterTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    filterTabActive: {
      backgroundColor: theme.colors.primary,
    },
    filterTabText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    filterTabTextActive: {
      color: theme.colors.textInverse,
    },
    filterTabBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.xs,
    },
    filterTabBadgeActive: {
      backgroundColor: theme.colors.overlayLight,
    },
    filterTabBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textSecondary,
    },
    filterTabBadgeTextActive: {
      color: theme.colors.textInverse,
    },

    // Empty State
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing["4xl"],
      paddingHorizontal: theme.spacing.xl,
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginTop: theme.spacing.base,
      marginBottom: theme.spacing.sm,
    },
    emptyMessage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.xl,
    },
    emptyButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
    },
    emptyButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textInverse,
    },

    // Chores Container
    choresContainer: {
      gap: theme.spacing.md,
    },

    // Chore Card (with glassy effect)
    choreCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        android: {
          elevation: 4,
        },
      }),
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    choreCardPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9,
    },
    choreCardGlassOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    },
    choreCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    choreCardBadges: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    groupBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      // No background - clean look per user request
      maxWidth: 220,
    },
    groupBadgeText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    personalBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.successBackground,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radii.xs,
    },
    personalBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.success,
    },
    recurringBadge: {
      backgroundColor: theme.colors.primaryBackground,
      padding: theme.spacing.xs,
      borderRadius: theme.radii.xs,
    },
    rotationBadge: {
      backgroundColor: theme.colors.warningBackground,
      padding: theme.spacing.xs,
      borderRadius: theme.radii.xs,
    },
    pointsBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: theme.colors.warningBackground,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    pointsText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.warning,
    },

    // Title Row
    choreTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      zIndex: 1,
    },
    choreTitle: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      lineHeight: 22,
    },
    choreDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },

    // Meta Row
    choreMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
      zIndex: 1,
    },
    dueDateBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.backgroundTertiary,
      paddingVertical: 3,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.radii.xs,
    },
    dueDateOverdue: {
      backgroundColor: theme.colors.errorBackground,
    },
    dueDateText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    dueDateTextOverdue: {
      color: theme.colors.error,
    },
    creatorInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    creatorText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },

    // Assignment Row
    choreAssignmentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      zIndex: 1,
    },
    grabButtonWrapper: {
      borderRadius: theme.radii.sm,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.success,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    grabButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    grabButtonText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textInverse,
    },
    multipleAssignment: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    avatarStack: {
      flexDirection: "row",
      alignItems: "center",
    },
    stackedAvatar: {
      borderWidth: 3,
      borderColor: theme.colors.background,
    },
    assignmentCountText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    singleAssignment: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    assignedToText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    youBadge: {
      backgroundColor: theme.colors.primaryBackground,
      paddingVertical: 2,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.radii.xs,
    },
    youBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    unassignedText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
      fontStyle: "italic",
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radii.xs,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },

    // Load More
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

    // FAB (with glassy gradient and glow) - Positioned above bottom nav (80px nav height + 16px margin)
    fab: {
      position: "absolute",
      right: theme.spacing.base,
      bottom: 96, // 80px bottom nav + 16px spacing
      width: 56,
      height: 56,
      borderRadius: 28,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    fabPressable: {
      width: '100%',
      height: '100%',
      borderRadius: 28,
      overflow: 'hidden',
    },
    fabGradient: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 28,
    },
  });
