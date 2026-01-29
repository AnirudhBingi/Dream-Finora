import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text as RNText,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Animated,
  Pressable,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getUserProfile, UserProfile } from "../api/profileApi";
import { getPosts, PostsResponse } from "../api/postApi";
import { getListings, Listing } from "../api/listingApi";
import { getPublicGroups, Group, requestJoinGroup } from "../api/groupApi";
import { getAvatarUrl } from "../utils/avatar";
import { getSafeImageUri } from "../utils/imageUri";
import {
  Friend,
  getMutualFriends,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  blockUser,
} from "../api/friendApi";
import { SkeletonDetailScreen } from "../components/SkeletonLoader";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { Header } from "../components/Header";
import { useTheme } from "../theme";
import { ScreenWrapper } from "../components/ScreenWrapper";

interface UserProfileScreenProps {
  userId: string;
  onBack: () => void;
  onNavigateToMessage?: (userId: string) => void;
  onNavigateToMutualFriends?: (userId: string) => void;
  onViewListing?: (listingId: string) => void;
  onViewPost?: (postId: string) => void;
  onNavigateToGroups?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  onViewUserProfile?: (userId: string) => void;
  onViewGroup?: (groupId: string) => void;
}

export function UserProfileScreen({
  userId,
  onBack,
  onNavigateToMessage,
  onNavigateToMutualFriends,
  onViewListing,
  onViewPost,
  onNavigateToGroups,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
  onViewUserProfile,
  onViewGroup,
}: UserProfileScreenProps) {
  const { token } = useAuth();
  const { theme, resolvedMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, resolvedMode), [theme, resolvedMode]);
  const [activeContentTab, setActiveContentTab] = useState<
    "friends" | "circles" | "posts" | "listings" | "finscore"
  >("friends");
  const [previewVisible, setPreviewVisible] = useState(false);

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

  const {
    data: profile,
    loading,
    error,
    refetch,
  } = useDataFetch<UserProfile>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getUserProfile(token, userId);
    },
    immediate: true,
    deps: [token, userId],
  });

  const { data: postsResponse, loading: postsLoading } =
    useDataFetch<PostsResponse>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        return getPosts(token, { userId, limit: 3, offset: 0 });
      },
      immediate: true,
      deps: [token, userId],
    });

  const { data: listingsData, loading: listingsLoading } = useDataFetch<
    Listing[]
  >({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      const response = await getListings(token, {
        userId,
        limit: 3,
        offset: 0,
      });
      if (Array.isArray(response)) {
        return response;
      }
      return response.listings || [];
    },
    immediate: true,
    deps: [token, userId],
  });

  const { data: publicGroupsResponse, refetch: refetchPublicGroups } =
    useDataFetch<{ groups: Group[] }>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        return getPublicGroups(token, {
          memberId: userId,
          limit: 50,
          offset: 0,
        });
      },
      immediate: true,
      deps: [token, userId],
    });

  const previewPosts = (postsResponse?.posts ?? []).slice(0, 6);
  const previewListings = (listingsData ?? []).slice(0, 6);
  const publicGroups = publicGroupsResponse?.groups ?? [];

  const { data: mutualFriends } = useDataFetch<Friend[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getMutualFriends(token, userId);
    },
    immediate: true,
    deps: [token, userId],
  });

  const tabs = useMemo(
    () => [
      { key: "friends", label: "Friends", count: mutualFriends?.length ?? 0 },
      { key: "circles", label: "Circles", count: publicGroups.length },
      { key: "finscore", label: "FinScore" },
      { key: "posts", label: "Posts", count: postsResponse?.total ?? 0 },
      {
        key: "listings",
        label: "Listings",
        count: profile?.listingsCount ?? 0,
      },
    ],
    [
      mutualFriends?.length,
      publicGroups.length,
      postsResponse?.total,
      profile?.listingsCount,
    ],
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

  const { loading: actionLoading, execute: executeFriendAction } =
    useAsyncOperation({
      operationFn: async (action: "send" | "accept" | "remove") => {
        if (!token || !profile) throw new Error("Missing token or profile");

        if (action === "send") {
          await sendFriendRequest(token, {
            friendEmailOrMobile: profile.email || "",
          });
        }
        // Other actions need friendship ID, handled separately
        return null;
      },
      onSuccess: () => {
        refetch(); // Refresh profile after action
      },
    });

  const { loading: joinRequestLoading, execute: executeJoinRequest } =
    useAsyncOperation({
      operationFn: async (groupId: string) => {
        if (!token) throw new Error("Missing token");
        return requestJoinGroup(token, groupId);
      },
      onSuccess: () => {
        refetchPublicGroups();
      },
    });

  function getTrustScoreColor(score: number): string {
    if (score >= 90) return theme.colors.success;
    if (score >= 70) return theme.colors.blue;
    if (score >= 50) return theme.colors.warning;
    return theme.colors.error;
  }

  async function handleSendFriendRequest() {
    if (!token || !profile) return;

    try {
      await executeFriendAction("send");
      Alert.alert("Success", "Friend request sent!");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to send friend request",
      );
    }
  }

  async function handleAcceptRequest() {
    if (!token || !profile) return;
    // Need to get the friendship ID - for now, reload and accept
    Alert.alert("Info", "Please accept the request from the friends list");
    await refetch();
  }

  async function handleRemoveFriend() {
    if (!token || !profile) return;

    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${profile.displayName || profile.email} as a friend?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            // Need friendship ID - for now, show message
            Alert.alert("Info", "Please remove from friends list");
            await refetch();
          },
        },
      ],
    );
  }

  async function handleBlockUser() {
    if (!token || !profile) return;

    Alert.alert(
      "Block User",
      `Are you sure you want to block ${profile.displayName || profile.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(token, userId);
              Alert.alert("Success", "User blocked");
              await refetch();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to block user",
              );
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <>
        <Header
          title="Profile"
          onBack={onBack}
          showProfile={false}
          showNotifications={false}
          showSettings={false}
          onNavigateToProfile={onNavigateToProfile}
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
          showProfile={false}
          showNotifications={false}
          showSettings={false}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScreenWrapper scroll>
          <ErrorState message={error} onRetry={refetch} />
        </ScreenWrapper>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Header
          title="Profile"
          onBack={onBack}
          showProfile={false}
          showNotifications={false}
          showSettings={false}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScreenWrapper scroll>
          <ErrorState message="Profile not found" onRetry={refetch} />
        </ScreenWrapper>
      </>
    );
  }

  const avatarUrl = getAvatarUrl(profile.avatarUrl);
  const isFriend = profile.friendStatus === "accepted";
  const isPendingIncoming = profile.friendStatus === "pending_incoming";
  const isPendingOutgoing = profile.friendStatus === "pending_outgoing";
  const isBlocked = profile.friendStatus === "blocked";
  const finScore = profile.trustScore?.score;
  const finScoreColor =
    finScore !== undefined && finScore !== null
      ? getTrustScoreColor(finScore)
      : theme.colors.textSecondary;

  // Header actions menu for destructive actions
  const headerActions = [
    ...(isFriend ? [{
      label: 'Remove Friend',
      icon: 'person-remove',
      onPress: handleRemoveFriend,
      danger: true,
    }] : []),
    ...(!isBlocked ? [{
      label: 'Block User',
      icon: 'block',
      onPress: handleBlockUser,
      danger: true,
    }] : []),
  ];

  return (
    <>
      <Header
        title={profile.displayName || "Profile"}
        onBack={onBack}
        showProfile={false}
        showNotifications={false}
        showSettings={false}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        useOptionsMenu={headerActions.length > 0}
        options={headerActions}
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
                  activeOpacity={0.9}
                  onLongPress={() => {
                    if (avatarUrl) setPreviewVisible(true);
                  }}
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <RNText style={styles.avatarPlaceholderText}>
                        {profile.displayName?.[0]?.toUpperCase() ||
                          profile.email?.[0]?.toUpperCase() ||
                          "U"}
                      </RNText>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.heroInfo}>
                <RNText style={styles.displayName} numberOfLines={1}>
                  {profile.displayName || "No display name"}
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
              </View>
            </View>
            {profile.bio ? (
              <View style={styles.bioRow}>
                <RNText style={styles.bioText}>{profile.bio}</RNText>
              </View>
            ) : null}
            
            {/* Message Icon Button - Bottom Right of Hero Card */}
            {onNavigateToMessage &&
              (isFriend || profile.profileVisibility === "public") && (
                <TouchableOpacity
                  style={styles.messageIconButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onNavigateToMessage(userId);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[theme.colors.blue, theme.colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.messageIconGradient}
                  >
                    <MaterialIcons
                      name="message"
                      size={20}
                      color={theme.colors.textInverse}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              )}
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
                  onPress={() =>
                    setActiveContentTab(tab.key as typeof activeContentTab)
                  }
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
                    <View style={styles.tabCount}>
                      <RNText style={styles.tabCountText}>{tab.count}</RNText>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>

            {activeContentTab === "friends" ? (
              <>
                {!isFriend &&
                  !isPendingOutgoing &&
                  !isPendingIncoming &&
                  !isBlocked && (
                    <View style={styles.sectionHeaderRow}>
                      <TouchableOpacity
                        style={styles.addFriendButton}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          handleSendFriendRequest();
                        }}
                        disabled={actionLoading}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name="person-add"
                          size={18}
                          color={theme.colors.blue}
                        />
                        <RNText style={styles.addFriendButtonText}>Add Friend</RNText>
                      </TouchableOpacity>
                    </View>
                  )}
                {(mutualFriends ?? []).length > 0 ? (
                  <View style={styles.listStack}>
                    {(mutualFriends ?? []).map((friend) => {
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
                          <MaterialIcons
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
                    <RNText style={styles.emptySectionText}>
                      No mutual friends yet.
                    </RNText>
                  </View>
                )}
                {isPendingIncoming && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        handleAcceptRequest();
                      }}
                      disabled={actionLoading}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="check" size={20} color={theme.colors.textInverse} />
                      <RNText style={styles.actionButtonText}>Accept Request</RNText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Alert.alert("Info", "Please reject from friends list");
                      }}
                      disabled={actionLoading}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="close" size={20} color={theme.colors.error} />
                      <RNText
                        style={[
                          styles.actionButtonText,
                          styles.rejectButtonText,
                        ]}
                      >
                        Reject
                      </RNText>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : activeContentTab === "circles" ? (
              <>
                {publicGroups.length > 0 ? (
                  <View style={styles.listStack}>
                    {publicGroups.map((group) => {
                      const isMember = group.isMember;
                      const requestPending =
                        group.joinRequestStatus === "pending";
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
                          disabled={!isMember}
                        >
                          {groupAvatar ? (
                            <Image
                              source={{ uri: groupAvatar }}
                              style={styles.listAvatar}
                            />
                          ) : (
                            <View style={styles.listIcon}>
                              <MaterialIcons
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
                          {isMember ? (
                            <MaterialIcons
                              name="chevron-right"
                              size={20}
                              color={theme.colors.textSecondary}
                            />
                          ) : requestPending ? (
                            <View style={styles.statusPill}>
                              <RNText style={styles.statusPillText}>
                                Requested
                              </RNText>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.listActionButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                executeJoinRequest(group.id);
                              }}
                              disabled={joinRequestLoading}
                              activeOpacity={0.7}
                            >
                              <RNText style={styles.listActionText}>
                                Request to join
                              </RNText>
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptySection}>
                    <RNText style={styles.emptySectionText}>
                      No public circles yet.
                    </RNText>
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
            ) : profile.trustScore?.breakdown ? (
              <View style={styles.breakdownCard}>
                <RNText style={styles.breakdownTitle}>FinScore Breakdown</RNText>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLabelRow}>
                    <View
                      style={[styles.breakdownIcon, styles.breakdownBlue]}
                    />
                    <RNText style={styles.breakdownItemLabel}>Billchop</RNText>
                    <RNText style={styles.breakdownScore}>
                      {Math.round(profile.trustScore.breakdown.expenseScore)}/35
                    </RNText>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${(profile.trustScore.breakdown.expenseScore / 35) * 100}%`,
                          backgroundColor: theme.colors.blue,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLabelRow}>
                    <View
                      style={[styles.breakdownIcon, styles.breakdownGreen]}
                    />
                    <RNText style={styles.breakdownItemLabel}>Chores</RNText>
                    <RNText style={styles.breakdownScore}>
                      {Math.round(profile.trustScore.breakdown.choreScore)}/35
                    </RNText>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${(profile.trustScore.breakdown.choreScore / 35) * 100}%`,
                          backgroundColor: theme.colors.success,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLabelRow}>
                    <View
                      style={[styles.breakdownIcon, styles.breakdownAmber]}
                    />
                    <RNText style={styles.breakdownItemLabel}>Community</RNText>
                    <RNText style={styles.breakdownScore}>
                      {Math.round(profile.trustScore.breakdown.communityScore)}
                      /15
                    </RNText>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${(profile.trustScore.breakdown.communityScore / 15) * 100}%`,
                          backgroundColor: theme.colors.warning,
                        },
                      ]}
                    />
                  </View>
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
                      {Math.round(
                        profile.trustScore.breakdown.responsivenessScore || 0,
                      )}
                      /10
                    </RNText>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${((profile.trustScore.breakdown.responsivenessScore || 0) / 10) * 100}%`,
                          backgroundColor: theme.colors.info,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLabelRow}>
                    <View
                      style={[styles.breakdownIcon, styles.breakdownSlate]}
                    />
                    <RNText style={styles.breakdownItemLabel}>Account Trust</RNText>
                    <RNText style={styles.breakdownScore}>
                      {Math.round(
                        profile.trustScore.breakdown.accountTrustScore || 0,
                      )}
                      /5
                    </RNText>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${((profile.trustScore.breakdown.accountTrustScore || 0) / 5) * 100}%`,
                          backgroundColor: theme.colors.backgroundSecondary,
                        },
                      ]}
                    />
                  </View>
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

      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.previewBackdrop}
            onPress={() => setPreviewVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.previewCard}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewFallback}>
                <RNText style={styles.previewFallbackText}>No image</RNText>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"], resolvedMode: ReturnType<typeof useTheme>["resolvedMode"]) {
  return StyleSheet.create({
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
      fontSize: 44,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.white,
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
      marginBottom: theme.spacing.xs,
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
    bioRow: {
      marginTop: theme.spacing.base,
    },
    bioText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    breakdownTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.md,
    },
    breakdownItem: {
      marginBottom: theme.spacing.base,
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
      borderRadius: 6,
      marginBottom: theme.spacing.xs,
      overflow: "hidden",
    },
    breakdownBarFill: {
      height: "100%",
      borderRadius: 6,
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
    contentSection: {
      width: "100%",
      marginTop: theme.spacing.sm,
      backgroundColor: "transparent",
      padding: 0,
    },
    sectionHeaderRow: {
      marginBottom: theme.spacing.base,
    },
    addFriendButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.full,
      backgroundColor: theme.colors.blueBackground,
      borderWidth: 1,
      borderColor: theme.colors.blue,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.blue,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    addFriendButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.semibold,
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
      backgroundColor: theme.colors.primary,
      borderWidth: 0,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
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
    listActionButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.blue,
      backgroundColor: theme.colors.blueBackground,
    },
    listActionText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.medium,
    },
    statusPill: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    statusPillText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
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
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      padding: theme.spacing.sm,
    },
    miniImage: {
      width: "100%",
      height: 90,
      borderRadius: 10,
      backgroundColor: theme.colors.backgroundSecondary,
      marginBottom: theme.spacing.xs,
    },
    miniFallback: {
      width: "100%",
      height: 90,
      borderRadius: 10,
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
    previewOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlayLight,
      justifyContent: "center",
      alignItems: "center",
    },
    previewBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    previewCard: {
      width: 240,
      height: 280,
      borderRadius: theme.radii.xl,
      overflow: "hidden",
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    previewImage: {
      width: "100%",
      height: "100%",
    },
    previewFallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.backgroundSecondary,
    },
    previewFallbackText: {
      fontSize: theme.typography.fontSize.sm,
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
    actionRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      width: "100%",
      marginTop: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      minHeight: 48,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    acceptButton: {
      backgroundColor: theme.colors.success,
    },
    rejectButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    rejectButtonText: {
      color: theme.colors.error,
    },
    messageIconButton: {
      position: 'absolute',
      bottom: theme.spacing.sm,
      right: theme.spacing.sm,
      borderRadius: theme.radii.full,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    messageIconGradient: {
      width: 48,
      height: 48,
      borderRadius: theme.radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
