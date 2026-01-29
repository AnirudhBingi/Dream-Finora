import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text as RNText,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Pressable,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/authContext";
import { getProfile, Profile } from "../api/profileApi";
import { getPosts, PostsResponse } from "../api/postApi";
import {
  deleteListing,
  getMyListings,
  Listing,
  ListingStatus,
  updateListingStatus,
} from "../api/listingApi";
import { getFriends, Friend } from "../api/friendApi";
import { getGroups, Group } from "../api/groupApi";
import { getAvatarUrl } from "../utils/avatar";
import { getSafeImageUri } from "../utils/imageUri";
import {
  getTrustScoreBreakdown,
  TrustScoreWithBreakdown,
  getUserPosition,
  UserPosition,
} from "../api/trustScoreApi";
import { SkeletonDetailScreen } from "../components/SkeletonLoader";
import { ErrorState } from "../components/ErrorState";
import { Header } from "../components/Header";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface ProfileScreenProps {
  onEdit: () => void;
  onBack: () => void;
  onSettings?: () => void;
  onEditListing?: (listingId: string) => void;
  onViewListing?: (listingId: string) => void;
  onViewPost?: (postId: string) => void;
  onViewTrustScoreInsights?: () => void;
  onViewLeaderboard?: () => void;
  onNavigateToFriends?: () => void;
  onNavigateToGroups?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  onViewUserProfile?: (userId: string) => void;
  onViewGroup?: (groupId: string) => void;
}

