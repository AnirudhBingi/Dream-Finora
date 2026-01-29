import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getFriends,
  getPendingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  Friend,
  FriendRequests,
} from "../api/friendApi";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { SkeletonFriendList } from "../components/SkeletonLoader";
import { Header } from "../components/Header";
import { Avatar } from "../components/Avatar";
import { useTheme } from "../theme";

interface FriendsListScreenProps {
  onBack: () => void;
  onSearchFriends: () => void;
  onAddNewFriends?: () => void; // New handler for add friends button
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function FriendsListScreen({
  onBack,
  onSearchFriends,
  onAddNewFriends,
  onNavigateToUserProfile,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: FriendsListScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");

  interface FriendsData {
    friends: Friend[];
    requests: FriendRequests;
  }

  const { data, loading, refreshing, error, refresh, refetch } =
    useDataFetch<FriendsData>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        const [friendsData, requestsData] = await Promise.all([
          getFriends(token),
          getPendingRequests(token),
        ]);
        return {
          friends: friendsData,
          requests: requestsData,
        };
      },
      immediate: true,
      deps: [token],
    });

  const friends = data?.friends ?? [];
  const requests = data?.requests ?? { incoming: [], outgoing: [] };

  const { execute: executeAcceptRequest } = useAsyncOperation({
    operationFn: async (friendshipId: string) => {
      if (!token) throw new Error("No authentication token");
      await acceptFriendRequest(token, friendshipId);
      return null;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const { execute: executeRejectRequest } = useAsyncOperation({
    operationFn: async (friendshipId: string) => {
      if (!token) throw new Error("No authentication token");
      await rejectFriendRequest(token, friendshipId);
      return null;
    },
    onSuccess: () => {
      refetch();
    },
  });

  function handleAcceptRequest(friendshipId: string) {
    executeAcceptRequest(friendshipId);
  }

  function handleRejectRequest(friendshipId: string) {
    Alert.alert(
      "Reject Request",
      "Are you sure you want to reject this friend request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => executeRejectRequest(friendshipId),
        },
      ],
    );
  }

  const { execute: executeRemoveFriend } = useAsyncOperation({
    operationFn: async (friendshipId: string) => {
      if (!token) throw new Error("No authentication token");
      await removeFriend(token, friendshipId);
      return null;
    },
    onSuccess: () => {
      refetch();
    },
  });

  function handleRemoveFriend(friendshipId: string, friendName: string) {
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => executeRemoveFriend(friendshipId),
        },
      ],
    );
  }

  function getUserDisplayName(friend: Friend): string {
    return (
      friend?.friend?.profile?.displayName || friend?.friend?.email || "Unknown"
    );
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Friends"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Friends"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const hasIncomingRequests = requests.incoming.length > 0;
  const hasOutgoingRequests = requests.outgoing.length > 0;
  const hasRequests = hasIncomingRequests || hasOutgoingRequests;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Friends"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "friends" && styles.tabActive]}
          onPress={() => setActiveTab("friends")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "friends" && styles.tabTextActive,
            ]}
          >
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && styles.tabActive]}
          onPress={() => setActiveTab("requests")}
          activeOpacity={0.7}
        >
          <View style={styles.tabWithBadge}>
            <Text
              style={[
                styles.tabText,
                activeTab === "requests" && styles.tabTextActive,
              ]}
            >
              Requests
            </Text>
            {hasIncomingRequests && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{requests.incoming.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {activeTab === "friends" ? (
          <>
            {/* Add New Friends Button */}
            {onAddNewFriends && (
              <TouchableOpacity
                style={styles.addNewFriendsButton}
                onPress={onAddNewFriends}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="person-add"
                  size={20}
                  color={theme.colors.white}
                />
                <Text style={styles.addNewFriendsButtonText}>
                  Add New Friends
                </Text>
              </TouchableOpacity>
            )}

            {friends.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No friends yet"
                message="Search for friends to add them to your network"
                actionLabel="Add Friends"
                onAction={onAddNewFriends || onSearchFriends}
              />
            ) : (
              friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendCard}
                  onPress={() => {
                    if (onNavigateToUserProfile) {
                      onNavigateToUserProfile(friend.friendId);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.friendInfo}>
                    <Avatar
                      avatarUrl={friend?.friend?.profile?.avatarUrl}
                      displayName={getUserDisplayName(friend)}
                      size={48}
                    />
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>
                        {getUserDisplayName(friend)}
                      </Text>
                      {!friend?.friend?.profile?.displayName &&
                        friend?.friend?.email && (
                          <Text style={styles.friendEmail}>
                            {friend.friend.email}
                          </Text>
                        )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemoveFriend(friend.id, getUserDisplayName(friend));
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="person-remove"
                      size={20}
                      color={theme.colors.error}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </>
        ) : activeTab === "requests" ? (
          <>
            {!hasRequests ? (
              <EmptyState
                icon="inbox"
                title="No pending requests"
                message="You don't have any pending friend requests"
              />
            ) : (
              <>
                {hasIncomingRequests && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons
                        name="inbox"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.sectionTitle}>Incoming Requests</Text>
                      {hasIncomingRequests && (
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>
                            {requests.incoming.length}
                          </Text>
                        </View>
                      )}
                    </View>
                    {requests.incoming.map((request) => (
                      <TouchableOpacity
                        key={request.id}
                        style={[styles.requestCard, styles.incomingRequestCard]}
                        onPress={() => {
                          if (onNavigateToUserProfile) {
                            onNavigateToUserProfile(request.friendId);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.requestCardContent}>
                          <View style={styles.friendInfo}>
                            <Avatar
                              avatarUrl={request?.friend?.profile?.avatarUrl}
                              displayName={getUserDisplayName(request)}
                              size={48}
                              borderColor={theme.colors.primary}
                              borderWidth={2}
                            />
                            <View style={styles.friendDetails}>
                              <Text style={styles.friendName}>
                                {getUserDisplayName(request)}
                              </Text>
                              {!request?.friend?.profile?.displayName &&
                                request?.friend?.email && (
                                  <Text style={styles.friendEmail}>
                                    {request.friend.email}
                                  </Text>
                                )}
                              <View style={styles.requestTimeContainer}>
                                <MaterialIcons
                                  name="schedule"
                                  size={14}
                                  color={theme.colors.textTertiary}
                                />
                                <Text style={styles.requestTime}>
                                  {formatDate(request.createdAt)}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.requestActions}>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.acceptButton]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleAcceptRequest(request.id);
                              }}
                              activeOpacity={0.8}
                            >
                              <MaterialIcons
                                name="check"
                                size={18}
                                color={theme.colors.white}
                              />
                              <Text style={styles.actionButtonText}>
                                Accept
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.rejectButton]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRejectRequest(request.id);
                              }}
                              activeOpacity={0.8}
                            >
                              <MaterialIcons
                                name="close"
                                size={18}
                                color={theme.colors.white}
                              />
                              <Text style={styles.actionButtonText}>
                                Reject
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {hasOutgoingRequests && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons
                        name="send"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.sectionTitle}>Outgoing Requests</Text>
                    </View>
                    {requests.outgoing.map((request) => (
                      <TouchableOpacity
                        key={request.id}
                        style={[styles.requestCard, styles.outgoingRequestCard]}
                        onPress={() => {
                          if (onNavigateToUserProfile) {
                            onNavigateToUserProfile(request.friendId);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.requestCardContent}>
                          <View style={styles.friendInfo}>
                            <Avatar
                              avatarUrl={request?.friend?.profile?.avatarUrl}
                              displayName={getUserDisplayName(request)}
                              size={48}
                              borderColor={theme.colors.warning}
                              borderWidth={2}
                            />
                            <View style={styles.friendDetails}>
                              <Text style={styles.friendName}>
                                {getUserDisplayName(request)}
                              </Text>
                              {!request?.friend?.profile?.displayName &&
                                request?.friend?.email && (
                                  <Text style={styles.friendEmail}>
                                    {request.friend.email}
                                  </Text>
                                )}
                              <View style={styles.requestTimeContainer}>
                                <MaterialIcons
                                  name="schedule"
                                  size={14}
                                  color={theme.colors.textTertiary}
                                />
                                <Text style={styles.requestTime}>
                                  Sent {formatDate(request.createdAt)}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.pendingBadge}>
                            <MaterialIcons
                              name="hourglass-empty"
                              size={16}
                              color={theme.colors.warning}
                            />
                            <Text style={styles.pendingText}>Pending</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        ) : null}
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
    headerActionButton: {
      padding: theme.spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 22,
      backgroundColor: theme.colors.overlayLight,
    },
    tabs: {
      flexDirection: "row",
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    tabWithBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    badge: {
      backgroundColor: theme.colors.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 6,
    },
    badgeText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.base,
      paddingBottom: theme.spacing["2xl"],
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
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      textAlign: "center",
    },
    retryButton: {
      marginTop: theme.spacing.base,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing["4xl"],
      minHeight: 300,
    },
    emptyText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    emptySubtext: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    addButton: {
      marginTop: theme.spacing.xl,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.blue,
      borderRadius: 8,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
    },
    addButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    sectionBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.sm,
    },
    sectionBadgeText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    friendCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.md,
      ...theme.shadows.sm,
    },
    requestCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    incomingRequestCard: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    outgoingRequestCard: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.warning,
    },
    requestCardContent: {
      padding: theme.spacing.base,
    },
    friendInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    friendDetails: {
      flex: 1,
    },
    friendName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    friendEmail: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    requestTimeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 6,
    },
    requestTime: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    friendActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      alignItems: "center",
    },
    removeButton: {
      padding: theme.spacing.sm,
    },
    requestActions: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginTop: theme.spacing.base,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      minHeight: 44,
      ...theme.shadows.sm,
    },
    acceptButton: {
      backgroundColor: theme.colors.success,
    },
    rejectButton: {
      backgroundColor: theme.colors.error,
    },
    actionButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    pendingBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.warningBackground,
      borderRadius: 12,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.warning,
    },
    pendingText: {
      color: theme.colors.warning,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    unblockButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 8,
      backgroundColor: theme.colors.blueBackground,
    },
    unblockButtonText: {
      color: theme.colors.blue,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    addNewFriendsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginBottom: theme.spacing.base,
      gap: theme.spacing.sm,
      ...theme.shadows.button,
    },
    addNewFriendsButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
