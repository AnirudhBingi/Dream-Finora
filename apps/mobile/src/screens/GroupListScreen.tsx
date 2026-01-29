import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text as RNText,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  Image,
  Animated,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getGroups, Group } from "../api/groupApi";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { getUserFriendlyErrorMessage } from "../components/ErrorState";
import { SkeletonGroupList } from "../components/SkeletonLoader";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { getAvatarUrl } from "../utils/avatar";
import { useTheme } from "../theme";

interface GroupListScreenProps {
  onCreateGroup: () => void;
  onViewGroup: (groupId: string) => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function GroupListScreen({
  onCreateGroup,
  onViewGroup,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: GroupListScreenProps) {
  const { theme, resolvedMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, resolvedMode), [theme, resolvedMode]);
  const { token, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);
  const limit = 20;

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

  // Fetch groups (initial load and refresh)
  const { loading, refreshing, error, refresh, refetch } = useDataFetch<
    Group[]
  >({
    fetchFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const data = await getGroups(token, limit, 0);
      // Handle paginated response
      let groupsList: Group[] = [];
      if (Array.isArray(data)) {
        groupsList = data;
        setHasMore(false);
      } else {
        groupsList = data.groups || [];
        setHasMore(data.hasMore || false);
      }
      setGroups(groupsList);
      setOffset(groupsList.length);
      return groupsList;
    },
    immediate: true,
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
      const data = await getGroups(token, limit, nextOffset);

      let groupsList: Group[] = [];
      if (Array.isArray(data)) {
        groupsList = data;
        setHasMore(false);
      } else {
        groupsList = data.groups || [];
        setHasMore(data.hasMore || false);
      }

      // Append to existing groups
      if (groupsList.length > 0) {
        setGroups((prev) => [...prev, ...groupsList]);
        setOffset((prev) => prev + groupsList.length);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more groups:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  function getUserDisplayName(groupUser: Group["createdByUser"]): string {
    if (!groupUser) return "Unknown";
    if (groupUser.id === user?.id) return "you";
    return groupUser.profile?.displayName || groupUser.email || "Unknown";
  }

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups;
    }
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [groups, searchQuery]);

  if (loading) {
    return (
      <>
        <Header
          title="Circles"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScreenWrapper scroll>
          <View style={styles.loadingContent}>
            <SkeletonGroupList count={5} />
          </View>
        </ScreenWrapper>
      </>
    );
  }

  return (
    <>
      <Header
        title="Circles"
        onBack={onBack}
        rightActions={
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCreateGroup();
            }}
            style={styles.headerButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Create new circle"
          >
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        }
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScreenWrapper
        scroll
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } =
            e.nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            if (hasMore && !loadingMore) {
              loadMore();
            }
          }
        }}
        scrollEventThrottle={400}
      >
          {/* Consistent header-to-content gap */}
          {error && (
            <View style={styles.errorContainer}>
              <RNText style={styles.errorText}>{error}</RNText>
              <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                <RNText style={styles.retryButtonText}>Retry</RNText>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar */}
          {groups.length > 0 && (
            <View style={styles.searchContainer}>
              <Icon
                name="search"
                size={20}
                color={theme.colors.textSecondary}
              />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search circles..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.textTertiary}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    searchInputRef.current?.blur();
                  }}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="close"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Create Circle Button - Prominent with Gradient + Haptics */}
          {filteredGroups.length > 0 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onCreateGroup();
              }}
              style={styles.createCircleButtonWrapper}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createCircleButton}
              >
                <MaterialIcons name="add" size={24} color={theme.colors.white} />
                <RNText style={styles.createCircleButtonText}>Create Circle</RNText>
              </LinearGradient>
            </Pressable>
          )}

          {filteredGroups.length === 0 && groups.length > 0 ? (
            <EmptyState
              icon="search"
              title="No circles found"
              message="Try adjusting your search query."
            />
          ) : filteredGroups.length === 0 ? (
            <EmptyState
              icon="group"
              title="No circles yet"
              message="Create a circle to start splitting bills with friends!"
              actionLabel="Create Circle"
              onAction={onCreateGroup}
            />
          ) : (
            filteredGroups.map((group) => {
              const memberCount = group.members?.length || 0;
              const expenseCount = group._count?.expenses || 0;
              const choreCount = group._count?.chores || 0;
              const rideCount = group._count?.rides || 0;
              const messageCount = group._count?.messages || 0;
              // Get first 4 members for avatar preview
              const previewMembers = (group.members || []).slice(0, 4);
              const remainingMembers = Math.max(0, memberCount - 4);

              // Generate group color based on name (consistent)
              const groupInitial = group.name.charAt(0).toUpperCase();
              const groupColors = [
                {
                  bg: theme.colors.primaryBackground,
                  icon: theme.colors.primary,
                }, // Indigo
                { bg: theme.colors.errorBackground, icon: theme.colors.error }, // Red/Pink
                {
                  bg: theme.colors.successBackground,
                  icon: theme.colors.success,
                }, // Green
                {
                  bg: theme.colors.warningBackground,
                  icon: theme.colors.warning,
                }, // Amber
                {
                  bg: theme.colors.primaryBackground,
                  icon: theme.colors.primary,
                }, // Purple (using primary)
                { bg: theme.colors.blueBackground, icon: theme.colors.blue }, // Blue
              ];
              const colorIndex = group.name.charCodeAt(0) % groupColors.length;
              const groupColor = groupColors[colorIndex];

              // Calculate activity level (for now based on expenses, later can include all features)
              const activityLevel =
                expenseCount > 10
                  ? "high"
                  : expenseCount > 0
                    ? "medium"
                    : "low";

              return (
                <Pressable
                  key={group.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onViewGroup(group.id);
                  }}
                  style={({ pressed }) => [
                    styles.groupCard,
                    pressed && styles.groupCardPressed,
                  ]}
                >
                  {/* Subtle glassy gradient overlay */}
                  <LinearGradient
                    colors={[
                      'rgba(255, 255, 255, 0.05)',
                      'rgba(255, 255, 255, 0.02)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.groupCardGlassOverlay}
                  />

                  {/* Group Icon/Header Section */}
                  <View style={styles.groupCardHeader}>
                    <View style={{ position: "relative" }}>
                      <Avatar
                        avatarUrl={getAvatarUrl(group.avatarUrl || null)}
                        displayName={group.name}
                        size={56}
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
                    <View style={styles.groupHeaderContent}>
                      <View style={styles.groupTitleRow}>
                        <RNText style={styles.groupName}>{group.name}</RNText>
                        {activityLevel === "high" && (
                          <View style={styles.activityBadge}>
                            <View style={styles.activityDot} />
                            <RNText style={styles.activityBadgeText}>Active</RNText>
                          </View>
                        )}
                      </View>
                      {group.description &&
                        group.description.trim() &&
                        group.description.trim() !== "Check" && (
                          <RNText
                            style={styles.groupDescription}
                            numberOfLines={1}
                          >
                            {group.description}
                          </RNText>
                        )}
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={theme.colors.textTertiary}
                    />
                  </View>

                  {/* Activity Stats Grid - All 4 Features */}
                  <View style={styles.activityStatsGrid}>
                    <View style={styles.activityStatItem}>
                      <View
                        style={[
                          styles.activityStatIcon,
                          { backgroundColor: theme.colors.primaryBackground },
                        ]}
                      >
                        <MaterialIcons
                          name="receipt"
                          size={18}
                          color={theme.colors.primary}
                        />
                      </View>
                      <View style={styles.activityStatContent}>
                        <RNText style={styles.activityStatValue}>
                          {expenseCount}
                        </RNText>
                        <RNText style={styles.activityStatLabel}>Billchops</RNText>
                      </View>
                    </View>
                    <View style={styles.activityStatItem}>
                      <View
                        style={[
                          styles.activityStatIcon,
                          { backgroundColor: theme.colors.successBackground },
                        ]}
                      >
                        <MaterialIcons
                          name="check-circle"
                          size={18}
                          color={theme.colors.success}
                        />
                      </View>
                      <View style={styles.activityStatContent}>
                        <RNText style={styles.activityStatValue}>
                          {choreCount}
                        </RNText>
                        <RNText style={styles.activityStatLabel}>Chores</RNText>
                      </View>
                    </View>
                    <View style={styles.activityStatItem}>
                      <View
                        style={[
                          styles.activityStatIcon,
                          { backgroundColor: theme.colors.blueBackground },
                        ]}
                      >
                        <MaterialIcons
                          name="directions-car"
                          size={18}
                          color={theme.colors.blue}
                        />
                      </View>
                      <View style={styles.activityStatContent}>
                        <RNText style={styles.activityStatValue}>
                          {rideCount}
                        </RNText>
                        <RNText style={styles.activityStatLabel}>Rides</RNText>
                      </View>
                    </View>
                    <View style={styles.activityStatItem}>
                      <View
                        style={[
                          styles.activityStatIcon,
                          { backgroundColor: theme.colors.errorBackground },
                        ]}
                      >
                        <MaterialIcons
                          name="chat"
                          size={18}
                          color={theme.colors.error}
                        />
                      </View>
                      <View style={styles.activityStatContent}>
                        <RNText style={styles.activityStatValue}>
                          {messageCount}
                        </RNText>
                        <RNText style={styles.activityStatLabel}>Messages</RNText>
                      </View>
                    </View>
                  </View>

                  {/* Member Avatars Preview */}
                  {previewMembers.length > 0 && (
                    <View style={styles.membersPreview}>
                      <View style={styles.avatarsContainer}>
                        {previewMembers.map((member, index) => {
                          const displayName =
                            member.user?.profile?.displayName ||
                            member.user?.email ||
                            "Unknown";
                          return (
                            <View
                              key={member.id}
                              style={[
                                styles.avatarWrapper,
                                index > 0 && { marginLeft: -8 }, // Overlap avatars
                              ]}
                            >
                              <Avatar
                                avatarUrl={member.user?.profile?.avatarUrl}
                                displayName={displayName}
                                size={36}
                                borderWidth={2}
                                borderColor={theme.colors.background}
                              />
                            </View>
                          );
                        })}
                        {remainingMembers > 0 && (
                          <View
                            style={[
                              styles.avatarWrapper,
                              styles.avatarMore,
                              { marginLeft: -8 },
                            ]}
                          >
                            <View style={styles.avatarMoreContainer}>
                              <RNText style={styles.avatarMoreText}>
                                +{remainingMembers}
                              </RNText>
                            </View>
                          </View>
                        )}
                      </View>
                      <RNText style={styles.membersPreviewText}>
                        {memberCount} member{memberCount !== 1 ? "s" : ""} •
                        Created by {getUserDisplayName(group.createdByUser)}
                      </RNText>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
          {hasMore && filteredGroups.length > 0 && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={loadMore}
              disabled={loadingMore}
              activeOpacity={0.7}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <RNText style={styles.loadMoreButtonText}>Load More</RNText>
              )}
            </TouchableOpacity>
          )}
      </ScreenWrapper>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"], resolvedMode: ReturnType<typeof useTheme>["resolvedMode"]) =>
  StyleSheet.create({
    loadingContent: {
      marginTop: theme.spacing.headerContentGap || theme.spacing.base,
    },
    headerButton: {
      padding: theme.spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
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
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: theme.radii.md,
      marginTop: theme.spacing.headerContentGap || theme.spacing.base,
      marginBottom: theme.spacing.base,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.radii.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.headerContentGap || theme.spacing.base,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      padding: 0,
    },
    emptyContainer: {
      alignItems: "center",
      padding: theme.spacing["2xl"],
    },
    emptyText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.xl,
    },
    emptyButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
    },
    emptyButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    createCircleButtonWrapper: {
      marginBottom: theme.spacing.base,
      borderRadius: theme.radii.lg,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    createCircleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    createCircleButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.2,
    },
    groupCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.xl,
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
      borderWidth: 1.5,
      borderColor: resolvedMode === 'light' 
        ? 'rgba(0, 0, 0, 0.06)' 
        : 'rgba(255, 255, 255, 0.08)',
    },
    groupCardPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9,
    },
    groupCardGlassOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    },
    groupCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.base,
      gap: theme.spacing.md,
      zIndex: 1,
    },
    groupIconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.radii.lg,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
      overflow: "hidden",
    },
    groupImage: {
      width: "100%",
      height: "100%",
    },
    groupIconBadge: {
      position: "absolute",
      bottom: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
      ...theme.shadows.sm,
    },
    groupIconText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.5,
    },
    groupHeaderContent: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    groupTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    groupName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
      flex: 1,
    },
    activityBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.successBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: 12,
      gap: theme.spacing.xs,
    },
    activityDot: {
      width: 6,
      height: 6,
      borderRadius: theme.radii.xs,
      backgroundColor: theme.colors.success,
    },
    activityBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.success,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    groupDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.normal,
    },
    activityStatsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.base,
      paddingBottom: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray100,
    },
    activityStatItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
      minWidth: "45%",
    },
    activityStatIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
    },
    activityStatContent: {
      flex: 1,
    },
    activityStatValue: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
    },
    activityStatValueEmpty: {
      color: theme.colors.textTertiary,
      opacity: 0.6,
    },
    activityStatLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
      marginTop: 2,
    },
    membersPreview: {
      gap: theme.spacing.md,
      zIndex: 1,
    },
    avatarsContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarWrapper: {
      borderRadius: 18,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    avatarMore: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.backgroundTertiary,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    avatarMoreContainer: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarMoreText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textSecondary,
    },
    membersPreviewText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.normal,
    },
    loadMoreButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      marginTop: theme.spacing.base,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      ...theme.shadows.button,
    },
    loadMoreButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