export function ProfileScreen({
  onEdit,
  onBack,
  onSettings,
  onEditListing,
  onViewListing,
  onViewPost,
  onViewTrustScoreInsights,
  onViewLeaderboard,
  onNavigateToFriends,
  onNavigateToGroups,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
  onViewUserProfile,
  onViewGroup,
}: ProfileScreenProps) {
  const { theme, resolvedMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, resolvedMode), [theme, resolvedMode]);
  const { token, user } = useAuth();
  const [activeContentTab, setActiveContentTab] = useState<
    "friends" | "circles" | "posts" | "listings" | "finscore"
  >("friends");

  // Animation value for hero card shimmer
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

  interface ProfileData {
    profile: Profile;
    trustScoreBreakdown: TrustScoreWithBreakdown | null;
    userPosition: UserPosition | null;
  }

  const { data, loading, error, refetch } = useDataFetch<ProfileData>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      const [profileData, breakdownData, positionData] = await Promise.all([
        getProfile(token),
        getTrustScoreBreakdown(token).catch(() => null), // Don't fail if breakdown fails
        getUserPosition(token, "overall").catch(() => null), // Don't fail if position fails
      ]);
      console.log(
        "[Profile] Loaded profile data:",
        JSON.stringify(profileData, null, 2),
      );
      console.log("[Profile] Trust score:", profileData?.user?.trustScore);
      return {
        profile: profileData,
        trustScoreBreakdown: breakdownData,
        userPosition: positionData,
      };
    },
    immediate: true,
    deps: [token],
  });

  const profile = data?.profile ?? null;
  const trustScoreBreakdown = data?.trustScoreBreakdown ?? null;
  const userPosition = data?.userPosition ?? null;

  const { data: postsResponse, loading: postsLoading } =
    useDataFetch<PostsResponse>({
      fetchFn: async () => {
        if (!token || !user?.id) throw new Error("No authentication token");
        return getPosts(token, { userId: user.id, limit: 3, offset: 0 });
      },
      immediate: true,
      deps: [token, user?.id],
    });

  const {
    data: myListings,
    loading: listingsLoading,
    refetch: refetchListings,
  } = useDataFetch<Listing[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getMyListings(token);
    },
    immediate: true,
    deps: [token],
  });

  const { data: friendsData } = useDataFetch<Friend[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getFriends(token);
    },
    immediate: true,
    deps: [token],
  });

  const { data: groupsData } = useDataFetch<Group[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      const response = await getGroups(token, 50, 0);
      return Array.isArray(response) ? response : response.groups || [];
    },
    immediate: true,
    deps: [token],
  });

  const previewPosts = (postsResponse?.posts ?? []).slice(0, 6);
  const previewListings = (myListings ?? []).slice(0, 6);
  const friendsList = friendsData ?? [];
  const friendsCount = friendsList.length;
  const groupList = groupsData ?? [];

  const tabs = useMemo(
    () => [
      { key: "friends", label: "Friends", count: friendsCount },
      { key: "circles", label: "Circles", count: groupList.length },
      { key: "finscore", label: "FinScore" },
      { key: "posts", label: "Posts", count: postsResponse?.total ?? 0 },
      { key: "listings", label: "Listings", count: myListings?.length ?? 0 },
    ],
    [friendsCount, groupList.length, postsResponse?.total, myListings?.length],
  );

  function getMiniPostPreview(post: PostsResponse["posts"][number]) {
    const image = post.images?.[0] ? getSafeImageUri(post.images[0]) : null;
    return {
      image,
      text: post.content || "Post",
    };
  }

  function getMiniListingPreview(listing: Listing) {
    const image = listing.images?.[0]
      ? getSafeImageUri(listing.images[0])
      : null;
    return {
      image,
      title: listing.title || "Listing",
      price: listing.price ? `$${listing.price}` : "Listing",
    };
  }

  async function handleUpdateListingStatus(
    listingId: string,
    status: ListingStatus,
  ) {
    if (!token) return;
    try {
      await updateListingStatus(token, listingId, status);
      await refetchListings();
    } catch (err) {
      console.error("Failed to update listing status:", err);
    }
  }

  async function handleDeleteListing(listingId: string) {
    if (!token) return;
    Alert.alert(
      "Delete listing",
      "Are you sure you want to delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteListing(token, listingId);
              await refetchListings();
            } catch (err) {
              console.error("Failed to delete listing:", err);
            }
          },
        },
      ],
    );
  }

  function getTrustScoreColor(score: number): string {
    // Trust Score Colors from design guide:
    // Excellent (90-100): Green
    // Good (70-89): Blue
    // Fair (50-69): Amber
    // Poor (0-49): Red
    if (score >= 90) return theme.colors.success;
    if (score >= 70) return theme.colors.blue;
    if (score >= 50) return theme.colors.warning;
    return theme.colors.error;
  }

  const menuOptions = [
    ...(onEdit
      ? [
          {
            label: "Edit My Space",
            icon: "edit",
            onPress: onEdit,
          },
        ]
      : []),
    ...(onSettings && !onNavigateToSettings
      ? [
          {
            label: "Settings",
            icon: "settings",
            onPress: onSettings,
          },
        ]
      : []),
  ];

  if (loading) {
    return (
      <>
        <Header
          title="Profile"
          onBack={onBack}
          useOptionsMenu
          options={menuOptions}
          showProfile={false}
          showNotifications={false}
          showSettings={false}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScreenWrapper scroll>
          <SkeletonDetailScreen />
        </ScreenWrapper>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header
          title="Profile"
          onBack={onBack}
          useOptionsMenu
          options={menuOptions}
          showProfile={false}
          showNotifications={false}
          showSettings={false}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScreenWrapper scroll>
          <ErrorState message={error} onRetry={refetch} />
        </ScreenWrapper>
      </>
    );
  }

  const avatarUrl = getAvatarUrl(profile?.avatarUrl || null);
  const finScore = profile?.user?.trustScore?.score;
  const finScoreColor =
    finScore !== undefined && finScore !== null
      ? getTrustScoreColor(finScore)
      : theme.colors.textSecondary;

  return (
    <>
      <Header
        title="Profile"
        onBack={onBack}
        useOptionsMenu
        options={menuOptions}
        showProfile={false}
        showNotifications={false}
        showSettings={false}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScreenWrapper scroll>
          {/* Hero Card with Glassy Effect - Consistent header-to-content gap */}
          <View style={styles.heroCard}>
            {/* Glassy gradient overlay */}
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.12)',
                'rgba(255, 255, 255, 0.04)',
                'rgba(255, 255, 255, 0.01)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGlassOverlay}
            />

            {/* Animated shimmer */}
            <Animated.View
              style={[
                styles.heroShimmerOverlay,
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
                style={styles.heroShimmerGradient}
              />
            </Animated.View>

            <View style={styles.heroRow}>
              <View style={styles.avatarStack}>
                <View style={styles.avatarBack} />
                <TouchableOpacity
                  style={styles.avatarFrame}
                  onPress={onEdit}
                  activeOpacity={0.8}
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                      onError={(e) => {
                        console.error("Image load error:", e.nativeEvent.error);
                        console.error("Failed to load avatar URL:", avatarUrl);
                      }}
                      onLoad={() => {
                        console.log("Avatar loaded successfully:", avatarUrl);
                      }}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <RNText style={styles.avatarPlaceholderText}>
                        {profile?.displayName?.[0]?.toUpperCase() ||
                          user?.email?.[0]?.toUpperCase() ||
                          "U"}
                      </RNText>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.heroInfo}>
                <RNText style={styles.displayName} numberOfLines={1}>
                  {profile?.displayName || "No display name"}
                </RNText>
                {finScore !== undefined && finScore !== null && (
                  <View style={styles.finScoreRow}>
                    <RNText style={styles.finScoreLabel}>FinScore</RNText>
                    <RNText
                      style={[styles.finScoreValue, { color: finScoreColor }]}
                    >
                      {finScore}
                    </RNText>
                  </View>
                )}
                {userPosition?.rank ? (
                  <View style={styles.rankBadge}>
                    <Icon
                      name="emoji-events"
                      size={14}
                      color={theme.colors.primary}
                    />
                    <RNText style={styles.rankBadgeText}>
                      Rank #{userPosition.rank}
                    </RNText>
                  </View>
                ) : null}
              </View>
            </View>
            {profile?.bio ? (
              <View style={styles.bioRow}>
                <RNText style={styles.bioText}>{profile.bio}</RNText>
              </View>
            ) : null}
          </View>

          <View style={styles.contentSection}>
            <View style={styles.tabRow}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabPill,
                    activeContentTab === tab.key && styles.tabPillActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveContentTab(tab.key as typeof activeContentTab);
                  }}
                  activeOpacity={0.7}
                >
                  <RNText
                    style={[
                      styles.tabText,
                      activeContentTab === tab.key && styles.tabTextActive,
                    ]}
                  >
                    {tab.label}
                  </RNText>
                  {"count" in tab ? (
                    <View style={[
                      styles.tabCount,
                      activeContentTab === tab.key && styles.tabCountActive,
                    ]}>
                      <RNText style={[
                        styles.tabCountText,
                        activeContentTab === tab.key && styles.tabCountTextActive,
                      ]}>{tab.count}</RNText>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>

            {activeContentTab === "friends" ? (
              <>
                {friendsList.length > 0 ? (
                  <View style={styles.listStack}>
                    {friendsList.map((friend) => {
                      const friendName = friend.friend.profile?.displayName;
                      const friendEmail = friend.friend.email;
                      const displayText = friendName || friendEmail;
                      const friendAvatar = getAvatarUrl(
                        friend.friend.profile?.avatarUrl || null,
                      );
                      return (
                        <TouchableOpacity
                          key={friend.id}
                          style={styles.listItem}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onViewUserProfile?.(friend.friend.id);
                          }}
                          activeOpacity={0.7}
                        >
                          {friendAvatar ? (
                            <Image
                              source={{ uri: friendAvatar }}
                              style={styles.listAvatar}
                            />
                          ) : (
                            <View style={styles.listAvatarPlaceholder}>
                              <RNText style={styles.listAvatarText}>
                                {displayText?.[0]?.toUpperCase() || "F"}
                              </RNText>
                            </View>
                          )}
                          <View style={styles.listInfo}>
                            <RNText style={styles.listTitle}>{displayText}</RNText>
                          </View>
                          <Icon
                            name="chevron-right"
                            size={20}
                            color={theme.colors.textSecondary}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptySection}>
                    <RNText style={styles.emptySectionText}>No friends yet.</RNText>
                  </View>
                )}
              </>
            ) : activeContentTab === "circles" ? (
              <>
                {groupList.length > 0 ? (
                  <View style={styles.listStack}>
                    {groupList.map((group) => {
                      const groupAvatar = group.avatarUrl ? getSafeImageUri(group.avatarUrl) : null;
                      return (
                        <TouchableOpacity
                          key={group.id}
                          style={styles.listItem}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onViewGroup?.(group.id);
                          }}
                          activeOpacity={0.7}
                        >
                          {groupAvatar ? (
                            <Image
                              source={{ uri: groupAvatar }}
                              style={styles.listAvatar}
                            />
                          ) : (
                            <View style={styles.listIcon}>
                              <Icon
                                name="groups"
                                size={20}
                                color={theme.colors.blue}
                              />
                            </View>
                          )}
                          <View style={styles.listInfo}>
                            <RNText style={styles.listTitle}>{group.name}</RNText>
                            <RNText style={styles.listSubtitle}>
                              {group.members?.length ?? 0} members
                            </RNText>
                          </View>
                          <Icon
                            name="chevron-right"
                            size={20}
                            color={theme.colors.textSecondary}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptySection}>
                    <RNText style={styles.emptySectionText}>No circles yet.</RNText>
                  </View>
                )}
              </>
            ) : activeContentTab === "posts" ? (
              postsLoading ? (
                <View style={styles.sectionLoading}>
                  <ActivityIndicator size="small" color={theme.colors.blue} />
                </View>
              ) : previewPosts.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.miniRow}>
                    {previewPosts.map((post) => {
                      const preview = getMiniPostPreview(post);
                      return (
                        <TouchableOpacity
                          key={post.id}
                          style={styles.miniCard}
                          onPress={() => onViewPost?.(post.id)}
                          activeOpacity={0.8}
                        >
                          {preview.image ? (
                            <Image
                              source={{ uri: preview.image }}
                              style={styles.miniImage}
                            />
                          ) : (
                            <View style={styles.miniFallback}>
                              <RNText style={styles.miniFallbackText}>Post</RNText>
                            </View>
                          )}
                          <RNText style={styles.miniCaption} numberOfLines={1}>
                            {preview.text}
                          </RNText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.emptySection}>
                  <RNText style={styles.emptySectionText}>No posts yet.</RNText>
                </View>
              )
            ) : activeContentTab === "listings" ? (
              listingsLoading ? (
                <View style={styles.sectionLoading}>
                  <ActivityIndicator size="small" color={theme.colors.blue} />
                </View>
              ) : previewListings.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.miniRow}>
                    {previewListings.map((listing) => {
                      const preview = getMiniListingPreview(listing);
                      return (
                        <TouchableOpacity
                          key={listing.id}
                          style={styles.miniCard}
                          onPress={() => onViewListing?.(listing.id)}
                          activeOpacity={0.8}
                        >
                          {preview.image ? (
                            <Image
                              source={{ uri: preview.image }}
                              style={styles.miniImage}
                            />
                          ) : (
                            <View style={styles.miniFallback}>
                              <RNText style={styles.miniFallbackText}>
                                Listing
                              </RNText>
                            </View>
                          )}
                          <RNText style={styles.miniCaption} numberOfLines={1}>
                            {preview.title}
                          </RNText>
                          <RNText style={styles.miniMeta} numberOfLines={1}>
                            {preview.price}
                          </RNText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.emptySection}>
                  <RNText style={styles.emptySectionText}>No listings yet.</RNText>
                </View>
              )
            ) : trustScoreBreakdown?.breakdown?.expense ? (
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeaderRow}>
                  <RNText style={styles.breakdownTitle}>FinScore Breakdown</RNText>
                  <View style={styles.breakdownActions}>
                    {onViewTrustScoreInsights && (
                      <TouchableOpacity
                        style={styles.breakdownAction}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onViewTrustScoreInsights();
                        }}
                        activeOpacity={0.7}
                      >
                        <RNText style={styles.breakdownActionText}>Insights</RNText>
                      </TouchableOpacity>
                    )}
                    {onViewLeaderboard && (
                      <TouchableOpacity
                        style={styles.breakdownAction}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onViewLeaderboard();
                        }}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name="emoji-events"
                          size={14}
                          color={theme.colors.textSecondary}
                        />
                        <RNText style={styles.breakdownActionText}>Rank</RNText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLabelRow}>
                    <View
                      style={[styles.breakdownIcon, styles.breakdownBlue]}
                    />
                    <RNText style={styles.breakdownItemLabel}>Billchop</RNText>
                    <RNText style={styles.breakdownScore}>
                      {Math.round(trustScoreBreakdown.expenseScore)}/35
                    </RNText>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${(trustScoreBreakdown.expenseScore / 35) * 100}%`,
                          backgroundColor: theme.colors.blue,
                        },
                      ]}
                    />
                  </View>
                  <RNText style={styles.breakdownDetails}>
                    On-time:{" "}
                    {Math.round(
                      (trustScoreBreakdown.breakdown.expense
                        .onTimeSettlementRate || 0) * 100,
                    )}
                    % • Organizer:{" "}
                    {Math.round(
                      (trustScoreBreakdown.breakdown.expense.organizerBonus ||
                        0) * 100,
                    )}
                    % • Payer:{" "}
                    {Math.round(
                      (trustScoreBreakdown.breakdown.expense.payerBonus || 0) *
                        100,
                    )}
                    %
                  </RNText>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLabelRow}>
                    <View
                      style={[styles.breakdownIcon, styles.breakdownGreen]}
                    />
                    <RNText style={styles.breakdownItemLabel}>Chores</RNText>
                    <RNText style={styles.breakdownScore}>
                      {Math.round(trustScoreBreakdown.choreScore)}/35
                    </RNText>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${(trustScoreBreakdown.choreScore / 35) * 100}%`,
                          backgroundColor: theme.colors.success,
                        },
                      ]}
                    />
                  </View>
                  <RNText style={styles.breakdownDetails}>
                    Completion:{" "}
                    {Math.round(
                      trustScoreBreakdown.breakdown.chore.completionRate * 100,
                    )}
                    % • On-time:{" "}
                    {Math.round(
                      trustScoreBreakdown.breakdown.chore.onTimeRate * 100,
                    )}
                    % • Organizer:{" "}
                    {Math.round(
                      (trustScoreBreakdown.breakdown.chore.organizerBonus ||
                        0) * 100,
                    )}
                    %
                  </RNText>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLabelRow}>
                    <View
                      style={[styles.breakdownIcon, styles.breakdownAmber]}
                    />
                    <RNText style={styles.breakdownItemLabel}>Community</RNText>
                    <RNText style={styles.breakdownScore}>
                      {Math.round(trustScoreBreakdown.communityScore)}/15
                    </RNText>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${(trustScoreBreakdown.communityScore / 15) * 100}%`,
                          backgroundColor: theme.colors.warning,
                        },
                      ]}
                    />
                  </View>
                  <RNText style={styles.breakdownDetails}>
                    Listings:{" "}
                    {Math.round(
                      trustScoreBreakdown.breakdown.community
                        .listingSuccessRate * 100,
                    )}
                    % • Engagement:{" "}
                    {Math.round(
                      trustScoreBreakdown.breakdown.community.engagementRate *
                        100,
                    )}
                    %
                  </RNText>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLabelRow}>
                    <View
                      style={[styles.breakdownIcon, styles.breakdownTeal]}
                    />
                    <RNText style={styles.breakdownItemLabel}>
                      Responsiveness
                    </RNText>
                    <RNText style={styles.breakdownScore}>
                      {Math.round(trustScoreBreakdown.responsivenessScore || 0)}
                      /10
                    </RNText>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${((trustScoreBreakdown.responsivenessScore || 0) / 10) * 100}%`,
                          backgroundColor: theme.colors.info,
                        },
                      ]}
                    />
                  </View>
                  <RNText style={styles.breakdownDetails}>
                    Response:{" "}
                    {Math.round(
                      (trustScoreBreakdown.breakdown.responsiveness
                        ?.responseRate || 0) * 100,
                    )}
                    %
                  </RNText>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLabelRow}>
                    <View
                      style={[styles.breakdownIcon, styles.breakdownSlate]}
                    />
                    <RNText style={styles.breakdownItemLabel}>Account Trust</RNText>
                    <RNText style={styles.breakdownScore}>
                      {Math.round(trustScoreBreakdown.accountTrustScore || 0)}/5
                    </RNText>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${((trustScoreBreakdown.accountTrustScore || 0) / 5) * 100}%`,
                          backgroundColor: theme.colors.backgroundSecondary,
                        },
                      ]}
                    />
                  </View>
                  <RNText style={styles.breakdownDetails}>
                    Profile:{" "}
                    {Math.round(
                      (trustScoreBreakdown.breakdown.accountTrust
                        ?.profileCompletionRate || 0) * 100,
                    )}
                    %
                  </RNText>
                </View>
              </View>
            ) : (
              <View style={styles.emptySection}>
                <RNText style={styles.emptySectionText}>
                  FinScore details are not available.
                </RNText>
              </View>
            )}
          </View>
      </ScreenWrapper>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"], resolvedMode: ReturnType<typeof useTheme>["resolvedMode"]) =>
  StyleSheet.create({
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
      textAlign: "center",
      marginBottom: theme.spacing.base,
    },
    retryButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    content: {
      alignItems: "stretch",
    },
    heroCard: {
      width: "100%",
      padding: theme.spacing.lg,
      borderRadius: theme.radii["2xl"],
      backgroundColor: theme.colors.background,
      marginTop: theme.spacing.headerContentGap || theme.spacing.base,
      marginBottom: theme.spacing.lg,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
        },
        android: {
          elevation: 8,
        },
      }),
      borderWidth: 2,
      borderColor: resolvedMode === 'light' 
        ? 'rgba(0, 0, 0, 0.08)' 
        : 'rgba(255, 255, 255, 0.12)',
    },
    heroGlassOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    heroShimmerOverlay: {
      position: 'absolute',
      top: 0,
      left: -100,
      right: -100,
      bottom: 0,
      zIndex: 1,
    },
    heroShimmerGradient: {
      flex: 1,
      width: 200,
      transform: [{ skewX: '-20deg' }],
    },
    heroRow: {
      flexDirection: "row",
      gap: theme.spacing.lg,
      zIndex: 2,
    },
    avatarStack: {
      width: 132,
      height: 152,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarBack: {
      position: "absolute",
      width: 120,
      height: 140,
      borderRadius: theme.radii["2xl"],
      backgroundColor: theme.colors.backgroundTertiary,
      transform: [{ rotate: "-3deg" }],
    },
    avatarFrame: {
      width: 120,
      height: 140,
      borderRadius: theme.radii["2xl"],
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarPlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.blue,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarPlaceholderText: {
      fontSize: theme.typography.fontSize["4xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textInverse,
    },
    heroInfo: {
      flex: 1,
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    displayName: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
      lineHeight: 26,
    },
    finScoreRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    finScoreLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    finScoreValue: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.bold,
    },
    rankBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.full,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryBackground,
    },
    rankBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    bioRow: {
      marginTop: theme.spacing.base,
    },
    bioText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    bio: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      lineHeight: 24,
    },
    breakdownCard: {
      width: "100%",
      padding: theme.spacing.base,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.backgroundSecondary,
      marginTop: theme.spacing.base,
    },
    breakdownHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.base,
    },
    breakdownActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    breakdownAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.full,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    breakdownActionText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    breakdownTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    breakdownItem: {
      marginBottom: theme.spacing.base,
    },
    breakdownLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    breakdownIcon: {
      width: 8,
      height: 8,
      borderRadius: theme.radii.xs,
    },
    breakdownBlue: {
      backgroundColor: theme.colors.blue,
    },
    breakdownGreen: {
      backgroundColor: theme.colors.success,
    },
    breakdownAmber: {
      backgroundColor: theme.colors.warning,
    },
    breakdownTeal: {
      backgroundColor: theme.colors.info,
    },
    breakdownSlate: {
      backgroundColor: theme.colors.backgroundSecondary,
    },
    breakdownItemLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    breakdownScore: {
      marginLeft: "auto",
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    breakdownBar: {
      height: 8,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.radii.sm,
      marginBottom: theme.spacing.xs,
      overflow: "hidden",
    },
    breakdownBarFill: {
      height: "100%",
      borderRadius: theme.radii.sm,
    },
    breakdownDetails: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    contentSection: {
      width: "100%",
      marginTop: theme.spacing.sm,
      backgroundColor: "transparent",
      padding: 0,
    },
    sectionHeader: {
      marginBottom: theme.spacing.base,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    tabRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
      justifyContent: "space-between",
    },
    tabPill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      borderRadius: theme.radii.full,
      borderWidth: 0,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      backgroundColor: "transparent",
      minHeight: 28,
      justifyContent: "center",
    },
    tabPillActive: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tabText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    tabTextActive: {
      color: theme.colors.textInverse,
      fontWeight: theme.typography.fontWeight.bold,
    },
    tabCount: {
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 0,
      borderRadius: theme.radii.full,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    tabCountActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    tabCountText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    tabCountTextActive: {
      color: theme.colors.textInverse,
    },
    sectionLoading: {
      paddingVertical: theme.spacing.md,
      alignItems: "center",
    },
    sectionList: {
      gap: theme.spacing.lg,
    },
    listStack: {
      gap: theme.spacing.sm,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    listAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    listAvatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.blue,
      alignItems: "center",
      justifyContent: "center",
    },
    listAvatarText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textInverse,
      fontWeight: theme.typography.fontWeight.bold,
    },
    listIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.radii.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.blueBackground,
    },
    listInfo: {
      flex: 1,
    },
    listTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    listSubtitle: {
      marginTop: theme.spacing.xs / 2,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    miniRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
    },
    miniCard: {
      width: 140,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
    },
    miniImage: {
      width: "100%",
      height: 90,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.backgroundSecondary,
      marginBottom: theme.spacing.xs,
    },
    miniFallback: {
      width: "100%",
      height: 90,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.backgroundSecondary,
      marginBottom: theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    miniFallbackText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    miniCaption: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    miniMeta: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    emptySection: {
      paddingVertical: theme.spacing.md,
      alignItems: "center",
    },
    emptySectionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    insightsButton: {
      marginTop: theme.spacing.base,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: theme.colors.blue,
      borderRadius: theme.radii.md,
      alignItems: "center",
    },
    insightsButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    leaderboardButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      marginTop: theme.spacing.base,
      gap: theme.spacing.sm,
    },
    leaderboardButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
