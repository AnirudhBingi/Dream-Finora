import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { getConversations, Conversation } from "../api/messagingApi";
import { useAuth } from "../auth/authContext";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { SkeletonConversationList } from "../components/SkeletonLoader";
import { Header } from "../components/Header";
import { MaterialIcons } from "@expo/vector-icons";
import { RefreshControl } from "react-native";
import { getUnreadCount } from "../api/notificationApi";
import { setBadgeCount } from "../services/pushNotifications";
import { useTheme } from "../theme";

interface ConversationListScreenProps {
  navigation?: {
    goBack: () => void;
    navigate: (screen: string, params?: any) => void;
  };
  onBack?: () => void;
  onNewMessage?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export default function ConversationListScreen({
  navigation,
  onBack,
  onNewMessage,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ConversationListScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const {
    data: conversationsData,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<Conversation[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      const data = await getConversations(token);
      // Handle both array response and object with conversations/groups property
      let conversationsList: Conversation[] = [];
      if (Array.isArray(data)) {
        conversationsList = data;
      } else if (data && typeof data === "object") {
        conversationsList =
          (data as any).conversations || (data as any).groups || [];
      }

      // Update notification badge count after loading conversations
      try {
        const unreadCount = await getUnreadCount(token);
        await setBadgeCount(unreadCount);
      } catch (err: any) {
        if (
          err?.message &&
          !err.message.includes("timeout") &&
          !err.message.includes("timed out")
        ) {
          console.error("Failed to update badge count:", err);
        }
      }

      return conversationsList;
    },
    immediate: true,
    deps: [token],
  });

  const conversations = conversationsData ?? [];

  // Poll for new conversations every 5 seconds (silently, without loading state)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      // Silently refetch - the hook handles the data update
      refetch().catch((err) => {
        // Silently fail during polling
        console.error("Polling error:", err);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [token, refetch]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const displayName =
      conv.otherParticipant?.profile?.displayName ||
      conv.otherParticipant?.email ||
      "";
    const lastMessage = conv.lastMessage?.content || "";
    return (
      displayName.toLowerCase().includes(query) ||
      lastMessage.toLowerCase().includes(query)
    );
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isGroupChat = item.type === "group" || item.group !== null;
    const otherUser = item.otherParticipant;
    const group = item.group;

    // Get display name - group chat or direct chat
    let displayName = "Unknown";
    let avatarUrl: string | null | undefined = null;

    if (isGroupChat && group) {
      displayName = group.name;
      avatarUrl = group.avatarUrl;
    } else if (otherUser) {
      // Prioritize displayName, fallback to email (but format it nicely)
      if (otherUser.profile?.displayName) {
        displayName = otherUser.profile.displayName;
      } else if (otherUser.email) {
        // Extract name from email (part before @) and capitalize
        const emailName = otherUser.email.split("@")[0];
        displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      }
      avatarUrl = otherUser.profile?.avatarUrl;
    }

    const lastMessage = item.lastMessage;
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          if (navigation?.navigate) {
            navigation.navigate("MessageThread", {
              chatId: item.id,
              otherUser: isGroupChat ? null : otherUser,
              group: isGroupChat ? group : null,
            });
          }
        }}
        activeOpacity={0.7}
      >
        {isGroupChat && group ? (
          <Avatar
            avatarUrl={getAvatarUrl(avatarUrl || null)}
            displayName={displayName}
            size={56}
            borderWidth={2}
            borderColor={theme.colors.background}
          />
        ) : (
          <Avatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            size={56}
            borderWidth={2}
            borderColor={theme.colors.background}
          />
        )}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.conversationName,
                hasUnread && styles.conversationNameUnread,
              ]}
            >
              {displayName}
            </Text>
            {lastMessage && (
              <Text style={styles.conversationTime}>
                {formatTime(lastMessage.sentAt)}
              </Text>
            )}
          </View>
          {lastMessage ? (
            <View style={styles.lastMessageRow}>
              {isGroupChat && lastMessage.senderId !== user?.id && (
                <Text style={styles.lastMessageSender}>
                  {(() => {
                    // Try to get sender name from participants (simplified)
                    // In a real implementation, we'd need sender info in lastMessage
                    return "Someone: ";
                  })()}
                </Text>
              )}
              <Text
                style={[
                  styles.lastMessage,
                  hasUnread && styles.lastMessageUnread,
                ]}
                numberOfLines={1}
              >
                {lastMessage.content}
              </Text>
              {hasUnread && <View style={styles.unreadDot} />}
            </View>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}
        </View>
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <RNSafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <Header
          title="Messages"
          onBack={handleBack}
          onNavigateToProfile={onNavigateToProfile}
          showNotifications={false}
          showSettings={false}
        />
        <SkeletonConversationList count={5} />
      </RNSafeAreaView>
    );
  }

  return (
    <RNSafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Header
        title="Messages"
        onBack={handleBack}
        rightActions={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => {
                if (showSearch) {
                  // Clear search when closing
                  setSearchQuery("");
                }
                setShowSearch(!showSearch);
              }}
              style={styles.headerIconButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={showSearch ? "close" : "search"}
                size={28}
                color={theme.colors.white}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (onNewMessage) {
                  onNewMessage();
                } else if (navigation?.navigate) {
                  navigation.navigate("NewConversation");
                }
              }}
              style={styles.headerIconButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={28} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        }
        onNavigateToProfile={onNavigateToProfile}
        showNotifications={false}
        showSettings={false}
      />
      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          {/* Search Bar - Only show when search icon is clicked */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <MaterialIcons
                  name="search"
                  size={20}
                  color={theme.colors.textTertiary}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search conversations..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    style={styles.searchClear}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="close"
                      size={18}
                      color={theme.colors.textTertiary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          {filteredConversations.length === 0 && conversations.length > 0 ? (
            <View style={styles.emptySearchContainer}>
              <MaterialIcons
                name="search-off"
                size={48}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.emptySearchText}>No conversations found</Text>
              <Text style={styles.emptySearchSubtext}>
                Try adjusting your search
              </Text>
            </View>
          ) : filteredConversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={64}
                  color={theme.colors.textTertiary}
                />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyMessage}>
                Start chatting with your friends, groups, or people from
                listings
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => {
                  if (onNewMessage) {
                    onNewMessage();
                  } else if (navigation?.navigate) {
                    navigation.navigate("NewConversation");
                  }
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="add"
                  size={20}
                  color={theme.colors.white}
                />
                <Text style={styles.emptyActionButtonText}>New Message</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              renderItem={renderConversation}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={theme.colors.primary}
                />
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </RNSafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      gap: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      padding: 0,
    },
    searchClear: {
      padding: 4,
    },
    emptySearchContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    emptySearchText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.base,
      marginBottom: 4,
    },
    emptySearchSubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerIconButton: {
      position: "relative",
      padding: 8,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 22,
      backgroundColor: theme.colors.surfaceOverlay,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primaryDark,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.backgroundTertiary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize["2xl"] + 2,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
      textAlign: "center",
      letterSpacing: -0.3,
    },
    emptyMessage: {
      fontSize: theme.typography.fontSize.sm + 1,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing["2xl"],
      lineHeight: 22,
      paddingHorizontal: theme.spacing.base,
    },
    emptyActionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: 14,
      borderRadius: theme.spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    emptyActionButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContainer: {
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      margin: theme.spacing.base,
      borderRadius: theme.spacing.sm,
      alignItems: "center",
    },
    errorText: {
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
    },
    retryText: {
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      textAlign: "center",
    },
    listContent: {
      padding: 16,
      paddingTop: 8,
    },
    conversationItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.md,
      borderRadius: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    conversationContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
      gap: 4,
    },
    conversationHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    conversationName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
    },
    conversationNameUnread: {
      fontWeight: theme.typography.fontWeight.bold,
    },
    conversationTime: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.normal,
    },
    lastMessageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    lastMessage: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    lastMessageUnread: {
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    noMessages: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
      fontStyle: "italic",
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
    },
    unreadBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.md,
      minWidth: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.sm,
      marginLeft: theme.spacing.sm,
    },
    unreadText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    groupAvatarContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    groupAvatarImage: {
      width: "100%",
      height: "100%",
    },
    groupAvatarText: {
      fontSize: 24,
      fontWeight: "700",
      letterSpacing: -0.5,
    },
    lastMessageSender: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginRight: 4,
    },
  });
